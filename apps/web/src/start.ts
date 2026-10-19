import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { gtMiddleware } from "gt-tanstack-start";

export const startInstance = createStart(() => ({
  defaultSsr: true,
  requestMiddleware: [
    createCsrfMiddleware({
      filter: ({ handlerType }) => handlerType === "serverFn",
    }),
    gtMiddleware,
  ],
}));
