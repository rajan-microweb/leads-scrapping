"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, FileSpreadsheet, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/EmptyState"
import { ErrorMessage } from "@/components/ErrorMessage"

type LeadFile = {
  id: string
  fileName: string
  uploadedAt: string
  signatureName?: string | null
}

type LeadRow = {
  id: string
  rowIndex: number
  businessEmail: string | null
  websiteUrl: string | null
}

function getFileTypeFromName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  if (dotIndex === -1 || dotIndex === fileName.length - 1) return "Unknown"
  return fileName.substring(dotIndex + 1).toUpperCase()
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

export default function LeadDetailPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null
  const [leadFile, setLeadFile] = useState<LeadFile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [rows, setRows] = useState<LeadRow[]>([])
  const [rowsTotal, setRowsTotal] = useState(0)
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)
  const [rowsPage, setRowsPage] = useState(1)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [addRowsCount, setAddRowsCount] = useState(10)
  const [addingRows, setAddingRows] = useState(false)

  const loadLeadFile = useCallback(async () => {
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
        setLeadFile(null)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to load lead file")
      }
      const data = (await res.json()) as LeadFile
      setLeadFile(data)
      setNotFound(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading the lead file."
      )
      setLeadFile(null)
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
      const from = (rowsPage - 1) * ROWS_PAGE_SIZE
      const to = from + ROWS_PAGE_SIZE - 1
      const res = await fetch(
        `/api/lead-files/${encodeURIComponent(id)}/rows?page=${rowsPage}&pageSize=${ROWS_PAGE_SIZE}`
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
  }, [id, rowsPage])

  useEffect(() => {
    void loadLeadFile()
  }, [loadLeadFile])

  useEffect(() => {
    if (id && leadFile) void loadRows()
  }, [id, leadFile, loadRows])

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
        <LeadDetailNav currentLabel="Lead file" />
        <ErrorMessage message={error} onRetry={loadLeadFile} />
      </PageShell>
    )
  }

  if (!leadFile) {
    return <></>
  }

  const fileType = getFileTypeFromName(leadFile.fileName)
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

  const handleAddRows = async () => {
    if (!id || addingRows) return
    const n = Math.max(1, Math.min(100, addRowsCount))
    setAddingRows(true)
    try {
      const res = await fetch(
        `/api/lead-files/${encodeURIComponent(id)}/rows`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: Array.from({ length: n }, () => ({
              businessEmail: null,
              websiteUrl: null,
            })),
          }),
        }
      )
      if (!res.ok) throw new Error("Failed to add rows")
      await loadRows()
    } catch {
      setRowsError("Failed to add rows")
    } finally {
      setAddingRows(false)
    }
  }

  return (
    <PageShell
      title={leadFile.fileName}
      description="Details for this uploaded lead file."
      actions={backToLeadsButton}
      maxWidth="default"
      className="space-y-6"
    >
      <LeadDetailNav currentLabel={leadFile.fileName} />
      <div className="grid gap-6">
        <Card className="border border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="type-card-title">File details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="type-caption text-muted-foreground">
                File name
              </span>
              <p className="type-body font-medium">{leadFile.fileName}</p>
            </div>
            <div className="grid gap-1">
              <span className="type-caption text-muted-foreground">Type</span>
              <p className="type-body">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-sm font-medium text-muted-foreground">
                  {fileType}
                </span>
              </p>
            </div>
            <div className="grid gap-1">
              <span className="type-caption text-muted-foreground">
                Uploaded at
              </span>
              <p className="type-body">
                {new Date(leadFile.uploadedAt).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-1">
              <span className="type-caption text-muted-foreground">
                Signature
              </span>
              <p className="type-body text-muted-foreground">
                {leadFile.signatureName ?? "No signature"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-card min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="type-card-title">Lead rows</CardTitle>
            <p className="type-caption text-muted-foreground">
              Business emails and website URLs from this file.
            </p>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
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
            {!rowsError && !rowsLoading && rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No rows yet. Import a file from the Leads page to see data here, or add rows below.
              </p>
            )}
            {!rowsError && !rowsLoading && rows.length > 0 && (
              <>
                <div className="w-full overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allOnPageSelected}
                            onCheckedChange={(v) =>
                              handleSelectAllRows(v === true)
                            }
                            aria-label="Select all rows on this page"
                          />
                        </TableHead>
                        <TableHead className="w-12">%</TableHead>
                        <TableHead>Business Emails</TableHead>
                        <TableHead>Website URLs</TableHead>
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
                          <TableCell className="text-muted-foreground">
                            {row.rowIndex + 1}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.businessEmail ?? ""}>
                            {row.businessEmail ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.websiteUrl ?? ""}>
                            {row.websiteUrl ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {rowsTotalPages > 1 && (
                  <Pagination
                    currentPage={rowsPage}
                    totalPages={rowsTotalPages}
                    onPageChange={setRowsPage}
                    totalItems={rowsTotal}
                    pageSize={ROWS_PAGE_SIZE}
                    itemLabel="row"
                  />
                )}
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRows}
                disabled={addingRows}
                className="gap-2"
              >
                {addingRows ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add
                  </>
                )}
              </Button>
              <Input
                type="number"
                min={1}
                max={100}
                value={addRowsCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!Number.isNaN(v)) setAddRowsCount(v)
                }}
                className="w-16"
                aria-label="Number of rows to add"
              />
              <span className="text-sm text-muted-foreground">
                more rows at the bottom
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
