import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (!toggleTheme) return null;

  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "theme-toggle relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border",
        dim,
        className
      )}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      <motion.span
        className="absolute inset-0 rounded-xl bg-primary/10"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="absolute text-primary"
      >
        <Moon className={icon} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="absolute text-amber-500"
      >
        <Sun className={icon} />
      </motion.div>
    </motion.button>
  );
}
