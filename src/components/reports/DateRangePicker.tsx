import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const presets = [
  { label: "Hoje", range: () => ({ from: new Date(), to: new Date() }) },
  { label: "Ontem", range: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "Últimos 7 dias", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Últimos 30 dias", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "Este mês", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Mês passado", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Este ano", range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const applyPreset = (preset: typeof presets[number]) => {
    onDateRangeChange(preset.range());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} → ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
            ) : (
              format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
            )
          ) : (
            "Selecionar período"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 flex" align="start">
        <div className="border-r border-border p-3 space-y-1 min-w-[140px]">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Atalhos</p>
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
