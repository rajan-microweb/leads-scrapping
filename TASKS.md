# Admin Panel – Tasks (Changes to Implement)

This file lists changes identified from a full pass over the admin panel. Work through them in order or by section as needed.

---

## 1. Terminology & consistency

1. **Unify "Lead file" vs "Lead sheet"** ✅  
   The app uses both terms (e.g. lead detail page title "Lead file", API messages "Lead sheet not found"). Pick one term (e.g. "Lead sheet") and use it everywhere: page titles, breadcrumbs, empty states, API error messages, and comments. *Done: "Lead sheet" used everywhere.*

2. **Align API route naming** ✅  
   There is both `/api/lead-file` (single) and `/api/lead-files` (list, import, rows). Document when each is used, or consolidate so naming is consistent (e.g. all under `lead-files`). *Done: all under `/api/lead-files` (GET list, POST create, DELETE; GET /api/lead-files/[id] for single sheet; import, parse-headers, rows, run-action, run-status under lead-files).*

---

## 2. Code quality & cleanup

3. **Remove duplicate sidebar toggle component** ✅  
   Two components exist: `src/components/sidebar-toggle.tsx` and `src/components/layout/SidebarToggle.tsx`. AppShell uses `layout/SidebarToggle`. Delete `src/components/sidebar-toggle.tsx` if unused, or switch to a single implementation and remove the other. *Done: deleted unused `sidebar-toggle.tsx`; AppShell uses `layout/SidebarToggle`.*

4. **Move n8n webhook URL to environment**  
   `src/app/api/lead-files/[id]/run-action/route.ts` hardcodes `N8N_SEND_MAIL_WEBHOOK_URL`. Add e.g. `N8N_SEND_MAIL_WEBHOOK_URL` to `env.example` and use it in the route; document in README or SETUP.md.

5. **Standardize API error response shape**  
   Ensure all API routes return errors in a consistent shape (e.g. `{ error: string }`) and appropriate status codes so the frontend can handle them uniformly.

---

## 3. Leads list page (`/leads`)

6. **Export lead sheets to CSV/Excel** ✅  
   Add an "Export" (or "Download") action so users can export the current list of lead sheets (or filtered list) as CSV or Excel. *Done: "Export CSV" and "Export Excel" buttons in leads list toolbar; export uses filtered/sorted list; xlsx used for Excel.*

7. **Use shared Select for signature in Create Leads modal** ✅  
   Replace the native `<select>` for "Select signature" with the same Radix `Select` used elsewhere so styling and behavior match the rest of the app. *Done: signature dropdown is now Radix Select with No signature, signatures list, and Create New Signature.*

8. **Import summary when adding to existing sheet** ✅  
   When import option is "Add to existing sheet", `redirectToId` is undefined so the summary dialog "Done" only closes. Either keep user on the same lead sheet, auto-navigate to that sheet, or clarify in the summary that they can open the sheet from the list. *Done: import API returns sheet id for both "new" and "add"; summary always sets `redirectToId` so "Done" navigates to that sheet.*

9. **Last upload card when no sheets** ✅  
   "Last upload" card uses `leadSheets[0]`; when list is empty it still shows "No sheets yet". Confirm copy and layout are correct for the empty state (e.g. no misleading date). *Done: when empty, main text shows "—", caption shows "Upload a sheet to get started"; when not empty, date and "Most recent sheet you've added" unchanged.*

---

## 4. Lead detail page (`/leads/[id]`)

10. **Unify page title and breadcrumb wording** ✅  
    Use the same term ("Lead sheet" or "Lead file") in the page title, breadcrumb, and not-found/error states (e.g. "Lead file" vs "Lead sheet" in `LeadDetailNav` and empty/error titles). *Done: `LeadDetailNav`, loading, not-found, and error states all use "Lead sheet".*

11. **Make email status and has replied filterable** ✅  
    In `src/config/lead-row-fields.ts`, `emailStatus` and `hasReplied` have `filterable: false`. Add filterable options and wire filters in the lead detail UI (e.g. filter by Pending/Sent/Completed/Failed and by Has replied YES/NO). *Done: both fields are filterable; `/leads/[id]` UI has filter chips for Email status (Pending/Sent/Completed/Failed/Not Eligible) and Has replied (YES/NO), wired through to `/api/lead-files/[id]/rows` via `emailStatus` and `hasReplied` query params.*

