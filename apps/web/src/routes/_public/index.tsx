import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { T, useGT } from "gt-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@disposabl/disposabl-kit/client/components/ui/tooltip";
import lightBrandLogo from "@disposabl/disposabl-kit/client/assets/logo-dark.svg?url";
import darkBrandLogo from "@disposabl/disposabl-kit/client/assets/logo-light.svg?url";
import androidLogo from "../../assets/landing/brands/android.svg?url";
import appStoreBadge from "../../assets/landing/app-store-badge.svg?url";
import appleLogo from "../../assets/landing/apple.svg?url";
import chromeLogo from "../../assets/landing/brands/chrome.svg?url";
import safariLogo from "../../assets/landing/brands/safari.svg?url";
import claudeLogo from "../../assets/landing/claude.svg?url";
import googlePlayBadge from "../../assets/landing/google-play-badge.png?url";
import mcpLogo from "../../assets/landing/mcp.svg?url";
import openaiLogo from "../../assets/landing/openai.svg?url";
import pythonLogo from "../../assets/landing/brands/python.svg?url";
import typescriptLogo from "../../assets/landing/brands/typescript.svg?url";
import windowsLogo from "../../assets/landing/windows.svg?url";

import workosLogo from "../../assets/landing/brands/workos.svg?url";
import convexLogo from "../../assets/landing/brands/convex.svg?url";
import posthogLogo from "../../assets/landing/brands/posthog.svg?url";
import viteLogo from "../../assets/landing/brands/vite.svg?url";
import bunLogo from "../../assets/landing/brands/bun.svg?url";
import tailwindcssLogo from "../../assets/landing/brands/tailwindcss.svg?url";
import shadcnuiLogo from "../../assets/landing/brands/shadcnui.svg?url";
import githubactionsLogo from "../../assets/landing/brands/githubactions.svg?url";
import githubDarkLogo from "../../assets/landing/brands/github-dark.svg?url";
import linuxLogo from "../../assets/landing/brands/linux.svg?url";
import honoLogo from "../../assets/landing/brands/hono.svg?url";
import tanstackLogo from "../../assets/landing/brands/tanstack-mark.svg?url";
import fumadocsLogo from "../../assets/landing/brands/fumadocs.svg?url";
import gtLogoOnDark from "../../assets/landing/brands/gt-dark.png?url";
import gtLogoOnLight from "../../assets/landing/brands/gt-light.png?url";

import openTelemetryLogo from "../../assets/landing/brands/opentelemetry.svg?url";
import resendLogo from "../../assets/landing/brands/resend.svg?url";
import resendDarkLogo from "../../assets/landing/brands/resend-dark.svg?url";
import expoLogo from "../../assets/landing/brands/expo.svg?url";
import autumnLogo from "../../assets/landing/brands/autumn.svg?url";
import cloudflareLogo from "../../assets/landing/brands/cloudflare.svg?url";
import electronLogo from "../../assets/landing/brands/electron.svg?url";
import reactNativeLogo from "../../assets/landing/brands/reactnative.svg?url";
import vercelLogo from "../../assets/landing/brands/vercel.svg?url";
import viteDarkLogo from "../../assets/landing/brands/vite-dark.svg?url";

export const Route = createFileRoute("/{-$lang}/_public/")({
  head: () => ({
    meta: [
      { title: "Disposabl | Build your app" },
      {
        name: "description",
        content:
          "Create apps for web, mobile, desktop, and developer tools. Draft, preview, publish.",
      },
    ],
  }),
  component: Home,
});

const landingTheme = [
  "disposabl-landing min-h-svh bg-[var(--bg)] font-landing text-base leading-[normal] font-normal text-[var(--ink)] antialiased",
  "[--bg:var(--background)] [--surface:color-mix(in_srgb,var(--foreground)_4%,var(--background))] [--ink:#17191c] [--muted:#515863] [--accent:#bd3f2d] [--accent-fill:#ff6b57] [--accent-ink:#18191b] [--paper:var(--background)] [--paper-ink:#17191c] [--paper-muted:#555c65] [--line:color-mix(in_srgb,var(--foreground)_14%,var(--background))] [--paper-inset:var(--surface)] [--hover:#e2e6eb] [--track:#d8dce0] [--logo-filter:none] [--mini-paper:#fff] [--mini-ink:#17191c] [--mini-row:#e7ebef] [--section-size:46px] ",
  "dark:[--surface:color-mix(in_srgb,var(--foreground)_5%,var(--background))] dark:[--ink:#eff0f1] dark:[--muted:#b0b2b6] dark:[--accent:#ff806c] dark:[--paper-ink:#eff0f1] dark:[--paper-muted:#b0b2b6] dark:[--line:color-mix(in_srgb,var(--foreground)_16%,var(--background))] dark:[--hover:#34373a] dark:[--track:#35373b] dark:[--logo-filter:invert(1)] dark:[--mini-paper:#eff0f1] dark:[--mini-ink:#18191b] dark:[--mini-row:#dfe2e5]",
  "max-[801px]:[--section-size:36px] max-[561px]:[--section-size:35px] print:[--section-size:28px] [html:has(&)]:scroll-smooth [html:has(&)]:scroll-pt-[26px] motion-reduce:[html:has(&)]:scroll-auto",
  "[&_:where(button,a)]:touch-manipulation [&_:where(button,a)]:[-webkit-tap-highlight-color:transparent] [&_button:enabled]:cursor-pointer [&_a:focus-visible]:outline-3 [&_a:focus-visible]:outline-[var(--accent)] [&_a:focus-visible]:outline-offset-5 [&_button:not(.platform-option):focus-visible]:outline-3 [&_button:not(.platform-option):focus-visible]:outline-[var(--accent)] [&_button:not(.platform-option):focus-visible]:outline-offset-5 selection:bg-[var(--accent)] selection:text-[var(--bg)]",
].join(" ");

const installCommands = {
  macos: "curl -fsSL https://disposable.dev/install.sh | sh",
  linux: "curl -fsSL https://disposable.dev/install.sh | sh",
  windows: "irm https://disposable.dev/install.ps1 | iex",
} as const;
type Feature = {
  id: string;
  label: string;
  provider: string;
  logo: string;
  description: string;
  docs: string;
  tone: string;
  darkLogo?: string;
  monochrome?: boolean;
  planned?: boolean;
};

function featureLogoClass(
  feature: Feature,
  context: "tile" | "detail" = "tile",
) {
  const standard = context === "tile" ? "h-8 w-9" : "size-11";
  const special =
    feature.logo === convexLogo
      ? context === "tile"
        ? "brand-spaced -mx-2 -my-2 size-[52px] max-w-none"
        : "brand-spaced -m-2 size-14 max-w-none"
      : feature.logo === expoLogo
        ? context === "tile"
          ? "brand-expo size-[39px] max-w-none"
          : "brand-expo -m-1 size-12 max-w-none"
        : standard;
  const theme = feature.darkLogo
    ? "brand-on-light dark:hidden"
    : feature.monochrome
      ? "monochrome-logo dark:invert"
      : "";
  return ["feature-logo object-contain", special, theme]
    .filter(Boolean)
    .join(" ");
}

const pendingPromptStorageKey = "disposabl:pending-app-prompt";
const pendingPlatformsStorageKey = "disposabl:pending-app-platforms";
const appPlatforms = [
  { id: "website", label: "Chrome", logo: chromeLogo, color: true },
  { id: "macos", label: "macOS", logo: appleLogo },
  { id: "windows", label: "Windows", logo: windowsLogo, color: true },
  { id: "linux", label: "Linux", logo: linuxLogo, color: true },
  { id: "ios", label: "iOS", logo: appleLogo },
  { id: "android", label: "Android", logo: androidLogo, color: true },
  { id: "openai", label: "OpenAI", logo: openaiLogo },
  { id: "claude", label: "Claude Code", logo: claudeLogo, color: true },
  { id: "cli", label: "CLI", path: "m9 12 12 12L9 36m18 0h13" },
  {
    id: "api",
    label: "API",
    path: "m15 12-11 12 11 12m18-24 11 12-11 12M28 7l-8 34",
  },
  { id: "mcp", label: "MCP", logo: mcpLogo },
  {
    id: "typescript",
    label: "TypeScript SDK",
    logo: typescriptLogo,
    color: true,
  },
  { id: "python", label: "Python SDK", logo: pythonLogo, color: true },
] as const;
// Both browser marks represent the same included Website target.
const platformDisplays = [
  ...appPlatforms,
  { id: "website", label: "Safari", logo: safariLogo, color: true },
] as const;
type AppPlatform = (typeof appPlatforms)[number]["id"];
const lockedPlatforms = new Set<AppPlatform>([
  "ios",
  "android",
  "macos",
  "windows",
  "linux",
]);
const platformRequirements: Partial<Record<AppPlatform, AppPlatform>> = {
  cli: "api",
  typescript: "api",
  python: "api",
  openai: "mcp",
  claude: "mcp",
};
function resolvePlatforms(platforms: readonly AppPlatform[]): AppPlatform[] {
  const selected = new Set<AppPlatform>(["website", ...platforms]);
  for (const platform of platforms) {
    const requirement = platformRequirements[platform];
    if (requirement) selected.add(requirement);
  }
  return appPlatforms
    .filter(
      (platform) =>
        !lockedPlatforms.has(platform.id) && selected.has(platform.id),
    )
    .map((platform) => platform.id);
}
function isRequiredPlatform(
  platform: AppPlatform,
  selected: readonly AppPlatform[],
) {
  return selected.some((item) => platformRequirements[item] === platform);
}
type Audience = "personal" | "business";
const personalFeatureIds = new Set([
  "authentication",
  "database",
  "storage",
  "email",
  "notifications",
  "crashes",
  "updates",
  "interfaces",
  "domains",
  "sandboxes",
  "sharing",
  "content",
]);

