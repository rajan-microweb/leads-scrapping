"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Users, Loader2, Search, ArrowUp, ArrowDown, Plus } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/EmptyState"
import { ErrorMessage } from "@/components/ErrorMessage"
import { Pagination } from "@/components/ui/pagination"

type Role = "ADMIN" | "CLIENT"

type UserRow = {
  id: string
  name: string | null
  email: string | null
  role: Role
  createdAt: string
  updatedAt?: string
}

type SortBy = "name" | "email" | "role" | "createdAt"
type SortOrder = "asc" | "desc"

const PAGE_SIZE = 10

function filterUsers(
  users: UserRow[],
  searchQuery: string,
  roleFilter: string | null
): UserRow[] {
  let result = users
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (u) =>
        (u.name?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false)
    )
  }
  if (roleFilter && roleFilter !== "all") {
    result = result.filter((u) => u.role === roleFilter)
  }
  return result
}

function sortUsers(
  users: UserRow[],
  sortBy: SortBy,
  sortOrder: SortOrder
): UserRow[] {
  return [...users].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "name":
        comparison = (a.name ?? "").localeCompare(b.name ?? "")
        break
      case "email":
        comparison = (a.email ?? "").localeCompare(b.email ?? "")
        break
      case "role":
        comparison = a.role.localeCompare(b.role)
        break
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
    }
    return sortOrder === "asc" ? comparison : -comparison
  })
}

type UsersTableProps = {
  currentUserId: string
}

export function UsersTable({ currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortBy>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [manageUser, setManageUser] = useState<UserRow | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("CLIENT")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingList(true)
      setError(null)

      const params = new URLSearchParams()
      params.set("page", String(currentPage))
      params.set("pageSize", String(PAGE_SIZE))
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim())
      }
      if (roleFilter !== "all") {
        params.set("role", roleFilter)
      }
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)

      const res = await fetch(`/api/users?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to load users")
      }

      const json = (await res.json()) as {
        users: UserRow[]
        total: number
      }

      setUsers(json.users ?? [])
      setTotalItems(json.total ?? json.users.length)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load users right now."
      )
    } finally {
      setIsLoadingList(false)
    }
  }, [currentPage, roleFilter, searchQuery, sortBy, sortOrder])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Reset to first page when filters or sort change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter, sortBy, sortOrder])

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(column)
      setSortOrder(column === "createdAt" ? "desc" : "asc")
    }
  }

  const handleChangeRole = async (userId: string, newRole: Role) => {
    setError(null)

    // Optimistic update: update local state first
    const previous = users
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    )
    setIsSavingId(userId)

    try {
      const res = await fetch("/api/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update role")
      }

      const updated = (await res.json()) as {
        id: string
        role: Role
        name: string | null
        email: string | null
        createdAt: string
        updatedAt?: string
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      )
      if (manageUser?.id === updated.id) {
        setManageUser((prev) => (prev ? { ...prev, ...updated } : null))
      }
    } catch (err) {
      setUsers(previous)
      setError(
        err instanceof Error ? err.message : "Unable to update role right now.",
      )
    } finally {
      setIsSavingId(null)
    }
  }

  return (
    <PageShell
      title="User Management"
      description="Manage user access and permissions. Only administrators can view this page and modify user roles."
      maxWidth="lg"
      className="space-y-6"
    >
      <Card className="border border-border/60 shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="type-card-title">All Users</CardTitle>
              <span className="type-caption font-normal">
                {totalItems} {totalItems === 1 ? "user" : "users"} registered
              </span>
            </div>
            <Button
              type="button"
              className="gap-2"
              size="sm"
              onClick={() => {
                setInviteError(null)
                setInviteName("")
                setInviteEmail("")
                setInviteRole("CLIENT")
                setInviteOpen(true)
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add user
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search users by name or email"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="CLIENT">CLIENT</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v as SortBy)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="createdAt">Created at</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
            >
              {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className="h-5 w-5 animate-spin text-muted-foreground"
                aria-hidden
              />
            </div>
          ) : totalItems === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No user accounts have been created yet."
            />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No matching users"
              description="Try adjusting your search or role filter."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-semibold"
                        onClick={() => handleSort("name")}
                        aria-label={`Sort by name ${sortBy === "name" ? (sortOrder === "asc" ? "ascending" : "descending") : ""}`}
                      >
                        Name / Email
                        {sortBy === "name" && (
                          sortOrder === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-semibold"
                        onClick={() => handleSort("role")}
                        aria-label={`Sort by role ${sortBy === "role" ? (sortOrder === "asc" ? "ascending" : "descending") : ""}`}
                      >
                        Role
                        {sortBy === "role" && (
                          sortOrder === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-semibold"
                        onClick={() => handleSort("createdAt")}
                        aria-label={`Sort by date ${sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : ""}`}
                      >
                        Created At
                        {sortBy === "createdAt" && (
                          sortOrder === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" aria-hidden /> : <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                  const isCurrentUser = user.id === currentUserId
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">
                            {user.name || "Unnamed User"}
                          </div>
                          {user.email && (
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                user.role === "ADMIN"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {user.role}
                            </span>
                            {!isCurrentUser && (
                              <select
                                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs transition-[box-shadow,border-color] duration-fast focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={user.role}
                                onChange={(e) =>
                                  handleChangeRole(user.id, e.target.value as Role)
                                }
                                disabled={isSavingId === user.id}
                                aria-label={`Change ${user.name || user.email}'s role`}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="CLIENT">CLIENT</option>
                              </select>
                            )}
                          </div>
                          {isCurrentUser && (
                            <p className="type-caption italic">
                              You cannot change your own role
                            </p>
                          )}
                          {isSavingId === user.id && (
                            <p className="type-caption flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              Updating...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setManageUser(user)}
                          aria-label={`Manage ${user.name || user.email || "user"}`}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                  itemLabel="user"
                  filterNote={
                    searchQuery || roleFilter !== "all" ? " (filtered)" : undefined
                  }
                />
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setInviteError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Create a user and send them an email to set their password.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setInviteError(null)
              setIsInviting(true)
              try {
                const res = await fetch("/api/users/invite", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: inviteName,
                    email: inviteEmail,
                    role: inviteRole,
                  }),
                })

                if (!res.ok) {
                  const data = await res.json().catch(() => null)
                  throw new Error(data?.error || "Failed to invite user")
                }

                // Refresh list from first page so the new user is visible
                setCurrentPage(1)
                await loadUsers()
                setInviteOpen(false)
              } catch (err) {
                setInviteError(
                  err instanceof Error ? err.message : "Failed to invite user"
                )
              } finally {
                setIsInviting(false)
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as Role)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">CLIENT</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Inviting..." : "Send invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageUser} onOpenChange={(open) => !open && setManageUser(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby="manage-user-description">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription id="manage-user-description">
              Read-only information for this user.
            </DialogDescription>
          </DialogHeader>
          {manageUser && (
            <div className="grid gap-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Name</span>
                <p className="font-medium text-foreground">
                  {manageUser.name || "—"}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Email</span>
                <p className="text-foreground">{manageUser.email || "—"}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Role</span>
                <p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      manageUser.role === "ADMIN"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {manageUser.role}
                  </span>
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Created at</span>
                <p className="text-foreground">
                  {new Date(manageUser.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {manageUser.updatedAt && (
                <div>
                  <span className="font-medium text-muted-foreground">Last updated</span>
                  <p className="text-foreground">
                    {new Date(manageUser.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
              <div>
                <span className="font-medium text-muted-foreground">User ID</span>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {manageUser.id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

