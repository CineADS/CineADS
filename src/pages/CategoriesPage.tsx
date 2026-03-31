import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, FolderTree, Edit, Trash2, FolderPlus, Search, RefreshCw,
  ChevronRight, Tag, FolderOpen, CheckCircle, XCircle, Loader2,
  Database, Link2, Package,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMlbCategories } from "@/hooks/useMlbCategories";
import { MlbCategorySelector } from "@/components/products/MlbCategorySelector";

// ─── Types ────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  tenant_id: string;
  marketplace_mapping: any;
  children?: Category[];
}

interface MappingRow {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  marketplace: string;
  mlId: string;
  mlName: string;
  mlPath: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function getCategoryPath(categories: Category[], id: string): string {
  const parts: string[] = [];
  let current = categories.find((c) => c.id === id);
  while (current) {
    parts.unshift(current.name);
    current = current.parent_id ? categories.find((c) => c.id === current!.parent_id) : undefined;
  }
  return parts.join(" > ");
}

function flattenMappings(categories: Category[]): MappingRow[] {
  const rows: MappingRow[] = [];
  for (const cat of categories) {
    const mapping = cat.marketplace_mapping;
    if (!mapping || typeof mapping !== "object") continue;
    for (const [marketplace, value] of Object.entries(mapping)) {
      const v = value as any;
      if (!v?.id) continue;
      rows.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryPath: getCategoryPath(categories, cat.id),
        marketplace,
        mlId: v.id,
        mlName: v.name || v.id,
        mlPath: v.path || v.name || "",
      });
    }
  }
  return rows;
}

