"use client"

import { useState } from "react"
import { Users, Loader2 } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/EmptyState"
import { ErrorMessage } from "@/components/ErrorMessage"

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
    <PageShell
      title="User Management"
      description="Manage user access and permissions. Only administrators can view this page and modify user roles."
      maxWidth="lg"
      className="space-y-6"
    >
      <Card className="border border-border/60 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="type-card-title">All Users</CardTitle>
            <span className="type-caption font-normal">
              {users.length} {users.length === 1 ? "user" : "users"} registered
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="No user accounts have been created yet."
            />
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
    </PageShell>
  )
}