const phases = ["draft", "preview", "publish"] as const;

const technologyStack: {
  name: string;
  href: string;
  logo: string;
  darkLogo?: string;
  monochrome?: boolean;
  spaced?: boolean;
  planned?: boolean;
}[] = [
  {
    name: "React / React Native",
    href: "https://reactnative.dev/",
    logo: reactNativeLogo,
  },
  { name: "Expo", href: "https://expo.dev/", logo: expoLogo, monochrome: true },
  {
    name: "Electron",
    href: "https://www.electronjs.org/",
    logo: electronLogo,
    planned: true,
  },
  { name: "TanStack", href: "https://tanstack.com/", logo: tanstackLogo },
  {
    name: "TypeScript",
    href: "https://www.typescriptlang.org/",
    logo: typescriptLogo,
  },
  { name: "Bun", href: "https://bun.sh/", logo: bunLogo },
  {
    name: "Vite",
    href: "https://vite.dev/",
    logo: viteLogo,
    darkLogo: viteDarkLogo,
  },
  {
    name: "Tailwind CSS",
    href: "https://tailwindcss.com/",
    logo: tailwindcssLogo,
  },
  {
    name: "shadcn/ui",
    href: "https://ui.shadcn.com/",
    logo: shadcnuiLogo,
    monochrome: true,
  },
  { name: "Hono", href: "https://hono.dev/", logo: honoLogo },
  {
    name: "Convex",
    href: "https://www.convex.dev/",
    logo: convexLogo,
    spaced: true,
  },
  {
    name: "MCP",
    href: "https://modelcontextprotocol.io/",
    logo: mcpLogo,
    monochrome: true,
  },
  {
    name: "GitHub Actions",
    href: "https://github.com/features/actions",
    logo: githubactionsLogo,
    darkLogo: githubDarkLogo,
  },
  {
    name: "OpenTelemetry",
    href: "https://opentelemetry.io/",
    logo: openTelemetryLogo,
  },
];

