import { useTheme } from "next-themes";
import darkLogo from "../assets/logo-dark.svg?url";
import lightLogo from "../assets/logo-light.svg?url";

export const Logo = () => {
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === "dark" ? darkLogo : lightLogo;
  return (
    <span className="flex items-center gap-2">
      <img
        src={logo}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
      />
      <span>Disposabl</span>
    </span>
  );
};
