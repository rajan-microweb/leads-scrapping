"use client"

import { useState, FormEvent, useEffect } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

type IntegrationCardProps = {
  name: string
  platformName: string
  description?: string
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  onConnectionChange?: () => void
}

export function IntegrationCard({ name, platformName, description, Icon, onConnectionChange }: IntegrationCardProps) {
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [tenantId, setTenantId] = useState("")
  const [errors, setErrors] = useState<{ clientId?: string; clientSecret?: string; tenantId?: string; submit?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  // Fetch integration status on mount
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const response = await fetch("/api/integrations")
        if (response.ok) {
          const integrations = await response.json()
          const integration = integrations.find(
            (int: { platformName: string; isConnected: boolean }) =>
              int.platformName === platformName && int.isConnected
          )
          if (integration) {
            setIsConnected(true)
            setIntegrationId(integration.id)
          }
        }
      } catch (err) {
        console.error("Failed to fetch integration status:", err)
      } finally {
        setIsLoadingStatus(false)
      }
    }

    fetchIntegrationStatus()
  }, [platformName])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const nextErrors: { clientId?: string; clientSecret?: string; tenantId?: string; submit?: string } = {}
    if (!clientId.trim()) {
      nextErrors.clientId = "Client ID is required"
    }
    if (!clientSecret.trim()) {
      nextErrors.clientSecret = "Client Secret is required"
    }
    if (!tenantId.trim()) {
      nextErrors.tenantId = "Tenant ID is required"
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platformName,
          credentials: {
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            tenantId: tenantId.trim(),
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect integration")
      }

      // Success: reset form & close dialog
      setClientId("")
      setClientSecret("")
      setTenantId("")
      setOpen(false)
      setIsConnected(true)
      setIntegrationId(data.id)
      onConnectionChange?.()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "An unexpected error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrors({})

    try {
      const response = await fetch("/api/integrations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platformName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect integration")
      }

      // Success: close dialog and update state
      setDeleteDialogOpen(false)
      setIsConnected(false)
      setIntegrationId(null)
      onConnectionChange?.()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "An unexpected error occurred",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOutlookConnect = async () => {
    if (platformName !== "outlook") return
    setIsRedirecting(true)
    setRedirectError(null)
    try {
      const res = await fetch("/api/integrations/outlook-oauth-url")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to get authorization URL")
      }
      const data = await res.json()
      const url = data?.url
      if (typeof url !== "string" || !url) {
        throw new Error("Invalid response")
      }
      window.location.href = url
    } catch (err) {
      setRedirectError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsRedirecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="flex items-center justify-between gap-4 border-border/70 bg-background">
        <CardContent className="flex w-full items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white border border-border overflow-hidden p-1.5">
              {Icon ? (
                <Icon className="h-5 w-5" aria-hidden="true" />
              ) : platformName === "outlook" ? (
                <img
                  src="https://img.icons8.com/fluency/48/microsoft-outlook-2019.png"
                  alt={`${name} logo`}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // Fallback to colored O if image fails
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    const parent = target.parentElement
                    if (parent && !parent.querySelector(".outlook-fallback")) {
                      const fallback = document.createElement("div")
                      fallback.className = "outlook-fallback h-full w-full flex items-center justify-center rounded bg-[#0078D4] text-white text-xs font-bold"
                      fallback.textContent = "O"
                      parent.appendChild(fallback)
                    }
                  }}
                />
              ) : (
                <span className="text-base font-semibold">O</span>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium leading-none">{name}</div>
              {description && (
                <p className="text-xs text-muted-foreground max-w-md">{description}</p>
              )}
            </div>
          </div>

          {isLoadingStatus ? (
            <Button size="sm" disabled>
              Loading...
            </Button>
          ) : isConnected ? (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Disconnect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disconnect {name}</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to disconnect your {name} integration? This will
                    permanently delete the stored credentials and you will need to reconnect
                    to use this integration again.
                  </DialogDescription>
                </DialogHeader>

                {errors.submit && (
                  <p className="text-xs text-red-600">{errors.submit}</p>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : platformName === "outlook" ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                onClick={handleOutlookConnect}
                disabled={isRedirecting}
              >
                {isRedirecting ? "Redirecting..." : "Connect"}
              </Button>
              {redirectError && (
                <p className="text-xs text-red-600">{redirectError}</p>
              )}
            </div>
          ) : (
            <DialogTrigger asChild>
              <Button size="sm">Connect</Button>
            </DialogTrigger>
          )}
        </CardContent>
      </Card>

      {platformName !== "outlook" && (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {name}</DialogTitle>
          <DialogDescription>
            Enter your {name} OAuth credentials. These will be used to authorize access to
            your account.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
              disabled={isSubmitting}
            />
            {errors.clientId && (
              <p className="text-xs text-red-600">{errors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              required
              disabled={isSubmitting}
            />
            {errors.clientSecret && (
              <p className="text-xs text-red-600">{errors.clientSecret}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Tenant ID</Label>
            <Input
              id="tenantId"
              type="text"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              required
              disabled={isSubmitting}
            />
            {errors.tenantId && (
              <p className="text-xs text-red-600">{errors.tenantId}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-xs text-red-600">{errors.submit}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="submit" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      )}
    </Dialog>
  )
}

