"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Plus, RefreshCw, Search, Trash2, Pencil, Play, XCircle } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Pagination } from "@/components/ui/pagination"
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast"
import {
  LEAD_ROW_FIELDS,
  LEAD_ROW_FILTERABLE_FIELDS,
  LEAD_ROW_SORTABLE_KEYS,
  LEAD_ROW_TABLE_COLUMNS,
  type LeadRowFieldKey,
} from "@/config/lead-row-fields"
import { LeadRowFormSidebar, type LeadRow } from "@/components/leads/LeadRowFormSidebar"
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/EmptyState"
import { ErrorMessage } from "@/components/ErrorMessage"

type LeadSheet = {
  id: string
  sheetName: string
  uploadedAt: string
  sourceFileExtension?: string | null
  signatureName?: string | null
}

const backToLeadsButton = (
  <Button variant="outline" size="sm" asChild>
    <Link href="/leads" className="gap-2">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to Leads
    </Link>
  </Button>
)

function LeadDetailNav({ currentLabel }: { currentLabel: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Link
        href="/leads"
        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors"
      >
        Leads
      </Link>
      <span aria-hidden className="select-none">
        /
      </span>
      <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">
        {currentLabel}
      </span>
    </nav>
  )
}

const ROWS_PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

type SortOrder = "asc" | "desc"

