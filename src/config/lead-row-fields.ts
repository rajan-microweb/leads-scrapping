/**
 * Lead row field configuration for table columns, sort, filter, and add/edit form.
 *
 * To add a new lead row attribute:
 * 1. Add the key to LeadRowFieldKey and the entry to LEAD_ROW_FIELDS (searchable, sortable, filterable, formField, formInputType).
 * 2. Extend the LeadRow type (in LeadRowFormSidebar) and the API GET/POST/PATCH/DELETE to include the new column.
 * 3. Table, sort, filter, and sidebar form will pick it up from this config.
 */
export type LeadRowFieldKey =
  | "rowIndex"
  | "businessEmail"
  | "websiteUrl"
  | "emailStatus"
  | "hasReplied"

export interface LeadRowFieldConfig {
  key: LeadRowFieldKey
  label: string
  searchable: boolean
  sortable: boolean
  filterable: boolean
  /** Shown in add/edit sidebar form */
  formField: boolean
  /** Input type when used in form (email, url, text) */
  formInputType?: "email" | "url" | "text"
}

export const LEAD_ROW_FIELDS: LeadRowFieldConfig[] = [
  {
    key: "rowIndex",
    label: "Row index",
    searchable: false,
    sortable: true,
    filterable: false,
    formField: false,
  },
  {
    key: "businessEmail",
    label: "Business email",
    searchable: true,
    sortable: true,
    filterable: true,
    formField: true,
    formInputType: "email",
  },
  {
    key: "websiteUrl",
    label: "Website URL",
    searchable: true,
    sortable: true,
    filterable: true,
    formField: true,
    formInputType: "url",
  },
  {
    key: "emailStatus",
    label: "Email status",
    searchable: false,
    sortable: true,
    filterable: true,
    formField: false,
  },
  {
    key: "hasReplied",
    label: "Has replied",
    searchable: false,
    sortable: true,
    filterable: true,
    formField: false,
  },
]

export const LEAD_ROW_SORTABLE_KEYS = LEAD_ROW_FIELDS.filter((f) => f.sortable).map(
  (f) => f.key
) as LeadRowFieldKey[]

export const LEAD_ROW_FILTERABLE_FIELDS = LEAD_ROW_FIELDS.filter(
  (f) => f.filterable
)

export const LEAD_ROW_FORM_FIELDS = LEAD_ROW_FIELDS.filter((f) => f.formField)

/** Columns to show in the lead rows table (order matches config) */
export const LEAD_ROW_TABLE_COLUMNS = LEAD_ROW_FIELDS
