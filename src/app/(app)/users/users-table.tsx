"use client"

import { useState } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Role = "ADMIN" | "CLIENT"

type UserRow = {
  id: string
  name: string | null
  email: string | null
  role: Role
  createdAt: string
}

type UsersTableProps = {
  currentUserId: string
  initialUsers: UserRow[]
}

export function UsersTable({ currentUserId, initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      )
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Manage user access and permissions. Only administrators can view this page and modify user roles.
          </p>
        </div>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Users</CardTitle>
            <span className="text-xs font-normal text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"} registered
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          {users.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">No users found</p>
                <p className="text-xs text-muted-foreground">
                  No user accounts have been created yet.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created At</TableHead>
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
                                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <p className="text-xs text-muted-foreground italic">
                              You cannot change your own role
                            </p>
                          )}
                          {isSavingId === user.id && (
                            <p className="text-xs text-muted-foreground">
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
                          disabled
                          className="text-xs opacity-50"
                          title="Coming soon"
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

