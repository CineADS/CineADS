import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.cineads.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

// Fetch from ML API using stored OAuth token
async function fetchML(supabase: any, path: string): Promise<any> {
  const { data: integrations } = await supabase
    .from("marketplace_integrations")
    .select("credentials")
    .eq("marketplace", "Mercado Livre")
    .eq("status", "connected")
    .limit(1)

  const accessToken = (integrations?.[0]?.credentials as any)?.access_token
  if (!accessToken) throw new Error("Nenhuma integração Mercado Livre conectada")

  const res = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`ML API HTTP ${res.status} for ${path}`)
  return res.json()
}

// Upsert categories into the cache table (fire-and-forget)
async function cacheCategories(supabase: any, rows: any[]) {
  if (rows.length === 0) return
  await supabase.from("mlb_categories").upsert(rows, { onConflict: "id", ignoreDuplicates: true })
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  // Use service role to access marketplace_integrations for ML token
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  try {
    // ── ROOTS ──────────────────────────────────────────────────────────────
    if (action === "roots") {
      const { data: cached } = await supabase
        .from("mlb_categories")
        .select("id, name, is_leaf, depth")
        .is("parent_id", null)
        .eq("site_id", "MLB")
        .order("name")

      if (cached && cached.length > 0) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Cache miss — fetch from ML API and cache for future requests
      const mlRoots: any[] = await fetchML(supabase, "/sites/MLB/categories")
      const rows = mlRoots.map((r: any) => ({
        id: r.id, name: r.name, parent_id: null,
        is_leaf: false, depth: 0, path_from_root: [{ id: r.id, name: r.name }],
        site_id: "MLB", total_items_in_this_category: 0,
        updated_at: new Date().toISOString(),
      }))

      // Cache in background — don't await, return fast
      EdgeRuntime.waitUntil(cacheCategories(supabase, rows))

      const result = rows.map(({ id, name, is_leaf, depth }: any) => ({ id, name, is_leaf, depth }))
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── CHILDREN ───────────────────────────────────────────────────────────
    if (action === "children") {
      const id = url.searchParams.get("id")
      if (!id) return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

      const { data: cached } = await supabase
        .from("mlb_categories")
        .select("id, name, is_leaf, depth, path_from_root")
        .eq("parent_id", id)
        .order("name")

      if (cached && cached.length > 0) {
        return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Cache miss — fetch category detail from ML API
      const catData = await fetchML(supabase, `/categories/${id}`)
      const children: any[] = catData.children_categories || []
      if (children.length === 0) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Get parent path from DB (for correct path_from_root)
      const { data: parentRow } = await supabase
        .from("mlb_categories")
        .select("path_from_root, depth")
        .eq("id", id)
        .maybeSingle()

      const parentPath: Array<{ id: string; name: string }> = parentRow?.path_from_root || [{ id: catData.id, name: catData.name }]
      const parentDepth: number = parentRow?.depth ?? 0

      const rows = children.map((c: any) => ({
        id: c.id, name: c.name, parent_id: id,
        is_leaf: (c.children_categories?.length ?? 0) === 0,
        depth: parentDepth + 1,
        path_from_root: [...parentPath, { id: c.id, name: c.name }],
        site_id: "MLB", total_items_in_this_category: 0,
        updated_at: new Date().toISOString(),
      }))

      EdgeRuntime.waitUntil(cacheCategories(supabase, rows))

      const result = rows.map(({ id, name, is_leaf, depth, path_from_root }: any) => ({ id, name, is_leaf, depth, path_from_root }))
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── DETAIL ─────────────────────────────────────────────────────────────
    if (action === "detail") {
      const id = url.searchParams.get("id")
      const { data, error } = await supabase.from("mlb_categories").select("*").eq("id", id!).maybeSingle()
      if (error) throw error
      if (data) return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

      // Fallback to ML API
      const catData = await fetchML(supabase, `/categories/${id}`)
      return new Response(JSON.stringify(catData), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── SEARCH ─────────────────────────────────────────────────────────────
    if (action === "search") {
      const q = url.searchParams.get("q") || ""
      const page = parseInt(url.searchParams.get("page") || "1") - 1
      const limit = parseInt(url.searchParams.get("limit") || "20")

      const { data, count, error } = await supabase
        .from("mlb_categories")
        .select("id, name, is_leaf, depth, path_from_root", { count: "exact" })
        .ilike("name", `%${q}%`)
        .eq("site_id", "MLB")
        .order("depth").order("name")
        .range(page * limit, (page + 1) * limit - 1)
      if (error) throw error

      return new Response(JSON.stringify({ data, total: count, page: page + 1, limit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── SYNC STATUS ────────────────────────────────────────────────────────
    if (action === "sync-status") {
      const { data, error } = await supabase.from("mlb_sync_logs")
        .select("*").order("started_at", { ascending: false }).limit(5)
      if (error) throw error
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── COUNT ──────────────────────────────────────────────────────────────
    if (action === "count") {
      const { count, error } = await supabase.from("mlb_categories")
        .select("id", { count: "exact", head: true }).eq("site_id", "MLB")
      if (error) throw error
      return new Response(JSON.stringify({ total: count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ error: "action not found" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
