import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ErrorBoundary,
  RouteErrorBoundary,
} from "../src/providers/error-boundary";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function Failure(): ReactNode {
  throw new Error("Private internal failure");
}

it("renders recovery without exposing internal errors by default", async () => {
  await act(async () =>
    root.render(
      <ErrorBoundary>
        <Failure />
      </ErrorBoundary>,
    ),
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "We couldn't load this page",
  );
  expect(container.querySelector("button")?.textContent).toContain("Try again");
  expect(container.textContent).not.toContain("Private internal failure");
  expect(container.querySelector("details")).toBeNull();
});

it("shows error details only when requested by the app", async () => {
  await act(async () =>
    root.render(
      <ErrorBoundary showDetails>
        <Failure />
      </ErrorBoundary>,
    ),
  );
  expect(container.querySelector("details")?.textContent).toContain(
    "Private internal failure",
  );
});

it("shares the detail setting with route error recovery", async () => {
  await act(async () =>
    root.render(
      <ErrorBoundary showDetails>
        <RouteErrorBoundary
          error={new Error("Route failure")}
          reset={vi.fn()}
        />
      </ErrorBoundary>,
    ),
  );
  expect(container.querySelector("details")?.textContent).toContain(
    "Route failure",
  );
});
