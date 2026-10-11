import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const functions = api.todos.index;
const identity = {
  issuer: "https://api.workos.com/",
  subject: "user_owner",
  org_id: "org_one",
  role: "member",
};
const paginationOpts = { numItems: 10, cursor: null };

beforeEach(() => vi.stubEnv("WORKOS_CLIENT_ID", "client_fixture"));
afterEach(() => vi.unstubAllEnvs());

it("rejects unauthenticated queries and mutations", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.query(functions.listTodos, { paginationOpts }),
  ).rejects.toMatchObject({ data: { code: "unauthenticated", status: 401 } });
  await expect(
    t.mutation(functions.createTodo, { text: "Private" }),
  ).rejects.toMatchObject({ data: { code: "unauthenticated", status: 401 } });
});

it.each([
  { issuer: "https://unexpected.example", code: "session_required" },
  { subject: "application_one", code: "user_required" },
  { org_id: undefined, code: "organization_required" },
  { role: "viewer", code: "role_required" },
])("rejects unsupported claims $code", async ({ code, ...claims }) => {
  const t = convexTest(schema, modules).withIdentity({
    ...identity,
    ...claims,
  });
  await expect(
    t.mutation(functions.createTodo, { text: "Private" }),
  ).rejects.toMatchObject({ data: { code, status: 403 } });
});

it("trims text, validates length, and isolates paginated organization data", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity);
  const other = t.withIdentity({ ...identity, org_id: "org_two" });
  await owner.mutation(functions.createTodo, { text: "  First  " });
  await owner.mutation(functions.createTodo, { text: "Second" });
  await other.mutation(functions.createTodo, { text: "Other organization" });
  for (const text of ["   ", "x".repeat(201)]) {
    await expect(
      owner.mutation(functions.createTodo, { text }),
    ).rejects.toMatchObject({ data: { code: "invalid_text", status: 400 } });
  }
  const first = await owner.query(functions.listTodos, {
    paginationOpts: { numItems: 1, cursor: null },
  });
  const second = await owner.query(functions.listTodos, {
    paginationOpts: { numItems: 1, cursor: first.continueCursor },
  });
  expect(
    [...first.page, ...second.page].map((todo) => todo.text).sort(),
  ).toEqual(["First", "Second"]);
  expect(
    [...first.page, ...second.page].every(
      (todo) => todo.orgId === "org_one" && todo.userId === "user_owner",
    ),
  ).toBe(true);
});

it("permits deletion only by the owner or an admin in the same organization", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity);
  const member = t.withIdentity({ ...identity, subject: "user_member" });
  const admin = t.withIdentity({
    ...identity,
    subject: "user_admin",
    roles: ["member", "admin"],
  });
  const outsider = t.withIdentity({
    ...identity,
    org_id: "org_two",
    role: "admin",
  });
  const id = await owner.mutation(functions.createTodo, { text: "Private" });
  await expect(
    member.mutation(functions.deleteTodo, { id }),
  ).rejects.toMatchObject({ data: { code: "forbidden", status: 403 } });
  await expect(
    outsider.mutation(functions.deleteTodo, { id }),
  ).rejects.toMatchObject({ data: { code: "not_found", status: 404 } });
  expect(
    (await owner.query(functions.listTodos, { paginationOpts })).page,
  ).toHaveLength(1);
  await admin.mutation(functions.deleteTodo, { id });
  const own = await owner.mutation(functions.createTodo, { text: "Mine" });
  await owner.mutation(functions.deleteTodo, { id: own });
  await expect(
    owner.mutation(functions.deleteTodo, { id: own }),
  ).rejects.toMatchObject({ data: { code: "not_found", status: 404 } });
  expect(
    (await owner.query(functions.listTodos, { paginationOpts })).page,
  ).toEqual([]);
});