12. **Run action: return job id and poll status**  
    If run-action is async, have the API return a `jobId` and document or implement polling via `/api/lead-files/[id]/run-status/[jobId]` so the UI can show "Running..." and then update when the job completes.

13. **Toast copy for run action** ✅  
    After "Run" (send mail), the toast says "Send mail triggered successfully". Ensure this (or similar) is used consistently and that the description matches the action. *Done: run action toast title is "Send mail triggered successfully" with description "Emails are being sent in the background."; row add/update toasts still use row-specific copy.*

14. **Reindex on sheet open** ✅  
    Opening a lead sheet triggers a POST to `/api/lead-files/[id]/rows/reindex` every time. For large sheets this may be slow. Consider making reindex optional, run once after import, or run in the background and avoid blocking the initial rows load. *Done: rows load immediately; reindex now runs once per session per sheet in the background using `sessionStorage`, so it no longer blocks initial load.*

15. **Optional: virtualized table for large row sets**  
    For lead sheets with many rows (e.g. 10k+), consider a virtualized table so scrolling and DOM size stay manageable.

---

## 5. Dashboard

16. **Quick links "current" state** ✅  
    Dashboard quick links use `isCurrent` for "Dashboard". Pass the current pathname (e.g. from `usePathname()`) so the correct item is highlighted on every page, not only on the dashboard. *Done: `DashboardContent` uses `usePathname` and an `isCurrentPath` helper so each quick link is highlighted when its route (or subroute) is active.*

17. **Recent activity deep links** ✅  
    Recent activity items link to `/leads`, `/signatures`, or `/integrations`. Where possible, link to the specific resource (e.g. `/leads/[id]` for a lead sheet, or a specific signature) for better UX. *Done: lead activity items now deep-link to `/leads/[id]`; signatures and integrations still go to their list pages until dedicated detail views exist.*

18. **Dashboard refetch / error handling** ✅  
    Ensure retry/refetch for dashboard data is clear and that partial failures (e.g. leads load but integrations fail) are handled or reported appropriately. *Done: dashboard shows a non-blocking error banner with retry when any section fails, while still rendering whatever data loaded successfully.*

---

## 6. Profile

19. **Profile form structure** ✅  
    Profile form is long (personal, website, company intelligence). Consider splitting into tabs or collapsible sections (e.g. "Personal", "Website", "Company intelligence") to make it easier to scan and edit. *Done: profile is organized into separate cards for Personal Information, Website, Company intelligence, and Change password, making the long form easier to scan.*

20. **Change password feedback** ✅  
    Use the same feedback pattern as elsewhere (e.g. toast for success) when password is changed, and ensure error messages are shown inline or via toast consistently. *Done: change password uses inline error alerts and a success toast before signing the user out.*

---

## 7. Auth

21. **Redirect to intended URL after sign-in** ✅  
    After login, redirect users to the URL they tried to access (e.g. from `callbackUrl` or referrer) instead of always sending them to `/dashboard`. *Done: middleware preserves the intended path in a `callbackUrl` param and the sign-in page passes it to `signIn` and uses it for post-login navigation.*

22. **Auth middleware and onboarding** ✅  
    Ensure `/auth/onboarding` is handled correctly: e.g. add it to the list of routes that logged-in users are redirected from (if onboarding is one-time), or allow access when needed and redirect from dashboard when profile/website info is incomplete. *Done: dashboard checks for a `WebsiteSubmission` record for the user and redirects to `/auth/onboarding` when missing; onboarding still skips to `/dashboard` when profile/website info already exists.*

23. **Document SMTP and email** ✅  
    `env.example` references SMTP and APP_URL. Add or point to a short guide (e.g. SMTP-CONFIGURATION-GUIDE.md or README section) so deployers know how to configure password reset and any other email flows. *Done: `docs/SMTP-CONFIGURATION-GUIDE.md` explains all SMTP-related env vars, common provider setups, and how password reset/invite flows use `sendEmail` and `APP_URL`.*

---

## 8. Users (admin)

24. **Add/invite user flow** ✅  
    Users page has role management but no "Add user" or "Invite user". Add an action to create/invite users if that’s required for admins. *Done: admin-only `/api/users/invite` endpoint creates users and emails an invite link; `UsersTable` includes an "Add user" button that opens an invite dialog wired to this API.*

25. **Users table scalability** ✅  
    Users are loaded once and filtered/sorted in the client. If the number of users can grow large, consider server-side pagination and filtering (e.g. via API params). *Done: new `GET /api/users` supports server-side pagination, search, role filter, and sort; `UsersTable` now consumes this API and uses the returned `total` for counts and pagination.*

