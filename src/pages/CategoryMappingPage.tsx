import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Map, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CategoryMappingPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [marketplace, setMarketplace] = useState("Mercado Livre");
  const [search, setSearch] = useState("");

  const { data: mappings, isLoading, refetch } = useQuery({
    queryKey: ["category-mappings", tenantId, marketplace],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("category_mappings")
        .select("*, categories!inner(name)")
        .eq("tenant_id", tenantId)
        .eq("marketplace", marketplace)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: internalCategories } = useQuery({
    queryKey: ["internal-categories", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("categories").select("id, name").eq("tenant_id", tenantId).order("name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: marketplaceCategories } = useQuery({
    queryKey: ["marketplace-categories", marketplace],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketplace_categories")
        .select("category_id, name")
        .eq("marketplace", marketplace)
        .order("name")
        .limit(500);
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("category_mappings").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir mapeamento"); return; }
    toast.success("Mapeamento excluído");
    refetch();
  };

  const filtered = (mappings || []).filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.categories?.name?.toLowerCase().includes(s) ||
      m.marketplace_category_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Mapeamento de Categorias</h1>
        <p className="text-sm text-muted-foreground">Vincule categorias internas às categorias dos marketplaces</p>
      </motion.div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={marketplace} onValueChange={setMarketplace}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Mercado Livre">Mercado Livre</SelectItem>
            <SelectItem value="Shopee">Shopee</SelectItem>
            <SelectItem value="Amazon">Amazon</SelectItem>
            <SelectItem value="Magalu">Magalu</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar categorias..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mapeamentos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum mapeamento encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria Interna</TableHead>
                  <TableHead>Categoria {marketplace}</TableHead>
                  <TableHead>ID Marketplace</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.categories?.name || "—"}</TableCell>
                    <TableCell>{m.marketplace_category_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{m.marketplace_category_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
