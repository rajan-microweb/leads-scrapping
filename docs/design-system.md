# Admin Panel Design System

This document describes the design tokens and patterns used across the admin panel. Use it to keep new features consistent.

## Color

- **Semantic tokens** (in `globals.css`): `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--card`, `--popover`. Use these for backgrounds, text, interactive states, and borders.
- **Accent palette**: `--success`, `--warning`, `--info` (and `-foreground`) for status, alerts, and empty-state accents. Tailwind: `success`, `warning`, `info`.
- **Gradients**: Optional for hero/empty states; keep subtle (e.g. `from-muted` to `background`).

## Typography

Use these utility classes for consistency:

| Class | Use |
|-------|-----|
| `type-page-title` | Main page heading (e.g. "Dashboard", "Leads") |
| `type-section-title` | Section heading within a page |
| `type-card-title` | Card header text |
| `type-body` | Body text |
| `type-caption` | Secondary text, hints |
| `type-overline` | Section labels (e.g. "Quick access", "Email & Calendar") |

## Spacing & layout

- **Page max-width**: Use `max-w-page` (56rem), `max-w-page-sm` (40rem), or `max-w-page-lg` (72rem) for content containers.
- **Section spacing**: Prefer `space-y-6` or `space-y-8` between major sections; `space-y-4` within sections.
- **Padding**: Page content `p-4 md:p-6 lg:p-8`; cards use `p-6` (CardHeader/CardContent).

## Motion

- **Durations**: `--duration-fast` (150ms), `--duration-normal` (200ms), `--duration-slow` (300ms). Tailwind: `duration-fast`, `duration-normal`, `duration-slow`.
- **Easing**: `--ease-out`, `--ease-in-out`. Tailwind: `ease-out`, `ease-in-out`.
- **Use**: Page/section enter, list stagger, button/card hover, modal open/close. Keep animations short and purposeful.
- **Reduced motion**: `prefers-reduced-motion: reduce` sets durations to 0ms; respect this for non-essential motion.

## Elevation

- **Card**: `shadow-card` (subtle).
- **Dropdown / popover**: `shadow-dropdown`.
- **Modal**: `shadow-modal`.

## Component usage

- **Dialog**: For forms and multi-step flows (e.g. Create Leads, Add Signature). Use shared padding and max-width.
- **AlertDialog**: For destructive or critical confirmations (e.g. Disconnect, Delete signatures).
- **Toast**: For success and non-blocking feedback after actions. Prefer toast over inline success banners for consistency.
- **Error**: Inline near the field or at top of form/modal; use destructive or warning token; include retry/cancel where useful.
- **Empty state**: Shared pattern: icon/illustration + short message + primary CTA. Reuse across Dashboard, Leads, Signatures, Users.

## Responsive

- **Sidebar**: Collapses to overlay on viewports &lt; 768px; toggle stored in localStorage on desktop.
- **Page content**: Use `max-w-page` (or sm/lg) and `p-4 md:p-6 lg:p-8` for consistent padding.
- **Tables**: Wrapped in `overflow-auto`; ensure pagination and actions wrap on small screens.
- **Breakpoints**: Use design system spacing and type scale; avoid cramped layouts on mobile.

## Accessibility

- **Focus**: Visible focus ring on all interactive elements (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`). Use `ring-offset-background` for contrast.
- **Reduced motion**: `prefers-reduced-motion: reduce` shortens durations to 0ms in CSS; use `motion-reduce:transition-none` or `motion-reduce:animate-none` where appropriate.
- **Contrast**: Text and interactive elements meet WCAG AA against their background.
- **Labels**: All form controls must have associated labels (`Label` with `htmlFor`, or `aria-label` on icon-only buttons).
- **Alerts**: Use `role="alert"` for errors and `role="status"` for success messages.
