"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock, FileSpreadsheet, UploadCloud, Plus, Loader2, Search, Trash2, ArrowUp, ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
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
import { PageShell } from "@/components/layout/PageShell"
import { EmptyState } from "@/components/EmptyState"
import { ErrorMessage } from "@/components/ErrorMessage"
import { TableSkeleton } from "@/components/TableSkeleton"
import { Pagination } from "@/components/ui/pagination"
import {
  MAPPABLE_IMPORT_FIELDS,
  suggestMapping,
} from "@/config/lead-import"
import {
  REJECT_REASON_LABELS,
  type RejectReason,
} from "@/lib/lead-import-filters"

type LeadSheet = {
  id: string
  sheetName: string
  uploadedAt: string
  sourceFileExtension?: string | null
  signatureName?: string | null
}

type Signature = {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]
const CREATE_NEW_SIGNATURE_VALUE = "__create_new_signature__"
/** Sentinel for "Don't map" in column mapping Select (Radix Select disallows empty string value). */
const DONT_MAP_VALUE = "__dont_map__"
/** Prefix for empty column headers in Select (Radix disallows empty string value). */
const EMPTY_HEADER_VALUE_PREFIX = "__empty_header_"

type SortBy = "uploadedAt" | "sheetName" | "signatureName" | "type"
type SortOrder = "asc" | "desc"

function getSheetType(sheet: LeadSheet): string {
  if (sheet.sourceFileExtension) return sheet.sourceFileExtension
  return "—"
}

function filterLeadSheets(
  sheets: LeadSheet[],
  searchQuery: string,
  filterSignature: string | null,
  filterType: string | null
): LeadSheet[] {
  let result = sheets

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (s) =>
        s.sheetName.toLowerCase().includes(q) ||
        (s.signatureName?.toLowerCase().includes(q) ?? false)
    )
  }

  if (filterSignature) {
    if (filterSignature === "__no_signature__") {
      result = result.filter((s) => !s.signatureName)
    } else {
      result = result.filter((s) => s.signatureName === filterSignature)
    }
  }

  if (filterType) {
    result = result.filter(
      (s) => getSheetType(s) === filterType
    )
  }

  return result
}

function sortLeadSheets(
  sheets: LeadSheet[],
  sortBy: SortBy,
  sortOrder: SortOrder
): LeadSheet[] {
  const sorted = [...sheets].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "uploadedAt":
        comparison =
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        break
      case "sheetName":
        comparison = a.sheetName.localeCompare(b.sheetName)
        break
      case "signatureName":
        comparison = (a.signatureName ?? "").localeCompare(b.signatureName ?? "")
        break
      case "type":
        comparison = getSheetType(a).localeCompare(getSheetType(b))
        break
    }
    return sortOrder === "asc" ? comparison : -comparison
  })
  return sorted
}

