"use client"

import { useEffect, useState } from "react"
import { Clock, FileSpreadsheet, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

type LeadFile = {
  id: string
  fileName: string
  uploadedAt: string
}

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]

export default function LeadsPage() {
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 10

  useEffect(() => {
    let isMounted = true

    const loadLeads = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch("/api/leads")

        if (!res.ok) {
          throw new Error("Failed to load leads")
        }

        const data = (await res.json()) as LeadFile[]

        if (isMounted) {
          setLeadFiles(
            data.map((item) => ({
              ...item,
              uploadedAt: item.uploadedAt,
            })),
          )
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading leads.",
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadLeads()

    return () => {
      isMounted = false
    }
  }, [])

  // Reset to first page whenever the list changes
  useEffect(() => {
    setCurrentPage(1)
  }, [leadFiles.length])

  const totalPages =
    leadFiles.length === 0 ? 1 : Math.ceil(leadFiles.length / pageSize)

  const paginatedLeads = leadFiles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  const getFileType = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf(".")
    if (dotIndex === -1 || dotIndex === fileName.length - 1) return "Unknown"
    return fileName.substring(dotIndex + 1).toUpperCase()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Upload prospect lists in CSV or Excel format and keep track of every file
            you&apos;ve processed through your workflow.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload Leads
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload leads file</DialogTitle>
              <DialogDescription>
                Choose a CSV or Excel file containing your leads. The file is sent
                securely to our processing workflow; only the file name is stored in
                your account for reference.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 pt-2"
              onSubmit={async (e) => {
                e.preventDefault()

                setUploadError(null)
                setUploadSuccess(null)

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

                try {
                  setUploading(true)

                  // 1. Build payload for n8n webhook
                  const formData = new FormData()
                  formData.append("file", selectedFile)

                  // 1a. Load latest MyCompanyInfo for this user
                  try {
                    const companyInfoRes = await fetch("/api/my-company-info")

                    if (companyInfoRes.ok) {
                      const rawCompanyInfo: any = await companyInfoRes.json()

                      if (rawCompanyInfo && !rawCompanyInfo.error) {
                        const normalizeToArray = (value: unknown): string[] => {
                          if (!value) return []
                          if (Array.isArray(value)) {
                            return value.map((v) => String(v))
                          }
                          if (typeof value === "string") {
                            try {
                              const parsed = JSON.parse(value)
                              if (Array.isArray(parsed)) {
                                return parsed.map((v) => String(v))
                              }
                            } catch {
                              // fall through and treat as single string
                            }
                            return [value]
                          }
                          return [String(value)]
                        }

                        const companyInfo = {
                          id: rawCompanyInfo.id,
                          userId: rawCompanyInfo.userId,
                          websiteName: rawCompanyInfo.websiteName,
                          websiteUrl: rawCompanyInfo.websiteUrl,
                          companyName: rawCompanyInfo.companyName ?? null,
                          companyType: rawCompanyInfo.companyType ?? null,
                          industryExpertise: normalizeToArray(
                            rawCompanyInfo.industryExpertise,
                          ),
                          fullTechSummary: normalizeToArray(
                            rawCompanyInfo.fullTechSummary,
                          ),
                          serviceCatalog: normalizeToArray(
                            rawCompanyInfo.serviceCatalog,
                          ),
                          theHook: rawCompanyInfo.theHook ?? null,
                          whatTheyDo: rawCompanyInfo.whatTheyDo ?? null,
                          valueProposition:
                            rawCompanyInfo.valueProposition ?? null,
                          brandTone: normalizeToArray(rawCompanyInfo.brandTone),
                          createdAt: rawCompanyInfo.createdAt,
                          updatedAt: rawCompanyInfo.updatedAt,
                        }

                        // 1b. Append each company info field separately so n8n
                        // receives a flat JSON structure in `body`
                        Object.entries(companyInfo).forEach(([key, value]) => {
                          if (value === null || value === undefined) return
                          if (Array.isArray(value) || typeof value === "object") {
                            formData.append(key, JSON.stringify(value))
                          } else {
                            formData.append(key, String(value))
                          }
                        })
                      }
                    }
                  } catch {
                    // If company info fails to load, continue with file only
                  }

                  // 1c. Send file + company info to n8n webhook
                  const n8nResponse = await fetch(
                    "https://n8n.srv1248804.hstgr.cloud/webhook/get-leads",
                    {
                      method: "POST",
                      body: formData,
                    },
                  )

                  if (!n8nResponse.ok) {
                    throw new Error("Failed to upload file to processing service.")
                  }

                  // 2. Save fileName via backend (no file storage)
                  const saveResponse = await fetch("/api/lead-file", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ fileName: selectedFile.name }),
                  })

                  if (!saveResponse.ok) {
                    const data = await saveResponse.json().catch(() => null)
                    throw new Error(
                      data?.error || "Failed to save lead file metadata.",
                    )
                  }

                  const updatedLeads = (await saveResponse.json()) as LeadFile[]
                  setLeadFiles(updatedLeads)

                  setUploadSuccess("Leads file uploaded successfully.")
                  setSelectedFile(null)
                  ;(e.currentTarget as HTMLFormElement).reset()
                } catch (err) {
                  setUploadError(
                    err instanceof Error
                      ? err.message
                      : "An unexpected error occurred while uploading the file.",
                  )
                } finally {
                  setUploading(false)
                }
              }}
            >
              <div className="space-y-2">
                <label
                  htmlFor="lead-file"
                  className="text-sm font-medium text-foreground"
                >
                  Leads file
                </label>
                <input
                  id="lead-file"
                  name="lead-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
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

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}

              {uploadSuccess && (
                <p className="text-sm text-green-600">{uploadSuccess}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Total files
            </span>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{leadFiles.length}</div>
            <p className="text-xs text-muted-foreground">
              {leadFiles.length === 1 ? "Single upload so far" : "All uploaded lead files"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Last upload
            </span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {leadFiles.length === 0
                ? "No uploads yet"
                : new Date(leadFiles[0].uploadedAt).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent file you&apos;ve added
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Table view
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <p className="text-xs text-muted-foreground">
              Showing up to {pageSize} files per page
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lead files</span>
            <span className="text-xs font-normal text-muted-foreground">
              Keep your uploads organized and easy to scan.
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Loading lead files...</span>
            </div>
          ) : error ? (
            <div className="flex h-24 items-center justify-center text-sm text-red-600">
              {error}
            </div>
          ) : leadFiles.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">
                  No lead files uploaded yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Start by uploading a CSV or Excel file using the &quot;Upload
                  Leads&quot; button above.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      {file.fileName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {getFileType(file.fileName)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(file.uploadedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Showing {leadFiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, leadFiles.length)} of{" "}
                  {leadFiles.length}{" "}
                  {leadFiles.length === 1 ? "file" : "files"}.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || leadFiles.length === 0}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

