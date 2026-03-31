import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, X, Star, GripVertical, ImageIcon, Check, AlertCircle, Scissors, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  removingBg?: boolean;
}

interface MarketplaceValidation {
  name: string;
  passed: boolean;
  message: string;
}

const marketplaceRules = [
  { name: "Mercado Livre", minW: 500, minH: 500, maxSize: 10 * 1024 * 1024, recW: 1200, recH: 1200 },
  { name: "Shopee", minW: 300, minH: 300, maxSize: 2 * 1024 * 1024, ratio: true },
  { name: "Amazon", minW: 1000, minH: 1000, maxSize: 10 * 1024 * 1024 },
  { name: "Magalu", minW: 500, minH: 500, maxSize: 5 * 1024 * 1024 },
];

function validateImage(img: ImageFile): MarketplaceValidation[] {
  return marketplaceRules.map((rule) => {
    const issues: string[] = [];
    if (img.width < rule.minW || img.height < rule.minH) {
      issues.push(`mínimo ${rule.minW}x${rule.minH}px (atual: ${img.width}x${img.height}px)`);
    }
    if (img.file.size > rule.maxSize) {
      issues.push(`máximo ${(rule.maxSize / 1024 / 1024).toFixed(0)}MB`);
    }
    if ((rule as any).ratio && img.width !== img.height) {
      issues.push("proporção 1:1 obrigatória");
    }
    return { name: rule.name, passed: issues.length === 0, message: issues.join(", ") };
  });
}

interface ImageUploadZoneProps {
  productId?: string;
  onImagesChange?: (images: { url: string; isPrimary: boolean }[]) => void;
}

export function ImageUploadZone({ productId, onImagesChange }: ImageUploadZoneProps) {
  const { profile } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedValidation, setSelectedValidation] = useState<ImageFile | null>(null);
  const [bgPreview, setBgPreview] = useState<{ original: string; processed: string; imageId: string } | null>(null);
  const [processingBg, setProcessingBg] = useState(false);

  const loadImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages: ImageFile[] = [];
    for (const file of acceptedFiles) {
      const dims = await loadImageDimensions(file);
      newImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        width: dims.width,
        height: dims.height,
        uploading: false,
        uploaded: false,
      });
    }
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: true,
  });

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const setPrimary = (id: string) => {
    setImages((prev) => prev.map((img, i) => ({ ...img })));
    // Move to first
    setImages((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      if (idx <= 0) return prev;
      const item = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [item, ...rest];
    });
  };

  const uploadAll = async () => {
    if (!profile?.tenant_id) return;
    const pid = productId || "temp";

    for (const img of images) {
      if (img.uploaded) continue;
      setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, uploading: true } : i)));

      const ext = img.file.name.split(".").pop();
      const path = `${profile.tenant_id}/${pid}/${img.id}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, img.file, { upsert: true });

      if (error) {
        toast.error(`Erro ao enviar ${img.file.name}`);
        setImages((prev) => prev.map((i) => (i.id === img.id ? { ...i, uploading: false } : i)));
        continue;
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, uploading: false, uploaded: true, url: urlData.publicUrl } : i))
      );
    }
    toast.success("Upload concluído!");
  };

  const handleRemoveBg = async (img: ImageFile) => {
    toast.error("Configure a API key do Remove.bg para usar esta funcionalidade");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
        <Info className="h-4 w-4 text-info shrink-0" />
        <p className="text-xs text-muted-foreground">
          Dica: Marketplaces como Amazon e Mercado Livre recomendam fundo branco
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Arraste imagens aqui ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP</p>
      </div>

      {/* Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{images.length} imagem(ns)</span>
            <Button size="sm" onClick={uploadAll} disabled={images.every((i) => i.uploaded)}>
              <Upload className="mr-2 h-3 w-3" /> Enviar Todas
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {images.map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group rounded-lg border border-border overflow-hidden bg-card"
                >
                  <img src={img.preview} alt={`Imagem ${i + 1} do produto`} className="w-full aspect-square object-cover" />
                  {i === 0 && (
                    <Badge className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" /> Principal
                    </Badge>
                  )}
                  {img.uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {img.uploaded && (
                    <div className="absolute top-1 right-1">
                      <Badge className="text-[10px] bg-success text-success-foreground"><Check className="h-3 w-3" /></Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {i !== 0 && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setPrimary(img.id)}>
                        <Star className="h-3 w-3 mr-1" /> Principal
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedValidation(img)}>
                      <Check className="h-3 w-3 mr-1" /> Validar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleRemoveBg(img)}>
                      <Scissors className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="sm" className="text-xs h-7" onClick={() => removeImage(img.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      <Dialog open={!!selectedValidation} onOpenChange={() => setSelectedValidation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validação de Imagem por Marketplace</DialogTitle>
          </DialogHeader>
          {selectedValidation && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Dimensões: {selectedValidation.width}x{selectedValidation.height}px | Tamanho: {(selectedValidation.file.size / 1024 / 1024).toFixed(1)}MB
              </p>
              {validateImage(selectedValidation).map((v) => (
                <div key={v.name} className="flex items-center gap-2 p-2 rounded border border-border">
                  {v.passed ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div>
                    <span className="text-sm font-medium">{v.name}: </span>
                    <span className="text-sm text-muted-foreground">
                      {v.passed ? "Aprovada ✓" : v.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
