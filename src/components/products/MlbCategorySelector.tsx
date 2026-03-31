import { useState, useEffect, useCallback } from "react";
import { useMlbCategories } from "@/hooks/useMlbCategories";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, Tag, FolderOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryValue {
  id: string;
  name: string;
  path: Array<{ id: string; name: string }>;
}

interface MlbCategorySelectorProps {
  value?: CategoryValue | null;
  onChange: (category: CategoryValue | null) => void;
  placeholder?: string;
}

export function MlbCategorySelector({ value, onChange, placeholder = "Selecione a categoria do Mercado Livre" }: MlbCategorySelectorProps) {
  const { getRoots, getChildren, search } = useMlbCategories();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load roots on open
  useEffect(() => {
    if (isOpen && categories.length === 0 && !searchQuery) {
      setLoading(true);
      getRoots().then((data) => {
        setCategories(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await search(searchQuery);
        setSearchResults(result.data || []);
      } catch { /* ignore */ }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const navigateTo = useCallback(async (categoryId: string, categoryName: string) => {
    setLoading(true);
    const newBreadcrumb = [...breadcrumb, { id: categoryId, name: categoryName }];
    setBreadcrumb(newBreadcrumb);
    try {
      const children = await getChildren(categoryId);
      setCategories(children);
    } catch { /* ignore */ }
    setLoading(false);
  }, [breadcrumb, getChildren]);

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    if (index < 0) {
      // Back to roots
      setBreadcrumb([]);
      setLoading(true);
      try {
        const data = await getRoots();
        setCategories(data);
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setLoading(true);
    try {
      const children = await getChildren(newBreadcrumb[index].id);
      setCategories(children);
    } catch { /* ignore */ }
    setLoading(false);
  }, [breadcrumb, getChildren, getRoots]);

  const selectCategory = (cat: any) => {
    const path = cat.path_from_root || [...breadcrumb, { id: cat.id, name: cat.name }];
    onChange({ id: cat.id, name: cat.name, path });
    setIsOpen(false);
    setSearchQuery("");
    setBreadcrumb([]);
    setCategories([]);
  };

  const displayItems = searchQuery.trim() ? searchResults : categories;

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
        <Tag className="h-4 w-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{value.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {value.path.map((p) => p.name).join(" > ")}
          </p>
        </div>
        <button onClick={() => onChange(null)} className="p-1 rounded hover:bg-muted" aria-label="Remover categoria">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors"
      >
        {placeholder}
      </button>

      {isOpen && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Breadcrumb */}
          {!searchQuery.trim() && breadcrumb.length > 0 && (
            <div className="px-3 py-2 border-b border-border flex items-center gap-1 flex-wrap text-xs">
              <button onClick={() => navigateToBreadcrumb(-1)} className="text-primary hover:underline">
                MLB
              </button>
              {breadcrumb.map((item, idx) => (
                <span key={item.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  {idx === breadcrumb.length - 1 ? (
                    <span className="text-foreground font-medium">{item.name}</span>
                  ) : (
                    <button onClick={() => navigateToBreadcrumb(idx)} className="text-primary hover:underline">
                      {item.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Category list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : displayItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {searchQuery ? `Nenhuma categoria encontrada para "${searchQuery}"` : "Nenhuma categoria disponível. Sincronize as categorias primeiro."}
              </div>
            ) : (
              displayItems.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (cat.is_leaf) {
                      selectCategory(cat);
                    } else if (!searchQuery.trim()) {
                      navigateTo(cat.id, cat.name);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                    cat.is_leaf && "hover:bg-green-500/10"
                  )}
                >
                  {cat.is_leaf ? (
                    <Tag className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{cat.name}</p>
                    {searchQuery.trim() && cat.path_from_root && (
                      <p className="text-xs text-muted-foreground truncate">
                        {(cat.path_from_root as Array<{ name: string }>).map((p) => p.name).join(" > ")}
                      </p>
                    )}
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

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Selecione uma categoria <Badge variant="outline" className="text-green-600 border-green-600/30 text-[10px] px-1">Folha</Badge> para anunciar no Mercado Livre
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