const marketplaceLabels: Record<string, { label: string; color: string }> = {
  mercadolivre: { label: "Mercado Livre", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  shopee: { label: "Shopee", color: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  amazon: { label: "Amazon", color: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
  magalu: { label: "Magalu", color: "bg-blue-600/20 text-blue-600 border-blue-600/30" },
  americanas: { label: "Americanas", color: "bg-red-500/20 text-red-700 border-red-500/30" },
};

// ─── Tab 1: Minhas Categorias ─────────────────────────────────────────────

function CategoryNode({ cat, level, onSelect, selectedId, onEdit, onAddSub, onDelete }: {
  cat: Category; level: number; selectedId: string | null;
  onSelect: (c: Category) => void;
  onEdit: (c: Category) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = (cat.children?.length || 0) > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors group cursor-pointer",
          selectedId === cat.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(cat)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 rounded hover:bg-muted"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        {hasChildren ? (
          <FolderTree className="h-4 w-4 text-primary/60 shrink-0" />
        ) : (
          <Tag className="h-4 w-4 text-green-500 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(cat); }}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onAddSub(cat.id); }}>
            <FolderPlus className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir "{cat.name}"?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(cat.id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {expanded && cat.children?.map((child) => (
        <CategoryNode key={child.id} cat={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} onEdit={onEdit} onAddSub={onAddSub} onDelete={onDelete} />
      ))}
    </div>
  );
}

function MyCategoriesTab({ categories, tree, isLoading, onRefresh }: {
  categories: Category[]; tree: Category[]; isLoading: boolean; onRefresh: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState("");

  const openNew = (pId?: string) => {
    setEditingCat(null);
    setName("");
    setParentId(pId || null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setParentId(cat.parent_id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!profile?.tenant_id || !name.trim()) return;
    setSaving(true);
    if (editingCat) {
      const { error } = await supabase.from("categories").update({ name: name.trim(), parent_id: parentId }).eq("id", editingCat.id);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Categoria atualizada");
    } else {
      const { error } = await supabase.from("categories").insert({ tenant_id: profile.tenant_id, name: name.trim(), parent_id: parentId });
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Categoria criada");
    }
    setSaving(false);
    setModalOpen(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Categoria excluída");
    if (selectedCat?.id === id) setSelectedCat(null);
    onRefresh();
  };

  const mappingBadges = selectedCat?.marketplace_mapping && typeof selectedCat.marketplace_mapping === "object"
    ? Object.entries(selectedCat.marketplace_mapping).filter(([, v]) => (v as any)?.id)
    : [];

  const filteredTree = filterText.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(filterText.toLowerCase()))
    : null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar categorias..." value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => openNew()} size="sm"><Plus className="mr-2 h-4 w-4" />Nova Categoria</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Tree */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-3 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : filteredTree ? (
            filteredTree.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria encontrada</p>
            ) : (
              filteredTree.map((cat) => (
                <div key={cat.id} className={cn("flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors", selectedCat?.id === cat.id ? "bg-primary/10" : "hover:bg-muted/50")} onClick={() => setSelectedCat(cat)}>
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{cat.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{getCategoryPath(categories, cat.id)}</span>
                </div>
              ))
            )
          ) : tree.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => openNew()}>
                <Plus className="mr-2 h-4 w-4" />Criar primeira categoria
              </Button>
            </div>
          ) : (
            tree.map((cat) => (
              <CategoryNode key={cat.id} cat={cat} level={0} selectedId={selectedCat?.id || null} onSelect={setSelectedCat} onEdit={openEdit} onAddSub={(pId) => openNew(pId)} onDelete={handleDelete} />
            ))
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          {selectedCat ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedCat.name}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedCat)}><Edit className="h-3.5 w-3.5 mr-1.5" />Editar</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30"><Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir "{selectedCat.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(selectedCat.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Caminho</p>
                  <p className="font-medium">{getCategoryPath(categories, selectedCat.id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Tipo</p>
                  <p className="font-medium">{selectedCat.children && selectedCat.children.length > 0 ? "Categoria Pai" : "Categoria Folha"}</p>
                </div>
              </div>
              {mappingBadges.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Mapeamentos de Marketplace</p>
                  <div className="flex flex-wrap gap-2">
                    {mappingBadges.map(([mk, v]) => {
                      const info = marketplaceLabels[mk] || { label: mk, color: "bg-muted text-foreground" };
                      return (
                        <Badge key={mk} variant="outline" className={info.color}>
                          {info.label}: {(v as any).name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
              <Package className="h-10 w-10 mb-2" />
              <p className="text-sm">Selecione uma categoria para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" />
            </div>
            <div className="space-y-2">
              <Label>Categoria Pai (opcional)</Label>
              <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {categories.filter((c) => c.id !== editingCat?.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Salvando..." : editingCat ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Tab 2: Categorias Mercado Livre ──────────────────────────────────────

function MlbCategoriesTab() {
  const { profile } = useAuth();
  const { getRoots, getChildren, search, getCount, getSyncStatus, syncFromBrowser, syncProgress, loading: syncing } = useMlbCategories();
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([]);
  const [polling, setPolling] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [logs, countData] = await Promise.all([getSyncStatus(), getCount()]);
      setSyncLogs(logs || []);
      setTotalCategories(countData);
      setPolling(logs?.[0]?.status === "running");
    } catch { /* ignore */ }
  }, [getSyncStatus, getCount]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [polling, loadStatus]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLoadingCats(true);
      if (breadcrumb.length === 0) {
        getRoots().then(setCategories).finally(() => setLoadingCats(false));
      } else {
        getChildren(breadcrumb[breadcrumb.length - 1].id).then(setCategories).finally(() => setLoadingCats(false));
      }
    }
  }, [breadcrumb.length]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setLoadingCats(true);
      try {
        const result = await search(searchQuery);
        setSearchResults(result.data || []);
        setSearchTotal(result.total || 0);
      } catch { /* ignore */ }
      setLoadingCats(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleSync = async () => {
    try {
      toast.info("Sincronização iniciada...");
      setPolling(true);
      await loadStatus();
      await syncFromBrowser(profile?.tenant_id!);
      await loadStatus();
      toast.success("Sincronização concluída!");
    } catch (err) {
      await loadStatus();
      toast.error("Erro na sincronização: " + String(err));
    } finally {
      setPolling(false);
    }
  };

  const navigateTo = async (id: string, name: string) => {
    setLoadingCats(true);
    setBreadcrumb((prev) => [...prev, { id, name }]);
    try { setCategories(await getChildren(id)); } catch { /* ignore */ }
    setLoadingCats(false);
  };

  const navigateToBreadcrumb = async (index: number) => {
    if (index < 0) {
      setBreadcrumb([]);
      setLoadingCats(true);
      getRoots().then(setCategories).finally(() => setLoadingCats(false));
      return;
    }
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setLoadingCats(true);
    getChildren(newBreadcrumb[index].id).then(setCategories).finally(() => setLoadingCats(false));
  };

  const lastSync = syncLogs[0];
  const displayItems = searchQuery.trim() ? searchResults : categories;

  const statusBadge = (status: string) => {
    if (status === "success") return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
    if (status === "error") return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sincronizando</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Sync Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status da Sincronização</CardTitle>
            <Button onClick={handleSync} disabled={syncing || polling} size="sm" variant="destructive">
              <RefreshCw className={cn("h-4 w-4 mr-2", (syncing || polling) && "animate-spin")} />
              Sincronizar Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(syncing || polling) && (
            <div className="space-y-1">
              <Progress value={undefined} className="h-2" />
              {syncProgress && <p className="text-xs text-muted-foreground">{syncProgress}</p>}
            </div>
          )}
          {lastSync ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                {statusBadge(lastSync.status)}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Última Sync</p>
                <p className="font-medium">{format(new Date(lastSync.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Categorias</p>
                <p className="font-medium">{lastSync.total_upserted?.toLocaleString("pt-BR") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Duração</p>
                <p className="font-medium">{lastSync.duration_seconds ? `${lastSync.duration_seconds}s` : "—"}</p>
              </div>
              {lastSync.error_message && (
                <div className="col-span-full">
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{lastSync.error_message}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma sincronização realizada ainda.</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            <span>{totalCategories.toLocaleString("pt-BR")} categorias sincronizadas</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar categoria por nome..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {/* Breadcrumb */}
      {!searchQuery.trim() && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap text-sm">
          <button onClick={() => navigateToBreadcrumb(-1)} className="text-primary hover:underline">MLB</button>
          {breadcrumb.map((item, idx) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {idx === breadcrumb.length - 1 ? (
                <span className="text-foreground font-medium">{item.name}</span>
              ) : (
                <button onClick={() => navigateToBreadcrumb(idx)} className="text-primary hover:underline">{item.name}</button>
              )}
            </span>
          ))}
        </div>
      )}

      {searchQuery.trim() && searchTotal > 0 && (
        <p className="text-xs text-muted-foreground">{searchTotal} resultados encontrados</p>
      )}

      {/* Category List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loadingCats ? (
          <div className="p-4 space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : displayItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {searchQuery ? `Nenhuma categoria encontrada para "${searchQuery}"` : 'Nenhuma categoria disponível. Clique em "Sincronizar Agora".'}
          </div>
        ) : (
          displayItems.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { if (!cat.is_leaf && !searchQuery.trim()) navigateTo(cat.id, cat.name); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b border-border last:border-b-0 transition-colors",
                !cat.is_leaf && !searchQuery.trim() ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
              )}
            >
              {cat.is_leaf ? <Tag className="h-4 w-4 text-green-500 shrink-0" /> : <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{cat.name}</p>
                {searchQuery.trim() && cat.path_from_root && (
                  <p className="text-xs text-muted-foreground truncate">
                    {(cat.path_from_root as Array<{ name: string }>).map((p) => p.name).join(" > ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{cat.id}</p>
              </div>
              {cat.is_leaf ? (
                <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs shrink-0">Folha</Badge>
              ) : (
                !searchQuery.trim() && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Mapeamentos ───────────────────────────────────────────────────

function MappingsTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState("mercadolivre");
  const [mlbValue, setMlbValue] = useState<{ id: string; name: string; path: Array<{ id: string; name: string }> } | null>(null);
  const [saving, setSaving] = useState(false);

  const mappings = flattenMappings(categories);

  const handleSave = async () => {
    if (!selectedCategoryId || !mlbValue) return;
    setSaving(true);

    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (!cat) { setSaving(false); return; }

    const existingMapping = (cat.marketplace_mapping && typeof cat.marketplace_mapping === "object") ? { ...cat.marketplace_mapping } : {};
    (existingMapping as any)[selectedMarketplace] = {
      id: mlbValue.id,
      name: mlbValue.name,
      path: mlbValue.path.map((p) => p.name).join(" > "),
    };

    const { error } = await supabase.from("categories").update({ marketplace_mapping: existingMapping }).eq("id", selectedCategoryId);
    if (error) { toast.error("Erro ao salvar mapeamento"); setSaving(false); return; }
    toast.success("Mapeamento salvo!");
    setSaving(false);
    setModalOpen(false);
    setMlbValue(null);
    setSelectedCategoryId(null);
    onRefresh();
  };

  const handleDelete = async (categoryId: string, marketplace: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const mapping = { ...(cat.marketplace_mapping as any || {}) };
    delete mapping[marketplace];
    const { error } = await supabase.from("categories").update({ marketplace_mapping: mapping }).eq("id", categoryId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Mapeamento excluído");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{mappings.length} mapeamento(s) configurado(s)</p>
        <Button size="sm" onClick={() => { setModalOpen(true); setSelectedCategoryId(null); setMlbValue(null); setSelectedMarketplace("mercadolivre"); }}>
          <Link2 className="mr-2 h-4 w-4" />Novo Mapeamento
        </Button>
      </div>

      {mappings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Link2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum mapeamento configurado.</p>
          <p className="text-muted-foreground text-xs mt-1">Crie mapeamentos para publicar seus produtos automaticamente nos marketplaces.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Criar primeiro mapeamento
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria Interna</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Categoria do Marketplace</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m, i) => {
                const info = marketplaceLabels[m.marketplace] || { label: m.marketplace, color: "bg-muted" };
                return (
                  <TableRow key={`${m.categoryId}-${m.marketplace}-${i}`}>
                    <TableCell>
                      <p className="font-medium text-sm">{m.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{m.categoryPath}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={info.color}>{info.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{m.mlName}</p>
                      <p className="text-xs text-muted-foreground">{m.mlPath}</p>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir mapeamento?</AlertDialogTitle>
                            <AlertDialogDescription>Remover vínculo de "{m.categoryName}" com {info.label}.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(m.categoryId, m.marketplace)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mapping Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria Interna</Label>
              <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{getCategoryPath(categories, c.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                  <SelectItem value="shopee" disabled>Shopee (em breve)</SelectItem>
                  <SelectItem value="amazon" disabled>Amazon (em breve)</SelectItem>
                  <SelectItem value="magalu" disabled>Magalu (em breve)</SelectItem>
                  <SelectItem value="americanas" disabled>Americanas (em breve)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedMarketplace === "mercadolivre" && (
              <div className="space-y-2">
                <Label>Categoria do Mercado Livre</Label>
                <MlbCategorySelector value={mlbValue} onChange={setMlbValue} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !selectedCategoryId || !mlbValue}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "minhas";

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("categories").select("*").eq("tenant_id", profile.tenant_id).order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!profile?.tenant_id,
  });

  const tree = buildTree(categories);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas categorias internas e mapeamentos com marketplaces</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue={defaultTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="mb-4">
            <TabsTrigger value="minhas">Minhas Categorias</TabsTrigger>
            <TabsTrigger value="mercadolivre">Categorias Mercado Livre</TabsTrigger>
            <TabsTrigger value="mapeamentos">Mapeamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="minhas">
            <MyCategoriesTab categories={categories} tree={tree} isLoading={isLoading} onRefresh={refresh} />
          </TabsContent>

          <TabsContent value="mercadolivre">
            <MlbCategoriesTab />
          </TabsContent>

          <TabsContent value="mapeamentos">
            <MappingsTab categories={categories} onRefresh={refresh} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
