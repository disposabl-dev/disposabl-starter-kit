import logoOnLight from "../assets/logo-dark.svg?url";
import logoOnDark from "../assets/logo-light.svg?url";

export const Logo = () => (
  <span className="flex items-center gap-2">
    <img
      src={logoOnLight}
      alt=""
      width={32}
      height={32}
      className="size-8 shrink-0 dark:hidden"
    />
    <img
      src={logoOnDark}
      alt=""
      width={32}
      height={32}
      className="hidden size-8 shrink-0 dark:block"
    />
    <span>Disposabl</span>
  </span>
);