function Home() {
  const gt = useGT();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState("");
  const [promptPending, setPromptPending] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<AppPlatform[]>([
    "website",
  ]);
  const [platformHelp, setPlatformHelp] = useState<AppPlatform | null>(null);
  const platformGroups = [
    { id: "web", label: gt("Website"), ids: ["website"] },
    { id: "mobile", label: gt("Mobile"), ids: ["ios", "android"] },
    { id: "agent-tools", label: gt("Agent tools"), ids: ["cli", "api", "mcp"] },
    { id: "agents", label: gt("Agent plugins"), ids: ["openai", "claude"] },
    {
      id: "tools",
      label: gt("Developer tools"),
      ids: ["typescript", "python"],
    },
    {
      id: "desktop",
      label: gt("Desktop"),
      ids: ["macos", "windows", "linux"],
    },
  ];

  function togglePlatform(platform: AppPlatform) {
    if (platform === "website" || lockedPlatforms.has(platform)) return;
    setSelectedPlatforms((current) => {
      if (isRequiredPlatform(platform, current)) return current;
      return resolvePlatforms(
        current.includes(platform)
          ? current.filter((item) => item !== platform)
          : [...current, platform],
      );
    });
  }
  function platformExplanation(platform: AppPlatform) {
    if (platform === "api" && isRequiredPlatform(platform, selectedPlatforms))
      return gt(
        "API is required by your selected CLI or SDKs. Deselect those first to remove API.",
      );
    if (platform === "mcp" && isRequiredPlatform(platform, selectedPlatforms))
      return gt(
        "MCP is required by your selected agent plugins. Deselect those first to remove MCP.",
      );
    if (platformRequirements[platform] === "api")
      return gt("Includes API automatically.");
    if (platformRequirements[platform] === "mcp")
      return gt("Includes MCP automatically.");
    return undefined;
  }
  const promptRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try {
      setPrompt(sessionStorage.getItem(pendingPromptStorageKey) ?? "");
      const savedPlatforms: unknown = JSON.parse(
        sessionStorage.getItem(pendingPlatformsStorageKey) ?? '["website"]',
      );
      if (Array.isArray(savedPlatforms)) {
        setSelectedPlatforms(
          resolvePlatforms(
            appPlatforms
              .filter(
                (platform) =>
                  platform.id === "website" ||
                  savedPlatforms.includes(platform.id),
              )
              .map((platform) => platform.id),
          ),
        );
      }
    } catch {
      // Submission reports storage failures before leaving the page.
    }
  }, []);

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const idea = prompt.trim();
    if (!idea) {
      setPromptError(gt("Describe your app before continuing."));
      promptRef.current?.focus();
      return;
    }
    try {
      sessionStorage.setItem(pendingPromptStorageKey, idea);
      sessionStorage.setItem(
        pendingPlatformsStorageKey,
        JSON.stringify(resolvePlatforms(selectedPlatforms)),
      );
    } catch {
      setPromptError(
        gt(
          "Your browser could not save this prompt. Copy it before continuing.",
        ),
      );
      return;
    }
    setPromptError("");
    setPromptPending(true);
    void navigate({ to: "/sign-in" }).catch(() => {
      setPromptPending(false);
      setPromptError(gt("Could not open sign-in. Your prompt is saved."));
    });
  }

  const [installPlatform, setInstallPlatform] =
    useState<keyof typeof installCommands>("macos");
  const installCommand = installCommands[installPlatform];
  const [audience, setAudience] = useState<Audience>("personal");
  const [activeFeature, setActiveFeature] = useState(0);
  const docsUrl = (topic: string) => `https://disposabl.dev/docs/${topic}`;
  const features: Feature[] = [
    {
      id: "authentication",
      label: gt("Authentication"),
      provider: "WorkOS",
      logo: workosLogo,
      description: gt("Sign-in and user accounts."),
      docs: docsUrl("authentication"),
      tone: "#8870F2",
    },
    {
      id: "database",
      label: gt("Database"),
      provider: "Convex",
      logo: convexLogo,
      description: gt("A reactive database shared by your apps."),
      docs: docsUrl("database"),
      tone: "#E56A45",
    },
    {
      id: "storage",
      label: gt("Storage"),
      provider: "Cloudflare R2",
      logo: cloudflareLogo,
      description: gt("Files and uploads, backed by Cloudflare R2."),
      docs: docsUrl("storage"),
      tone: "#E98932",
    },
    {
      id: "teams",
      label: gt("Teams"),
      provider: "WorkOS",
      logo: workosLogo,
      description: gt("Invite people and manage their roles."),
      docs: docsUrl("teams"),
      tone: "#8870F2",
    },
    {
      id: "languages",
      label: gt("80+ languages"),
      provider: "General Translation",
      logo: gtLogoOnLight,
      description: gt("Localized interfaces and language catalogs."),
      docs: docsUrl("localization"),
      tone: "#239D94",
      darkLogo: gtLogoOnDark,
    },
    {
      id: "email",
      label: gt("Email"),
      provider: "Resend",
      logo: resendLogo,
      description: gt("Transactional email through Resend."),
      docs: docsUrl("email"),
      tone: "#7289C8",
      darkLogo: resendDarkLogo,
    },
    {
      id: "notifications",
      label: gt("Notifications"),
      provider: "Expo",
      logo: expoLogo,
      description: gt("Register devices for mobile push notifications."),
      docs: docsUrl("notifications"),
      tone: "#5E9CEC",
      monochrome: true,
    },
    {
      id: "billing",
      label: gt("Billing"),
      provider: "Autumn \u00b7 Stripe \u00b7 RevenueCat",
      logo: autumnLogo,
      description: gt(
        "Subscriptions, credits, and usage across web and mobile.",
      ),
      docs: docsUrl("billing"),
      tone: "#A379E7",
      monochrome: true,
      planned: true,
    },
    {
      id: "analytics",
      label: gt("Analytics"),
      provider: "PostHog",
      logo: posthogLogo,
      description: gt("Understand how people use your app."),
      docs: docsUrl("analytics"),
      tone: "#D89130",
    },
    {
      id: "replay",
      label: gt("Session replay"),
      provider: "PostHog",
      logo: posthogLogo,
      description: gt(
        "Replay consented sessions with sensitive inputs masked.",
      ),
      docs: docsUrl("session-replay"),
      tone: "#D89130",
    },
    {
      id: "tracing",
      label: gt("Distributed tracing"),
      provider: "OpenTelemetry",
      logo: openTelemetryLogo,
      description: gt("Trace browser requests and server actions."),
      docs: docsUrl("tracing"),
      tone: "#538EDB",
    },
    {
      id: "crashes",
      label: gt("Crash analytics"),
      provider: "PostHog",
      logo: posthogLogo,
      description: gt(
        "Inspect errors and connect them to the sessions behind them.",
      ),
      docs: docsUrl("crash-analytics"),
      tone: "#DF785E",
    },
    {
      id: "updates",
      label: gt("App updates"),
      provider: "Expo Updates",
      logo: expoLogo,
      description: gt("Download compatible updates and restart when ready."),
      docs: docsUrl("updates"),
      tone: "#5E9CEC",
      monochrome: true,
    },
    {
      id: "ci",
      label: gt("GitHub CI"),
      provider: "GitHub Actions",
      logo: githubactionsLogo,
      darkLogo: githubDarkLogo,
      description: gt("Run checks before changes reach your users."),
      docs: docsUrl("ci"),
      tone: "#3D91DF",
      planned: true,
    },
    {
      id: "interfaces",
      label: gt("API, CLI & MCP"),
      provider: "Model Context Protocol",
      logo: mcpLogo,
      description: gt("Typed interfaces for your apps and agents."),
      docs: docsUrl("interfaces"),
      tone: "#7C91CF",
      monochrome: true,
    },
    {
      id: "domains",
      label: gt("Custom domains"),
      provider: "Convex",
      logo: convexLogo,
      description: gt("Connect your own domain to a published app."),
      docs: docsUrl("domains"),
      tone: "#E56A45",
    },
    {
      id: "sandboxes",
      label: gt("Agent sandboxes"),
      provider: "Vercel Sandbox",
      logo: vercelLogo,
      description: gt("Isolated workspaces for coding agents."),
      docs: docsUrl("sandboxes"),
      tone: "#8F96AB",
      monochrome: true,
    },
    {
      id: "sharing",
      label: gt("Sharing"),
      provider: "Disposabl",
      logo: lightBrandLogo,
      description: gt("Share app previews with a link or QR code."),
      docs: docsUrl("sharing"),
      tone: "#E17B6A",
      darkLogo: darkBrandLogo,
    },
    {
      id: "content",
      label: gt("Blog & docs"),
      provider: "Fumadocs",
      logo: fumadocsLogo,
      description: gt("Articles and documentation, powered by Fumadocs."),
      docs: docsUrl("content"),
      tone: "#A17BE8",
      planned: true,
    },
    {
      id: "flags",
      label: gt("Feature flags"),
      provider: "PostHog",
      logo: posthogLogo,
      description: gt("Roll out changes gradually and turn them off quickly."),
      docs: docsUrl("feature-flags"),
      tone: "#4DAD88",
      planned: true,
    },
  ];
  const visibleFeatures = features
    .map((feature, index) => ({ feature, index }))
    .filter(
      ({ feature }) =>
        audience === "business" || personalFeatureIds.has(feature.id),
    );
  const detail = features[activeFeature] ?? features[0]!;
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const journeyRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const featureHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const clearFeatureHover = () => clearTimeout(featureHoverTimer.current);
  function selectAudience(nextAudience: Audience) {
    clearFeatureHover();
    setAudience(nextAudience);
    if (nextAudience === "personal" && !personalFeatureIds.has(detail.id))
      setActiveFeature(0);
  }
  const selectFeature = (index: number) => {
    clearFeatureHover();
    setActiveFeature(index);
  };
  useEffect(
    () => () => {
      clearTimeout(noticeTimer.current);
      clearTimeout(featureHoverTimer.current);
    },
    [],
  );

  useEffect(() => {
    const element = journeyRef.current;
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver === "undefined";
    let timer: ReturnType<typeof setInterval> | undefined;

    function synchronize() {
      clearInterval(timer);
      if (paused || !visible || reducedMotion.matches || document.hidden)
        return;
      timer = setInterval(
        () => setPhase((previous) => (previous + 1) % phases.length),
        2800,
      );
    }

    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(
            ([entry]) => {
              visible = entry?.isIntersecting ?? false;
              synchronize();
            },
            { threshold: 0.25 },
          );
    observer?.observe(element);
    reducedMotion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    synchronize();
    return () => {
      clearInterval(timer);
      observer?.disconnect();
      reducedMotion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [paused]);

  async function copyInstallCommand() {
    let message: string;
    try {
      await navigator.clipboard.writeText(installCommand);
      message = gt("Install command copied");
    } catch {
      const selection = window.getSelection();
      if (selection && commandRef.current) {
        const range = document.createRange();
        range.selectNodeContents(commandRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      message = gt("Select and copy the command");
    }
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2600);
  }

  return (
    <main className={landingTheme}>
      <div className="sheet mx-auto max-w-[1440px]">
        <section
          className="hero wrap block min-h-0 px-5 pt-14 pb-[50px] sm:px-8 xl:px-10 max-[701px]:pt-9 max-[701px]:pb-[30px] print:pt-2 print:pb-5"
          id="top"
          aria-labelledby="title"
        >
          <div className="hero-copy mx-auto max-w-[1160px]">
            <h1
              id="title"
              className="text-center text-[clamp(40px,5.1vw,72px)] leading-[1.1] font-medium tracking-[-0.055em] max-[701px]:text-[clamp(34px,8vw,48px)] max-[701px]:text-balance max-[561px]:[&:is(:lang(es),:lang(fr),:lang(ja))]:text-[clamp(30px,9.2vw,38px)]"
            >
              <T>What do you want to build?</T>
            </h1>
            <p className="hero-subtitle mx-auto mt-4 max-w-[54ch] text-center text-lg leading-[1.5] text-[var(--muted)] max-[701px]:mt-3 max-[701px]:max-w-[32ch] max-[701px]:text-base">
              <T>From personal software to enterprise-ready apps.</T>
            </p>
            <form
              className="idea-composer mt-7 overflow-hidden border border-[var(--line)] bg-[var(--paper)] transition-[border-color] duration-200 focus-within:border-[var(--accent)] max-[701px]:mt-[26px]"
              onSubmit={submitPrompt}
              aria-busy={promptPending}
              aria-label={gt("App prompt and selected platforms")}
            >
              <div
                className="output-panel platform-selector min-w-0 border-b border-[var(--line)] bg-transparent px-6 pt-[22px] pb-5 min-[701px]:max-[1001px]:px-4 max-[701px]:px-[14px] max-[701px]:py-[18px]"
                id="platform-picker"
                role="group"
                aria-label={gt("App platforms")}
              >
                <div className="platform-groups grid grid-cols-6 gap-3 min-[701px]:max-[1001px]:grid-cols-3 min-[701px]:max-[1001px]:gap-y-4 max-[701px]:grid-cols-6 max-[701px]:gap-y-4">
                  {platformGroups.map((group) => (
                    <fieldset
                      key={group.id}
                      className={`platform-group platform-group-${group.id} group/platform min-w-0 border border-[var(--line)] bg-transparent px-[7px] pt-2.5 pb-[9px] transition-[border-color] duration-180 data-[selected=true]:border-[var(--accent)] data-[locked=true]:[&_.platform-symbol]:opacity-40 data-[locked=true]:[&_.platform-option]:text-[var(--muted)] max-[701px]:col-span-3 motion-reduce:transition-none ${group.id === "tools" || group.id === "desktop" ? "max-[361px]:col-span-full" : ""}`}
                      data-locked={
                        group.id === "mobile" || group.id === "desktop"
                      }
                      data-selected={selectedPlatforms.some((platform) =>
                        group.ids.includes(platform),
                      )}
                      aria-labelledby={`${group.id}-platforms`}
                    >
                      <legend
                        id={`${group.id}-platforms`}
                        className="mx-px px-[5px] text-[10px] leading-[1.4] font-medium tracking-[0.07em] uppercase text-[var(--muted)] group-data-[selected=true]/platform:text-[var(--accent)] min-[701px]:max-[1001px]:tracking-[0.06em]"
                      >
                        {group.label}
                        {(group.id === "mobile" || group.id === "desktop") && (
                          <svg
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="platform-lock ms-[5px] inline-block size-[11px] align-[-1px]"
                            viewBox="0 0 16 16"
                            role="img"
                            aria-label={gt("Locked")}
                          >
                            <rect x="3.5" y="7" width="9" height="7" rx="1" />
                            <path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" />
                          </svg>
                        )}
                      </legend>
                      <div className="output-logos flex justify-between gap-[3px] min-[701px]:max-[1001px]:gap-2">
                        {platformDisplays
                          .filter((platform) => group.ids.includes(platform.id))
                          .map((platform) => (
                            <Tooltip
                              key={`${platform.id}-${platform.label}`}
                              open={platformHelp === platform.id}
                              onOpenChange={(open) =>
                                setPlatformHelp(
                                  open && platformExplanation(platform.id)
                                    ? platform.id
                                    : null,
                                )
                              }
                            >
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="platform-option group/option flex min-h-[78px] min-w-0 flex-1 flex-col items-center justify-start gap-2 border border-transparent bg-transparent px-[3px] pt-[10px] pb-[7px] text-[var(--ink)] transition-[border-color] duration-180 disabled:cursor-default disabled:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-3 max-[701px]:min-h-[74px] max-[701px]:px-0.5 motion-reduce:transition-none"
                                  aria-label={`${group.label}: ${platform.label}`}
                                  aria-pressed={selectedPlatforms.includes(
                                    platform.id,
                                  )}
                                  disabled={
                                    platform.id === "website" ||
                                    lockedPlatforms.has(platform.id)
                                  }
                                  aria-disabled={
                                    isRequiredPlatform(
                                      platform.id,
                                      selectedPlatforms,
                                    ) || undefined
                                  }
                                  {...(platform.id === "website"
                                    ? {
                                        "aria-describedby": `website-included-${platform.label}`,
                                      }
                                    : {})}
                                  title={
                                    platform.id === "website"
                                      ? gt("Website is included in every app")
                                      : lockedPlatforms.has(platform.id)
                                        ? gt("Locked")
                                        : undefined
                                  }
                                  onClick={(event) => {
                                    if (
                                      isRequiredPlatform(
                                        platform.id,
                                        selectedPlatforms,
                                      )
                                    ) {
                                      event.preventDefault();
                                      setPlatformHelp(platform.id);
                                      return;
                                    }
                                    togglePlatform(platform.id);
                                  }}
                                >
                                  <span className="platform-symbol relative grid h-[34px] w-9 place-items-center transition-transform duration-180 group-hover/option:-translate-y-0.5 group-disabled/option:translate-y-0 motion-reduce:transition-none">
                                    {"logo" in platform ? (
                                      <img
                                        src={platform.logo}
                                        alt=""
                                        width="40"
                                        height="40"
                                        className={
                                          "color" in platform
                                            ? "brand-color size-7 object-contain"
                                            : "size-7 object-contain dark:invert"
                                        }
                                      />
                                    ) : (
                                      <svg
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.6}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="size-7"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                      >
                                        <path d={platform.path} />
                                      </svg>
                                    )}
                                    <span
                                      className="platform-check absolute -end-2 -top-[5px] grid size-[13px] place-items-center text-transparent group-aria-pressed/option:bg-[var(--accent)] group-aria-pressed/option:text-[var(--paper)] dark:group-aria-pressed/option:text-[#17191d] [&_svg]:size-2.5 [&_svg]:stroke-[1.7]"
                                      aria-hidden="true"
                                    >
                                      <svg
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1.6}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        viewBox="0 0 12 12"
                                      >
                                        <path
                                          d={
                                            selectedPlatforms.includes(
                                              platform.id,
                                            )
                                              ? "m2.5 6 2.3 2.3 4.7-4.6"
                                              : "M6 3v6M3 6h6"
                                          }
                                        />
                                      </svg>
                                    </span>
                                  </span>
                                  <span
                                    className="platform-caption min-h-[30px] text-center text-[10px] leading-[1.4] group-aria-pressed/option:text-[var(--ink)] max-[361px]:min-h-11 max-[361px]:wrap-anywhere"
                                    dir="auto"
                                  >
                                    {platform.label}
                                    {isRequiredPlatform(
                                      platform.id,
                                      selectedPlatforms,
                                    ) && (
                                      <small className="platform-included mt-0.5 block text-[10px] font-normal text-[var(--muted)]">
                                        <T>Required</T>
                                      </small>
                                    )}
                                    {platform.id === "website" && (
                                      <small
                                        className="platform-included mt-0.5 block text-[10px] font-normal text-[var(--muted)]"
                                        id={`website-included-${platform.label}`}
                                      >
                                        <T>Included</T>
                                      </small>
                                    )}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              {platformExplanation(platform.id) && (
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={8}
                                  className="max-w-56 rounded-none px-3 py-2 text-xs leading-relaxed"
                                >
                                  {platformExplanation(platform.id)}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>
              <div className="prompt-writing-area relative">
                <textarea
                  className="block h-[200px] w-full resize-none border-0 bg-transparent px-[26px] pt-6 pb-[68px] text-lg leading-[1.5] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] placeholder:opacity-85 max-[701px]:h-48 max-[701px]:px-[18px] max-[701px]:pt-5 max-[701px]:pb-[66px] max-[701px]:text-base"
                  ref={promptRef}
                  dir="auto"
                  aria-label={gt("Your app idea")}
                  aria-invalid={promptError ? true : undefined}
                  aria-describedby={promptError ? "prompt-feedback" : undefined}
                  placeholder={gt("Describe the app you want to make…")}
                  value={prompt}
                  maxLength={4000}
                  rows={6}
                  required
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setPrompt(value);
                    setPromptError("");
                    if (!value.trim()) {
                      try {
                        sessionStorage.removeItem(pendingPromptStorageKey);
                      } catch {
                        /* The visible text is still cleared. */
                      }
                    }
                  }}
                />
                <div className="composer-actions absolute end-[18px] bottom-4">
                  <button
                    className="composer-submit grid size-11 place-items-center bg-[var(--accent)] text-[var(--paper)] transition-transform duration-180 hover:-translate-y-0.5 disabled:cursor-progress disabled:opacity-65 dark:text-[#17191d] [&_svg]:size-5 rtl:[&_svg]:-scale-x-100 motion-reduce:transition-none"
                    type="submit"
                    disabled={promptPending}
                    aria-label={gt("Save prompt and platforms, then sign in")}
                    title={gt("Continue")}
                  >
                    <span className="sr-only">
                      {promptPending ? <T>Continuing…</T> : <T>Continue</T>}
                    </span>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M4 10h12m-5-5 5 5-5 5" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
            <p
              id="prompt-feedback"
              className="prompt-feedback mt-2.5 text-[13px] text-[var(--accent)] empty:hidden"
              role="status"
            >
              {promptError}
            </p>
            <div className="install mx-auto mt-6 max-w-[600px] max-[701px]:mt-5">
              <div className="install-label mb-[9px] flex items-center justify-between gap-5 text-[13px] text-[var(--muted)]">
                <span>
                  <T>Or start in your terminal</T>
                </span>
                <div
                  className="terminal-platforms flex shrink-0 gap-[3px] [&_button]:grid [&_button]:h-[30px] [&_button]:w-[34px] [&_button]:place-items-center [&_button]:bg-transparent [&_button]:opacity-85 [&_button]:transition-[background,opacity] [&_button]:duration-200 [&_button:hover]:bg-[var(--surface)] [&_button:hover]:opacity-100 [&_button[aria-pressed=true]]:bg-[var(--surface)] [&_button[aria-pressed=true]]:opacity-100 [&_img]:size-[18px] [&_img]:object-contain"
                  role="group"
                  aria-label={gt("macOS, Linux, or Windows")}
                >
                  {(
                    [
                      ["macos", "macOS", appleLogo],
                      ["linux", "Linux", linuxLogo],
                      ["windows", "Windows", windowsLogo],
                    ] as const
                  ).map(([platform, label, logo]) => (
                    <button
                      key={platform}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={installPlatform === platform}
                      onClick={() => {
                        setInstallPlatform(platform);
                        setNotice("");
                      }}
                    >
                      <img
                        src={logo}
                        alt=""
                        width="18"
                        height="18"
                        className={
                          platform !== "macos" ? "brand-color" : "dark:invert"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="copy-command flex w-full items-center justify-between gap-[14px] bg-[var(--surface)] px-4 py-5 text-left text-[var(--ink)] [direction:ltr] transition-colors duration-200 hover:bg-[var(--hover)] max-[561px]:gap-2.5 max-[561px]:px-[13px] max-[561px]:py-[15px]"
                aria-label={gt("Copy install command")}
                onClick={copyInstallCommand}
              >
                <code
                  ref={commandRef}
                  dir="ltr"
                  className="block min-w-0 font-mono text-xs leading-[1.6] whitespace-normal wrap-anywhere blur-[5px] max-[561px]:text-[10px]"
                >
                  {installCommand}
                </code>
                <span
                  className="copy-icon size-[18px] shrink-0 [&_svg]:size-[18px] max-[561px]:size-4 max-[561px]:[&_svg]:size-4"
                  aria-hidden="true"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M15 4H6a2 2 0 0 0-2 2v9" />
                  </svg>
                </span>
              </button>
            </div>
            <div
              className="technology-logos group/carousel mx-auto mt-[26px] max-w-[720px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_18px,#000_calc(100%_-_18px),transparent)] max-[701px]:mt-[22px] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none] motion-reduce:[&_[aria-hidden=true]]:hidden"
              role="group"
              aria-label={gt("Tech stack")}
            >
              <div
                className="technology-track flex w-max animate-[technology-flow_38s_linear_infinite] group-hover/carousel:[animation-play-state:paused] group-focus-within/carousel:[animation-play-state:paused] motion-reduce:animate-none"
                dir="ltr"
              >
                {[0, 1].map((copy) => (
                  <div
                    className="technology-group flex h-[42px] shrink-0 items-center gap-[30px] px-[15px] max-[561px]:h-9 max-[561px]:gap-6 max-[561px]:px-3"
                    key={copy}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {technologyStack.map((technology) => (
                      <a
                        key={technology.name}
                        className="grid h-9 w-8 shrink-0 place-items-center opacity-94 transition-opacity hover:opacity-100 focus-visible:opacity-100 max-[561px]:h-8 max-[561px]:w-7"
                        href={technology.href}
                        target="_blank"
                        rel="noopener"
                        title={
                          technology.planned
                            ? `${technology.name} · ${gt("Planned")}`
                            : technology.name
                        }
                        aria-label={
                          technology.planned
                            ? `${technology.name} · ${gt("Planned")}`
                            : technology.name
                        }
                        tabIndex={copy === 1 ? -1 : undefined}
                      >
                        <img
                          src={technology.logo}
                          alt={technology.name}
                          width="32"
                          height="32"
                          className={`stack-symbol object-contain ${technology.darkLogo ? "brand-on-light dark:hidden" : technology.monochrome ? "monochrome-logo dark:invert" : ""} ${technology.spaced ? "stack-spaced size-[42px] max-w-none max-[561px]:size-9" : "size-7 max-[561px]:size-[25px]"}`}
                        />
                        {technology.darkLogo && (
                          <img
                            src={technology.darkLogo}
                            alt={technology.name}
                            width="32"
                            height="32"
                            className="stack-symbol brand-on-dark hidden size-7 object-contain dark:block max-[561px]:size-[25px]"
                          />
                        )}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section
          className="foundation wrap border-t-0 pt-[38px] pb-[54px] max-[561px]:pt-10 max-[561px]:pb-[35px] px-5 sm:px-8 xl:px-10"
          aria-labelledby="foundation-title"
        >
          <div className="foundation-heading mb-6 flex flex-col items-start gap-[18px] min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between min-[701px]:gap-6 min-[701px]:mb-[29px]">
            <h2
              id="foundation-title"
              className="m-0 text-[length:var(--section-size)] font-medium leading-[1.08] tracking-[-0.05em]"
            >
              <T>Ready for real users.</T>
            </h2>
            <div
              className="audience-tabs flex w-full shrink-0 gap-1 border border-[var(--line)] p-1 min-[701px]:w-auto"
              role="tablist"
              aria-label={gt("App type")}
            >
              {(["personal", "business"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  id={`audience-${mode}`}
                  aria-selected={audience === mode}
                  aria-controls="audience-features"
                  tabIndex={audience === mode ? 0 : -1}
                  className="min-h-10 flex-1 px-5 py-2 text-sm text-[var(--muted)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--paper)] min-[701px]:min-h-[38px] min-[701px]:flex-none"
                  onClick={() => selectAudience(mode)}
                  onKeyDown={(event) => {
                    let next: Audience;
                    if (event.key === "Home") next = "personal";
                    else if (event.key === "End") next = "business";
                    else if (
                      event.key === "ArrowRight" ||
                      event.key === "ArrowLeft"
                    )
                      next = mode === "personal" ? "business" : "personal";
                    else return;
                    event.preventDefault();
                    selectAudience(next);
                    document.getElementById(`audience-${next}`)?.focus();
                  }}
                >
                  {mode === "personal" ? <T>Personal</T> : <T>Business</T>}
                </button>
              ))}
            </div>
          </div>

          <div
            className="feature-explorer grid gap-[14px] min-[801px]:grid-cols-[1.3fr_1fr] min-[801px]:max-[1101px]:grid-cols-[1.25fr_1fr] min-[801px]:gap-4 min-[1101px]:gap-6"
            id="audience-features"
            role="tabpanel"
            aria-labelledby={`audience-${audience}`}
            data-audience={audience}
            style={{ "--feature-accent": detail.tone } as CSSProperties}
          >
            <div
              className={`feature-choices grid grid-cols-3 auto-rows-[108px] content-start gap-[7px] min-[561px]:auto-rows-[110px] min-[561px]:gap-[10px] ${audience === "personal" ? "min-[801px]:grid-cols-3" : "max-[561px]:grid-cols-6 min-[801px]:grid-cols-4"}`}
              data-count={visibleFeatures.length}
              role="group"
              aria-label={gt("Features")}
            >
              {visibleFeatures.map(({ feature, index }, visibleIndex) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`feature-choice flex h-[108px] min-w-0 flex-col items-center justify-start gap-[9px] border border-[var(--line)] bg-[var(--paper)] p-[14px_7px] text-center text-[var(--ink)] transition-[background,border-color,box-shadow] hover:bg-[var(--surface)] aria-pressed:border-[color-mix(in_srgb,var(--feature-accent)_70%,var(--line))] aria-pressed:bg-[color-mix(in_srgb,var(--feature-accent)_8%,var(--paper))] aria-pressed:shadow-[inset_3px_0_var(--feature-accent)] rtl:aria-pressed:shadow-[inset_-3px_0_var(--feature-accent)] min-[561px]:h-[110px] min-[561px]:gap-[10px] min-[561px]:p-[15px_12px] min-[801px]:max-[1101px]:p-[14px_9px] min-[801px]:items-start min-[801px]:text-start ${audience === "business" ? "max-[561px]:col-span-2" : ""} ${audience === "business" && visibleIndex === 18 ? "max-[561px]:col-start-2" : ""} ${audience === "business" && visibleIndex === 19 ? "max-[561px]:col-start-4" : ""}`}
                  aria-label={feature.label}
                  title={feature.label}
                  aria-pressed={activeFeature === index}
                  aria-controls="feature-detail"
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "touch") {
                      clearFeatureHover();
                      featureHoverTimer.current = setTimeout(
                        () => setActiveFeature(index),
                        160,
                      );
                    }
                  }}
                  onPointerLeave={clearFeatureHover}
                  onFocus={() => selectFeature(index)}
                  onClick={() => selectFeature(index)}
                >
                  <span className="feature-mark grid h-[34px] w-9 shrink-0 place-items-center">
                    <img
                      src={feature.logo}
                      alt=""
                      width="32"
                      height="32"
                      className={featureLogoClass(feature, "tile")}
                    />
                    {feature.darkLogo && (
                      <img
                        src={feature.darkLogo}
                        alt=""
                        width="32"
                        height="32"
                        className="brand-on-dark hidden size-8 object-contain dark:block"
                      />
                    )}
                  </span>
                  <span className="h-[38px] text-xs leading-[1.25] font-medium min-[561px]:h-10 min-[561px]:text-sm min-[801px]:max-[1101px]:text-xs max-[361px]:text-[11px]">
                    {feature.label}
                    {feature.planned && (
                      <small className="feature-status mt-0.5 block text-[9px] font-normal text-[var(--muted)] min-[561px]:mt-[3px] min-[561px]:text-[10px]">
                        <T>Planned</T>
                      </small>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div
              id="feature-detail"
              className={`feature-detail-panel flex h-[420px] min-w-0 flex-col border border-[var(--line)] bg-[var(--paper)] p-[22px] min-[561px]:h-[400px] min-[561px]:max-[801px]:p-6 min-[801px]:p-7 ${audience === "personal" ? "min-[801px]:h-[470px]" : "min-[801px]:h-[590px]"}`}
              aria-label={gt("Feature details")}
            >
              <div
                className="feature-detail-content flex min-h-0 w-full flex-1 flex-col"
                key={detail.id}
                aria-live="polite"
                aria-atomic="true"
              >
                <span
                  className={`feature-detail-brand mb-[14px] flex min-h-11 shrink-0 items-center gap-3 min-[561px]:mb-[25px] min-[561px]:min-h-12 ${audience === "personal" ? "min-[801px]:mb-[18px]" : ""}`}
                >
                  <img
                    src={detail.logo}
                    alt={detail.provider}
                    width="44"
                    height="44"
                    className={featureLogoClass(detail, "detail")}
                  />
                  {detail.darkLogo && (
                    <img
                      src={detail.darkLogo}
                      alt={detail.provider}
                      width="44"
                      height="44"
                      className="brand-on-dark hidden size-11 object-contain dark:block"
                    />
                  )}
                  <span className="text-[13px] leading-[1.5] text-[var(--muted)] max-[561px]:text-xs">
                    {detail.provider}
                  </span>
                  {detail.planned && (
                    <small className="ms-auto border border-[var(--line)] px-[7px] py-[3px] text-[11px] text-[var(--muted)]">
                      <T>Planned</T>
                    </small>
                  )}
                </span>
                <h3
                  className={`min-h-[68px] text-[30px] leading-[1.12] font-medium tracking-[-0.04em] min-[561px]:min-h-0 min-[801px]:text-[34px] ${audience === "personal" ? "min-[801px]:min-h-0" : "min-[801px]:min-h-[78px]"}`}
                >
                  {detail.label}
                </h3>
                <p
                  className={`mt-[9px] min-h-[68px] max-w-[36ch] text-[15px] leading-[1.55] text-[var(--muted)] min-[561px]:min-h-[48px] min-[561px]:mt-[13px] min-[561px]:text-base ${audience === "personal" ? "min-[801px]:min-h-[48px]" : "min-[801px]:min-h-[75px]"}`}
                >
                  {detail.description}
                </p>
                <FeatureVisual id={detail.id} audience={audience} />
                <a
                  className="feature-docs mt-auto inline-flex self-start items-center gap-2 pt-5 pb-1 text-sm leading-[normal] font-medium text-[var(--ink)] hover:underline [text-underline-offset:4px]"
                  aria-label={`${gt("Learn more")}: ${detail.label}`}
                  href={detail.docs}
                  target="_blank"
                  rel="noopener"
                >
                  <T>Learn more</T>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className="size-[17px] text-[var(--feature-accent)]"
                  >
                    <path d="M5 15 15 5M5 5h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          className="process wrap pt-5 pb-10 max-[801px]:pt-[19px] max-[801px]:pb-8 max-[561px]:pt-[25px] max-[561px]:pb-7 px-5 sm:px-8 xl:px-10"
          aria-labelledby="process-title"
        >
          <div className="section-title relative mb-7 flex items-center justify-between gap-[25px] max-[561px]:mb-6 max-[561px]:block">
            <h2
              id="process-title"
              className="text-[length:var(--section-size)] font-medium leading-[1.08] tracking-[-0.05em] max-[561px]:pe-[30px] max-[561px]:text-[35px] max-[561px]:[&:lang(ja)]:text-[30px]"
            >
              <T>Draft. Preview. Publish.</T>
            </h2>
            <button
              type="button"
              className="flow-toggle flex min-h-[34px] items-center gap-1.5 bg-[var(--surface)] px-3 py-[9px] text-[11px] text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--hover)] hover:text-[var(--ink)] motion-reduce:hidden max-[561px]:absolute max-[561px]:top-0 max-[561px]:end-0 max-[561px]:p-[9px]"
              aria-label={paused ? gt("Play animation") : gt("Pause animation")}
              onClick={() => setPaused((previous) => !previous)}
            >
              <svg
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[14px]"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d={paused ? "m7 5 7 5-7 5Z" : "M7 5v10m6-10v10"} />
              </svg>
              <span className="max-[561px]:hidden">
                {paused ? <T>Play</T> : <T>Pause</T>}
              </span>
            </button>
          </div>
          <div
            ref={journeyRef}
            className={`journey phase-${phases[phase]}${paused ? " flow-paused" : ""}`}
            data-ui
            aria-label={gt(
              "Animated illustration showing draft, preview, and publish",
            )}
          >
            <div
              className="flow-rail relative mx-[9px] mb-[29px] h-[3px] overflow-hidden bg-[var(--track)] max-[561px]:mx-0 max-[561px]:mb-[26px]"
              aria-hidden="true"
            >
              <span
                className={`flow-dot block h-[3px] w-1/3 bg-[var(--accent)] transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.65,0.3,1)] motion-reduce:!w-full motion-reduce:!translate-x-0 motion-reduce:transition-none ${
                  phase === 1
                    ? "translate-x-full rtl:-translate-x-full"
                    : phase === 2
                      ? "translate-x-[200%] rtl:-translate-x-[200%]"
                      : "translate-x-0"
                }`}
              />
            </div>
            <div className="journey-columns grid grid-cols-3 gap-[22px] max-[801px]:gap-3.5 max-[561px]:flex max-[561px]:flex-col max-[561px]:gap-[26px]">
              <article
                className="journey-step active relative min-w-0 max-[561px]:flex max-[561px]:flex-col max-[561px]:gap-[9px]"
                data-stage="draft"
              >
                <h3
                  className={`text-[27px] font-medium tracking-[-0.8px] transition-colors duration-[400ms] motion-reduce:transition-none max-[801px]:text-[24px] max-[561px]:pt-0 max-[561px]:self-start max-[561px]:text-[22px] ${phase === 0 ? "text-[var(--accent)]" : ""}`}
                >
                  <T>Draft</T>
                </h3>
                <p className="mt-2.5 text-sm leading-[1.6] text-[var(--muted)] max-[801px]:text-[13px] max-[561px]:mt-0 max-[561px]:mb-2 max-[561px]:max-w-[160px] max-[561px]:text-[13px] max-[561px]:leading-[1.5]">
                  <T>Say what you want to make.</T>
                </p>
                <div className="draft-paper relative mt-[23px] flex h-[205px] w-full flex-col gap-[17px] overflow-hidden bg-[var(--surface)] p-[25px] max-[801px]:mt-[14px] max-[801px]:h-[190px] max-[801px]:gap-3.5 max-[801px]:p-[18px] max-[561px]:mt-0 max-[561px]:h-[178px] max-[561px]:gap-3.5 max-[561px]:p-[19px]">
                  <img
                    className="brand-on-light -ms-[7px] block size-8 dark:hidden"
                    src={lightBrandLogo}
                    alt=""
                    width="38"
                    height="38"
                  />
                  <img
                    className="brand-on-dark -ms-[7px] hidden size-8 dark:block"
                    src={darkBrandLogo}
                    alt=""
                    width="38"
                    height="38"
                  />
                  <span
                    className={`draft-words text-[23px] leading-[1.4] tracking-[-0.5px] max-[801px]:text-xl max-[561px]:text-[19px] ${phase === 0 ? "animate-[disposabl-idea-in_0.7s_both] motion-reduce:animate-none" : ""} ${paused ? "[animation-play-state:paused]" : ""}`}
                  >
                    <T>
                      Make a notes app
                      <br />
                      for all my devices.
                    </T>
                    {phase === 0 && (
                      <span
                        className={`draft-caret ms-1 inline-block h-[19px] w-0.5 bg-[var(--accent)] align-[-2px] motion-reduce:hidden ${paused ? "animate-[disposabl-blink_1.1s_steps(2)_infinite] [animation-play-state:paused]" : "animate-[disposabl-blink_1.1s_steps(2)_infinite]"}`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </div>
              </article>
              <article
                className="journey-step relative min-w-0 max-[561px]:flex max-[561px]:flex-col max-[561px]:gap-[9px]"
                data-stage="preview"
              >
                <h3
                  className={`text-[27px] font-medium tracking-[-0.8px] transition-colors duration-[400ms] motion-reduce:transition-none max-[801px]:text-[24px] max-[561px]:pt-0 max-[561px]:self-start max-[561px]:text-[22px] ${phase === 1 ? "text-[var(--accent)]" : ""}`}
                >
                  <T>Preview</T>
                </h3>
                <p className="mt-2.5 text-sm leading-[1.6] text-[var(--muted)] max-[801px]:text-[13px] max-[561px]:mt-0 max-[561px]:mb-2 max-[561px]:max-w-[160px] max-[561px]:text-[13px] max-[561px]:leading-[1.5]">
                  <T>Open it. Try it. Make it yours.</T>
                </p>
                <div className="preview-paper relative mt-[23px] flex h-[205px] w-full items-center justify-center gap-[21px] overflow-hidden bg-[var(--surface)] p-4 max-[801px]:mt-[14px] max-[801px]:h-[190px] max-[801px]:gap-3 max-[801px]:p-2.5 max-[561px]:mt-0 max-[561px]:h-[178px]">
                  <div
                    className={`mini-app flex w-[158px] flex-col gap-[9px] bg-[var(--mini-paper)] p-[15px] text-[10px] text-[var(--mini-ink)] transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.65,0.3,1)] motion-reduce:!rotate-0 motion-reduce:!scale-100 motion-reduce:transition-none max-[801px]:w-[125px] max-[801px]:gap-[7px] max-[801px]:p-[11px] max-[801px]:text-[8px] max-[561px]:w-[130px] ${phase === 1 ? "rotate-0 scale-[1.04]" : "-rotate-[4deg]"}`}
                  >
                    <span
                      className="mini-mark mb-0.5 block h-[15px] w-[11px] rotate-[-8deg] bg-[var(--accent-fill)]"
                      aria-hidden="true"
                    />
                    <strong className="mb-[5px] text-[15px] font-normal tracking-[-0.4px] max-[801px]:text-[12px]">
                      Fieldnotes
                    </strong>
                    <span className="bg-[var(--mini-row)] px-[5px] py-[7px] max-[801px]:px-1">
                      <T>A slower morning</T>
                    </span>
                    <span className="bg-[var(--mini-row)] px-[5px] py-[7px] max-[801px]:px-1">
                      <T>Things to make</T>
                    </span>
                    <span className="bg-[var(--mini-row)] px-[5px] py-[7px] max-[801px]:px-1">
                      <T>For the weekend</T>
                    </span>
                  </div>
                  <div className="preview-icons flex flex-col gap-[18px] max-[801px]:gap-3.5">
                    {[
                      { src: appleLogo, alt: "Apple", color: false },
                      { src: androidLogo, alt: "Android", color: true },
                      { src: chromeLogo, alt: "Web", color: true },
                    ].map((icon, index) => (
                      <img
                        key={icon.alt}
                        className={`${icon.color ? "brand-color" : "[filter:var(--logo-filter)]"} size-[19px] object-contain max-[801px]:size-[15px] ${phase === 1 ? "animate-[disposabl-platform-in_0.5s_both] motion-reduce:animate-none" : ""} ${index === 1 ? "[animation-delay:0.1s]" : index === 2 ? "[animation-delay:0.2s]" : ""} ${paused ? "[animation-play-state:paused]" : ""}`}
                        src={icon.src}
                        alt={icon.alt}
                        width="20"
                        height="20"
                      />
                    ))}
                  </div>
                </div>
              </article>
              <article
                className="journey-step relative min-w-0 max-[561px]:flex max-[561px]:flex-col max-[561px]:gap-[9px]"
                data-stage="live"
              >
                <h3
                  className={`text-[27px] font-medium tracking-[-0.8px] transition-colors duration-[400ms] motion-reduce:transition-none max-[801px]:text-[24px] max-[561px]:pt-0 max-[561px]:self-start max-[561px]:text-[22px] ${phase === 2 ? "text-[var(--accent)]" : ""}`}
                >
                  <T>Publish</T>
                </h3>
                <p className="mt-2.5 text-sm leading-[1.6] text-[var(--muted)] max-[801px]:text-[13px] max-[561px]:mt-0 max-[561px]:mb-2 max-[561px]:max-w-[160px] max-[561px]:text-[13px] max-[561px]:leading-[1.5]">
                  <T>One click. Out in the world.</T>
                </p>
                <div
                  className={`publish-paper relative mt-[23px] flex h-[205px] w-full flex-col items-center justify-center gap-3 overflow-hidden transition-[background,color] duration-500 motion-reduce:!bg-[var(--surface)] motion-reduce:!text-[var(--ink)] motion-reduce:transition-none max-[801px]:mt-[14px] max-[801px]:h-[190px] max-[561px]:mt-0 max-[561px]:h-[178px] ${phase === 2 ? "bg-[var(--accent-fill)] text-[var(--accent-ink)]" : "bg-[var(--surface)] text-[var(--ink)]"}`}
                >
                  <div
                    className={`publish-symbol mb-[3px] grid size-[51px] place-items-center bg-[var(--accent-fill)] text-[var(--accent-ink)] transition-[background,color] duration-500 motion-reduce:transition-none max-[801px]:size-[43px] max-[561px]:size-11 ${phase === 2 ? "bg-[var(--accent-ink)] text-[var(--accent-fill)]" : "bg-[var(--accent-fill)] text-[var(--accent-ink)]"}`}
                    aria-hidden="true"
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-[30px] stroke-[1.8]"
                      viewBox="0 0 48 48"
                    >
                      <path
                        className={
                          phase === 2
                            ? `[stroke-dasharray:43] [stroke-dashoffset:43] animate-[disposabl-draw-check_0.6s_0.2s_forwards] motion-reduce:[stroke-dashoffset:0] motion-reduce:animate-none ${paused ? "[animation-play-state:paused]" : ""}`
                            : ""
                        }
                        d="m12 24 8 8 16-17"
                      />
                    </svg>
                  </div>
                  <strong className="text-[17px] font-medium max-[801px]:text-[15px]">
                    {phase === 2 ? (
                      <T>Your app is live.</T>
                    ) : (
                      <T>Ready for the world.</T>
                    )}
                  </strong>
                  <span
                    className={`text-xs motion-reduce:!text-[var(--muted)] max-[801px]:text-[9px] ${phase === 2 ? "text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}
                  >
                    <T>Publish your approved preview.</T>
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="downloads wrap bg-[var(--paper)] pt-9 pb-[38px] text-[var(--paper-ink)] max-[801px]:pt-[26px] max-[801px]:pb-7 max-[561px]:pt-7 max-[561px]:pb-[30px] px-5 sm:px-8 xl:px-10"
          aria-labelledby="download-title"
        >
          <h2
            id="download-title"
            className="text-[length:var(--section-size)] font-medium leading-[1.08] tracking-[-0.05em] max-[801px]:text-4xl max-[561px]:text-[35px] max-[561px]:[&:lang(ja)]:text-[30px]"
          >
            <T>Get Disposabl.</T>
          </h2>
          <div className="download-options mt-[25px] flex items-center justify-between gap-[17px] max-[1100px]:gap-3 max-[801px]:mt-5 max-[801px]:grid max-[801px]:grid-cols-6 max-[801px]:gap-x-3.5 max-[801px]:gap-y-4 max-[561px]:gap-x-2 max-[561px]:gap-y-[15px]">
            <a
              className="store-badge block min-w-0 flex-[0_1_163px] max-[1100px]:basis-[150px] max-[801px]:col-span-3 max-[801px]:w-[164px] max-[801px]:justify-self-start max-[561px]:w-[142px] max-[361px]:w-full"
              href="https://example.com/disposabl/app-store"
              target="_blank"
              rel="noopener"
              aria-label={gt("Download Disposabl on the App Store")}
            >
              <img
                className="h-auto w-full"
                src={appStoreBadge}
                alt={gt("Download Disposabl on the App Store")}
                width="162"
                height="54"
              />
            </a>
            <a
              className="store-badge google-badge -mx-2.5 block min-w-0 flex-[0_1_181px] max-[1100px]:basis-[167px] max-[801px]:col-span-3 max-[801px]:w-[187px] max-[801px]:justify-self-end max-[801px]:-mx-3 max-[561px]:w-[166px] max-[561px]:-mx-2.5 max-[361px]:mx-0 max-[361px]:w-full"
              href="https://example.com/disposabl/google-play"
              target="_blank"
              rel="noopener"
              aria-label={gt("Get Disposabl on Google Play")}
            >
              <img
                className="h-auto w-full"
                src={googlePlayBadge}
                alt={gt("Get Disposabl on Google Play")}
                width="192"
                height="74"
              />
            </a>
            {[
              {
                href: "https://example.com/disposabl/download/macos",
                label: gt("Download Disposabl for macOS"),
                logo: appleLogo,
                name: "macOS",
                color: false,
              },
              {
                href: "https://example.com/disposabl/download/windows",
                label: gt("Download Disposabl for Windows"),
                logo: windowsLogo,
                name: "Windows",
                color: true,
              },
              {
                href: "https://example.com/disposabl/download/linux",
                label: gt("Download Disposabl for Linux"),
                logo: linuxLogo,
                name: "Linux",
                color: true,
              },
            ].map((download) => (
              <a
                key={download.name}
                className="desktop-download flex min-h-[54px] min-w-0 flex-1 items-center gap-3 bg-[var(--paper-inset)] px-3.5 py-2.5 transition-colors duration-200 hover:bg-[var(--hover)] max-[1100px]:gap-[9px] max-[1100px]:px-2.5 max-[1100px]:py-[9px] max-[801px]:col-span-2 max-[801px]:min-h-[56px] max-[561px]:min-h-[104px] max-[561px]:flex-col max-[561px]:items-start max-[561px]:gap-[9px] max-[561px]:px-[11px] max-[561px]:py-[13px]"
                aria-label={download.label}
                href={download.href}
                target="_blank"
                rel="noopener"
              >
                <img
                  className={`${download.color ? "brand-color" : "[filter:var(--logo-filter)]"} size-[25px] shrink-0 object-contain max-[1100px]:size-[22px] max-[561px]:size-6`}
                  src={download.logo}
                  alt=""
                  width="26"
                  height="26"
                />
                <span className="whitespace-nowrap text-[11px] leading-[1.3] text-[var(--paper-muted)] max-[561px]:text-[8px]">
                  <T>Download for</T>
                  <strong className="mt-0.5 block text-[17px] font-medium tracking-[-0.3px] text-[var(--paper-ink)] max-[1100px]:text-[13px] max-[801px]:text-sm max-[561px]:text-[13px]">
                    {download.name}
                  </strong>
                </span>
                <svg
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ms-auto size-3.5 shrink-0 max-[1100px]:w-3 max-[561px]:hidden"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10 3v10m-4-4 4 4 4-4M4 17h12" />
                </svg>
              </a>
            ))}
          </div>
        </section>
        <footer className="wrap flex justify-between gap-[25px] py-[25px] text-xs leading-[normal] whitespace-nowrap text-[var(--muted)] max-[561px]:gap-2.5 max-[561px]:py-[23px] px-5 sm:px-8 xl:px-10">
          <span className="footer-name font-medium text-[var(--ink)]">
            Disposabl
          </span>
          <a
            className="transition-colors duration-200 hover:text-[var(--accent)]"
            href="#top"
          >
            <T>Back to top ↑</T>
          </a>
        </footer>
      </div>
      <div
        className={`landing-notice fixed bottom-[25px] left-1/2 z-10 -translate-x-1/2 bg-[var(--ink)] px-6 py-[13px] text-sm text-[var(--bg)] pointer-events-none transition-[opacity,transform] duration-200 max-[561px]:w-max max-[561px]:max-w-[90%] max-[561px]:text-xs ${notice ? "show translate-y-0 opacity-100" : "translate-y-[10px] opacity-0"}`}
        role="status"
      >
        {notice}
      </div>
    </main>
  );
}

function FeatureVisual({ id, audience }: { id: string; audience: Audience }) {
  const scenes: Record<string, ReactNode> = {
    authentication: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="M85 52h56m78 0h56"
        />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="24"
          y="19"
          width="61"
          height="65"
          rx="10"
        />
        <circle cx="54" cy="42" r="9" />
        <path d="M38 69c0-14 32-14 32 0" />
        <path
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          d="m180 12 33 13v25c0 22-33 42-33 42s-33-20-33-42V25z"
        />
        <path d="m166 49 10 10 20-22" />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="275"
          y="19"
          width="61"
          height="65"
          rx="10"
        />
        <path d="M288 35h35m-35 14h26m-26 14h18" />
      </g>
    ),
    database: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="M99 51h67m28 0h67"
        />
        <path
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          d="M35 27v49c0 15 64 15 64 0V27"
        />
        <ellipse cx="67" cy="27" rx="32" ry="11" />
        <path d="M35 49c0 15 64 15 64 0m-64 24c0 15 64 15 64 0" />
        <circle
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          cx="180"
          cy="51"
          r="18"
        />
        <path d="m172 51 6 6 11-12" />
        <path
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          d="M261 27v49c0 15 64 15 64 0V27"
        />
        <ellipse cx="293" cy="27" rx="32" ry="11" />
        <path d="M261 49c0 15 64 15 64 0m-64 24c0 15 64 15 64 0" />
      </g>
    ),
    storage: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="47"
          y="17"
          width="60"
          height="73"
          rx="8"
          transform="rotate(-7 77 53)"
        />
        <path d="M61 39h31M61 51h22" />
        <path className="visual-line stroke-[var(--line)]" d="M112 52h133" />
        <path
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          d="M253 35h29l9 10h46v40h-84z"
        />
        <path d="M295 72V52m-8 8 8-8 8 8" />
        <circle
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          cx="180"
          cy="52"
          r="20"
        />
        <path d="M180 62V42m-8 8 8-8 8 8" />
      </g>
    ),
    content: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="51"
          y="14"
          width="78"
          height="77"
          rx="6"
          transform="rotate(-5 90 52)"
        />
        <path d="M68 32h43M68 47h35M68 62h43M68 76h26" />
        <path
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          d="M207 23c-18-9-37-9-55-5v67c18-4 37-4 55 5 18-9 37-9 55-5V18c-18-4-37-4-55 5z"
        />
        <path d="M207 23v67m-40-53 24 4m-24 12 24 4m32-16 24-4m-24 20 24-4" />
      </g>
    ),
    languages: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="42"
          y="17"
          width="70"
          height="70"
          rx="12"
          transform="rotate(-7 77 52)"
        />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="145"
          y="17"
          width="70"
          height="70"
          rx="12"
        />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="248"
          y="17"
          width="70"
          height="70"
          rx="12"
          transform="rotate(7 283 52)"
        />
        <text
          className="fill-[var(--ink)] stroke-none [font-family:var(--font)] text-[30px]"
          x="77"
          y="64"
          textAnchor="middle"
        >
          A
        </text>
        <text
          className="fill-[var(--ink)] stroke-none [font-family:var(--font)] text-[30px]"
          x="180"
          y="64"
          textAnchor="middle"
        >
          あ
        </text>
        <text
          className="fill-[var(--ink)] stroke-none [font-family:var(--font)] text-[30px]"
          x="283"
          y="62"
          textAnchor="middle"
        >
          ع
        </text>
      </g>
    ),
    tracing: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="M42 22v59m0-39h40m0 0v39m0-18h45"
        />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="42"
          y="11"
          width="270"
          height="17"
          rx="5"
        />
        <rect x="82" y="34" width="178" height="17" rx="5" />
        <rect x="127" y="57" width="139" height="17" rx="5" />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="127"
          y="80"
          width="191"
          height="13"
          rx="4"
        />
      </g>
    ),
    replay: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="47"
          y="10"
          width="266"
          height="83"
          rx="9"
        />
        <path className="visual-line stroke-[var(--line)]" d="M47 27h266" />
        <circle cx="58" cy="19" r="1" />
        <circle cx="65" cy="19" r="1" />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="62"
          y="39"
          width="52"
          height="36"
          rx="4"
        />
        <path
          className="visual-line stroke-[var(--line)]"
          d="M128 42h115m-115 12h90"
        />
        <circle
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          cx="183"
          cy="64"
          r="18"
        />
        <path d="m178 56 13 8-13 8z" />
        <path className="visual-line stroke-[var(--line)]" d="M63 83h232" />
        <path d="M63 83h136" />
      </g>
    ),
    flags: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="M75 27h85m-85 26h124m-124 26h64"
        />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="230"
          y="15"
          width="55"
          height="23"
          rx="11.5"
        />
        <circle
          className="visual-dot fill-[var(--feature-accent)] stroke-none"
          cx="273"
          cy="26.5"
          r="7"
        />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="230"
          y="41"
          width="55"
          height="23"
          rx="11.5"
        />
        <circle cx="242" cy="52.5" r="7" />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="230"
          y="67"
          width="55"
          height="23"
          rx="11.5"
        />
        <circle
          className="visual-dot fill-[var(--feature-accent)] stroke-none"
          cx="273"
          cy="78.5"
          r="7"
        />
      </g>
    ),
    crashes: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="M37 86h289M48 20v66"
        />
        <path d="m48 70 42-9 34 5 31-17 25 5 20-39 27 52 32-13 49 10" />
        <circle
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          cx="200"
          cy="15"
          r="9"
        />
        <path d="M200 10v6m0 4h.01" />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="259"
          y="22"
          width="59"
          height="22"
          rx="6"
        />
        <path d="M270 33h36" />
      </g>
    ),
    analytics: (
      <g>
        <path className="visual-line stroke-[var(--line)]" d="M44 87h276" />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="64"
          y="58"
          width="32"
          height="29"
          rx="5"
        />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="129"
          y="39"
          width="32"
          height="48"
          rx="5"
        />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="194"
          y="49"
          width="32"
          height="38"
          rx="5"
        />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="259"
          y="17"
          width="32"
          height="70"
          rx="5"
        />
        <path d="m80 39 65-17 65 11 65-26" />
      </g>
    ),
    email: (
      <g>
        <path className="visual-line stroke-[var(--line)]" d="M60 53h235" />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="115"
          y="23"
          width="130"
          height="65"
          rx="8"
        />
        <path d="m117 27 63 39 63-39" />
        <path
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          d="m278 15 47 15-47 17 7-17z"
        />
      </g>
    ),
    notifications: (
      <g>
        <path
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          d="M141 58V39c0-44 78-44 78 0v19l12 13H129z"
        />
        <path d="M169 83c0 13 22 13 22 0m-64-43c0-15 5-27 15-36m90 36c0-15-5-27-15-36" />
        <circle
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          cx="231"
          cy="22"
          r="12"
        />
      </g>
    ),
    billing: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="59"
          y="14"
          width="139"
          height="74"
          rx="9"
          transform="rotate(-5 128 51)"
        />
        <path d="M59 36h139" />
        <rect
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          x="167"
          y="28"
          width="139"
          height="65"
          rx="9"
        />
        <path d="M181 45h110m-110 30h32" />
        <circle
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          cx="274"
          cy="62"
          r="22"
        />
        <path d="m264 62 7 7 13-15" />
      </g>
    ),
    updates: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="39"
          y="22"
          width="73"
          height="62"
          rx="8"
        />
        <path d="M52 38h47m-47 15h29" />
        <path className="visual-line stroke-[var(--line)]" d="M112 53h136" />
        <circle
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          cx="180"
          cy="53"
          r="24"
        />
        <path d="M180 39v28m-10-10 10 10 10-10" />
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="248"
          y="22"
          width="73"
          height="62"
          rx="8"
        />
        <path d="m269 53 9 9 17-20" />
      </g>
    ),
    teams: (
      <g>
        <path className="visual-line stroke-[var(--line)]" d="M82 51h196" />
        {[82, 180, 278].map((x) => (
          <g key={x}>
            <circle
              className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
              cx={x}
              cy="51"
              r="31"
            />
            <circle cx={x} cy="42" r="8" />
            <path d={`M${x - 15} 66c0-16 30-16 30 0`} />
          </g>
        ))}
      </g>
    ),
    interfaces: (
      <g>
        <rect
          className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
          x="36"
          y="18"
          width="288"
          height="70"
          rx="9"
        />
        <path d="m64 43 13 10-13 10m24 0h18m39-22-13 12 13 12m22-24 13 12-13 12m-7-33-10 42m68-31 18 18 29-29" />
      </g>
    ),
    domains: (
      <g>
        <circle
          className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
          cx="180"
          cy="52"
          r="39"
        />
        <ellipse cx="180" cy="52" rx="17" ry="39" />
        <path d="M142 52h76m-72-18h68m-68 36h68" />
        <path
          className="visual-line stroke-[var(--line)]"
          d="M45 52h85m100 0h85"
        />
        <circle cx="45" cy="52" r="6" />
        <circle cx="315" cy="52" r="6" />
      </g>
    ),
    sandboxes: (
      <g>
        {[46, 139, 232].map((x) => (
          <g key={x}>
            <rect
              className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
              x={x}
              y="19"
              width="82"
              height="67"
              rx="8"
            />
            <path
              className="visual-line stroke-[var(--line)]"
              d={`M${x} 35h82`}
            />
            <path d={`m${x + 20} 49 10 10-10 10m19 0h22`} />
          </g>
        ))}
      </g>
    ),
    sharing: (
      <g>
        <path
          className="visual-line stroke-[var(--line)]"
          d="m103 52 140-27M103 52l140 27"
        />
        {[
          [78, 52],
          [275, 22],
          [275, 82],
        ].map(([x, y]) => (
          <circle
            key={y}
            className="visual-fill fill-[color-mix(in_srgb,var(--feature-accent)_13%,var(--paper))] stroke-[var(--feature-accent)]"
            cx={x}
            cy={y}
            r="18"
          />
        ))}
        <path d="M67 52h22m-11-11v22" />
      </g>
    ),
    ci: (
      <g>
        <path className="visual-line stroke-[var(--line)]" d="M74 52h212" />
        {[74, 180, 286].map((x) => (
          <g key={x}>
            <circle
              className="visual-paper fill-[var(--paper)] stroke-[var(--line)]"
              cx={x}
              cy="52"
              r="23"
            />
            <path d={`m${x - 10} 52 7 7 13-15`} />
          </g>
        ))}
      </g>
    ),
  };
  return (
    <svg
      className={`feature-visual pointer-events-none my-auto h-[85px] w-full shrink-0 text-[var(--feature-accent)] min-[561px]:h-[104px] ${audience === "personal" ? "min-[801px]:h-[104px]" : "min-[801px]:h-[154px]"}`}
      viewBox="0 0 360 104"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {scenes[id] ?? scenes.database}
    </svg>
  );
}
