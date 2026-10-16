/**
 * Functions select their additional exposure through API and MCP.
 * Web and mobile already access public Convex functions directly.
 * CLI/SDK are global API clients; OpenAI/Claude are global MCP integrations.
 * Keeping those clients global prevents selecting a function for a client
 * without exposing the API or MCP transport that client needs.
 * This metadata guides generation; it does not authorize requests.
 */
export type Platforms = readonly ("api" | "mcp")[];

/** Parse global DISPOSABL_PLATFORMS and enable required transports. */
export function getPlatforms(value?: string) {
  const enabled = new Set(
    (value ?? process.env.DISPOSABL_PLATFORMS ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
      .map((name) =>
        name === "openai" || name === "openai-plugin"
          ? "openai-plugin"
          : name === "claude" || name === "claude-plugin"
            ? "claude-plugin"
            : name,
      ),
  );
  const supported = new Set([
    "api",
    "cli",
    "mcp",
    "sdk",
    "openai-plugin",
    "claude-plugin",
  ]);
  for (const name of enabled) {
    if (!supported.has(name))
      throw new Error(`Invalid DISPOSABL_PLATFORMS platform: ${name}`);
  }
  return {
    isApiEnabled:
      enabled.has("api") || enabled.has("cli") || enabled.has("sdk"),
    isCliEnabled: enabled.has("cli"),
    isMcpEnabled:
      enabled.has("mcp") ||
      enabled.has("openai-plugin") ||
      enabled.has("claude-plugin"),
    isSdkEnabled: enabled.has("sdk"),
    isOpenaiPluginEnabled: enabled.has("openai-plugin"),
    isClaudePluginEnabled: enabled.has("claude-plugin"),
  };
}
