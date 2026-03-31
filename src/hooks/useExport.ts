import * as XLSX from "xlsx";

export function useExport() {
  const exportToExcel = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToPDF = (title: string) => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        .print-area, .print-area * { visibility: visible; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    document.title = title;
    window.print();
    document.head.removeChild(style);
  };

  return { exportToExcel, exportToPDF };
}
