"use client"

import { useState, FormEvent, useEffect, useRef } from "react"

import { ConnectionSuccessDialog } from "@/components/connection-success-dialog"
import { IntegrationDetails } from "@/components/integration-details"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [redirectError, setRedirectError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [isPendingConnection, setIsPendingConnection] = useState(false)
  const [oauthUrl, setOauthUrl] = useState<string | null>(null)
  const [oauthUrlError, setOauthUrlError] = useState<string | null>(null)
  const outlookPopupRef = useRef<Window | null>(null)
  const onConnectionChangeRef = useRef(onConnectionChange)
  onConnectionChangeRef.current = onConnectionChange

  // Pre-fetch Outlook OAuth URL so Connect can call window.open(url) with no await
  // before it, which avoids popup blockers and avoids setting popup.location to a
  // cross-origin URL (which some browsers block). Refetch when user disconnects.
  useEffect(() => {
    if (platformName !== "outlook" || isConnected) return
    if (oauthUrl || oauthUrlError) return
    let cancelled = false
    fetch("/api/integrations/outlook-oauth-url")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Not ok"))))
      .then((data) => {
        if (cancelled) return
        if (data?.url && typeof data.url === "string") {
          setOauthUrl(data.url)
          setOauthUrlError(null)
        } else {
          setOauthUrl(null)
          setOauthUrlError("Could not load sign-in link.")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOauthUrl(null)
          setOauthUrlError("Could not load sign-in link.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [platformName, isConnected, oauthUrl, oauthUrlError])

  // Fetch integration status from DB on mount. /api/integrations returns only the current
  // user's integrations (filtered by userId). No row for this platform → Connect; row
  // with isConnected for this platform → Disconnect.
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const response = await fetch("/api/integrations")
        if (response.ok) {
          const raw = await response.json()
          const list = Array.isArray(raw) ? raw : []
          const integration = list.find(
            (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
              int.platformName === platformName && int.isConnected
          )
          if (integration) {
            setIsConnected(true)
            setIntegrationId(integration.id ?? null)
            setMetadata(integration.metadata ?? null)
          } else {
            setIsConnected(false)
            setIntegrationId(null)
            setMetadata(null)
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

  // Outlook: poll for DB update after OAuth popup is opened
  useEffect(() => {
    if (!isPendingConnection || platformName !== "outlook") return

    const POLL_MS = 1500
    const TIMEOUT_MS = 10 * 60 * 1000
    const startedAt = Date.now()

    const id = setInterval(async () => {
      if (outlookPopupRef.current?.closed) {
        clearInterval(id)
        // Popup closed (e.g. auto-closed by n8n): do one final fetch and update UI if
        // the integration was stored in the DB, so the user doesn’t need to refresh
        try {
          const res = await fetch("/api/integrations")
          if (res.ok) {
            const raw = await res.json()
            const list = Array.isArray(raw) ? raw : []
            const found = list.find(
              (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
                int.platformName === "outlook" && int.isConnected
            )
            if (found) {
              setIsConnected(true)
              setIntegrationId(found.id)
              setMetadata(found.metadata ?? null)
              setOauthUrl(null)
              setOauthUrlError(null)
              setRedirectError(null)
              setSuccessDialogOpen(true)
              onConnectionChangeRef.current?.()
            }
          }
        } catch {
          /* ignore */
        }
        setIsPendingConnection(false)
        return
      }
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(id)
        setIsPendingConnection(false)
        return
      }
      try {
        const res = await fetch("/api/integrations")
        if (!res.ok) return
        const raw = await res.json()
        const list = Array.isArray(raw) ? raw : []
        const found = list.find(
          (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
            int.platformName === "outlook" && int.isConnected
        )
        if (found) {
          clearInterval(id)
          setIsConnected(true)
          setIntegrationId(found.id)
          setMetadata(found.metadata ?? null)
          setOauthUrl(null)
          setOauthUrlError(null)
          setRedirectError(null)
          setIsPendingConnection(false)
          setSuccessDialogOpen(true)
          onConnectionChangeRef.current?.()
        }
      } catch {
        // ignore, will retry next tick
      }
    }, POLL_MS)

    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/integrations")
        if (!res.ok) return
        const raw = await res.json()
        const list = Array.isArray(raw) ? raw : []
        const found = list.find(
          (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
            int.platformName === "outlook" && int.isConnected
        )
        if (found) {
          clearInterval(id)
          setIsConnected(true)
          setIntegrationId(found.id ?? null)
          setMetadata(found.metadata ?? null)
          setOauthUrl(null)
          setOauthUrlError(null)
          setRedirectError(null)
          setIsPendingConnection(false)
          setSuccessDialogOpen(true)
          onConnectionChangeRef.current?.()
        }
      } catch { /* ignore */ }
    }, 800)
    return () => { clearInterval(id); clearTimeout(t) }
  }, [isPendingConnection, platformName])

  // When Outlook is not connected and we're not in the OAuth flow, still check the DB
  // periodically (e.g. user completed OAuth in another tab, or fallback link was used
  // in a way that didn't set isPendingConnection). Ensures the UI updates without refresh.
  useEffect(() => {
    if (platformName !== "outlook" || isConnected || isLoadingStatus || isPendingConnection) return

    const SYNC_MS = 10_000
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/integrations")
        if (!res.ok) return
        const raw = await res.json()
        const list = Array.isArray(raw) ? raw : []
        const found = list.find(
          (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
            int.platformName === "outlook" && int.isConnected
        )
        if (found) {
          clearInterval(id)
          setIsConnected(true)
          setIntegrationId(found.id ?? null)
          setMetadata(found.metadata ?? null)
          setOauthUrl(null)
          setOauthUrlError(null)
          setRedirectError(null)
          onConnectionChangeRef.current?.()
        }
      } catch { /* ignore */ }
    }, SYNC_MS)

    return () => clearInterval(id)
  }, [platformName, isConnected, isLoadingStatus, isPendingConnection])

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

      // Re-fetch from DB (user-scoped by /api/integrations) to confirm persisted state and get metadata.
      // Only update UI and show success when we have a DB-confirmed row; no optimistic updates.
      const verificationError =
        "Connection was reported successful but we could not verify it. Please refresh the page to confirm."
      try {
        const refetchRes = await fetch("/api/integrations")
        if (refetchRes.ok) {
          const raw = await refetchRes.json()
          const list = Array.isArray(raw) ? raw : []
          const found = list.find(
            (int: { platformName: string; isConnected: boolean; id?: string; metadata?: Record<string, unknown> | null }) =>
              int.platformName === platformName && int.isConnected
          )
          if (found) {
            setIsConnected(true)
            setIntegrationId(found.id ?? data.id)
            setMetadata(found.metadata ?? null)
            setClientId("")
            setClientSecret("")
            setTenantId("")
            setOpen(false)
            setSuccessDialogOpen(true)
            onConnectionChange?.()
          } else {
            setErrors({ submit: verificationError })
          }
        } else {
          setErrors({ submit: verificationError })
        }
      } catch {
        setErrors({ submit: verificationError })
      }
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
      setMetadata(null)
      onConnectionChange?.()
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "An unexpected error occurred",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOutlookConnect = () => {
    if (platformName !== "outlook") return
    setRedirectError(null)
    outlookPopupRef.current = null

    if (!oauthUrl) {
      setRedirectError(oauthUrlError || "Sign-in link is still loading. Please wait a moment and try again.")
      return
    }

    const popup = window.open(oauthUrl, "_blank", "noopener,noreferrer,width=600,height=700")
    if (popup == null) {
      setRedirectError("Popup was blocked. Please allow popups and try again.")
      return
    }
    outlookPopupRef.current = popup
    setIsPendingConnection(true)

  }

  return (
    <>
    <div className="space-y-3 min-w-0">
      <Dialog open={open} onOpenChange={setOpen}>
        <Card className="border-border/70 transition-shadow duration-normal hover:shadow-dropdown overflow-hidden">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white border border-border overflow-hidden p-1.5">
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
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-medium leading-none">{name}</div>
                {description && (
                  <p className="text-xs text-muted-foreground break-words">{description}</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          {isLoadingStatus ? (
            <Button size="sm" disabled className="gap-2 w-full sm:w-auto">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              Loading...
            </Button>
          ) : isConnected ? (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  Disconnect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Disconnect {name}</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to disconnect your {name} integration? This will
                    permanently delete the stored credentials and you will need to reconnect
                    to use this integration again.
                  </DialogDescription>
                </DialogHeader>

                {errors.submit && (
                  <p className="text-xs text-destructive">{errors.submit}</p>
                )}

                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full sm:w-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : platformName === "outlook" ? (
            <>
              <Button
                size="sm"
                onClick={handleOutlookConnect}
                disabled={isPendingConnection || (oauthUrl === null && oauthUrlError === null)}
                className="gap-2 w-full sm:w-auto"
              >
                {(isPendingConnection || (oauthUrl === null && oauthUrlError === null)) ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    {isPendingConnection ? "Connecting..." : "Loading..."}
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
              {(redirectError || oauthUrlError) && (
                <div className="w-full space-y-1 text-right">
                  <p className="text-xs text-destructive break-words" role="alert">{redirectError || oauthUrlError}</p>
                  {redirectError === "Popup was blocked. Please allow popups and try again." &&
                    oauthUrl && (
                      <a
                        href={oauthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setRedirectError(null)
                          setIsPendingConnection(true)
                        }}
                        className="text-xs text-primary underline hover:no-underline"
                      >
                        Or open sign-in in a new tab
                      </a>
                    )}
                </div>
              )}
            </>
          ) : (
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">Connect</Button>
            </DialogTrigger>
          )}
            </div>
        </CardContent>
      </Card>

      {platformName !== "outlook" && (
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
              <p className="text-xs text-destructive">{errors.clientId}</p>
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
              <p className="text-xs text-destructive">{errors.clientSecret}</p>
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
              <p className="text-xs text-destructive">{errors.tenantId}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive">{errors.submit}</p>
          )}

          <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto sm:ml-auto" disabled={isSubmitting}>
              {isSubmitting ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      )}
      </Dialog>

      {isConnected && (
        <Card className="min-w-0 overflow-hidden border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="type-card-title truncate">{name} profile</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 pt-0">
            <IntegrationDetails
              metadata={metadata}
              platformName={platformName}
              hideTitle
              emptyMessage="No profile details available."
            />
          </CardContent>
        </Card>
      )}
    </div>
    <ConnectionSuccessDialog
      open={successDialogOpen}
      onOpenChange={setSuccessDialogOpen}
      platformDisplayName={name}
      duration={5}
    />
    </>
  )
}

