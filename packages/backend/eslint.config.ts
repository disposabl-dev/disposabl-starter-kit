import convexPlugin from "@convex-dev/eslint-plugin";
import sharedConfig from "@repo/eslint-config";

const config: typeof sharedConfig = [
  ...sharedConfig,
  ...convexPlugin.configs.recommended,
];

export default config;
