import { useState } from "react";
import { useAuth, type User } from "@workos-inc/authkit-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "disposabl-kit/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "disposabl-kit/components/ui/avatar";
import { Button } from "disposabl-kit/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "disposabl-kit/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "disposabl-kit/components/ui/sidebar";
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";

function UserProfile({
  user,
  trigger = false,
}: {
  user: User;
  trigger?: boolean;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Account";
  const email = (
    <Button
      type="button"
      variant="ghost"
      aria-label={showEmail ? "Hide email" : "Show email"}
      aria-pressed={showEmail}
      onClick={() => setShowEmail(!showEmail)}
      className={`relative z-10 h-auto min-w-0 justify-start border-0 p-0 text-left text-xs font-normal ${showEmail ? "" : "blur-sm select-none"}`}
    >
      <span className="truncate">{user.email}</span>
    </Button>
  );
  return (
    <div className="relative flex min-w-0 flex-1 items-start gap-2 text-left text-sm">
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={user.profilePictureUrl ?? undefined} alt={name} />
        <AvatarFallback className="rounded-lg">{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div
        className={`grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden ${trigger ? "pr-6" : ""}`}
      >
        <span className="truncate font-medium">{name}</span>
        {trigger ? (
          email
        ) : (
          <DropdownMenuItem
            asChild
            className="p-0"
            onSelect={(event) => event.preventDefault()}
          >
            {email}
          </DropdownMenuItem>
        )}
      </div>
      {trigger && (
        <DropdownMenuTrigger asChild>
          <Button
            variant="link"
            className="absolute inset-0 h-auto w-full rounded-md p-0 text-inherit"
            aria-label="Open user menu"
          >
            <ChevronsUpDownIcon className="absolute right-0 top-2 size-4 group-data-[collapsible=icon]:hidden" />
          </Button>
        </DropdownMenuTrigger>
      )}
    </div>
  );
}

export function NavUser() {
  const { user, signOut } = useAuth();
  const { isMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <AlertDialog>
          <DropdownMenu>
            <SidebarMenuButton asChild size="lg">
              <div>
                <UserProfile user={user} trigger />
              </div>
            </SidebarMenuButton>
            <DropdownMenuContent
              className="w-64"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel>
                <UserProfile user={user} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You can sign back in at any time.
              </AlertDialogDescription>
              {signOutFailed && (
                <p role="alert" className="text-sm text-destructive">
                  Couldn't sign out. Try again.
                </p>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signingOut}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={signingOut}
                onClick={async (event) => {
                  event.preventDefault();
                  setSigningOut(true);
                  setSignOutFailed(false);
                  try {
                    await signOut({ returnTo: window.location.origin });
                  } catch {
                    setSignOutFailed(true);
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                {signingOut ? "Logging out…" : "Log out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
