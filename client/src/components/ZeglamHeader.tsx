import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { ZeglamButton } from "@/components/ZeglamButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ZEGLAM_LOGO_URL, ZEGLAM_SITE_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ZeglamHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  backHref?: string;
  showLogo?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function ZeglamHeader({
  title,
  subtitle,
  badge = "Cronograma",
  backHref,
  showLogo = true,
  actions,
  className,
}: ZeglamHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("zeglam-header shrink-0", className)}
    >
      <div className="container flex flex-wrap items-center justify-between gap-3 py-3 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {backHref && (
            <ZeglamButton
              type="button"
              variant="ghost"
              size="sm"
              className="!h-9 !w-9 shrink-0 !p-0"
              onClick={() => setLocation(backHref)}
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </ZeglamButton>
          )}
          {showLogo && (
            <a
              href={ZEGLAM_SITE_URL}
              className="shrink-0 transition-opacity hover:opacity-85"
            >
              <img
                src={ZEGLAM_LOGO_URL}
                alt="Grupo Zeglam"
                className="h-9 w-auto object-contain md:h-11"
              />
            </a>
          )}
          <div className="hidden h-9 w-px bg-primary/25 sm:block" />
          <div className="min-w-0">
            {badge && (
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs">
                {badge}
              </p>
            )}
            <h1 className="truncate font-display text-lg font-semibold text-foreground md:text-xl">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex shrink-0 flex-wrap items-center gap-2"
        >
          <ThemeToggle size="sm" />
          {actions}
        </motion.div>
      </div>
    </motion.header>
  );
}