export default function LeadDetailPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null
  const [leadSheet, setLeadSheet] = useState<LeadSheet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [rows, setRows] = useState<LeadRow[]>([])
  const [rowsTotal, setRowsTotal] = useState(0)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)
  const [rowsPage, setRowsPage] = useState(1)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<LeadRowFieldKey>(
    LEAD_ROW_SORTABLE_KEYS[0] ?? "rowIndex"
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [filterValues, setFilterValues] = useState<Record<string, string | null>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<"add" | "edit">("add")
  const [editingRow, setEditingRow] = useState<LeadRow | null>(null)
  const [deletingRowIds, setDeletingRowIds] = useState<string[] | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [selectedAction, setSelectedAction] = useState<string>("send_mail")
  const [rowsToRun, setRowsToRun] = useState<string>("1")
  const [isRunning, setIsRunning] = useState(false)

  const loadLeadSheet = useCallback(async () => {
    if (!id) {
      setIsLoading(false)
      setNotFound(true)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      setNotFound(false)
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`)
      if (res.status === 404) {
        setNotFound(true)
        setLeadSheet(null)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to load lead sheet")
      }
      const data = (await res.json()) as LeadSheet
      setLeadSheet(data)
      setNotFound(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading the lead sheet."
      )
      setLeadSheet(null)
      setNotFound(false)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const loadRows = useCallback(async () => {
    if (!id) return
    try {
      setRowsLoading(true)
      setRowsError(null)
      const params = new URLSearchParams()
      params.set("page", String(rowsPage))
      params.set("pageSize", String(ROWS_PAGE_SIZE))
      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      if (filterValues["businessEmail"] === "true") params.set("hasEmail", "true")
      if (filterValues["businessEmail"] === "false") params.set("hasEmail", "false")
      if (filterValues["websiteUrl"] === "true") params.set("hasUrl", "true")
      if (filterValues["websiteUrl"] === "false") params.set("hasUrl", "false")
      const res = await fetch(
        `/api/lead-files/${encodeURIComponent(id)}/rows?${params.toString()}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to load rows")
      }
      const data = (await res.json()) as { rows: LeadRow[]; total: number }
      setRows(data.rows ?? [])
      setRowsTotal(data.total ?? 0)
    } catch (err) {
      setRowsError(
        err instanceof Error ? err.message : "Failed to load rows"
      )
      setRows([])
      setRowsTotal(0)
    } finally {
      setRowsLoading(false)
    }
  }, [id, rowsPage, searchQuery, sortBy, sortOrder, filterValues])

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setRowsPage(1)
  }, [searchQuery, sortBy, sortOrder, filterValues])

  useEffect(() => {
    if (rowsPage > 1 && rowsTotal > 0) {
      const maxPage = Math.ceil(rowsTotal / ROWS_PAGE_SIZE)
      if (rowsPage > maxPage) setRowsPage(Math.max(1, maxPage))
    }
  }, [rowsPage, rowsTotal])

  useEffect(() => {
    void loadLeadSheet()
  }, [loadLeadSheet])

  // When lead sheet is opened: re-sequence row indices (1,2,6 → 1,2,3) then load rows
  useEffect(() => {
    if (!id || !leadSheet) return
    void (async () => {
      await fetch(`/api/lead-files/${encodeURIComponent(id)}/rows/reindex`, {
        method: "POST",
      }).catch(() => {})
      await loadRows()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reindex when opening sheet, not on loadRows deps
  }, [id, leadSheet])

  const handleRunAction = async () => {
    if (!id) return
    const count = Math.max(1, Math.min(500, parseInt(rowsToRun, 10) || 1))
    const useSelected = selectedRowIds.size > 0
    const payload = useSelected
      ? { action: selectedAction, rowIds: Array.from(selectedRowIds) }
      : { action: selectedAction, rowCount: count }

    setIsRunning(true)
    try {
      const res = await fetch(`/api/lead-files/${encodeURIComponent(id)}/run-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to run action")
      }
      setToastMessage("Send mail triggered successfully")
      setToastOpen(true)
      void loadRows()
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : "Failed to run action")
    } finally {
      setIsRunning(false)
    }
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      LEAD_ROW_FILTERABLE_FIELDS.some((f) => filterValues[f.key] != null)
  )

  const handleDeleteClick = (rowId: string) => {
    setDeletingRowIds([rowId])
  }

  const handleBulkDeleteClick = () => {
    if (selectedRowIds.size > 0) setDeletingRowIds(Array.from(selectedRowIds))
  }

  const handleDeleteConfirm = async () => {
    if (!id || !deletingRowIds || deletingRowIds.length === 0) return
    setIsDeleting(true)
    try {
      const res = await fetch(
        `/api/lead-files/${encodeURIComponent(id)}/rows`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: deletingRowIds }),
        }
      )
      if (!res.ok) throw new Error("Failed to delete rows")
      setSelectedRowIds((prev) => {
        const next = new Set(prev)
        deletingRowIds.forEach((rid) => next.delete(rid))
        return next
      })
      setDeletingRowIds(null)
      await loadRows()
    } catch {
      setRowsError("Failed to delete rows")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddClick = () => {
    setSidebarMode("add")
    setEditingRow(null)
    setSidebarOpen(true)
  }

  const handleEditClick = (row: LeadRow) => {
    setSidebarMode("edit")
    setEditingRow(row)
    setSidebarOpen(true)
  }

  const handleSidebarSuccess = (mode: "add" | "edit") => {
    setToastMessage(mode === "add" ? "Row added" : "Row updated")
    setToastOpen(true)
    void loadRows()
  }

  const clearFilters = () => {
    setSearchInput("")
    setSearchQuery("")
    setFilterValues(
      LEAD_ROW_FILTERABLE_FIELDS.reduce(
        (acc, f) => ({ ...acc, [f.key]: null }),
        {} as Record<string, string | null>
      )
    )
    setRowsPage(1)
  }

  if (isLoading) {
    return (
      <PageShell
        title="Lead file"
        description="Loading lead file details..."
        actions={backToLeadsButton}
        maxWidth="default"
        className="space-y-6"
      >
        <LeadDetailNav currentLabel="Lead file" />
        <div className="grid gap-4">
          <Card className="border border-border/60 shadow-card">
            <CardHeader>
              <div className="type-card-title h-6 w-48 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    )
  }

  if (notFound) {
    return (
      <PageShell
        title="Lead file"
        description="The requested lead file could not be found."
        maxWidth="default"
        className="space-y-6"
      >
        <LeadDetailNav currentLabel="Not found" />
        <EmptyState
          icon={FileSpreadsheet}
          title="Lead file not found"
          description="This lead file may have been deleted or you may not have access to it."
          action={
            <Button asChild>
              <Link href="/leads" className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to Leads
              </Link>
            </Button>
          }
        />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell
        title="Lead file"
        description="Something went wrong while loading this lead file."
        actions={backToLeadsButton}
        maxWidth="default"
        className="space-y-6"
      >
        <LeadDetailNav currentLabel="Lead sheet" />
        <ErrorMessage message={error} onRetry={loadLeadSheet} />
      </PageShell>
    )
  }

  if (!leadSheet) {
    return <></>
  }

  const rowsTotalPages = Math.max(
    1,
    Math.ceil(rowsTotal / ROWS_PAGE_SIZE)
  )
  const currentPageRowIds = rows.map((r) => r.id)
  const allOnPageSelected =
    currentPageRowIds.length > 0 &&
    currentPageRowIds.every((rid) => selectedRowIds.has(rid))

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds((prev) => new Set([...prev, ...currentPageRowIds]))
    } else {
      setSelectedRowIds((prev) => {
        const next = new Set(prev)
        currentPageRowIds.forEach((rid) => next.delete(rid))
        return next
      })
    }
  }

  const handleSelectRow = (rowId: string, checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }

  const renderHasReplied = (value: LeadRow["hasReplied"]) => {
    if (value === "YES") {
      return (
        <span className="inline-flex justify-center items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/60">
          YES
        </span>
      )
    }
    if (value === "NO") {
      return (
        <span className="inline-flex justify-center items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-900/60">
          NO
        </span>
      )
    }
    return (
      <span className="inline-flex justify-center items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
        —
      </span>
    )
  }

  return (
    <PageShell
      title={leadSheet.sheetName}
      description="Details for this leads sheet."
      actions={backToLeadsButton}
      maxWidth="default"
      className="space-y-6"
    >
      <LeadDetailNav currentLabel={leadSheet.sheetName} />
      <div className="grid gap-6">
        <Card className="border border-border/60 shadow-card min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="type-card-title">Lead rows</CardTitle>
                <p className="type-caption text-muted-foreground">
                  Business emails and website URLs from this file.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadRows()}
                disabled={rowsLoading}
                className="gap-2"
                aria-label="Refresh table"
              >
                {rowsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            {rowsTotal > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium">Actions</span>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_mail">Send mail</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="rows-to-run" className="text-sm text-muted-foreground whitespace-nowrap">
                    Rows to run
                  </Label>
                  <Input
                    id="rows-to-run"
                    type="number"
                    min={1}
                    max={500}
                    value={rowsToRun}
                    onChange={(e) => setRowsToRun(e.target.value)}
                    className="w-20"
                    disabled={selectedRowIds.size > 0}
                  />
                </div>
                {selectedRowIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedRowIds.size} selected — will use selection)
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={() => void handleRunAction()}
                  disabled={isRunning || rowsTotal === 0}
                  className="gap-2"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden />
                      Run
                    </>
                  )}
                </Button>
              </div>
            )}
            {rowsError && (
              <ErrorMessage
                message={rowsError}
                onRetry={loadRows}
              />
            )}
            {!rowsError && rowsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading rows...
              </div>
            )}
            {!rowsError && !rowsLoading && (
              <>
                {(rowsTotal > 0 || hasActiveFilters) && (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        type="search"
                        placeholder="Search rows..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9"
                        aria-label="Search lead rows"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as LeadRowFieldKey)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_ROW_FIELDS.filter((f) => f.sortable).map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                      {LEAD_ROW_FILTERABLE_FIELDS.map((field) => (
                        <Select
                          key={field.key}
                          value={filterValues[field.key] ?? "any"}
                          onValueChange={(v) =>
                            setFilterValues((prev) => ({
                              ...prev,
                              [field.key]: v === "any" ? null : v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder={`Has ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="true">Has {field.label.toLowerCase()}</SelectItem>
                            <SelectItem value="false">No {field.label.toLowerCase()}</SelectItem>
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>
                )}
                {rows.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? "No rows match your filters."
                        : "No rows yet. Import a file from the Leads page to see data here, or add a row below."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {selectedRowIds.size > 0 && (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedRowIds.size} row{selectedRowIds.size !== 1 ? "s" : ""} selected
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRowIds(new Set())}
                        >
                          Clear selection
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDeleteClick}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete selected
                        </Button>
                      </div>
                    )}
                    <div className="w-full overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-4">
                              <Checkbox
                                checked={allOnPageSelected}
                                onCheckedChange={(v) =>
                                  handleSelectAllRows(v === true)
                                }
                                aria-label="Select all rows on this page"
                              />
                            </TableHead>
                            {LEAD_ROW_TABLE_COLUMNS.filter((col) => col.key !== "hasReplied").map(
                              (col) => (
                                <TableHead
                                  key={col.key}
                                  className={col.key === "rowIndex" ? "w-4" : "w-1/5"}
                                >
                                  {col.key === "rowIndex" ? "%" : col.label}
                                </TableHead>
                              )
                            )}
                            <TableHead className="w-1/5">Email Status</TableHead>
                            <TableHead className="w-1/5">Has replied</TableHead>
                            <TableHead className="w-1 text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRowIds.has(row.id)}
                                  onCheckedChange={(v) =>
                                    handleSelectRow(row.id, v === true)
                                  }
                                  aria-label={`Select row ${row.rowIndex + 1}`}
                                />
                              </TableCell>
                              {LEAD_ROW_TABLE_COLUMNS.filter((col) => col.key !== "hasReplied").map(
                                (col) => {
                                  const value = row[col.key as keyof LeadRow]
                                  if (col.key === "rowIndex" && typeof value === "number") {
                                    return (
                                      <TableCell
                                        key={col.key}
                                        className="w-4 text-muted-foreground"
                                      >
                                        {value + 1}
                                      </TableCell>
                                    )
                                  }
                                  const display = value ?? "—"
                                  const str =
                                    typeof display === "string" ? display : String(display)
                                  return (
                                    <TableCell
                                      key={col.key}
                                      className="w-1/5 truncate"
                                      title={typeof display === "string" ? display : undefined}
                                    >
                                      {str}
                                    </TableCell>
                                  )
                                }
                              )}
                              <TableCell>
                                {(() => {
                                  const status = row.emailStatus ?? "Pending"
                                  if (status === "Sent") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                                        Sent
                                      </span>
                                    )
                                  }
                                  if (status === "Completed") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 text-success">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                                        Completed
                                      </span>
                                    )
                                  }
                                  if (status === "Failed") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 text-destructive">
                                        <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                                        Failed
                                      </span>
                                    )
                                  }
                                  if (status === "Not Eligible") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 text-destructive">
                                        <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                                        Not Eligible
                                      </span>
                                    )
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                      Pending
                                    </span>
                                  )
                                })()}
                              </TableCell>
                              <TableCell>
                                {renderHasReplied(row.hasReplied ?? null)}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    onClick={() => handleEditClick(row)}
                                    aria-label={`Edit row ${row.rowIndex + 1}`}
                                  >
                                    <Pencil className="h-5 w-5" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                  className="h-10 w-10 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteClick(row.id)}
                                    aria-label={`Delete row ${row.rowIndex + 1}`}
                                  >
                                    <Trash2 className="h-5 w-5" aria-hidden />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={rowsPage}
                      totalPages={rowsTotalPages}
                      onPageChange={setRowsPage}
                      totalItems={rowsTotal}
                      pageSize={ROWS_PAGE_SIZE}
                      itemLabel="row"
                      filterNote={hasActiveFilters ? " (filtered)" : undefined}
                    />
                  </>
                )}
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddClick}
                className="gap-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Button>
              <span className="text-sm text-muted-foreground">
                Add a new lead row
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={deletingRowIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingRowIds(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead row(s)</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRowIds?.length === 1
                ? "Are you sure you want to delete this lead row? This cannot be undone."
                : `Are you sure you want to delete these ${deletingRowIds?.length ?? 0} lead rows? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteConfirm()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {id && (
        <LeadRowFormSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          mode={sidebarMode}
          row={editingRow}
          leadFileId={id}
          onSuccess={handleSidebarSuccess}
        />
      )}

      <Toast open={toastOpen} onOpenChange={setToastOpen} variant="success">
        <ToastTitle>{toastMessage}</ToastTitle>
        <ToastDescription>
          {toastMessage === "Row added"
            ? "The new lead row has been added."
            : "The lead row has been updated."}
        </ToastDescription>
      </Toast>
    </PageShell>
  )
}
