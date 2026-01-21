"use client"

import * as React from "react"
import {
  IconBan,
  IconFilter,
  IconLock,
  IconRefresh,
  IconSearch,
  IconShieldLock,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { authClient, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  bannedFilter: "all" | "banned" | "active"
}

const defaultQuery: ListQuery = {
  searchValue: "",
  searchField: "email",
  sortBy: "name",
  sortDirection: "desc",
  limit: 20,
  offset: 0,
  bannedFilter: "all",
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

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const [users, setUsers] = React.useState<UserRecord[]>([])
  const [listMeta, setListMeta] = React.useState<ListMeta>({})
  const [query, setQuery] = React.useState<ListQuery>(defaultQuery)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserRecord | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  const [createForm, setCreateForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  })
  const [targetUserId, setTargetUserId] = React.useState("")
  const [roleInput, setRoleInput] = React.useState("admin")
  const [newPassword, setNewPassword] = React.useState("")
  const [banReason, setBanReason] = React.useState("")
  const [banExpiresIn, setBanExpiresIn] = React.useState("")

  const sessionRoles = normalizeRoles(session?.user?.role)
  const isAdmin = sessionRoles.includes("admin")

  const stats = React.useMemo(() => {
    const total = listMeta.total ?? users.length
    const admins = users.filter((user) =>
      normalizeRoles(user.role).includes("admin")
    ).length
    const banned = users.filter((user) => user.banned).length
    return { total, admins, banned }
  }, [listMeta.total, users])

  const loadUsers = React.useCallback(async (currentQuery: ListQuery) => {
    setIsLoading(true)
    const toastId = toast.loading("Fetching users...")
    try {
      const payload: Record<string, unknown> = {
        searchField: currentQuery.searchField,
        sortBy: currentQuery.sortBy,
        sortDirection: currentQuery.sortDirection,
        limit: currentQuery.limit,
        offset: currentQuery.offset,
      }

      if (currentQuery.searchValue.trim()) {
        payload.searchValue = currentQuery.searchValue.trim()
      }

      if (currentQuery.bannedFilter !== "all") {
        payload.filterField = "banned"
        payload.filterOperator = "eq"
        payload.filterValue = currentQuery.bannedFilter === "banned"
      }

      const { data, error } = await authClient.admin.listUsers(payload)
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
      toast.success("Users loaded.", { id: toastId })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
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
    setTargetUserId(user.id)
  }

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createForm.email || !createForm.password || !createForm.name) {
      toast.error("Name, email, and password are required.")
      return
    }

    setActionLoading("create-user")
    const toastId = toast.loading("Creating user...")
    try {
      const roleValue = createForm.role.trim()
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: roleValue ? roleValue : undefined,
      }
      const { error } = await authClient.admin.createUser(payload)
      if (error) throw error
      toast.success("User created.", { id: toastId })
      setCreateForm({ name: "", email: "", password: "", role: "user" })
      await loadUsers({ ...query, offset: 0 })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetRole = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to update their role.")
      return
    }
    const roles = roleInput
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean)
    if (!roles.length) {
      toast.error("Enter at least one role.")
      return
    }

    setActionLoading("set-role")
    const toastId = toast.loading("Updating role...")
    try {
      const { error } = await authClient.admin.setRole({
        userId: targetUserId,
        role: roles.length === 1 ? roles[0] : roles,
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

  const handleSetPassword = async () => {
    if (!targetUserId.trim() || !newPassword.trim()) {
      toast.error("User ID and new password are required.")
      return
    }

    setActionLoading("set-password")
    const toastId = toast.loading("Resetting password...")
    try {
      const { error } = await authClient.admin.setUserPassword({
        userId: targetUserId.trim(),
        newPassword: newPassword.trim(),
      })
      if (error) throw error
      toast.success("Password updated.", { id: toastId })
      setNewPassword("")
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBanUser = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to ban.")
      return
    }

    const expiresValue = banExpiresIn.trim()
    const expiresIn = expiresValue ? Number(expiresValue) : undefined
    if (expiresValue && Number.isNaN(expiresIn)) {
      toast.error("Ban expiry must be a number in seconds.")
      return
    }

    setActionLoading("ban-user")
    const toastId = toast.loading("Banning user...")
    try {
      const { error } = await authClient.admin.banUser({
        userId: targetUserId.trim(),
        banReason: banReason.trim() || undefined,
        banExpiresIn: expiresIn,
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

  const handleUnbanUser = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to unban.")
      return
    }

    setActionLoading("unban-user")
    const toastId = toast.loading("Removing ban...")
    try {
      const { error } = await authClient.admin.unbanUser({
        userId: targetUserId.trim(),
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

  const handleRevokeSessions = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to revoke sessions.")
      return
    }

    setActionLoading("revoke-sessions")
    const toastId = toast.loading("Revoking sessions...")
    try {
      const { error } = await authClient.admin.revokeUserSessions({
        userId: targetUserId.trim(),
      })
      if (error) throw error
      toast.success("All sessions revoked.", { id: toastId })
    } catch (error) {
      toast.error(formatError(error), { id: toastId })
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to impersonate.")
      return
    }

    setActionLoading("impersonate")
    const toastId = toast.loading("Starting impersonation...")
    try {
      const { error } = await authClient.admin.impersonateUser({
        userId: targetUserId.trim(),
      })
      if (error) throw error
      toast.success("Impersonation started.", { id: toastId })
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

  const handleRemoveUser = async () => {
    if (!targetUserId.trim()) {
      toast.error("Select a user to remove.")
      return
    }

    setActionLoading("remove-user")
    const toastId = toast.loading("Removing user...")
    try {
      const { error } = await authClient.admin.removeUser({
        userId: targetUserId.trim(),
      })
      if (error) throw error
      toast.success("User removed.", { id: toastId })
      setSelectedUser(null)
      setTargetUserId("")
      await loadUsers({ ...query, offset: 0 })
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

  return (
    <div className="@container/main flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 pt-6 lg:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin control center</h1>
            <p className="text-muted-foreground text-sm">
              Manage accounts, roles, and security actions with Better Auth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <IconShieldLock className="size-3.5" />
              {isPending ? "Checking session" : isAdmin ? "Admin" : "Member"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <IconUsers className="size-3.5" />
              {stats.total} total users
            </Badge>
          </div>
        </div>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total users</CardTitle>
              <CardDescription>
                {listMeta.total !== undefined
                  ? `${listMeta.total} in directory`
                  : "Loading directory"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.total}</div>
              <p className="text-muted-foreground text-sm">
                {listMeta.limit !== undefined
                  ? `Showing ${users.length} of ${listMeta.total}`
                  : "All results currently loaded"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Admins</CardTitle>
              <CardDescription>Users with elevated permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.admins}</div>
              <p className="text-muted-foreground text-sm">
                {stats.admins === 0
                  ? "No admin roles detected"
                  : "Includes custom role assignments"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Banned</CardTitle>
              <CardDescription>Accounts blocked from signing in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{stats.banned}</div>
              <p className="text-muted-foreground text-sm">
                {stats.banned === 0
                  ? "No active bans"
                  : "Review bans regularly"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 px-4 pb-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:px-6">
        <Card className="min-h-[480px]">
          <CardHeader>
            <CardTitle>User directory</CardTitle>
            <CardDescription>
              Search, filter, and select a user to perform admin actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                applyQuery({ offset: 0 })
              }}
            >
              <Field>
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
              <Field>
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
              <Field>
                <FieldLabel htmlFor="banned-filter">Ban status</FieldLabel>
                <Select
                  value={query.bannedFilter}
                  onValueChange={(value: ListQuery["bannedFilter"]) =>
                    setQuery((prev) => ({ ...prev, bannedFilter: value }))
                  }
                >
                  <SelectTrigger id="banned-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="banned">Banned only</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={isLoading}>
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
              </div>
            </form>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Showing {users.length} of {listMeta.total ?? 0}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length ? (
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
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.name || "Unnamed"}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {user.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
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

            {selectedUser ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Selected user</p>
                    <p className="text-muted-foreground">
                      {selectedUser.name || selectedUser.email || selectedUser.id}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {selectedUser.banned ? "Banned" : "Active"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  <span>Role: {normalizeRoles(selectedUser.role).join(", ") || "user"}</span>
                  <span>Ban reason: {selectedUser.banReason || "-"}</span>
                  <span>Ban expires: {formatDate(selectedUser.banExpires)}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create user</CardTitle>
              <CardDescription>
                Add a new account with optional role assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <FieldLabel htmlFor="create-role">Role</FieldLabel>
                  <Input
                    id="create-role"
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        role: event.target.value,
                      }))
                    }
                    placeholder="user"
                  />
                  <FieldDescription>
                    Use comma-separated roles to assign multiple.
                  </FieldDescription>
                </Field>
                <Button type="submit" disabled={actionLoading === "create-user"}>
                  <IconUserPlus />
                  {actionLoading === "create-user" ? "Creating..." : "Create user"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected user actions</CardTitle>
              <CardDescription>
                Use the directory to pick a user, then perform actions below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="target-user-id">User ID</FieldLabel>
                  <Input
                    id="target-user-id"
                    value={targetUserId}
                    onChange={(event) => setTargetUserId(event.target.value)}
                    placeholder="user-id"
                  />
                </Field>
              </FieldGroup>
              <Tabs defaultValue="roles" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="roles">Roles</TabsTrigger>
                  <TabsTrigger value="ban">Bans</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="mt-4">
                  <FieldGroup>
                    <Field>
                      <FieldTitle>Update role</FieldTitle>
                      <FieldDescription>
                        Set one or multiple roles for the user.
                      </FieldDescription>
                      <Input
                        value={roleInput}
                        onChange={(event) => setRoleInput(event.target.value)}
                        placeholder="admin"
                      />
                    </Field>
                    <Button
                      type="button"
                      onClick={handleSetRole}
                      disabled={actionLoading === "set-role"}
                    >
                      <IconUserCheck />
                      {actionLoading === "set-role" ? "Updating..." : "Set role"}
                    </Button>
                  </FieldGroup>
                </TabsContent>

                <TabsContent value="ban" className="mt-4">
                  <FieldGroup>
                    <Field>
                      <FieldTitle>Ban user</FieldTitle>
                      <FieldDescription>
                        Optional reason and expiry in seconds.
                      </FieldDescription>
                      <Input
                        value={banReason}
                        onChange={(event) => setBanReason(event.target.value)}
                        placeholder="Spamming"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="ban-expires">Ban expires in</FieldLabel>
                      <Input
                        id="ban-expires"
                        value={banExpiresIn}
                        onChange={(event) => setBanExpiresIn(event.target.value)}
                        placeholder="604800"
                      />
                      <FieldDescription>
                        Leave blank for a permanent ban.
                      </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleBanUser}
                        disabled={actionLoading === "ban-user"}
                      >
                        <IconBan />
                        {actionLoading === "ban-user" ? "Banning..." : "Ban user"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUnbanUser}
                        disabled={actionLoading === "unban-user"}
                      >
                        {actionLoading === "unban-user" ? "Unbanning..." : "Unban"}
                      </Button>
                    </div>
                  </FieldGroup>
                </TabsContent>

                <TabsContent value="security" className="mt-4">
                  <FieldGroup>
                    <Field>
                      <FieldTitle>Reset password</FieldTitle>
                      <FieldDescription>
                        Force a new password for the selected user.
                      </FieldDescription>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="new-password"
                      />
                    </Field>
                    <Button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={actionLoading === "set-password"}
                    >
                      <IconLock />
                      {actionLoading === "set-password"
                        ? "Updating..."
                        : "Set password"}
                    </Button>
                  </FieldGroup>
                </TabsContent>

                <TabsContent value="sessions" className="mt-4">
                  <FieldGroup>
                    <Field>
                      <FieldTitle>Session controls</FieldTitle>
                      <FieldDescription>
                        Revoke all sessions or impersonate the user.
                      </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRevokeSessions}
                        disabled={actionLoading === "revoke-sessions"}
                      >
                        {actionLoading === "revoke-sessions"
                          ? "Revoking..."
                          : "Revoke sessions"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleImpersonate}
                        disabled={actionLoading === "impersonate"}
                      >
                        {actionLoading === "impersonate"
                          ? "Impersonating..."
                          : "Impersonate"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStopImpersonating}
                        disabled={actionLoading === "stop-impersonating"}
                      >
                        {actionLoading === "stop-impersonating"
                          ? "Stopping..."
                          : "Stop impersonating"}
                      </Button>
                    </div>
                  </FieldGroup>
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <div className="flex flex-col gap-3">
                <Alert variant="destructive">
                  <IconBan />
                  <AlertTitle>Danger zone</AlertTitle>
                  <AlertDescription>
                    Deleting a user permanently removes them and their data.
                  </AlertDescription>
                </Alert>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={actionLoading === "remove-user"}
                    >
                      {actionLoading === "remove-user"
                        ? "Removing..."
                        : "Remove user"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The user will be deleted
                        permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveUser}>
                        Confirm removal
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
