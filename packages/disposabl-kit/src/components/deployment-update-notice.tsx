import { useDeploymentUpdates } from "@convex-dev/static-hosting/react";
import { RefreshCwIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";

export function DeploymentUpdateNotice({
  query,
}: {
  query: NonNullable<Parameters<typeof useDeploymentUpdates>[0]>;
}) {
  const { updateAvailable, reload, dismiss } = useDeploymentUpdates(query);
  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="Deployment update"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg sm:left-auto sm:w-[26rem]"
    >
      <div
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex"
      >
        <RefreshCwIcon className="size-4" />
      </div>
      <div role="status" className="min-w-0 flex-1">
        <p className="text-sm font-medium">Update available</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reload to get the latest changes.
        </p>
      </div>
      <Button size="sm" onClick={reload}>
        Reload
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss update notification"
        onClick={dismiss}
      >
        <XIcon className="size-4" />
      </Button>
    </aside>
  );
}
