import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Tag, List, CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { MlbCategorySelector } from "@/components/products/MlbCategorySelector";

export default function CategoryAttributesPage() {
  const [marketplace] = useState("Mercado Livre");
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; path: Array<{ id: string; name: string }> } | null>(null);
  const [search, setSearch] = useState("");

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["category-attributes", marketplace, selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory?.id) return [];
      const { data, error } = await supabase
        .from("category_attributes")
        .select("*")
        .eq("marketplace", marketplace)
        .eq("category_id", selectedCategory.id)
        .order("required", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCategory?.id,
  });

  const filtered = attributes.filter((a: any) => {
    if (!search) return true;
    return a.name?.toLowerCase().includes(search.toLowerCase()) || a.attribute_id?.toLowerCase().includes(search.toLowerCase());
  });

  const requiredCount = attributes.filter((a: any) => a.required).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Atributos de Categoria</h1>
        <p className="text-sm text-muted-foreground">Visualize os atributos exigidos por cada categoria do marketplace</p>
      </motion.div>

      {/* Category Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Selecione uma Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MlbCategorySelector value={selectedCategory} onChange={setSelectedCategory} />
          {selectedCategory && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Selecionada:</span>
              <Badge variant="outline" className="font-mono text-xs">{selectedCategory.id}</Badge>
              <span className="font-medium text-foreground">{selectedCategory.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attributes */}
      {selectedCategory && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Atributos ({attributes.length})
                  {requiredCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{requiredCount} obrigatórios</Badge>
                  )}
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar atributo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {attributes.length === 0 ? "Nenhum atributo encontrado para esta categoria. Sincronize os atributos primeiro." : "Nenhum atributo corresponde à busca."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atributo</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead>Valores Permitidos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((attr: any) => {
                      const values = Array.isArray(attr.values) ? attr.values : [];
                      return (
                        <TableRow key={attr.id}>
                          <TableCell className="font-medium">{attr.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{attr.attribute_id}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{attr.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {attr.required ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {values.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {values.slice(0, 5).map((v: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{v.name || v.id || String(v)}</Badge>
                                ))}
                                {values.length > 5 && (
                                  <Badge variant="secondary" className="text-xs">+{values.length - 5}</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Livre</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
