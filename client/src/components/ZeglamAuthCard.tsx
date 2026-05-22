import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ZEGLAM_LOGO_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ZeglamAuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function ZeglamAuthCard({
  title,
  description,
  children,
  footer,
  className,
}: ZeglamAuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
    <Card className={cn("zeglam-auth-card w-full border-primary/25 shadow-2xl", className)}>
      <CardHeader className="space-y-4 pb-2 text-center">
        <motion.div
          className="mx-auto flex justify-center"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <img
            src={ZEGLAM_LOGO_URL}
            alt="Grupo Zeglam"
            className="h-12 w-auto object-contain drop-shadow-lg md:h-14"
          />
        </motion.div>
        <div className="space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
            Grupo Zeglam
          </p>
          <CardTitle className="font-display text-xl text-foreground">{title}</CardTitle>
          {description && (
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
      {footer && (
        <div className="border-t border-border/60 px-6 pb-6 pt-0 text-center text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
    </motion.div>
  );
}
