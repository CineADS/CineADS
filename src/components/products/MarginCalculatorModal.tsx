import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";

interface MarketplaceConfig {
  name: string;
  logo: string;
  commissionPercent: number;
  fixedFee: number;
  avgShipping: number;
}

const marketplaces: MarketplaceConfig[] = [
  { name: "Mercado Livre", logo: "🟡", commissionPercent: 13, fixedFee: 5.5, avgShipping: 15 },
  { name: "Shopee", logo: "🟠", commissionPercent: 14, fixedFee: 2, avgShipping: 12 },
  { name: "Amazon", logo: "🟤", commissionPercent: 15, fixedFee: 0, avgShipping: 18 },
  { name: "Magalu", logo: "🔵", commissionPercent: 16, fixedFee: 3, avgShipping: 14 },
  { name: "Americanas", logo: "🔴", commissionPercent: 16, fixedFee: 4, avgShipping: 16 },
  { name: "Shein", logo: "⚫", commissionPercent: 20, fixedFee: 0, avgShipping: 10 },
  { name: "Shopify", logo: "🟢", commissionPercent: 2, fixedFee: 0.3, avgShipping: 0 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  price: number;
  onApplyPrice: (price: number) => void;
}

export function MarginCalculatorModal({ open, onOpenChange, cost, price, onApplyPrice }: Props) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [targetMargin, setTargetMargin] = useState("");

  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      marketplaces.forEach((m) => { initial[m.name] = price || 0; });
      setPrices(initial);
    }
  }, [open, price]);

  const calculate = (mp: MarketplaceConfig, sellPrice: number) => {
    const commission = sellPrice * (mp.commissionPercent / 100);
    const totalCosts = cost + commission + mp.fixedFee + mp.avgShipping;
    const profit = sellPrice - totalCosts;
    const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
    return { commission, totalCosts, profit, margin };
  };

  const calculatePriceFromMargin = () => {
    const margin = parseFloat(targetMargin);
    if (isNaN(margin) || margin >= 100) return;
    const newPrices: Record<string, number> = {};
    marketplaces.forEach((mp) => {
      // price = (cost + fixedFee + shipping) / (1 - commission% - margin%)
      const denominator = 1 - (mp.commissionPercent / 100) - (margin / 100);
      if (denominator > 0) {
        newPrices[mp.name] = Math.ceil(((cost + mp.fixedFee + mp.avgShipping) / denominator) * 100) / 100;
      } else {
        newPrices[mp.name] = 0;
      }
    });
    setPrices(newPrices);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora de Margem
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm font-medium">Custo: R$ {cost.toFixed(2)}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm">Margem desejada:</span>
          <Input
            type="number"
            className="w-20 h-8"
            placeholder="%"
            value={targetMargin}
            onChange={(e) => setTargetMargin(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={calculatePriceFromMargin}>
            Calcular Preços
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead>
              <TableHead>Preço Venda</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Taxa Fixa</TableHead>
              <TableHead>Frete Médio</TableHead>
              <TableHead>Lucro</TableHead>
              <TableHead>Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marketplaces.map((mp) => {
              const sellPrice = prices[mp.name] || 0;
              const calc = calculate(mp, sellPrice);
              const marginColor = calc.margin > 15 ? "text-success" : calc.margin > 5 ? "text-warning" : "text-destructive";

              return (
                <TableRow key={mp.name}>
                  <TableCell className="font-medium">
                    <span className="mr-2">{mp.logo}</span>{mp.name}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24 h-8"
                      value={sellPrice || ""}
                      onChange={(e) => setPrices({ ...prices, [mp.name]: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    R$ {calc.commission.toFixed(2)} <span className="text-xs">({mp.commissionPercent}%)</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">R$ {mp.fixedFee.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">R$ {mp.avgShipping.toFixed(2)}</TableCell>
                  <TableCell className={`text-sm font-medium ${calc.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    R$ {calc.profit.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-sm font-bold ${marginColor}`}>
                    {calc.margin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => {
            const mlPrice = prices["Mercado Livre"] || price;
            onApplyPrice(mlPrice);
            onOpenChange(false);
          }}>
            Aplicar Preços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
