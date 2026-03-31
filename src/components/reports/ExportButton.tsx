import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
}

export function ExportButton({ onExportExcel, onExportPDF }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onExportExcel}>Exportar Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>Exportar PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
