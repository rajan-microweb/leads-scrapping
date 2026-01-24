"use client"

import { useEffect, useRef, useState } from "react"
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
  const [CKEditorComponent, setCKEditorComponent] = useState<any>(null)
  const [ClassicEditorConstructor, setClassicEditorConstructor] = useState<any>(null)
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [selectedText, setSelectedText] = useState("")
  const [linkDisplayText, setLinkDisplayText] = useState("")

  // Lazily load CKEditor only in the browser to avoid SSR issues
  useEffect(() => {
    let isMounted = true

    const loadEditor = async () => {
      try {
        const { CKEditor } = await import("@ckeditor/ckeditor5-react")
        const ClassicEditor = (await import("@ckeditor/ckeditor5-build-classic")).default

        if (!isMounted) return

        setCKEditorComponent(() => CKEditor)
        setClassicEditorConstructor(() => ClassicEditor)
      } catch (e) {
        console.error("Failed to load CKEditor:", e)
        if (isMounted) {
          setError("Failed to load the rich text editor. Please refresh the page.")
        }
      }
    }

    if (typeof window !== "undefined") {
      void loadEditor()
    }

    return () => {
      isMounted = false
    }
  }, [])

  // Simple base64 upload adapter for CKEditor images.
  // This keeps uploaded images embedded directly in the HTML,
  // so they are stored and rendered correctly from the `content` field.
  const createBase64UploadAdapter = (loader: any) => {
    return {
      loader,
      // Called by CKEditor when the file should be uploaded.
      async upload() {
        const file = await loader.file

        if (!file) {
          return Promise.reject("No file to upload")
        }

        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              // CKEditor expects an object with the `default` URL.
              default: reader.result as string,
            })
          }
          reader.onerror = (error) => {
            reject(error)
          }
          reader.readAsDataURL(file)
        })
      },
      // Called by CKEditor if the upload is aborted.
      abort() {
        // No special abort handling needed for FileReader.
      },
    }
  }

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
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Reset form
      setName("")
      setContent("")
      if (editorRef.current) {
        editorRef.current.setData("")
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
      setShowLinkDialog(false)
      setLinkUrl("")
      if (editorRef.current) {
        editorRef.current.setData("")
      }
      onOpenChange(false)
    }
  }

  // Handle custom link dialog
  const handleLinkButtonClick = () => {
    if (editorRef.current) {
      const model = editorRef.current.model
      const selection = model.document.selection

      // Get selected text
      let text = ""
      const ranges = Array.from(selection.getRanges())
      ranges.forEach((range: any) => {
        for (const item of range.getItems()) {
          if (item.is("$textProxy") || item.is("$text")) {
            text += item.data
          }
        }
      })

      // If there's an existing link, get its URL
      const linkCommand = editorRef.current.commands.get("link")
      if (linkCommand && linkCommand.value) {
        setLinkUrl(linkCommand.value)
      }

      setSelectedText(text)
      setShowLinkDialog(true)
    }
  }

  const handleApplyLink = () => {
    if (!linkUrl.trim() || !editorRef.current) {
      return
    }

    // Add protocol if missing
    let url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) {
      url = "https://" + url
    }

    const editor = editorRef.current
    const model = editor.model
    const selection = model.document.selection
    const displayText = (linkDisplayText || selectedText || url).trim()

    // Insert or replace text with link similar to Outlook's "Display as" + URL dialog.
    model.change((writer: any) => {
      const isCollapsed = selection.isCollapsed

      if (isCollapsed) {
        const position = selection.getFirstPosition()
        if (!position) return

        writer.insertText(displayText, { linkHref: url }, position)
        writer.setSelection(position.getShiftedBy(displayText.length))
      } else {
        const firstRange = selection.getFirstRange()
        if (!firstRange) return
        const start = firstRange.start

        // Replace current selection with the display text linked to the URL.
        writer.remove(selection)
        writer.insertText(displayText, { linkHref: url }, start)
        writer.setSelection(start.getShiftedBy(displayText.length))
      }
    })

    // Close the dialog
    setShowLinkDialog(false)
    setLinkUrl("")
    setSelectedText("")
    setLinkDisplayText("")
  }

  const handleCancelLink = () => {
    setShowLinkDialog(false)
    setLinkUrl("")
    setSelectedText("")
    setLinkDisplayText("")
  }

  // Handle clicks to prevent modal from closing when interacting with CKEditor balloons
  const handleInteractOutside = (event: Event) => {
    const target = event.target as HTMLElement
    
    // Check if the interaction is with a CKEditor balloon element
    if (
      target.closest(".ck-balloon") ||
      target.closest(".ck-link-form") ||
      target.closest("[class*='ck-balloon']") ||
      target.closest(".ck.ck-balloon-panel") ||
      target.closest(".ck.ck-link-form") ||
      target.closest(".ck-input-text") ||
      target.classList.contains("ck-balloon") ||
      target.classList.contains("ck-link-form")
    ) {
      // Prevent the dialog from closing when clicking on CKEditor balloons
      event.preventDefault()
    }
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
        onInteractOutside={handleInteractOutside}
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
              {/* Fixed-height unified editor box; CKEditor fills this box */}
              <div className="signature-editor-wrapper h-[320px] border rounded-md">
                {CKEditorComponent && ClassicEditorConstructor ? (
                  <CKEditorComponent
                    editor={ClassicEditorConstructor}
                    data={content}
                    onChange={(_: any, editor: any) => {
                      const data = editor.getData()
                      setContent(data)
                    }}
                    onReady={(editor: any) => {
                      editorRef.current = editor
                      // Configure a custom upload adapter so image uploads work
                      // and are embedded as base64 data URLs in the HTML.
                      const fileRepository = editor.plugins.get("FileRepository")
                      if (fileRepository) {
                        fileRepository.createUploadAdapter = (loader: any) =>
                          createBase64UploadAdapter(loader)
                      }

                      // Intercept link command execution to show custom dialog
                      const linkCommand = editor.commands.get("link")
                      if (linkCommand) {
                        // Store original execute function
                        const originalExecute = linkCommand.execute.bind(linkCommand)
                        
                        // Override execute to show our dialog first
                        linkCommand.execute = (url?: string) => {
                          if (url) {
                            // If URL provided directly, use it
                            originalExecute(url)
                          } else {
                            // Show our custom dialog
                            const selection = editor.model.document.selection
                            let text = ""
                            const ranges = Array.from(selection.getRanges())
                            ranges.forEach((range: any) => {
                              for (const item of range.getItems()) {
                                if (item.is("$textProxy") || item.is("$text")) {
                                  text += item.data
                                }
                              }
                            })
                            
                            // If there's an existing link, pre-fill the URL
                            if (linkCommand.value) {
                              setLinkUrl(linkCommand.value)
                            }
                            
                            setSelectedText(text)
                            setLinkDisplayText(text)
                            setShowLinkDialog(true)
                          }
                        }
                      }

                      // Intercept Ctrl+K shortcut to show custom dialog
                      editor.keystrokes.set("Ctrl+K", (data: any, cancel: () => void) => {
                        cancel()
                        const selection = editor.model.document.selection
                        let text = ""
                        const ranges = Array.from(selection.getRanges())
                        ranges.forEach((range: any) => {
                          for (const item of range.getItems()) {
                            if (item.is("$textProxy") || item.is("$text")) {
                              text += item.data
                            }
                          }
                        })
                        
                        const linkCommand = editor.commands.get("link")
                        if (linkCommand?.value) {
                          setLinkUrl(linkCommand.value)
                        }
                        
                        setSelectedText(text)
                        setLinkDisplayText(text)
                        setShowLinkDialog(true)
                      })
                    }}
                    config={{
                      // Required by the new CKEditor 5 licensing model when using the GPL build.
                      // See: https://ckeditor.com/docs/ckeditor5/latest/support/error-codes.html#error-license-key-missing
                      licenseKey: "GPL",
                      // Fix for CKEditorError: "object null is not iterable (cannot read property Symbol(Symbol.iterator))"
                      // This error is thrown from CKEditor’s internal balloon toolbar positioning
                      // code (`_getBalloonPositionData`) in some modal/dialog setups when the
                      // balloon toolbar tries to calculate its position against a DOM element
                      // that has just been removed (e.g. when used inside Radix Dialog).
                      //
                      // Disabling the `BalloonToolbar` plugin prevents that faulty positioning
                      // call path while keeping the main toolbar fully functional.
                      removePlugins: ["BalloonToolbar"],
                      toolbar: [
                        "heading",
                        "|",
                        "bold",
                        "italic",
                        "underline",
                        "link",
                        "|",
                        "bulletedList",
                        "numberedList",
                        "|",
                        "imageUpload",
                        "insertTable",
                        "blockQuote",
                        "|",
                        "undo",
                        "redo",
                      ],
                      image: {
                        toolbar: [
                          "imageStyle:inline",
                          "imageStyle:block",
                          "imageStyle:side",
                          "|",
                          "imageTextAlternative",
                        ],
                      },
                      link: {
                        // Automatically add https:// to URLs that don't have a protocol
                        defaultProtocol: "https://",
                        // Configure which protocols are allowed
                        allowedProtocols: ["http", "https", "mailto", "tel"],
                        // Disable the default link balloon UI - we use custom dialog
                        decorators: {
                          openInNewTab: {
                            mode: "automatic",
                            callback: (url: string) => {
                              // Automatically mark links starting with http/https as external
                              return /^https?:\/\//.test(url)
                            },
                            attributes: {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            },
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-xs text-muted-foreground">
                    Loading editor...
                  </div>
                )}
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

      {/* Custom Link Dialog Modal */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => {
        if (!open) {
          handleCancelLink()
        }
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
          // Prevent closing when clicking on the editor
          const target = e.target as HTMLElement
          if (target.closest(".ck-editor") || target.closest(".signature-editor-wrapper")) {
            e.preventDefault()
          }
        }}>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Enter the display text and web address for your link, similar to Outlook&rsquo;s link dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-display-input">Display as</Label>
              <Input
                id="link-display-input"
                type="text"
                placeholder={selectedText || "Best regards, Your Name"}
                value={linkDisplayText}
                onChange={(e) => setLinkDisplayText(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url-input">Link URL</Label>
              <Input
                id="link-url-input"
                type="url"
                placeholder="https://example.com or mailto:email@example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkUrl.trim()) {
                    e.preventDefault()
                    handleApplyLink()
                  } else if (e.key === "Escape") {
                    handleCancelLink()
                  }
                }}
                autoFocus
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL (e.g., https://example.com or mailto:email@example.com)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelLink}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyLink}
              disabled={!linkUrl.trim()}
            >
              Apply Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
