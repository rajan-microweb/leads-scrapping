"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddSignatureModal } from "./add-signature-modal"
import type { Signature } from "@/types/signatures"

type SortBy = "name" | "createdAt" | "updatedAt"
type SortOrder = "asc" | "desc"

// Utility function to strip HTML tags for search
const stripHtml = (html: string): string => {
  if (typeof document === "undefined") {
    // Server-side: simple regex approach
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
  }
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

// Filter signatures by search query
const filterSignatures = (
  signatures: Signature[],
  query: string
): Signature[] => {
  if (!query.trim()) return signatures

  const lowerQuery = query.toLowerCase()
  return signatures.filter((sig) => {
    const nameMatch = sig.name.toLowerCase().includes(lowerQuery)
    const contentText = stripHtml(sig.content).toLowerCase()
    const contentMatch = contentText.includes(lowerQuery)
    return nameMatch || contentMatch
  })
}

// Sort signatures
const sortSignatures = (
  signatures: Signature[],
  sortBy: SortBy,
  sortOrder: SortOrder
): Signature[] => {
  const sorted = [...signatures].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "updatedAt":
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  return sorted
}

export function SignaturesList() {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSignature, setEditingSignature] = useState<Signature | null>(
    null
  )
  const [selectedSignatures, setSelectedSignatures] = useState<Set<string>>(
    new Set()
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [deletingSignatureIds, setDeletingSignatureIds] = useState<
    string[] | null
  >(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [duplicatingSignatureId, setDuplicatingSignatureId] = useState<
    string | null
  >(null)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadSignatures = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch("/api/signatures")

      if (!res.ok) {
        throw new Error("Failed to load signatures")
      }

      const data = (await res.json()) as Signature[]
      setSignatures(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading signatures."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSignatures()
  }, [])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleSuccess = () => {
    loadSignatures()
    setEditingSignature(null)
    setSuccessMessage("Signature saved successfully!")
  }

  const handleEdit = (signature: Signature) => {
    setEditingSignature(signature)
    setIsModalOpen(true)
  }

  const handleDuplicate = async (signatureId: string) => {
    try {
      setIsDuplicating(true)
      setDuplicatingSignatureId(signatureId)

      // Find the signature to duplicate
      const signature = signatures.find((sig) => sig.id === signatureId)
      if (!signature) {
        throw new Error("Signature not found")
      }

      // Create new signature with "(Copy)" suffix
      const response = await fetch("/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${signature.name} (Copy)`,
          content: signature.content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || "Failed to duplicate signature")
      }

      setSuccessMessage("Signature duplicated successfully!")
      loadSignatures()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while duplicating signature."
      )
    } finally {
      setIsDuplicating(false)
      setDuplicatingSignatureId(null)
    }
  }

  const handleDeleteClick = (signatureId: string) => {
    setDeletingSignatureIds([signatureId])
  }

  const handleBulkDeleteClick = () => {
    if (selectedSignatures.size > 0) {
      setDeletingSignatureIds(Array.from(selectedSignatures))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSignatureIds || deletingSignatureIds.length === 0) return

    try {
      setIsDeleting(true)

      const response = await fetch("/api/signatures", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: deletingSignatureIds }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || "Failed to delete signature(s)")
      }

      const count = deletingSignatureIds.length
      setSuccessMessage(
        `Successfully deleted ${count} signature${count > 1 ? "s" : ""}`
      )
      setSelectedSignatures(new Set())
      setDeletingSignatureIds(null)
      loadSignatures()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting signature(s)."
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSignatures(new Set(filteredAndSortedSignatures.map((s) => s.id)))
    } else {
      setSelectedSignatures(new Set())
    }
  }

  const handleSelectSignature = (signatureId: string, checked: boolean) => {
    const newSelected = new Set(selectedSignatures)
    if (checked) {
      newSelected.add(signatureId)
    } else {
      newSelected.delete(signatureId)
    }
    setSelectedSignatures(newSelected)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  // Filter and sort signatures
  const filteredAndSortedSignatures = useMemo(() => {
    const filtered = filterSignatures(signatures, searchQuery)
    return sortSignatures(filtered, sortBy, sortOrder)
  }, [signatures, searchQuery, sortBy, sortOrder])

  const allSelected =
    filteredAndSortedSignatures.length > 0 &&
    filteredAndSortedSignatures.every((sig) =>
      selectedSignatures.has(sig.id)
    )
  const someSelected =
    filteredAndSortedSignatures.some((sig) => selectedSignatures.has(sig.id)) &&
    !allSelected

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Email Signatures
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Create and manage reusable email signatures for your communications.
          </p>
        </div>

        <Button onClick={() => {
          setEditingSignature(null)
          setIsModalOpen(true)
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Signature
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Signatures</span>
            <span className="text-xs font-normal text-muted-foreground">
              {signatures.length} {signatures.length === 1 ? "signature" : "signatures"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Sort Controls */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search signatures by name or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortBy)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="updatedAt">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="gap-2"
              >
                {sortOrder === "asc" ? (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Ascending
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    Descending
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedSignatures.size > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedSignatures.size} signature{selectedSignatures.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSignatures(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Loading signatures...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col h-32 items-center justify-center gap-3 text-sm text-red-600">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadSignatures}>
                Retry
              </Button>
            </div>
          ) : filteredAndSortedSignatures.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                {searchQuery ? (
                  <Search className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Plus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">
                  {searchQuery
                    ? "No signatures found"
                    : "No signatures yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : 'Get started by creating your first email signature using the "Add Signature" button above.'}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all signatures"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSignatures.map((signature) => (
                  <TableRow
                    key={signature.id}
                    className={selectedSignatures.has(signature.id) ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedSignatures.has(signature.id)}
                        onCheckedChange={(checked) =>
                          handleSelectSignature(signature.id, checked as boolean)
                        }
                        aria-label={`Select ${signature.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {signature.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(signature.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(signature.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(signature)}
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${signature.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(signature.id)}
                          disabled={isDuplicating && duplicatingSignatureId === signature.id}
                          className="h-8 w-8 p-0"
                          aria-label={`Duplicate ${signature.name}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(signature.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label={`Delete ${signature.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="text-xs text-muted-foreground">
                Showing {filteredAndSortedSignatures.length} of {signatures.length}{" "}
                {signatures.length === 1 ? "signature" : "signatures"}
                {searchQuery && ` matching "${searchQuery}"`}
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Modal */}
      <AddSignatureModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) {
            setEditingSignature(null)
          }
        }}
        onSuccess={handleSuccess}
        signature={editingSignature}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingSignatureIds !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSignatureIds(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingSignatureIds && deletingSignatureIds.length === 1
                ? "Delete Signature?"
                : `Delete ${deletingSignatureIds?.length || 0} Signatures?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSignatureIds && deletingSignatureIds.length === 1 ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong>
                    {
                      signatures.find(
                        (s) => s.id === deletingSignatureIds[0]
                      )?.name
                    }
                  </strong>
                  ? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{deletingSignatureIds?.length || 0} signatures</strong>?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
