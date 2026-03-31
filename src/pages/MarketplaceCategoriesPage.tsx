import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search, RefreshCw, ChevronRight, Tag, FolderOpen,
  CheckCircle, XCircle, Loader2, Database, Leaf,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMlbCategories } from "@/hooks/useMlbCategories";

export default function MarketplaceCategoriesPage() {
  const { profile } = useAuth();
  const {
    getRoots, getChildren, search, getCount, getSyncStatus,
    syncFromBrowser, syncProgress, loading: syncing,
  } = useMlbCategories();

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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Categorias do Marketplace</h1>
        <p className="text-sm text-muted-foreground">Navegue e sincronize as categorias oficiais do Mercado Livre</p>
      </motion.div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Status da Sincronização
            </CardTitle>
            <Button onClick={handleSync} disabled={syncing || polling} size="sm">
              <RefreshCw className={cn("h-4 w-4 mr-2", (syncing || polling) && "animate-spin")} />
              Sincronizar Categorias
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
          <button onClick={() => navigateToBreadcrumb(-1)} className="text-primary hover:underline font-medium">MLB</button>
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
            {searchQuery ? `Nenhuma categoria encontrada para "${searchQuery}"` : 'Nenhuma categoria disponível. Clique em "Sincronizar Categorias".'}
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
              {cat.is_leaf ? <Leaf className="h-4 w-4 text-green-500 shrink-0" /> : <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />}
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
