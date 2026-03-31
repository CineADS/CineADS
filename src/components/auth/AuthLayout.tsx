import { ReactNode } from "react";
import { motion } from "framer-motion";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #0D0D0D 0%, #1A0000 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center gap-2">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-4xl font-black tracking-tight"
          >
            <span className="text-white">Cine</span><span style={{ color: "#E8001C" }}>ADS</span>
          </motion.h1>
          <p className="text-sm text-muted-foreground">Gerencie seus marketplaces em um só lugar</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#E8001C" }} />
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
