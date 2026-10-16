import { cn } from "cn";
import { Loader2Icon } from "lucide-react";
import { useGT } from "gt-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const gt = useGT();
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label={gt("Loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
