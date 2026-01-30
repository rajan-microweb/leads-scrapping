"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type PaginationProps = {
  /** Current 1-based page */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Called with the new page number (1-based) */
  onPageChange: (page: number) => void
  /** Total number of items across all pages */
  totalItems: number
  /** Number of items per page (used for "X–Y of Z" summary) */
  pageSize: number
  /** Singular item label, e.g. "file" → "1–10 of 42 files" */
  itemLabel?: string
  /** Optional filter note, e.g. " (filtered)" */
  filterNote?: string
  /** Optional class for the root */
  className?: string
}

/**
 * Reusable pagination bar: summary text (X–Y of Z) + Previous + page indicator + Next.
 * Uses chevron icons and optional numbered page buttons when total pages is small.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = "items",
  filterNote,
  className,
}: PaginationProps) {
  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  const plural = totalItems === 1 ? itemLabel : `${itemLabel}s`

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages && totalItems > 0

  // Show numbered page buttons when total pages is small
  const showPageNumbers = totalPages > 1 && totalPages <= 7
  const pageNumbers = showPageNumbers
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : []

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="type-caption text-muted-foreground order-2 sm:order-1">
        <span className="font-medium text-foreground">
          {startItem}–{endItem}
        </span>{" "}
        of {totalItems} {plural}
        {filterNote && <span>{filterNote}</span>}
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canGoPrev}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>

        {showPageNumbers ? (
          <div className="flex items-center gap-0.5 mx-1" role="navigation" aria-label="Page numbers">
            {pageNumbers.map((page) => {
              const isActive = page === currentPage
              return (
                <Button
                  key={page}
                  variant={isActive ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 min-w-0 text-xs font-medium",
                    !isActive && "border-transparent bg-transparent hover:bg-muted hover:border-input"
                  )}
                  onClick={() => onPageChange(page)}
                  aria-label={isActive ? `Page ${page} (current)` : `Go to page ${page}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page}
                </Button>
              )
            })}
          </div>
        ) : (
          <span className="type-caption text-muted-foreground min-w-[7rem] text-center px-2">
            Page {currentPage} of {totalPages}
          </span>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
