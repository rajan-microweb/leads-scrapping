"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { LEAD_ROW_FORM_FIELDS, type LeadRowFieldKey } from "@/config/lead-row-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export type LeadRow = {
  id: string
  rowIndex: number
  businessEmail: string | null
  websiteUrl: string | null
  emailStatus?: string | null
  hasReplied?: "YES" | "NO" | null
}

type LeadRowFormSidebarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  row: LeadRow | null
  leadFileId: string
  onSuccess: (mode: "add" | "edit") => void
}

export function LeadRowFormSidebar({
  open,
  onOpenChange,
  mode,
  row,
  leadFileId,
  onSuccess,
}: LeadRowFormSidebarProps) {
  const [formValues, setFormValues] = useState<Record<LeadRowFieldKey, string>>({
    rowIndex: "",
    businessEmail: "",
    websiteUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = mode === "edit"

  useEffect(() => {
    if (open) {
      setError(null)
      if (isEdit && row) {
        setFormValues({
          rowIndex: String(row.rowIndex),
          businessEmail: row.businessEmail ?? "",
          websiteUrl: row.websiteUrl ?? "",
        })
      } else {
        setFormValues({
          rowIndex: "",
          businessEmail: "",
          websiteUrl: "",
        })
      }
    }
  }, [open, isEdit, row])

  function getBodyFromFormValues(): Record<string, string | null> {
    const body: Record<string, string | null> = {}
    for (const field of LEAD_ROW_FORM_FIELDS) {
      const v = formValues[field.key as LeadRowFieldKey]?.trim()
      body[field.key] = v || null
    }
    return body
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leadFileId || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    const body = getBodyFromFormValues()

    try {
      if (isEdit && row) {
        const res = await fetch(
          `/api/lead-files/${encodeURIComponent(leadFileId)}/rows/${encodeURIComponent(row.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? "Failed to update row")
        }
        onSuccess("edit")
        onOpenChange(false)
      } else {
        const res = await fetch(
          `/api/lead-files/${encodeURIComponent(leadFileId)}/rows`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? "Failed to add row")
        }
        onSuccess("add")
        onOpenChange(false)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="type-card-title">
            {isEdit ? "Edit lead row" : "Add lead row"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the business email and website URL for this row."
              : "Enter the business email and website URL for the new row."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 pt-4"
        >
          {error && (
            <p
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          {LEAD_ROW_FORM_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`lead-row-${field.key}`}>{field.label}</Label>
              <Input
                id={`lead-row-${field.key}`}
                type={field.formInputType ?? "text"}
                placeholder={
                  field.key === "businessEmail"
                    ? "email@example.com"
                    : field.key === "websiteUrl"
                      ? "https://example.com"
                      : undefined
                }
                value={formValues[field.key as LeadRowFieldKey] ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                autoComplete={field.key === "businessEmail" ? "email" : field.key === "websiteUrl" ? "url" : undefined}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>
          ))}

          <SheetFooter className="mt-auto border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {isEdit ? "Saving..." : "Adding..."}
                </>
              ) : isEdit ? (
                "Save"
              ) : (
                "Add row"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
