"use client"

import * as React from "react"
import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { EditAccountDialog } from "@/components/edit-account-dialog"
import { useRouter } from "next/navigation"
import { authClient, useSession } from "@/lib/auth-client"

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function NavUser({ compact }: { compact?: boolean }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: session, isPending, refetch } = useSession()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const userName =
    session?.user?.name ?? session?.user?.email ?? "Guest"
  const userEmail = session?.user?.email ?? "No email"
  const userAvatar = session?.user?.image ?? null
  const userInitials = getInitials(userName || userEmail || "User")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={userAvatar ?? undefined}
                  alt={userName}
                />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!compact ? (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {isPending ? "Loading..." : userName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {isPending ? "Fetching session..." : userEmail}
                  </span>
                </div>
              ) : null}
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={userAvatar ?? undefined}
                    alt={userName}
                  />
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {isPending ? "Loading..." : userName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {isPending ? "Fetching session..." : userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={!session?.user || isPending}
                onSelect={(event) => {
                  event.preventDefault()
                  setIsDialogOpen(true)
                }}
              >
                <IconUserCircle />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isPending}
              onSelect={(event) => {
                event.preventDefault()
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/sign-in")
                    },
                  },
                })
              }}
            >
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <EditAccountDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        session={session}
        isPending={isPending}
        refetch={refetch}
      />
    </SidebarMenu>
  )
}
