"use client"

import { useEffect, useState } from "react"

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connected</DialogTitle>
          <DialogDescription>
            {platformDisplayName} has been connected successfully.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
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
