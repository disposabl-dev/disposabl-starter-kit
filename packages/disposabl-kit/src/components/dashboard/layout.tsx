import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Navigate } from "@tanstack/react-router";
import { GalleryVerticalEndIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { AppSidebar } from "./app-sidebar";
import type { ReactNode } from "react";
import { ModeToggle } from "../mode-toggle";
import { Separator } from "../ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";

export function DashboardLayout({
  sidebar,
  breadcrumbs,
  children,
}: {
  sidebar: ReactNode;
  breadcrumbs?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {breadcrumbs}
          </div>
          <div className="ml-auto px-4">
            <ModeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AuthenticatedLayout({
  name,
  sidebar,
  children,
}: {
  name: string;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <Skeleton
          className="h-screen w-full"
          role="status"
          aria-label="Loading session"
        />
      </AuthLoading>
      <Unauthenticated>
        <Navigate to="/login" replace />
      </Unauthenticated>
      <Authenticated>
        <DashboardLayout
          sidebar={
            <AppSidebar
              teams={[{ name, logo: <GalleryVerticalEndIcon />, plan: "" }]}
            >
              {sidebar}
            </AppSidebar>
          }
        >
          {children}
        </DashboardLayout>
      </Authenticated>
    </>
  );
}
