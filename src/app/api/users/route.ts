import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

const DEFAULT_PAGE_SIZE = 10

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = new URL(request.url)
    const pageParam = url.searchParams.get("page")
    const pageSizeParam = url.searchParams.get("pageSize")
    const search = url.searchParams.get("search") || ""
    const roleFilter = url.searchParams.get("role") || "all"
    const sortBy = (url.searchParams.get("sortBy") ||
      "createdAt") as "name" | "email" | "role" | "createdAt"
    const sortOrder = (url.searchParams.get("sortOrder") ||
      "desc") as "asc" | "desc"

    const page = Math.max(1, Number(pageParam) || 1)
    const pageSize = Math.max(1, Number(pageSizeParam) || DEFAULT_PAGE_SIZE)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from("User")
      .select('id, name, email, role, "createdAt", "updatedAt"', {
        count: "exact",
      })

    if (search.trim()) {
      const q = `%${search.trim()}%`
      query = query.or(`name.ilike.${q},email.ilike.${q}`)
    }

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter)
    }

    const sortColumn =
      sortBy === "createdAt" || sortBy === "role" || sortBy === "email"
        ? sortBy
        : "name"

    query = query
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("users GET error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }

    const users = (data || []).map((u) => ({
      id: u.id as string,
      name: (u as any).name as string | null,
      email: (u as any).email as string | null,
      role: (u as any).role as "ADMIN" | "CLIENT",
      createdAt: new Date((u as any).createdAt).toISOString(),
      updatedAt: (u as any).updatedAt
        ? new Date((u as any).updatedAt).toISOString()
        : undefined,
    }))

    return NextResponse.json(
      {
        users,
        total: count ?? users.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("users GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

