"use client"

import * as React from "react"
import {
  IconBan,
  IconFilter,
  IconDots,
  IconKey,
  IconLockOpen,
  IconLogout,
  IconRefresh,
  IconSearch,
  IconShieldLock,
  IconUserCog,
  IconUserPlus,
  IconUserScan,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { authClient, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserRecord = {
  id: string
  name?: string | null
  email?: string | null
  role?: string | string[] | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: string | number | Date | null
  createdAt?: string | number | Date | null
  image?: string | null
}

type ListMeta = {
  total?: number
  limit?: number
  offset?: number
}

type ListQuery = {
  searchValue: string
  searchField: "email" | "name"
  sortBy: "name" | "email"
  sortDirection: "asc" | "desc"
  limit: number
  offset: number
}

const defaultQuery: ListQuery = {
  searchValue: "",
  searchField: "email",
  sortBy: "name",
  sortDirection: "desc",
  limit: 20,
  offset: 0,
}

function formatError(error: unknown) {
  if (!error) return "Something went wrong."
  if (typeof error === "string") return error
  if (typeof error === "object" && error && "message" in error) {
    const message = error.message
    if (typeof message === "string") return message
  }
  return "Something went wrong."
}

function normalizeRoles(value: UserRecord["role"]) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean)
}

function formatDate(value: UserRecord["createdAt"] | UserRecord["banExpires"]) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getUserInitials(user: UserRecord) {
  const source = (user.name || user.email || "").trim()
  if (!source) return "?"
  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  return initials || "?"
}

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const [users, setUsers] = React.useState<UserRecord[]>([])
  const [listMeta, setListMeta] = React.useState<ListMeta>({})
  const [query, setQuery] = React.useState<ListQuery>(defaultQuery)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserRecord | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [actionDialog, setActionDialog] = React.useState<{
    type: "role" | "password" | "ban"
    user: UserRecord
  } | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)

  const [createForm, setCreateForm] = React.useState<{
    name: string
    email: string
    password: string
    role: "user" | "admin"
  }>({
    name: "",
    email: "",
    password: "",
    role: "user",
  })
  const [roleInput, setRoleInput] = React.useState<"user" | "admin">("user")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [createConfirmPassword, setCreateConfirmPassword] = React.useState("")
  const [banReason, setBanReason] = React.useState("")

  const sessionRoles = normalizeRoles(session?.user?.role)
  const isAdmin = sessionRoles.includes("admin")

  const loadUsers = React.useCallback(async (currentQuery: ListQuery) => {
    setIsLoading(true)
    try {
      const payload: NonNullable<
        Parameters<typeof authClient.admin.listUsers>[0]
      >["query"] = {
        searchField: currentQuery.searchField,
        sortBy: currentQuery.sortBy,
        sortDirection: currentQuery.sortDirection,
        limit: currentQuery.limit,
        offset: currentQuery.offset,
      }

      if (currentQuery.searchValue.trim()) {
        payload.searchValue = currentQuery.searchValue.trim()
      }

      const { data, error } = await authClient.admin.listUsers({ query: payload })
      if (error) {
        throw error
      }

      const result = data as
        | { users?: UserRecord[]; total?: number; limit?: number; offset?: number }
        | undefined

      setUsers(result?.users ?? [])
      setListMeta({
        total: result?.total ?? 0,
        limit: result?.limit ?? currentQuery.limit,
        offset: result?.offset ?? currentQuery.offset,
      })
    } catch (error) {
      toast.error(formatError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const applyQuery = (next: Partial<ListQuery>) => {
    const updated = { ...query, ...next }
    setQuery(updated)
    void loadUsers(updated)
  }

  React.useEffect(() => {
    void loadUsers(query)
  }, [loadUsers])

  const handleSelectUser = (user: UserRecord) => {
    setSelectedUser(user)
  }

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createForm.email || !createForm.password || !createForm.name) {
      toast.error("Name, email, and password are required.")
      return
    }

    if (createForm.password !== createConfirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setActionLoading("create-user")
    const toastId = toast.loading("Creating user...")
    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      }
      const { error } = await authClient.admin.createUser(payload)
      if (error) throw error
      toast.success("User created.", { id: toastId })
      setCreateForm({ name: "", email: "", password: "", role: "user" })
      setCreateConfirmPassword("")
      setCreateDialogOpen(false)
      await loadUsers({ ...query, offset: 0 })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetRole = async (userId: string) => {
    if (!roleInput) {
      toast.error("Select a role.")
      return
    }

    setActionLoading("set-role")
    const toastId = toast.loading("Updating role...")
    try {
      const { error } = await authClient.admin.setRole({
        userId,
        role: roleInput,
      })
      if (error) throw error
      toast.success("Role updated.", { id: toastId })
      await loadUsers(query)
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetPassword = async (userId: string) => {
    if (!newPassword.trim()) {
      toast.error("New password is required.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setActionLoading("set-password")
    const toastId = toast.loading("Resetting password...")
    try {
      const { error } = await authClient.admin.setUserPassword({
        userId,
        newPassword: newPassword.trim(),
      })
      if (error) throw error
      toast.success("Password updated.", { id: toastId })
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBanUser = async (userId: string) => {
    setActionLoading("ban-user")
    const toastId = toast.loading("Banning user...")
    try {
      const { error } = await authClient.admin.banUser({
        userId,
        banReason: banReason.trim() || undefined,
      })
      if (error) throw error
      toast.success("User banned.", { id: toastId })
      await loadUsers(query)
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    setActionLoading("unban-user")
    const toastId = toast.loading("Removing ban...")
    try {
      const { error } = await authClient.admin.unbanUser({
        userId,
      })
      if (error) throw error
      toast.success("Ban removed.", { id: toastId })
      await loadUsers(query)
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeSessions = async (userId: string) => {
    setActionLoading("revoke-sessions")
    const toastId = toast.loading("Revoking sessions...")
    try {
      const { error } = await authClient.admin.revokeUserSessions({
        userId,
      })
      if (error) throw error
      toast.success("All sessions revoked.", { id: toastId })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async (userId: string) => {
    setActionLoading("impersonate")
    const toastId = toast.loading("Starting impersonation...")
    try {
      const { error } = await authClient.admin.impersonateUser({
        userId,
      })
      if (error) throw error
      toast.success("Impersonation started.", { id: toastId })
      window.location.assign("/dashboard")
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleStopImpersonating = async () => {
    setActionLoading("stop-impersonating")
    const toastId = toast.loading("Stopping impersonation...")
    try {
      const { error } = await authClient.admin.stopImpersonating({})
      if (error) throw error
      toast.success("Impersonation ended.", { id: toastId })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const canGoPrevious = query.offset > 0
  const canGoNext =
    listMeta.total !== undefined &&
    query.offset + query.limit < (listMeta.total ?? 0)
  const showSkeleton = isLoading && users.length === 0

  return (
    <div className="@container/main flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {!isPending && !isAdmin ? (
          <Alert variant="destructive">
            <IconShieldLock />
            <AlertTitle>Admin permissions required</AlertTitle>
            <AlertDescription>
              Your account does not have the admin role. Requests may be
              rejected until an administrator grants you access.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-6 px-4 lg:px-6">
        <Card className="min-h-[480px]">
          <CardContent className="flex flex-col gap-4">
            <Dialog
              open={createDialogOpen}
              onOpenChange={(open) => setCreateDialogOpen(open)}
            >
              <form
                className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,220px)_minmax(0,1fr)] lg:items-end"
                onSubmit={(event) => {
                  event.preventDefault()
                  applyQuery({ offset: 0 })
                }}
              >
                <Field className="w-full max-w-[360px]">
                  <FieldLabel htmlFor="search">Search</FieldLabel>
                  <div className="relative">
                    <IconSearch className="text-muted-foreground pointer-events-none absolute left-3 top-3 size-4" />
                    <Input
                      id="search"
                      className="pl-9"
                      placeholder="Search by name or email"
                      value={query.searchValue}
                      onChange={(event) =>
                        setQuery((prev) => ({
                          ...prev,
                          searchValue: event.target.value,
                        }))
                      }
                    />
                  </div>
                </Field>
                <Field className="w-full max-w-[220px]">
                  <FieldLabel htmlFor="search-field">Search field</FieldLabel>
                  <Select
                    value={query.searchField}
                    onValueChange={(value: ListQuery["searchField"]) =>
                      setQuery((prev) => ({ ...prev, searchField: value }))
                    }
                  >
                    <SelectTrigger id="search-field">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end gap-2">
                  <Button type="submit" variant="outline" disabled={isLoading}>
                    <IconFilter />
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadUsers(query)}
                    disabled={isLoading}
                  >
                    <IconRefresh />
                    Refresh
                  </Button>
                  <DialogTrigger asChild>
                    <Button type="button" className="ml-auto shadow-sm">
                      <IconUserPlus />
                      Create user
                    </Button>
                  </DialogTrigger>
                </div>
              </form>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create user</DialogTitle>
                  <DialogDescription>
                    Add a new account with optional role assignment.
                  </DialogDescription>
                </DialogHeader>
                <form className="grid gap-4" onSubmit={handleCreateUser}>
                  <Field>
                    <FieldLabel htmlFor="create-name">Name</FieldLabel>
                    <Input
                      id="create-name"
                      value={createForm.name}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="James Smith"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-email">Email</FieldLabel>
                    <Input
                      id="create-email"
                      type="email"
                      value={createForm.email}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      placeholder="user@example.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-password">Password</FieldLabel>
                    <Input
                      id="create-password"
                      type="password"
                      value={createForm.password}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="some-secure-password"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-confirm-password">Confirm password</FieldLabel>
                    <Input
                      id="create-confirm-password"
                      type="password"
                      value={createConfirmPassword}
                      onChange={(event) =>
                        setCreateConfirmPassword(event.target.value)
                      }
                      placeholder="confirm-password"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-role">Role</FieldLabel>
                    <Select
                      value={createForm.role}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          role: value as "user" | "admin",
                        }))
                      }
                    >
                      <SelectTrigger id="create-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="submit" disabled={actionLoading === "create-user"}>
                    <IconUserPlus />
                    {actionLoading === "create-user"
                      ? "Creating..."
                      : "Create user"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {showSkeleton ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  `Showing ${users.length} of ${listMeta.total ?? 0}`
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="page-size" className="text-xs">
                  Page size
                </Label>
                <Select
                  value={String(query.limit)}
                  onValueChange={(value) =>
                    applyQuery({ limit: Number(value), offset: 0 })
                  }
                >
                  <SelectTrigger id="page-size" className="h-8 w-[96px]">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    applyQuery({ offset: Math.max(0, query.offset - query.limit) })
                  }
                  disabled={!canGoPrevious || isLoading}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuery({ offset: query.offset + query.limit })}
                  disabled={!canGoNext || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12 text-right">More</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showSkeleton ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-row-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full" />
                            <div className="flex flex-col gap-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-12" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-8 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : users.length ? (
                    users.map((user) => {
                      const roles = normalizeRoles(user.role)
                      const isSelected = selectedUser?.id === user.id
                      return (
                        <TableRow
                          key={user.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected && "bg-muted"
                          )}
                          onClick={() => handleSelectUser(user)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9">
                                <AvatarImage
                                  src={user.image || undefined}
                                  alt={user.name || user.email || "User avatar"}
                                />
                                <AvatarFallback>
                                  {getUserInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {user.name || "Unnamed"}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {user.email || "-"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roles.length ? (
                                roles.map((role) => (
                                  <Badge
                                    key={`${user.id}-${role}`}
                                    variant={role === "admin" ? "default" : "outline"}
                                  >
                                    {role}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline">user</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.banned ? (
                              <Badge variant="destructive">Banned</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <IconDots className="size-4" />
                                  <span className="sr-only">More actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => {
                                    handleSelectUser(user)
                                    const roles = normalizeRoles(user.role)
                                    const firstRole = roles[0]
                                    setRoleInput(
                                      firstRole === "admin" ? "admin" : "user"
                                    )
                                    setActionDialog({ type: "role", user })
                                  }}
                                >
                                  <IconUserCog className="size-4 text-primary" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => {
                                    handleSelectUser(user)
                                    setNewPassword("")
                                    setConfirmPassword("")
                                    setActionDialog({ type: "password", user })
                                  }}
                                >
                                  <IconKey className="size-4 text-primary" />
                                  Reset password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => {
                                    handleSelectUser(user)
                                    void handleRevokeSessions(user.id)
                                  }}
                                >
                                  <IconLogout className="size-4 text-primary" />
                                  Revoke sessions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => {
                                    handleSelectUser(user)
                                    void handleImpersonate(user.id)
                                  }}
                                >
                                  <IconUserScan className="size-4 text-primary" />
                                  Impersonate
                                </DropdownMenuItem>
                                {user.banned ? (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => {
                                      handleSelectUser(user)
                                      void handleUnbanUser(user.id)
                                    }}
                                  >
                                    <IconLockOpen className="size-4 text-primary" />
                                    Unban user
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => {
                                      handleSelectUser(user)
                                      setBanReason("")
                                      setActionDialog({ type: "ban", user })
                                    }}
                                    variant="destructive"
                                  >
                                    <IconBan className="size-4 text-destructive" />
                                    Ban user
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {isLoading ? "Loading users..." : "No users found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

          </CardContent>
        </Card>
      </div>
      <Dialog
        open={actionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null)
          }
        }}
      >
        <DialogContent>
          {actionDialog?.type === "role" ? (
            <>
              <DialogHeader>
                <DialogTitle>Update role</DialogTitle>
                <DialogDescription>
                  Set the role for {actionDialog.user.name || "this user"}.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  await handleSetRole(actionDialog.user.id)
                  setActionDialog(null)
                }}
              >
                <Field>
                  <FieldTitle>Role</FieldTitle>
                  <Select
                    value={roleInput}
                    onValueChange={(value: string) => {
                      if (value === "user" || value === "admin") {
                        setRoleInput(value)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" disabled={actionLoading === "set-role"}>
                  {actionLoading === "set-role" ? "Updating..." : "Set role"}
                </Button>
              </form>
            </>
          ) : null}
          {actionDialog?.type === "password" ? (
            <>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Force a new password for {actionDialog.user.name || "this user"}.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  await handleSetPassword(actionDialog.user.id)
                  setActionDialog(null)
                }}
              >
                <Field>
                  <FieldTitle>New password</FieldTitle>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="new-password"
                  />
                </Field>
                <Field>
                  <FieldTitle>Confirm password</FieldTitle>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="confirm-password"
                  />
                </Field>
                <Button type="submit" disabled={actionLoading === "set-password"}>
                  {actionLoading === "set-password" ? "Updating..." : "Set password"}
                </Button>
              </form>
            </>
          ) : null}
          {actionDialog?.type === "ban" ? (
            <>
              <DialogHeader>
                <DialogTitle>Ban user</DialogTitle>
                <DialogDescription>
                  Optional reason for {actionDialog.user.name || "this user"}.
                  The ban stays in place until you unban them.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  await handleBanUser(actionDialog.user.id)
                  setActionDialog(null)
                }}
              >
                <Field>
                  <FieldTitle>Ban reason</FieldTitle>
                  <Input
                    value={banReason}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Spamming"
                  />
                </Field>
                <Button
                  type="submit"
                  disabled={actionLoading === "ban-user"}
                  variant="destructive"
                >
                  {actionLoading === "ban-user" ? "Banning..." : "Ban user"}
                </Button>
              </form>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
