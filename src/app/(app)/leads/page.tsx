"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, FileSpreadsheet, UploadCloud, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LeadFile = {
  id: string
  fileName: string
  uploadedAt: string
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

export default function LeadsPage() {
  const router = useRouter()
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([])
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
  const [connectAccountDialogOpen, setConnectAccountDialogOpen] = useState(false)

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

  useEffect(() => {
    let isMounted = true

    const loadSignatures = async () => {
      try {
        setSignaturesLoading(true)
        setSignaturesError(null)

        const res = await fetch("/api/signatures")

        if (!res.ok) {
          // If user is unauthorized or another error occurs, just show a friendly message.
          throw new Error(
            res.status === 401
              ? "You must be signed in to load signatures."
              : "Failed to load signatures.",
          )
        }

        const data = (await res.json()) as Signature[]

        if (isMounted) {
          setSignatures(data ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setSignaturesError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading signatures.",
          )
          setSignatures([])
        }
      } finally {
        if (isMounted) {
          setSignaturesLoading(false)
        }
      }
    }

    void loadSignatures()

    return () => {
      isMounted = false
    }
  }, [])

  // Check Outlook integration status on mount
  useEffect(() => {
    let isMounted = true

    const checkOutlookIntegration = async () => {
      try {
        setIsCheckingOutlook(true)
        const response = await fetch("/api/integrations")
        
        if (!response.ok) {
          throw new Error("Failed to check integration status")
        }

        const integrations = await response.json()
        const outlookIntegration = integrations.find(
          (int: { platformName: string; isConnected: boolean }) =>
            int.platformName === "outlook" && int.isConnected
        )

        if (isMounted) {
          setIsOutlookConnected(!!outlookIntegration)
        }
      } catch (err) {
        console.error("Failed to check Outlook integration:", err)
        if (isMounted) {
          // On error, assume not connected to be safe
          setIsOutlookConnected(false)
        }
      } finally {
        if (isMounted) {
          setIsCheckingOutlook(false)
        }
      }
    }

    void checkOutlookIntegration()

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

  const handleCreateLeadsClick = () => {
    // If still checking, don't do anything
    if (isCheckingOutlook) {
      return
    }

    // If Outlook is not connected, show connect account modal
    if (isOutlookConnected === false) {
      setConnectAccountDialogOpen(true)
      return
    }

    // If Outlook is connected, open the create leads dialog
    if (isOutlookConnected === true) {
      setCreateLeadsDialogOpen(true)
    }
  }

  const handleConnectAccount = () => {
    setConnectAccountDialogOpen(false)
    router.push("/integrations")
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

        <Button 
          className="gap-2" 
          onClick={handleCreateLeadsClick}
          disabled={isCheckingOutlook}
        >
          <Plus className="h-4 w-4" />
          Create Leads
        </Button>
      </div>

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

      {/* Create Leads Modal */}
      <Dialog open={createLeadsDialogOpen} onOpenChange={setCreateLeadsDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Create leads</DialogTitle>
              <DialogDescription>
                Choose a CSV or Excel file containing your leads and optionally
                select an email signature to attach. The file is sent securely to our
                processing workflow; only the file name and selected signature
                reference are stored in your account for reference.
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

                  // 1a. Get userId from profile (only need the id, not full details)
                  let userId = ""
                  try {
                    const profileRes = await fetch("/api/profile")
                    if (profileRes.ok) {
                      const userProfile: any = await profileRes.json()
                      if (userProfile && !userProfile.error && userProfile.id) {
                        userId = userProfile.id
                      }
                    }
                  } catch {
                    // If profile fails to load, continue without userId
                  }

                  // 1b. Attach selected signature details, if any
                  let selectedSignature: Signature | null = null
                  if (selectedSignatureId) {
                    selectedSignature =
                      signatures.find((sig) => sig.id === selectedSignatureId) ??
                      null
                  }

                  // Add userId as a separate field
                  formData.append("userId", userId)
                  
                  // Add signature fields separately
                  if (selectedSignature) {
                    formData.append("signatureId", selectedSignature.id ?? "")
                    formData.append("signatureName", selectedSignature.name ?? "")
                    formData.append("signatureContent", selectedSignature.content ?? "")
                    formData.append("signatureCreatedAt", selectedSignature.createdAt ?? "")
                    formData.append("signatureUpdatedAt", selectedSignature.updatedAt ?? "")
                  } else {
                    // Send empty strings if no signature is selected
                    formData.append("signatureId", "")
                    formData.append("signatureName", "")
                    formData.append("signatureContent", "")
                    formData.append("signatureCreatedAt", "")
                    formData.append("signatureUpdatedAt", "")
                  }

                  // 1c. Send file + userId + signature (with separate fields) to n8n webhook
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

                  // 2. Save fileName via backend (no file storage) and associate selected signature reference
                  const saveResponse = await fetch("/api/lead-file", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      fileName: selectedFile.name,
                      signatureId: selectedSignatureId || null,
                    }),
                  })

                  if (!saveResponse.ok) {
                    const data = await saveResponse.json().catch(() => null)
                    throw new Error(
                      data?.error || "Failed to save lead file metadata.",
                    )
                  }

                  const updatedLeads = (await saveResponse.json()) as LeadFile[]
                  setLeadFiles(updatedLeads)

                  setUploadSuccess("File uploaded to n8n successfully.")
                  setSelectedFile(null)
                  setSelectedSignatureId("")
                  // Reset file input so the user can re-upload (including the same file name)
                  setFileInputKey((k) => k + 1)
                  // Close the dialog after successful upload
                  setCreateLeadsDialogOpen(false)
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
                    setSelectedSignatureId(event.target.value)
                  }}
                  disabled={signaturesLoading || !!signaturesError}
                >
                  {signaturesLoading ? (
                    <option value="">Loading signatures...</option>
                  ) : signaturesError ? (
                    <option value="">Unable to load signatures</option>
                  ) : signatures.length === 0 ? (
                    <option value="">No signatures available</option>
                  ) : (
                    <>
                      <option value="">No signature</option>
                      {signatures.map((signature) => (
                        <option key={signature.id} value={signature.id}>
                          {signature.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">
                  Choose an email signature to associate with this leads file. This
                  is optional and can be managed from the Signatures page.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lead-file"
                  className="text-sm font-medium text-foreground"
                >
                  Leads file
                </label>
                <input
                  key={fileInputKey}
                  id="lead-file"
                  name="lead-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  onClick={(event) => {
                    // Allow selecting the same file twice in a row by clearing the input first
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
                  Start by uploading a CSV or Excel file using the &quot;Create
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
                  <TableHead>Signature</TableHead>
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
                      <span className="text-xs text-muted-foreground">
                        {file.signatureName || "No signature"}
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

