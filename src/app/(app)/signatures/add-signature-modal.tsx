"use client"

import { useEffect, useRef, useState } from "react"
import { Editor } from "@tinymce/tinymce-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AddSignatureModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddSignatureModal({
  open,
  onOpenChange,
  onSuccess,
}: AddSignatureModalProps) {
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    if (!content.trim()) {
      setError("Content is required")
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/signatures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim(),
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to create signature"
        try {
          const errorData = await response.json()
          errorMessage = errorData?.error || errorData?.details || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Reset form
      setName("")
      setContent("")
      if (editorRef.current) {
        editorRef.current.setContent("")
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName("")
      setContent("")
      setError(null)
      if (editorRef.current) {
        editorRef.current.setContent("")
      }
      onOpenChange(false)
    }
  }

  // Handle image upload to Supabase Storage
  const handleImageUpload = async (blobInfo: any, progress: (percent: number) => void): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const file = blobInfo.blob()
        
        // Validate file type
        if (!file.type.startsWith("image/")) {
          reject("File must be an image")
          return
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
          reject("File size must be less than 5MB")
          return
        }

        progress(0)

        const formData = new FormData()
        formData.append("image", file)

        const response = await fetch("/api/signatures/upload-image", {
          method: "POST",
          body: formData,
        })

        progress(50)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          reject(errorData?.error || "Failed to upload image")
          return
        }

        const data = await response.json()

        if (!data.url) {
          reject("No URL returned from upload")
          return
        }

        progress(100)
        resolve(data.url)
      } catch (error) {
        console.error("Image upload error:", error)
        reject(error instanceof Error ? error.message : "Failed to upload image")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !isSubmitting) {
        handleClose()
      } else if (newOpen) {
        onOpenChange(true)
      }
    }}>
      <DialogContent 
        className="max-w-4xl w-[95vw] md:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>Add Email Signature</DialogTitle>
          <DialogDescription>
            Create a new email signature. Use the editor to format your text, add links, and customize the appearance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="signature-name">Name</Label>
              <Input
                id="signature-name"
                type="text"
                placeholder="e.g., Business Signature, Personal Signature"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Give your signature a name to easily identify it later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature-content">Signature Content</Label>
              <div className="signature-editor-wrapper h-[320px] border rounded-md overflow-hidden">
                <Editor
                  apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key"} // Get free API key from https://www.tiny.cloud/auth/signup/
                  onInit={(_evt, editor) => {
                    editorRef.current = editor
                  }}
                  value={content}
                  onEditorChange={(newContent) => {
                    setContent(newContent)
                  }}
                  init={{
                    height: 320,
                    menubar: false,
                    plugins: [
                      "advlist",
                      "autolink",
                      "lists",
                      "link",
                      "image",
                      "charmap",
                      "preview",
                      "anchor",
                      "searchreplace",
                      "visualblocks",
                      "code",
                      "fullscreen",
                      "insertdatetime",
                      "media",
                      "table",
                      "code",
                      "help",
                      "wordcount",
                    ],
                    toolbar:
                      "undo redo | blocks | " +
                      "bold italic underline | alignleft aligncenter alignright | " +
                      "bullist numlist | link image | " +
                      "removeformat | help",
                    content_style:
                      "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
                    // Image upload handler
                    images_upload_handler: handleImageUpload,
                    // Image alignment options
                    image_advtab: true,
                    image_align_toolbar: true,
                    // Link settings
                    link_default_target: "_blank",
                    link_default_protocol: "https",
                    // Allow all HTML tags needed for signatures
                    valid_elements: "*[*]",
                    extended_valid_elements: "*[*]",
                    // Remove invalid elements
                    invalid_elements: "script,iframe,object,embed,form",
                    // Auto-resize
                    autoresize_bottom_margin: 16,
                    // Remove branding (optional - for free version)
                    branding: false,
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Signature"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
