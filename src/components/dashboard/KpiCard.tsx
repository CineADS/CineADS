import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: ReactNode;
  index?: number;
  isLoading?: boolean;
}

export function KpiCard({ title, value, change, trend, icon, index = 0, isLoading }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-5 space-y-3 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change && (
              <div className={cn("flex items-center gap-1 text-xs font-medium", trend === "up" ? "text-success" : "text-destructive")}>
                {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
