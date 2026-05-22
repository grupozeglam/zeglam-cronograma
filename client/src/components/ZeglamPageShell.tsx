import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ZeglamFloatingOrbs } from "@/components/ZeglamFloatingOrbs";
import { ThemeToggle } from "@/components/ThemeToggle";

type ZeglamPageShellProps = {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
};

export function ZeglamPageShell({
  children,
  className,
  centered = false,
}: ZeglamPageShellProps) {
  return (
    <div
      className={cn(
        "zeglam-page relative min-h-screen overflow-x-hidden",
        centered && "flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="zeglam-page-glow pointer-events-none absolute inset-0" aria-hidden />
      <ZeglamFloatingOrbs />
      {centered && (
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "relative z-10 flex min-h-screen w-full flex-col",
          centered && "items-center justify-center"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
