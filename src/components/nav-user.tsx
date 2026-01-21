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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
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
  const [name, setName] = React.useState("")
  const [image, setImage] = React.useState("")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null)
  const userName =
    session?.user?.name ?? session?.user?.email ?? "Guest"
  const userEmail = session?.user?.email ?? "No email"
  const userAvatar = session?.user?.image ?? null
  const userInitials = getInitials(userName || userEmail || "User")

  React.useEffect(() => {
    if (!isDialogOpen) return
    setName(session?.user?.name ?? "")
    setImage(session?.user?.image ?? "")
    setCurrentPassword("")
    setNewPassword("")
    setFormError(null)
    setFormSuccess(null)
  }, [isDialogOpen, session?.user?.image, session?.user?.name])

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!session?.user) return

    const trimmedName = name.trim()
    const trimmedImage = image.trim()
    const trimmedCurrentPassword = currentPassword.trim()
    const trimmedNewPassword = newPassword.trim()
    const updates: Record<string, string | null> = {}

    if (trimmedName && trimmedName !== session.user.name) {
      updates.name = trimmedName
    }

    if (trimmedImage !== (session.user.image ?? "")) {
      updates.image = trimmedImage.length ? trimmedImage : null
    }

    if (
      (trimmedCurrentPassword && !trimmedNewPassword) ||
      (!trimmedCurrentPassword && trimmedNewPassword)
    ) {
      setFormError("Enter your current password and a new password.")
      return
    }

    setIsSaving(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      if (Object.keys(updates).length) {
        const { error } = await authClient.updateUser(updates)
        if (error) throw error
      }

      if (trimmedCurrentPassword && trimmedNewPassword) {
        const { error } = await authClient.changePassword({
          currentPassword: trimmedCurrentPassword,
          newPassword: trimmedNewPassword,
        })
        if (error) throw error
      }

      await refetch()
      setFormSuccess("Profile updated.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Update failed."
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

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
              <Dialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              >
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                      Update your name, password, or image.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="grid gap-4"
                    onSubmit={handleProfileSubmit}
                  >
                    <div className="grid gap-2">
                      <Label htmlFor="nav-user-name">
                        Name
                      </Label>
                      <Input
                        id="nav-user-name"
                        autoComplete="name"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        placeholder="Your name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nav-user-image">
                        Image URL
                      </Label>
                      <Input
                        id="nav-user-image"
                        type="url"
                        autoComplete="url"
                        value={image}
                        onChange={(event) =>
                          setImage(event.target.value)
                        }
                        placeholder="https://example.com/avatar.png"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nav-user-current-password">
                        Current password
                      </Label>
                      <Input
                        id="nav-user-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nav-user-new-password">
                        New password
                      </Label>
                      <Input
                        id="nav-user-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter new password"
                      />
                    </div>
                    {formError ? (
                      <p className="text-sm text-destructive">
                        {formError}
                      </p>
                    ) : null}
                    {formSuccess ? (
                      <p className="text-sm text-emerald-600">
                        {formSuccess}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={isSaving || isPending}
                      >
                        {isSaving ? "Saving..." : "Save changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
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
    </SidebarMenu>
  )
}
