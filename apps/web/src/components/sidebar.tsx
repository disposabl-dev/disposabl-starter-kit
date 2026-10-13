import { Link } from "@tanstack/react-router";
import { useGT } from "gt-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "disposabl-kit/components/ui/sidebar";

export default function Sidebar() {
  const gt = useGT();
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={gt("Dashboard")}>
            <Link
              to="/dashboard"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
            >
              {gt("Dashboard")}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
