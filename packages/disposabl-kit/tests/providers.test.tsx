import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { useGT } from "gt-react";
import { I18nProvider } from "../src/providers/i18n";

function Greeting() {
  const gt = useGT();
  return <p>{gt("Hello")}</p>;
}

test("renders English without translation credentials", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(() =>
      root.render(
        <I18nProvider>
          <Greeting />
        </I18nProvider>,
      ),
    );
    expect(container.textContent).toBe("Hello");
  } finally {
    await act(() => root.unmount());
  }
});
