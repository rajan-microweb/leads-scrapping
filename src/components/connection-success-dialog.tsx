"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ConnectionSuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformDisplayName: string
  duration?: number
}

export function ConnectionSuccessDialog({
  open,
  onOpenChange,
  platformDisplayName,
  duration = 5,
}: ConnectionSuccessDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState(duration)

  useEffect(() => {
    if (!open) return

    setSecondsLeft(duration)

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onOpenChange(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, duration, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>Connected</DialogTitle>
              <DialogDescription>
                {platformDisplayName} has been connected successfully.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="type-caption">
          Closing in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
