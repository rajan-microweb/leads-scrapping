"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { AddSignatureModal } from "./add-signature-modal"
import type { Signature } from "@/types/signatures"

export function SignaturesList() {
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadSignatures = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch("/api/signatures")

      if (!res.ok) {
        throw new Error("Failed to load signatures")
      }

      const data = (await res.json()) as Signature[]
      setSignatures(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading signatures."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSignatures()
  }, [])

  const handleSuccess = () => {
    loadSignatures()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Email Signatures</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Create and manage reusable email signatures for your communications.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Signature
        </Button>
      </div>

      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Signatures</span>
            <span className="text-xs font-normal text-muted-foreground">
              Manage your email signatures
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Loading signatures...</span>
            </div>
          ) : error ? (
            <div className="flex h-24 items-center justify-center text-sm text-red-600">
              {error}
            </div>
          ) : signatures.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">
                  No signatures yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Get started by creating your first email signature using the &quot;Add Signature&quot; button above.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((signature) => (
                  <TableRow key={signature.id}>
                    <TableCell className="font-medium">
                      {signature.name}
                    </TableCell>
                    <TableCell>
                      {new Date(signature.updatedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption className="text-xs text-muted-foreground">
                Showing {signatures.length} {signatures.length === 1 ? "signature" : "signatures"}
              </TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddSignatureModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
