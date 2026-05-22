import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ZeglamGlassPanelProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function ZeglamGlassPanel({ children, className, delay = 0 }: ZeglamGlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("zeglam-glass-panel", className)}
    >
      {children}
    </motion.div>
  );
}