---

## 9. Integrations

26. **Disconnect integration** ✅  
    Ensure "Disconnect" (or equivalent) for Outlook has a confirmation step and that tokens/metadata are cleared correctly on the backend. *Done: Outlook `IntegrationCard` shows a confirmation dialog before disconnecting, and the backend `DELETE /api/integrations` removes the integration row (and its stored credentials/metadata) for that user.*

27. **Integration placeholders** ✅  
    If more integrations (e.g. Gmail, Calendar) are planned, add placeholder cards or a short note in the UI so it’s clear the list is intentional. *Done: Integrations page shows a “More integrations coming soon” placeholder card under Email & Calendar explaining that Gmail, Calendar, and other tools will appear there when added.*

---

## 10. Signatures

28. **Signatures list empty and error states** ✅  
    Confirm signatures list shows a clear empty state and that API errors are surfaced (e.g. via ErrorMessage or toast) with retry where appropriate. *Done: signatures list uses distinct empty states for “no signatures yet” and “no matches”, plus an `ErrorMessage` component with retry when the API call fails.*

29. **Signature content sanitization** ✅  
    Rich text signature content is stored and rendered; ensure `sanitize-html` (or equivalent) is used wherever HTML is displayed to avoid XSS. *Done: `POST/PUT /api/signatures` sanitize HTML via `sanitizeHtml` before storing; the UI edits/renders signatures through TipTap rather than raw `dangerouslySetInnerHTML`.*

---

## 11. API & backend

30. **Single lead-file route usage** ✅  
    Clarify when `POST /api/lead-file` is used vs `POST /api/lead-files/import`. If one path is redundant, deprecate or remove it and update the client. *Done: the legacy `/api/lead-file` route has been removed; the app now uses the consolidated `/api/lead-files` family of routes for listing, creating, importing, and working with lead sheets.*

31. **run-action and run-status contract**  
    Document or implement the contract between run-action (e.g. returning `jobId`) and run-status (e.g. polling until completed/failed) so the frontend can show progress when you add polling (see task 12).

---

## 12. Documentation & config

32. **README project structure**  
    Update the README "Project structure" to match the current app router layout (e.g. `(app)/dashboard`, `(app)/leads`, auth routes) so new contributors see the real structure.

33. **env.example n8n and APP_URL**  
    In `env.example`, add a line for the n8n webhook URL (when you move it to env) and a short comment that `APP_URL` is used for callbacks (e.g. n8n) and must be reachable where needed.

---

## 13. Accessibility & UX

34. **Skip to main content** ✅  
    Add a "Skip to main content" link at the top of the layout for keyboard and screen-reader users, especially when the sidebar is visible. *Done: root layout includes a visually-hidden-on-load "Skip to main content" link that becomes visible on focus and targets `#main-content`, which is applied to the main scrollable region in `AppShell` and focusable via `tabIndex={-1}`.*

35. **Loading and success patterns** ✅  
    Align loading (skeleton vs spinner) and success (toast vs inline) with the design system (e.g. toast for success, skeletons for list/table loads) and apply consistently across Leads, Dashboard, Profile, and Users. *Done: long loads use skeletons (`Skeleton`, `TableSkeleton`) or a centered spinner for lists; success feedback is delivered via toasts or inline `role="status"` messages in Leads, Dashboard, Profile, Users, and Signatures flows.*

36. **Form labels and ARIA** ✅  
    Do a quick pass on forms (Create Leads, Profile, Signatures, Users) to ensure every control has an associated label (`htmlFor`/`id` or `aria-label`) and that errors use `role="alert"` where appropriate. *Done: key forms were verified/updated so inputs are labeled via `Label` + `htmlFor` or `aria-label`, and error messages use `role="alert"` consistently.*

---

## 14. Optional / future

37. **Rate limiting**  
    Consider rate limiting on auth endpoints (sign-in, forgot password, signup) and on heavy API routes (e.g. import, run-action) to reduce abuse and load.

38. **Error boundary**  
    Add an error boundary around the main app content (e.g. in `(app)/layout.tsx`) so uncaught errors show a friendly message and optional retry instead of a blank or broken page.

39. **Bulk actions beyond delete**  
    On leads list and lead detail, consider more bulk actions (e.g. assign signature, export selected rows, or tag) if they fit the product.

---

*End of task list. You can tick off items as you implement them.*
