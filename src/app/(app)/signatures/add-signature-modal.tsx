"use client"

import { useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import FileHandler from "@tiptap/extension-file-handler"
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
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  RemoveFormatting,
  Loader2,
} from "lucide-react"
import type { Signature } from "@/types/signatures"

type AddSignatureModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  signature?: Signature | null
}

export function AddSignatureModal({
  open,
  onOpenChange,
  onSuccess,
  signature,
}: AddSignatureModalProps) {
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = !!signature

  // Handle image upload to Supabase Storage
  const uploadImage = async (file: File): Promise<string> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image")
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB")
    }

    const formData = new FormData()
    formData.append("image", file)

    const response = await fetch("/api/signatures/upload-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error || "Failed to upload image")
    }

    const data = await response.json()

    if (!data.url) {
      throw new Error("No URL returned from upload")
    }

    return data.url
  }

  // Convert file to base64 for immediate preview
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Helper function to replace image src in editor
  const replaceImageSrc = (editorInstance: any, oldSrc: string, newSrc: string) => {
    const { tr } = editorInstance.state
    let found = false
    editorInstance.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "image" && node.attrs.src === oldSrc && !found) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc })
        found = true
        return false
      }
    })
    if (found) {
      editorInstance.view.dispatch(tr)
    }
  }

  // Tiptap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default heading to allow custom styling
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "signature-image",
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"],
        onDrop: async (editorInstance, files, pos) => {
          for (const file of files) {
            try {
              // Show image immediately as base64
              const base64 = await fileToBase64(file)
              editorInstance.chain().focus().setImage({ src: base64 }).run()

              // Upload in background and replace with URL
              const url = await uploadImage(file)
              replaceImageSrc(editorInstance, base64, url)
            } catch (error) {
              console.error("Image upload error:", error)
              // Remove the base64 image if upload fails
              editorInstance.chain().focus().deleteSelection().run()
            }
          }
        },
        onPaste: async (editorInstance, files, htmlContent) => {
          for (const file of files) {
            try {
              // Show image immediately as base64
              const base64 = await fileToBase64(file)
              editorInstance.chain().focus().setImage({ src: base64 }).run()

              // Upload in background and replace with URL
              const url = await uploadImage(file)
              replaceImageSrc(editorInstance, base64, url)
            } catch (error) {
              console.error("Image upload error:", error)
              // Remove the base64 image if upload fails
              editorInstance.chain().focus().deleteSelection().run()
            }
          }
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[280px] px-4 py-2",
      },
    },
  })

  // Load signature data when in edit mode
  useEffect(() => {
    if (open && signature) {
      setName(signature.name)
      setContent(signature.content)
      if (editor) {
        editor.commands.setContent(signature.content)
      }
    } else if (open && !signature) {
      // Reset for add mode
      setName("")
      setContent("")
      if (editor) {
        editor.commands.clearContent()
      }
    }
  }, [open, signature, editor])

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

      const url = "/api/signatures"
      const method = isEditMode ? "PUT" : "POST"
      const body = isEditMode
        ? {
            id: signature!.id,
            name: name.trim(),
            content: content.trim(),
          }
        : {
            name: name.trim(),
            content: content.trim(),
          }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let errorMessage = isEditMode
          ? "Failed to update signature"
          : "Failed to create signature"
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
      if (editor) {
        editor.commands.clearContent()
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
      if (editor) {
        editor.commands.clearContent()
      }
      onOpenChange(false)
    }
  }

  // Handle image button click
  const handleImageButtonClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && editor) {
        try {
          // Show image immediately as base64
          const base64 = await fileToBase64(file)
          editor.chain().focus().setImage({ src: base64 }).run()

          // Upload in background and replace with URL
          const url = await uploadImage(file)
          replaceImageSrc(editor, base64, url)
        } catch (error) {
          console.error("Image upload error:", error)
          alert(error instanceof Error ? error.message : "Failed to upload image")
        }
      }
    }
    input.click()
  }

  // Ensure URL has a protocol (Outlook and many clients require absolute URLs)
  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return "https://" + trimmed
  }

  // Handle link button click: works with selected text, when cursor is in a link (edit), or when inserting new link
  const handleLinkButtonClick = () => {
    if (!editor) return
    const currentHref = editor.isActive("link") ? editor.getAttributes("link").href ?? "" : ""
    const url = window.prompt("Enter URL:", currentHref)
    if (url == null) return // User cancelled

    const trimmed = url.trim()
    if (!trimmed) {
      if (editor.isActive("link")) {
        editor.chain().focus().unsetLink().run()
      }
      return
    }

    const href = normalizeUrl(trimmed)

    if (editor.isActive("link")) {
      editor.chain().focus().setLink({ href }).run()
      return
    }
    if (!editor.state.selection.empty) {
      editor.chain().focus().setLink({ href }).run()
      return
    }
    // No selection: insert a new link so the URL is both the href and visible text (Outlook-safe)
    const safeHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
    const safeText = href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    editor.chain().focus().insertContent(`<a href="${safeHref}">${safeText}</a>`).run()
  }

  // Reset editor when modal closes (only if not in edit mode or closing)
  useEffect(() => {
    if (!open && editor && !isEditMode) {
      editor.commands.clearContent()
      setName("")
      setContent("")
      setError(null)
    }
  }, [open, editor, isEditMode])

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
          <DialogTitle>
            {isEditMode ? "Edit Email Signature" : "Add Email Signature"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your email signature. Use the editor to format your text, add links, and customize the appearance."
              : "Create a new email signature. Use the editor to format your text, add links, and customize the appearance."}
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
              <div className="signature-editor-wrapper border rounded-md overflow-hidden flex flex-col h-[320px]">
                {/* Toolbar */}
                {editor && (
                  <div className="flex items-center gap-1 p-2 border-b bg-background flex-wrap">
                    {/* Undo/Redo */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().undo().run()}
                      disabled={!editor.can().chain().focus().undo().run()}
                      className="h-8 w-8 p-0"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().redo().run()}
                      disabled={!editor.can().chain().focus().redo().run()}
                      className="h-8 w-8 p-0"
                    >
                      <Redo className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Text Formatting */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      disabled={!editor.can().chain().focus().toggleBold().run()}
                      className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-accent" : ""}`}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      disabled={!editor.can().chain().focus().toggleItalic().run()}
                      className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-accent" : ""}`}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      disabled={!editor.can().chain().focus().toggleUnderline().run()}
                      className={`h-8 w-8 p-0 ${editor.isActive("underline") ? "bg-accent" : ""}`}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Text Alignment */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign("left").run()}
                      className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "left" }) ? "bg-accent" : ""}`}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign("center").run()}
                      className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "center" }) ? "bg-accent" : ""}`}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().setTextAlign("right").run()}
                      className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: "right" }) ? "bg-accent" : ""}`}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Lists */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`h-8 w-8 p-0 ${editor.isActive("bulletList") ? "bg-accent" : ""}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`h-8 w-8 p-0 ${editor.isActive("orderedList") ? "bg-accent" : ""}`}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Link & Image */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLinkButtonClick}
                      className={`h-8 w-8 p-0 ${editor.isActive("link") ? "bg-accent" : ""}`}
                    >
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleImageButtonClick}
                      className="h-8 w-8 p-0"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Remove Format */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                      className="h-8 w-8 p-0"
                    >
                      <RemoveFormatting className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Editor Content */}
                <div className="flex-1 overflow-y-auto">
                  <EditorContent editor={editor} />
                </div>
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
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : isEditMode ? (
                "Update Signature"
              ) : (
                "Create Signature"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
