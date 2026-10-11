import * as React from "react";

import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "disposabl-kit/components/ui/sidebar";
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  teams: React.ComponentProps<typeof TeamSwitcher>["teams"];
  children: React.ReactNode;
};

export function AppSidebar({ teams, children, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
