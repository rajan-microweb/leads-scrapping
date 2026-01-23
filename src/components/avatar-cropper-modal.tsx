"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Area = {
  x: number
  y: number
  width: number
  height: number
}

type AvatarCropperModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (croppedImageFile: File) => void
}

export function AvatarCropperModal({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: AvatarCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.setAttribute("crossOrigin", "anonymous")
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    
    // Since aspect is 1, the crop area should be square
    // Use the minimum dimension to ensure we have a perfect square
    const size = Math.min(pixelCrop.width, pixelCrop.height)
    
    // Create a circular canvas
    const circularCanvas = document.createElement("canvas")
    const circularCtx = circularCanvas.getContext("2d")

    if (!circularCtx) {
      throw new Error("Could not get circular canvas context")
    }

    circularCanvas.width = size
    circularCanvas.height = size

    // Draw circular mask
    circularCtx.beginPath()
    circularCtx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI)
    circularCtx.clip()

    // Calculate the center of the crop area
    const cropCenterX = pixelCrop.x + pixelCrop.width / 2
    const cropCenterY = pixelCrop.y + pixelCrop.height / 2
    const cropSize = size

    // Draw the cropped image centered in the circle
    circularCtx.drawImage(
      image,
      cropCenterX - cropSize / 2,
      cropCenterY - cropSize / 2,
      cropSize,
      cropSize,
      0,
      0,
      size,
      size
    )

    return new Promise((resolve, reject) => {
      circularCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"))
            return
          }
          resolve(blob)
        },
        "image/png",
        1.0
      )
    })
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      setError("Please adjust the crop area")
      return
    }

    setIsProcessing(true)
    setError(null)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const file = new File([blob], "avatar.png", { type: "image/png" })
      onCropComplete(file)
      handleClose()
    } catch (error) {
      console.error("Error cropping image:", error)
      setError("Failed to process image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state when modal closes
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
  }

  const handleCancel = () => {
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose()
      } else {
        onOpenChange(isOpen)
      }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
          <DialogDescription>
            Adjust and crop your image. The final image will be circular.
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full" style={{ height: "400px" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="round"
            showGrid={false}
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
                position: "relative",
              },
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Zoom:</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? "Processing..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
