"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Download, FileSpreadsheet, Filter, Globe, Loader2, Mail, Plus, RefreshCw, Search, Trash2, Pencil, Play, X, XCircle } from "lucide-react"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

type ExportColumnKey =
  | "rowIndex"
  | "businessEmail"
  | "websiteUrl"
  | "emailStatus"
  | "hasReplied"

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

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")
  const [exportScope, setExportScope] = useState<
    "currentPage" | "selectedRows" | "allMatching"
  >("allMatching")
  const [exportMaxRows, setExportMaxRows] = useState<string>("1000")
  const [exportIncludeHeaders, setExportIncludeHeaders] = useState(true)
  const [exportFileNameBase, setExportFileNameBase] = useState<string>("")
  const [exportCsvDelimiter, setExportCsvDelimiter] = useState<"," | ";" | "\t">(
    ","
  )
  const [exportColumns, setExportColumns] = useState<Record<ExportColumnKey, boolean>>({
    rowIndex: true,
    businessEmail: true,
    websiteUrl: true,
    emailStatus: true,
    hasReplied: true,
  })
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [filterDraft, setFilterDraft] = useState<Record<string, string | null>>({})

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
      const res = await fetch(`/api/lead-files/${encodeURIComponent(id)}`)
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
      if (filterValues["emailStatus"] && filterValues["emailStatus"] !== "any") {
        params.set("emailStatus", filterValues["emailStatus"] as string)
      }
      if (filterValues["hasReplied"] && filterValues["hasReplied"] !== "any") {
        params.set("hasReplied", filterValues["hasReplied"] as string)
      }
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

  function buildRowsQueryParams(page: number, pageSize: number) {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    if (searchQuery.trim()) params.set("search", searchQuery.trim())
    params.set("sortBy", sortBy)
    params.set("sortOrder", sortOrder)
    if (filterValues["businessEmail"] === "true") params.set("hasEmail", "true")
    if (filterValues["businessEmail"] === "false") params.set("hasEmail", "false")
    if (filterValues["websiteUrl"] === "true") params.set("hasUrl", "true")
    if (filterValues["websiteUrl"] === "false") params.set("hasUrl", "false")
    if (filterValues["emailStatus"] && filterValues["emailStatus"] !== "any") {
      params.set("emailStatus", filterValues["emailStatus"] as string)
    }
    if (filterValues["hasReplied"] && filterValues["hasReplied"] !== "any") {
      params.set("hasReplied", filterValues["hasReplied"] as string)
    }
    return params
  }

  function sanitizeFileName(name: string): string {
    return name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120)
  }

  function toExportRecords(exportRows: LeadRow[]) {
    const allColumns: Array<{
      key: ExportColumnKey
      label: string
      getValue: (row: LeadRow) => unknown
    }> = [
      {
        key: "rowIndex",
        label: "Row index",
        getValue: (r) => (typeof r.rowIndex === "number" ? r.rowIndex + 1 : ""),
      },
      { key: "businessEmail", label: "Business email", getValue: (r) => r.businessEmail ?? "" },
      { key: "websiteUrl", label: "Website URL", getValue: (r) => r.websiteUrl ?? "" },
      { key: "emailStatus", label: "Email status", getValue: (r) => (r as any).emailStatus ?? "" },
      { key: "hasReplied", label: "Has replied", getValue: (r) => (r as any).hasReplied ?? "" },
    ]

    const selected = allColumns.filter((c) => exportColumns[c.key])
    const cols = selected.length > 0 ? selected : allColumns

    return exportRows.map((r) => {
      const rec: Record<string, unknown> = {}
      for (const c of cols) rec[c.label] = c.getValue(r)
      return rec
    })
  }

  function downloadCSV(records: Record<string, unknown>[], fileNameBase: string) {
    const cols = Object.keys(records[0] ?? {})
    const escape = (v: unknown) => {
      const str = v == null ? "" : String(v)
      if (str.includes(exportCsvDelimiter) || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    const lines: string[] = []
    if (exportIncludeHeaders) {
      lines.push(cols.map(escape).join(exportCsvDelimiter))
    }
    for (const rec of records) {
      lines.push(cols.map((c) => escape((rec as any)[c])).join(exportCsvDelimiter))
    }
    const csv = lines.join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileNameBase}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadExcel(records: Record<string, unknown>[], fileNameBase: string) {
    const XLSX = (await import("xlsx")).default
    const ws = XLSX.utils.json_to_sheet(records, { skipHeader: !exportIncludeHeaders })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rows")
    XLSX.writeFile(wb, `${fileNameBase}.xlsx`)
  }

  const handleExport = async () => {
    if (!id || !leadSheet || exporting) return
    setExportError(null)
    setExporting(true)
    try {
      let exportRows: LeadRow[] = []

      if (exportScope === "currentPage") {
        exportRows = rows
      } else if (exportScope === "selectedRows") {
        exportRows = rows.filter((r) => selectedRowIds.has(r.id))
      } else {
        const pageSize = 100
        const maxRowsParsed = parseInt(exportMaxRows, 10)
        const maxRows =
          Number.isFinite(maxRowsParsed) && maxRowsParsed > 0 ? maxRowsParsed : 1000

        let page = 1
        let total = Infinity
        while (exportRows.length < maxRows && exportRows.length < total) {
          const params = buildRowsQueryParams(page, pageSize)
          const res = await fetch(
            `/api/lead-files/${encodeURIComponent(id)}/rows?${params.toString()}`
          )
          if (!res.ok) {
            const data = await res.json().catch(() => null)
            throw new Error(data?.error ?? "Failed to export rows")
          }
          const data = (await res.json()) as { rows: LeadRow[]; total: number }
          total = typeof data.total === "number" ? data.total : total
          const batch = Array.isArray(data.rows) ? data.rows : []
          if (batch.length === 0) break
          exportRows.push(...batch)
          page += 1
        }

        exportRows = exportRows.slice(0, maxRows)
      }

      if (exportRows.length === 0) {
        throw new Error("No rows to export with the current selection/filters.")
      }

      const records = toExportRecords(exportRows)
      const base = sanitizeFileName(leadSheet.sheetName || "lead-sheet")
      const date = new Date().toISOString().slice(0, 10)
      const rawName = exportFileNameBase.trim()
      const cleanedName = sanitizeFileName(rawName.replace(/\.(csv|xlsx)$/i, ""))
      const fileNameBase =
        cleanedName || `${base}-rows-${date}`

      if (exportFormat === "csv") {
        downloadCSV(records, fileNameBase)
      } else {
        await downloadExcel(records, fileNameBase)
      }

      setExportDialogOpen(false)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Failed to export rows")
    } finally {
      setExporting(false)
    }
  }

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

  // Load rows when sheet or query changes
  useEffect(() => {
    if (!id || !leadSheet) return
    void loadRows()
  }, [id, leadSheet, loadRows])

  // Reindex rows in the background once per session per sheet (so it doesn't block initial load)
  useEffect(() => {
    if (!id || !leadSheet) return
    if (typeof window === "undefined") return
    const key = `lead-sheet-${id}-reindexed`
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, "true")
    void fetch(`/api/lead-files/${encodeURIComponent(id)}/rows/reindex`, {
      method: "POST",
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when opening sheet
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

  const activeFilterCount = LEAD_ROW_FILTERABLE_FIELDS.filter(
    (f) => filterValues[f.key] != null
  ).length
  const hasActiveFilters = Boolean(
    searchQuery.trim() || activeFilterCount > 0
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

  const handleSortClick = (key: LeadRowFieldKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(key)
      setSortOrder("asc")
    }
    setRowsPage(1)
  }

  if (isLoading) {
    return (
      <PageShell
        title="Lead sheet"
        description="Loading lead sheet details..."
        actions={backToLeadsButton}
        maxWidth="default"
        className="space-y-6"
      >
        <LeadDetailNav currentLabel="Lead sheet" />
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
        title="Lead sheet"
        description="The requested lead sheet could not be found."
        maxWidth="default"
        className="space-y-6"
      >
        <LeadDetailNav currentLabel="Not found" />
        <EmptyState
          icon={FileSpreadsheet}
          title="Lead sheet not found"
          description="This lead sheet may have been deleted or you may not have access to it."
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
        title="Lead sheet"
        description="Something went wrong while loading this lead sheet."
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const base = sanitizeFileName(leadSheet?.sheetName || "lead-sheet")
                    const date = new Date().toISOString().slice(0, 10)
                    setExportFileNameBase(`${base}-rows-${date}`)
                    setExportScope(selectedRowIds.size > 0 ? "selectedRows" : "allMatching")
                    setExportDialogOpen(true)
                  }}
                  className="gap-2"
                  aria-label="Export lead rows"
                  disabled={rowsTotal === 0}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Export
                </Button>
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
                  <div className="space-y-3">
                    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                          type="search"
                          placeholder="Search rows..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="h-10 pl-9 bg-background/80 transition-colors placeholder:text-muted-foreground focus-visible:ring-2"
                          aria-label="Search lead rows"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            Clear filters ({activeFilterCount})
                          </button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFilterDraft(filterValues)
                            setFilterDialogOpen(true)
                          }}
                          className="gap-2"
                          aria-label="Open filters"
                        >
                          <Filter className="h-4 w-4" aria-hidden />
                          Filters
                          {activeFilterCount > 0 && (
                            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">
                              {activeFilterCount}
                            </span>
                          )}
                        </Button>
                      </div>
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
                            {LEAD_ROW_TABLE_COLUMNS.filter(
                              (col) => col.key !== "hasReplied" && col.key !== "emailStatus"
                            ).map((col) => {
                              const isSortable = col.sortable
                              const isActive = sortBy === col.key
                              const label = col.key === "rowIndex" ? "#" : col.label
                              return (
                                <TableHead
                                  key={col.key}
                                  className={col.key === "rowIndex" ? "w-4" : "w-1/5"}
                                >
                                  {isSortable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSortClick(col.key)}
                                      className="inline-flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                                      aria-label={`Sort by ${col.label} ${isActive ? (sortOrder === "asc" ? "ascending" : "descending") : ""}`}
                                    >
                                      {label}
                                      {isActive &&
                                        (sortOrder === "asc" ? (
                                          <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
                                        ) : (
                                          <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                                        ))}
                                    </button>
                                  ) : (
                                    label
                                  )}
                                </TableHead>
                              )
                            })}
                            {(["emailStatus", "hasReplied"] as const).map((key) => {
                              const col = LEAD_ROW_TABLE_COLUMNS.find((c) => c.key === key)
                              if (!col) return null
                              const isActive = sortBy === key
                              return (
                                <TableHead key={key} className="w-1/5">
                                  <button
                                    type="button"
                                    onClick={() => handleSortClick(key)}
                                    className="inline-flex items-center gap-1 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                                    aria-label={`Sort by ${col.label} ${isActive ? (sortOrder === "asc" ? "ascending" : "descending") : ""}`}
                                  >
                                    {col.label}
                                    {isActive &&
                                      (sortOrder === "asc" ? (
                                        <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
                                      ) : (
                                        <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                                      ))}
                                  </button>
                                </TableHead>
                              )
                            })}
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
                              {LEAD_ROW_TABLE_COLUMNS.filter(
                                (col) =>
                                  col.key !== "hasReplied" && col.key !== "emailStatus"
                              ).map((col) => {
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

      <Dialog
        open={filterDialogOpen}
        onOpenChange={(open) => {
          setFilterDialogOpen(open)
          if (!open) setFilterDraft({})
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter rows</DialogTitle>
            <DialogDescription>
              Refine rows by email, website, status, and reply state. Filters apply on top of your search.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Business email</Label>
                <Select
                  value={filterDraft["businessEmail"] ?? "any"}
                  onValueChange={(v) =>
                    setFilterDraft((prev) => ({ ...prev, businessEmail: v === "any" ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Has email</SelectItem>
                    <SelectItem value="false">No email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Website URL</Label>
                <Select
                  value={filterDraft["websiteUrl"] ?? "any"}
                  onValueChange={(v) =>
                    setFilterDraft((prev) => ({ ...prev, websiteUrl: v === "any" ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Has URL</SelectItem>
                    <SelectItem value="false">No URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Email status</Label>
                <Select
                  value={filterDraft["emailStatus"] ?? "any"}
                  onValueChange={(v) =>
                    setFilterDraft((prev) => ({ ...prev, emailStatus: v === "any" ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Not Eligible">Not Eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Has replied</Label>
                <Select
                  value={filterDraft["hasReplied"] ?? "any"}
                  onValueChange={(v) =>
                    setFilterDraft((prev) => ({ ...prev, hasReplied: v === "any" ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <span className="type-caption text-muted-foreground">Active filters:</span>
                {LEAD_ROW_FILTERABLE_FIELDS.map((field) => {
                  const v = filterValues[field.key]
                  if (v == null) return null

                  let label: string
                  if (field.key === "businessEmail") {
                    label = v === "true" ? "Has email" : "No email"
                  } else if (field.key === "websiteUrl") {
                    label = v === "true" ? "Has URL" : "No URL"
                  } else {
                    label = v
                  }

                  return (
                    <span
                      key={field.key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() =>
                          setFilterValues((prev) => ({ ...prev, [field.key]: null }))
                        }
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Clear ${label} filter`}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  )
                })}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilterDialogOpen(false)
                setFilterDraft({})
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFilterValues(filterDraft)
                setRowsPage(1)
                setFilterDialogOpen(false)
              }}
            >
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={(open) => {
        setExportDialogOpen(open)
        if (!open) setExportError(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export rows</DialogTitle>
            <DialogDescription>
              Export rows from this lead sheet. Choose format, which rows to export, columns, and file name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {exportError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {exportError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="export-file-name" className="text-sm font-medium text-foreground">
                File name
              </Label>
              <Input
                id="export-file-name"
                value={exportFileNameBase}
                onChange={(e) => setExportFileNameBase(e.target.value)}
                placeholder="e.g. my-sheet-rows-2026-02-05"
              />
              <p className="text-xs text-muted-foreground">
                Extension is added automatically based on file type.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">File type</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Rows</Label>
              <Select
                value={exportScope}
                onValueChange={(v) =>
                  setExportScope(v as "currentPage" | "selectedRows" | "allMatching")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentPage">Current page ({rows.length} rows)</SelectItem>
                  {selectedRowIds.size > 0 && (
                    <SelectItem value="selectedRows">
                      Selected rows (current page) ({rows.filter((r) => selectedRowIds.has(r.id)).length})
                    </SelectItem>
                  )}
                  <SelectItem value="allMatching">All matching rows (filtered)</SelectItem>
                </SelectContent>
              </Select>
              {exportScope === "allMatching" && (
                <div className="space-y-2">
                  <Label htmlFor="export-max-rows" className="text-sm text-muted-foreground">
                    Max rows
                  </Label>
                  <Input
                    id="export-max-rows"
                    type="number"
                    min={1}
                    max={50000}
                    value={exportMaxRows}
                    onChange={(e) => setExportMaxRows(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="export-include-headers"
                  checked={exportIncludeHeaders}
                  onCheckedChange={(v) => setExportIncludeHeaders(Boolean(v))}
                />
                <Label htmlFor="export-include-headers" className="text-sm text-muted-foreground">
                  Include headers
                </Label>
              </div>
            </div>

            {exportFormat === "csv" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">CSV delimiter</Label>
                <Select
                  value={exportCsvDelimiter}
                  onValueChange={(v) => setExportCsvDelimiter(v as "," | ";" | "\t")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Columns</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-col-rowIndex"
                    checked={exportColumns.rowIndex}
                    onCheckedChange={(v) =>
                      setExportColumns((prev) => ({ ...prev, rowIndex: Boolean(v) }))
                    }
                  />
                  <Label htmlFor="export-col-rowIndex" className="text-sm text-muted-foreground">
                    Row index
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-col-businessEmail"
                    checked={exportColumns.businessEmail}
                    onCheckedChange={(v) =>
                      setExportColumns((prev) => ({ ...prev, businessEmail: Boolean(v) }))
                    }
                  />
                  <Label htmlFor="export-col-businessEmail" className="text-sm text-muted-foreground">
                    Business email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-col-websiteUrl"
                    checked={exportColumns.websiteUrl}
                    onCheckedChange={(v) =>
                      setExportColumns((prev) => ({ ...prev, websiteUrl: Boolean(v) }))
                    }
                  />
                  <Label htmlFor="export-col-websiteUrl" className="text-sm text-muted-foreground">
                    Website URL
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-col-emailStatus"
                    checked={exportColumns.emailStatus}
                    onCheckedChange={(v) =>
                      setExportColumns((prev) => ({ ...prev, emailStatus: Boolean(v) }))
                    }
                  />
                  <Label htmlFor="export-col-emailStatus" className="text-sm text-muted-foreground">
                    Email status
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-col-hasReplied"
                    checked={exportColumns.hasReplied}
                    onCheckedChange={(v) =>
                      setExportColumns((prev) => ({ ...prev, hasReplied: Boolean(v) }))
                    }
                  />
                  <Label htmlFor="export-col-hasReplied" className="text-sm text-muted-foreground">
                    Has replied
                  </Label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExportColumns({
                      rowIndex: true,
                      businessEmail: true,
                      websiteUrl: true,
                      emailStatus: true,
                      hasReplied: true,
                    })
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExportColumns({
                      rowIndex: false,
                      businessEmail: false,
                      websiteUrl: false,
                      emailStatus: false,
                      hasReplied: false,
                    })
                  }
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleExport()} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            : toastMessage === "Row updated"
              ? "The lead row has been updated."
              : toastMessage === "Send mail triggered successfully"
                ? "Emails are being sent in the background."
                : null}
        </ToastDescription>
      </Toast>
    </PageShell>
  )
}