export default function LeadsPage() {
  const router = useRouter()
  const [leadSheets, setLeadSheets] = useState<LeadSheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [signaturesLoading, setSignaturesLoading] = useState(true)
  const [signaturesError, setSignaturesError] = useState<string | null>(null)
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("")
  const [isOutlookConnected, setIsOutlookConnected] = useState<boolean | null>(null)
  const [isCheckingOutlook, setIsCheckingOutlook] = useState(true)
  const [createLeadsDialogOpen, setCreateLeadsDialogOpen] = useState(false)
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1)
  const [fileHeaders, setFileHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [parsingHeaders, setParsingHeaders] = useState(false)
  const [importOption, setImportOption] = useState<"new" | "add">("new")
  const [targetLeadSheetId, setTargetLeadSheetId] = useState("")
  const [existingTablesSearch, setExistingTablesSearch] = useState("")
  const [connectAccountDialogOpen, setConnectAccountDialogOpen] = useState(false)
  const [selectedLeadSheets, setSelectedLeadSheets] = useState<Set<string>>(new Set())
  const [deletingLeadSheetIds, setDeletingLeadSheetIds] = useState<string[] | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("uploadedAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [filterSignature, setFilterSignature] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [sheetNameInput, setSheetNameInput] = useState("")
  const [importSummary, setImportSummary] = useState<{
    totalRows: number
    rowCount: number
    rejected: number
    rejectedByReason: Record<RejectReason, number>
    redirectToId?: string
  } | null>(null)
  const [importSummaryDialogOpen, setImportSummaryDialogOpen] = useState(false)

  const pageSize = 10

  const loadLeads = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/leads")
      const raw = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          raw && typeof raw.error === "string" ? raw.error : "Failed to load leads"
        throw new Error(message)
      }
      const data = Array.isArray(raw) ? raw : []
      setLeadSheets(
        data.map((item: LeadSheet) => ({
          id: item.id,
          sheetName: item.sheetName ?? "",
          uploadedAt: item.uploadedAt ?? "",
          sourceFileExtension: item.sourceFileExtension ?? null,
          signatureName: item.signatureName ?? null,
        })),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading leads.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  const loadSignatures = useCallback(async (): Promise<Signature[]> => {
    try {
      setSignaturesLoading(true)
      setSignaturesError(null)

      const res = await fetch("/api/signatures")

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "You must be signed in to load signatures."
            : "Failed to load signatures.",
        )
      }

      const data = (await res.json()) as Signature[]
      const signaturesData = data ?? []
      setSignatures(signaturesData)
      setSignaturesError(null)
      return signaturesData
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading signatures."
      setSignaturesError(errorMessage)
      setSignatures([])
      throw err
    } finally {
      setSignaturesLoading(false)
    }
  }, [])

  // Signatures are loaded only when opening Create Leads dialog (see handleCreateLeadsClick)

  // Check Outlook integration after leads load so the table can show first
  useEffect(() => {
    if (isLoading) return
    let isMounted = true

    const checkOutlookIntegration = async () => {
      try {
        setIsCheckingOutlook(true)
        const response = await fetch("/api/integrations")
        if (!response.ok) throw new Error("Failed to check integration status")
        const integrations = await response.json()
        const outlookIntegration = integrations.find(
          (int: { platformName: string; isConnected: boolean }) =>
            int.platformName === "outlook" && int.isConnected
        )
        if (isMounted) setIsOutlookConnected(!!outlookIntegration)
      } catch (err) {
        console.error("Failed to check Outlook integration:", err)
        if (isMounted) setIsOutlookConnected(false)
      } finally {
        if (isMounted) setIsCheckingOutlook(false)
      }
    }

    void checkOutlookIntegration()
    return () => { isMounted = false }
  }, [isLoading])

  const filteredAndSortedLeadSheets = useMemo(() => {
    const filtered = filterLeadSheets(
      leadSheets,
      searchQuery,
      filterSignature,
      filterType
    )
    return sortLeadSheets(filtered, sortBy, sortOrder)
  }, [leadSheets, searchQuery, filterSignature, filterType, sortBy, sortOrder])

  const totalPages =
    filteredAndSortedLeadSheets.length === 0
      ? 1
      : Math.ceil(filteredAndSortedLeadSheets.length / pageSize)

  const paginatedLeads = useMemo(
    () =>
      filteredAndSortedLeadSheets.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      ),
    [filteredAndSortedLeadSheets, currentPage, pageSize]
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterSignature, filterType, sortBy, sortOrder])

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(t)
    }
  }, [successMessage])

  const handleDeleteClick = (id: string) => {
    setDeletingLeadSheetIds([id])
  }

  const handleBulkDeleteClick = () => {
    if (selectedLeadSheets.size > 0) {
      setDeletingLeadSheetIds(Array.from(selectedLeadSheets))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLeadSheetIds || deletingLeadSheetIds.length === 0) return
    try {
      setIsDeleting(true)
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deletingLeadSheetIds }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to delete lead sheet(s)")
      }
      const count = deletingLeadSheetIds.length
      setSuccessMessage(
        `Successfully deleted ${count} lead sheet${count > 1 ? "s" : ""}`
      )
      setSelectedLeadSheets(new Set())
      setDeletingLeadSheetIds(null)
      loadLeads()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while deleting lead sheet(s)."
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadSheets(
        new Set(filteredAndSortedLeadSheets.map((s) => s.id))
      )
    } else {
      setSelectedLeadSheets(new Set())
    }
  }

  const handleSelectLeadSheet = (id: string, checked: boolean) => {
    const next = new Set(selectedLeadSheets)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedLeadSheets(next)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" || filterSignature !== null || filterType !== null

  const clearSearchAndFilters = () => {
    setSearchQuery("")
    setFilterSignature(null)
    setFilterType(null)
  }

  const signatureOptions = useMemo(() => {
    const names = new Set<string>()
    leadSheets.forEach((s) => {
      if (s.signatureName) names.add(s.signatureName)
    })
    return Array.from(names)
  }, [leadSheets])

  const allSelected =
    filteredAndSortedLeadSheets.length > 0 &&
    filteredAndSortedLeadSheets.every((s) => selectedLeadSheets.has(s.id))
  const someSelected =
    filteredAndSortedLeadSheets.some((s) => selectedLeadSheets.has(s.id)) &&
    !allSelected

  const handleCreateLeadsClick = async () => {
    // If still checking, don't do anything
    if (isCheckingOutlook) {
      return
    }

    // If Outlook is not connected, show connect account modal
    if (isOutlookConnected === false) {
      setConnectAccountDialogOpen(true)
      return
    }

    // If Outlook is connected, fetch and check for signatures
    if (isOutlookConnected === true) {
      try {
        // Fetch available signatures for the current user
        await loadSignatures()
      } catch (err) {
        // If there's an error loading signatures, still allow the user to proceed
        // (they can select "No signature" option)
      }
      // Always open the create leads dialog - it will show empty state if no signatures
      setCreateLeadsDialogOpen(true)
    }
  }

  const handleConnectAccount = () => {
    setConnectAccountDialogOpen(false)
    router.push("/integrations")
  }

  const handleCreateSignature = (preserveData?: { fileName?: string }) => {
    setCreateLeadsDialogOpen(false)
    if (preserveData?.fileName && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "createLeadsPreserve",
          JSON.stringify({ fileName: preserveData.fileName }),
        )
      } catch {
        /* ignore */
      }
    }
    router.push("/signatures")
  }

  return (
    <PageShell
      title="Leads"
      description="Upload prospect lists in CSV or Excel format and keep track of every file you've processed through your workflow."
      actions={
        <Button
          className="gap-2"
          onClick={handleCreateLeadsClick}
          disabled={isCheckingOutlook}
        >
          <Plus className="h-4 w-4" />
          Create Leads
        </Button>
      }
      maxWidth="full"
      className="space-y-6"
    >

      {/* Connect Account Modal */}
      <Dialog open={connectAccountDialogOpen} onOpenChange={setConnectAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Your Outlook Account</DialogTitle>
            <DialogDescription>
              Connect your Outlook account to continue
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConnectAccountDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConnectAccount}>
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success message */}
      {successMessage && (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success dark:bg-success/20 dark:text-success"
        >
          {successMessage}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingLeadSheetIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLeadSheetIds(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead file(s)</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingLeadSheetIds?.length === 1
                ? "Are you sure you want to delete this lead sheet? This cannot be undone."
                : `Are you sure you want to delete these ${deletingLeadSheetIds?.length ?? 0} lead sheets? This cannot be undone.`}
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

      {/* Create Leads Modal */}
      <Dialog
        open={createLeadsDialogOpen}
        onOpenChange={(open) => {
          setCreateLeadsDialogOpen(open)
          if (!open) {
            setUploadStep(1)
            setFileHeaders([])
            setColumnMapping({})
            setImportOption("new")
            setTargetLeadSheetId("")
            setSheetNameInput("")
            setExistingTablesSearch("")
          }
        }}
      >
        <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {uploadStep === 1
                  ? "Create leads"
                  : uploadStep === 2
                    ? "Map your columns"
                    : "Where to add data?"}
              </DialogTitle>
              <DialogDescription>
                {uploadStep === 1
                  ? "Choose a CSV or Excel file and optionally select an email signature."
                  : uploadStep === 2
                    ? "Map your file columns to our fields so we know where to find email and website."
                    : "Create a new lead sheet with this data, or append rows to an existing sheet."}
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 pt-2"
              onSubmit={async (e) => {
                e.preventDefault()
                setUploadError(null)
                setUploadSuccess(null)

                if (selectedSignatureId === CREATE_NEW_SIGNATURE_VALUE) {
                  handleCreateSignature({ fileName: selectedFile?.name ?? undefined })
                  return
                }

                if (!selectedFile) {
                  setUploadError("Please choose a file to upload.")
                  return
                }

                const lowerName = selectedFile.name.toLowerCase()
                const isValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
                  lowerName.endsWith(ext),
                )
                if (!isValidExtension) {
                  setUploadError(
                    "Invalid file type. Please upload a .csv, .xls, or .xlsx file.",
                  )
                  return
                }

                if (uploadStep === 1) {
                  setParsingHeaders(true)
                  setUploadError(null)
                  try {
                    const formData = new FormData()
                    formData.append("file", selectedFile)
                    const parseRes = await fetch("/api/lead-files/parse-headers", {
                      method: "POST",
                      body: formData,
                    })
                    const parseData = await parseRes.json().catch(() => null)
                    if (!parseRes.ok) {
                      setUploadError(
                        (parseData && typeof parseData.error === "string")
                          ? parseData.error
                          : "Failed to read file. Please choose another file.",
                      )
                      return
                    }
                    const headers = Array.isArray(parseData?.headers)
                      ? parseData.headers
                      : []
                    setFileHeaders(headers)
                    setColumnMapping(suggestMapping(headers))
                    setUploadStep(2)
                  } catch (err) {
                    setUploadError(
                      err instanceof Error
                        ? err.message
                        : "Failed to read file. Please choose another file.",
                    )
                  } finally {
                    setParsingHeaders(false)
                  }
                  return
                }

                if (uploadStep === 2) {
                  setUploadStep(3)
                  return
                }

                if (importOption === "new" && !sheetNameInput.trim()) {
                  setUploadError("Sheet name is required.")
                  return
                }
                if (importOption === "new" && sheetNameInput.trim().length > 255) {
                  setUploadError("Sheet name must be 255 characters or less.")
                  return
                }
                if (importOption === "add" && !targetLeadSheetId.trim()) {
                  setUploadError("Please select an existing sheet to add data to.")
                  return
                }

                try {
                  setUploading(true)

                  const formData = new FormData()
                  formData.append("file", selectedFile)
                  formData.append("option", importOption)
                  if (importOption === "new") {
                    formData.append("sheetName", sheetNameInput.trim())
                  }
                  if (importOption === "add") {
                    formData.append("targetLeadFileId", targetLeadSheetId.trim())
                  }
                  if (selectedSignatureId && selectedSignatureId !== CREATE_NEW_SIGNATURE_VALUE) {
                    formData.append("signatureId", selectedSignatureId)
                  }
                  const mapping: Record<string, string> = {}
                  for (const field of MAPPABLE_IMPORT_FIELDS) {
                    const v = columnMapping[field.key]
                    const isUnmapped =
                      v === DONT_MAP_VALUE ||
                      v == null ||
                      v === "" ||
                      (typeof v === "string" && v.startsWith(EMPTY_HEADER_VALUE_PREFIX))
                    mapping[field.key] = isUnmapped ? "" : v
                  }
                  formData.append("mapping", JSON.stringify(mapping))

                  const importRes = await fetch("/api/lead-files/import", {
                    method: "POST",
                    body: formData,
                  })

                  if (!importRes.ok) {
                    const data = await importRes.json().catch(() => null)
                    throw new Error(
                      (data && typeof data.error === "string") ? data.error : "Failed to import file.",
                    )
                  }

                  const importData = (await importRes.json()) as {
                    id: string
                    sheetName?: string
                    rowCount: number
                    totalRows: number
                    rejected: number
                    rejectedByReason: Record<RejectReason, number>
                  }

                  await loadLeads()

                  setUploadSuccess(
                    `Imported ${importData.rowCount} row(s)${importOption === "new" ? " into a new sheet." : "."}`,
                  )
                  setSelectedFile(null)
                  setSelectedSignatureId("")
                  setFileInputKey((k) => k + 1)
                  setUploadStep(1)
                  setFileHeaders([])
                  setColumnMapping({})
                  setImportOption("new")
                  setTargetLeadSheetId("")
                  setSheetNameInput("")
                  setCreateLeadsDialogOpen(false)

                  setImportSummary({
                    totalRows: importData.totalRows,
                    rowCount: importData.rowCount,
                    rejected: importData.rejected,
                    rejectedByReason: importData.rejectedByReason,
                    ...(importOption === "new" ? { redirectToId: importData.id } : {}),
                  })
                  setImportSummaryDialogOpen(true)
                } catch (err) {
                  setUploadError(
                    err instanceof Error
                      ? err.message
                      : "An unexpected error occurred while uploading.",
                  )
                } finally {
                  setUploading(false)
                }
              }}
            >
              {uploadStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signature-select"
                      className="text-sm font-medium text-foreground"
                    >
                      Select signature
                    </Label>
                    <select
                      id="signature-select"
                      name="signature"
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedSignatureId}
                      onChange={(event) => {
                        const value = event.currentTarget.value
                        if (value === CREATE_NEW_SIGNATURE_VALUE) {
                          handleCreateSignature({
                            fileName: selectedFile?.name ?? undefined,
                          })
                          return
                        }
                        setSelectedSignatureId(value)
                      }}
                      disabled={signaturesLoading || !!signaturesError}
                    >
                      {signaturesLoading ? (
                        <option value="">Loading signatures...</option>
                      ) : signaturesError ? (
                        <option value="">Unable to load signatures</option>
                      ) : (
                        <>
                          <option value="">No signature</option>
                          {signatures.map((signature) => (
                            <option key={signature.id} value={signature.id}>
                              {signature.name}
                            </option>
                          ))}
                          <option value={CREATE_NEW_SIGNATURE_VALUE}>
                            Create New Signature
                          </option>
                        </>
                      )}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Optional. Can be managed from the Signatures page.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="lead-file"
                      className="text-sm font-medium text-foreground"
                    >
                      Upload file
                    </label>
                    <input
                      key={fileInputKey}
                      id="lead-file"
                      name="lead-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                      onClick={(event) => {
                        ;(event.currentTarget as HTMLInputElement).value = ""
                      }}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setSelectedFile(file)
                        setUploadError(null)
                        setUploadSuccess(null)
                      }}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: .csv, .xls, .xlsx
                    </p>
                  </div>
                </>
              )}

              {uploadStep === 2 && (
                <>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {selectedFile?.name ?? "No file selected"}
                  </div>
                  {fileHeaders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No columns detected. You can still continue or go back to choose another file.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {MAPPABLE_IMPORT_FIELDS.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label
                            htmlFor={`map-${field.key}`}
                            className="text-sm font-medium text-foreground"
                          >
                            {field.label}
                          </Label>
                          <Select
                            value={columnMapping[field.key] || DONT_MAP_VALUE}
                            onValueChange={(value) => {
                              setColumnMapping((prev) => ({
                                ...prev,
                                [field.key]: value,
                              }))
                            }}
                          >
                            <SelectTrigger id={`map-${field.key}`} className="w-full">
                              <SelectValue placeholder="Don&apos;t map" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={DONT_MAP_VALUE}>Don&apos;t map</SelectItem>
                              {fileHeaders.map((header, headerIndex) => {
                                const isEmpty = header == null || header === ""
                                const value = isEmpty
                                  ? `${EMPTY_HEADER_VALUE_PREFIX}${headerIndex}`
                                  : header
                                return (
                                  <SelectItem key={value} value={value}>
                                    {isEmpty ? "(empty)" : header}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {uploadStep === 3 && (
                <>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {selectedFile?.name ?? "No file selected"}
                  </div>
                  {importOption === "new" && (
                    <div className="space-y-2">
                      <Label htmlFor="sheet-name" className="text-sm font-medium text-foreground">
                        Sheet Name
                      </Label>
                      <Input
                        id="sheet-name"
                        placeholder="e.g. Q1 Prospects, Client List"
                        value={sheetNameInput}
                        onChange={(e) => {
                          setSheetNameInput(e.target.value)
                          setUploadError(null)
                        }}
                        maxLength={255}
                        className="w-full"
                        aria-required="true"
                        aria-describedby="sheet-name-help"
                      />
                      <p id="sheet-name-help" className="text-xs text-muted-foreground">
                        Give this leads sheet a name. This is how you&apos;ll identify it in your leads.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportOption("new")
                        setTargetLeadSheetId("")
                        setUploadError(null)
                      }}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                        importOption === "new"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">New sheet</span>
                      <span className="text-xs text-muted-foreground">
                        Create a new lead sheet and import rows into it.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportOption("add")
                        setUploadError(null)
                      }}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-left transition-colors ${
                        importOption === "add"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">Add to existing sheet</span>
                      <span className="text-xs text-muted-foreground">
                        Append rows to a lead sheet you already have.
                      </span>
                    </button>
                  </div>
                  {importOption === "add" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Search existing sheets
                      </Label>
                      <Input
                        placeholder="Search by sheet name..."
                        value={existingTablesSearch}
                        onChange={(e) => setExistingTablesSearch(e.target.value)}
                        className="w-full"
                      />
                      <div className="max-h-48 overflow-y-auto rounded-md border">
                        {leadSheets
                          .filter((s) =>
                            existingTablesSearch.trim()
                              ? s.sheetName
                                  .toLowerCase()
                                  .includes(existingTablesSearch.toLowerCase())
                              : true,
                          )
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setTargetLeadSheetId(s.id)}
                              className={`block w-full px-3 py-2 text-left text-sm ${
                                targetLeadSheetId === s.id
                                  ? "bg-primary/10 font-medium"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              {s.sheetName}
                            </button>
                          ))}
                        {leadSheets.length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No lead sheets yet. Use &quot;New sheet&quot; first.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {uploadError && (
                <p className="text-sm text-destructive" role="alert">{uploadError}</p>
              )}

              {uploadSuccess && (
                <p className="text-sm text-success" role="status">{uploadSuccess}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {uploadStep === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadStep(1)}
                    disabled={parsingHeaders || uploading}
                  >
                    Back
                  </Button>
                )}
                {uploadStep === 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadStep(2)}
                    disabled={uploading}
                  >
                    Back
                  </Button>
                )}
                {uploadStep === 2 ? (
                  <Button
                    type="button"
                    onClick={() => setUploadStep(3)}
                    disabled={parsingHeaders || uploading}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={parsingHeaders || uploading}
                    className="gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Importing...
                      </>
                    ) : parsingHeaders ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Reading file...
                      </>
                    ) : uploadStep === 1 ? (
                      "Continue"
                    ) : (
                      "Import"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Import Summary Dialog */}
      <Dialog
        open={importSummaryDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            const redirectToId = importSummary?.redirectToId
            setImportSummaryDialogOpen(false)
            setImportSummary(null)
            if (redirectToId) {
              router.push(`/leads/${redirectToId}`)
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import complete</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-1">
                {importSummary && (
                  <>
                    <p>
                      Total rows in file: <strong>{importSummary.totalRows}</strong>.
                      Imported: <strong>{importSummary.rowCount}</strong>.
                    </p>
                    {importSummary.rejected > 0 && (
                      <>
                        <p className="text-muted-foreground">
                          The following rows were not imported:
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-sm">
                          {(Object.entries(importSummary.rejectedByReason) as [RejectReason, number][])
                            .filter(([, count]) => count > 0)
                            .map(([reason, count]) => (
                              <li key={reason}>
                                {REJECT_REASON_LABELS[reason]}: {count}
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                const redirectToId = importSummary?.redirectToId
                setImportSummaryDialogOpen(false)
                setImportSummary(null)
                if (redirectToId) {
                  router.push(`/leads/${redirectToId}`)
                }
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="type-caption font-medium">Total sheets</span>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{leadSheets.length}</div>
            <p className="type-caption mt-1">
              {leadSheets.length === 1 ? "Single sheet so far" : "All lead sheets"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="type-caption font-medium">Last upload</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {leadSheets.length === 0
                ? "No sheets yet"
                : new Date(leadSheets[0].uploadedAt).toLocaleString()}
            </div>
            <p className="type-caption mt-1">Most recent sheet you&apos;ve added</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="type-caption font-medium">Table view</span>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <p className="type-caption mt-1">Showing up to {pageSize} sheets per page</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 shadow-card min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between type-card-title">
            <span>Lead sheets</span>
            <span className="type-caption font-normal">
              Keep your lead sheets organized and easy to scan.
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {!isLoading && !error && leadSheets.length > 0 && (
            <>
              <div className="mb-4 flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    type="search"
                    placeholder="Search by sheet name or signature..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search lead sheets"
                  />
                </div>
                <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="type-body text-muted-foreground">Sort by:</span>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uploadedAt">Date</SelectItem>
                        <SelectItem value="sheetName">Sheet name</SelectItem>
                        <SelectItem value="signatureName">Signature</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSortOrder}
                    className="gap-2"
                    aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
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
                  <div className="flex items-center gap-2">
                    <span className="type-body text-muted-foreground">Signature:</span>
                    <Select
                      value={filterSignature ?? "__all__"}
                      onValueChange={(v) =>
                        setFilterSignature(v === "__all__" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="All signatures" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All signatures</SelectItem>
                        <SelectItem value="__no_signature__">No signature</SelectItem>
                        {signatureOptions.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="type-body text-muted-foreground">Type:</span>
                    <Select
                      value={filterType ?? "__all__"}
                      onValueChange={(v) => setFilterType(v === "__all__" ? null : v)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All types</SelectItem>
                        <SelectItem value="CSV">CSV</SelectItem>
                        <SelectItem value="XLS">XLS</SelectItem>
                        <SelectItem value="XLSX">XLSX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearSearchAndFilters}>
                      Clear search and filters
                    </Button>
                  )}
                </div>
              </div>

              {selectedLeadSheets.size > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-md bg-muted p-3 transition-colors duration-normal">
                  <span className="type-body text-muted-foreground">
                    {selectedLeadSheets.size} sheet{selectedLeadSheets.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeadSheets(new Set())}
                    >
                      Clear selection
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Delete selected
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadLeads} />
          ) : leadSheets.length === 0 ? (
            <EmptyState
              icon={UploadCloud}
              title="No lead sheets yet"
              description='Start by uploading a CSV or Excel file using the "Create Leads" button above.'
              action={
                <Button onClick={handleCreateLeadsClick} disabled={isCheckingOutlook} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Leads
                </Button>
              }
            />
          ) : filteredAndSortedLeadSheets.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No lead sheets match your search or filters"
              description="Try adjusting your search or filters, or clear them to see all sheets."
              action={
                <Button variant="outline" onClick={clearSearchAndFilters}>
                  Clear search and filters
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all lead sheets on this page"
                    />
                  </TableHead>
                  <TableHead>Sheet Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((sheet) => (
                  <TableRow
                    key={sheet.id}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors duration-normal ${selectedLeadSheets.has(sheet.id) ? "bg-muted/50" : ""}`}
                    onClick={() => router.push(`/leads/${sheet.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        router.push(`/leads/${sheet.id}`)
                      }
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeadSheets.has(sheet.id)}
                        onCheckedChange={(checked) =>
                          handleSelectLeadSheet(sheet.id, checked as boolean)
                        }
                        aria-label={`Select ${sheet.sheetName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{sheet.sheetName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {getSheetType(sheet)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {sheet.signatureName || "No signature"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(sheet.uploadedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(sheet.id)
                        }}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label={`Delete ${sheet.sheetName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredAndSortedLeadSheets.length}
                  pageSize={pageSize}
                  itemLabel="sheet"
                  filterNote={hasActiveFilters ? " (filtered)" : undefined}
                />
              </TableCaption>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}

