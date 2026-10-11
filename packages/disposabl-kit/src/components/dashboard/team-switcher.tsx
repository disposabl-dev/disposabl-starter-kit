import type { ReactNode } from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "disposabl-kit/components/ui/sidebar";

// Display the current app until real organization switching is connected.
export function TeamSwitcher({
  teams,
}: {
  teams: { name: string; logo: ReactNode; plan: string }[];
}) {
  const team = teams[0];
  if (!team) return null;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg">
          <div>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {team.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{team.name}</span>
              {team.plan && (
                <span className="truncate text-xs">{team.plan}</span>
              )}
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
