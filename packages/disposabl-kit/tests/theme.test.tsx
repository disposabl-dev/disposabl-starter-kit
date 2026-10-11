import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "../src/providers/theme";

let root: Root;
let container: HTMLDivElement;
function Toggle() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme("dark")}>{theme}</button>;
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark", "light");
});
it("keeps rendering and allows theme changes when browser storage is blocked", async () => {
  vi.spyOn(localStorage, "getItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  await act(async () =>
    root.render(
      <ThemeProvider defaultTheme="light">
        <Toggle />
      </ThemeProvider>,
    ),
  );
  expect(container.textContent).toBe("light");
  expect(document.documentElement.classList.contains("light")).toBe(true);
  await act(async () => container.querySelector("button")?.click());
  expect(container.textContent).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});
