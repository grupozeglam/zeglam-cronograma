import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ZeglamButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";

type ZeglamButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: React.ReactNode;
  variant?: ZeglamButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  shine?: boolean;
};

const variantClass: Record<ZeglamButtonVariant, string> = {
  primary: "zeglam-btn-primary",
  secondary: "zeglam-btn-secondary",
  ghost: "zeglam-btn-ghost",
  outline: "zeglam-btn-outline",
  danger: "zeglam-btn-danger",
};

const sizeClass = {
  sm: "zeglam-btn-sm",
  md: "zeglam-btn-md",
  lg: "zeglam-btn-lg",
};

export function ZeglamButton({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  shine = true,
  disabled,
  type = "button",
  ...props
}: ZeglamButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      className={cn("zeglam-btn", variantClass[variant], sizeClass[size], className)}
      whileHover={isDisabled ? undefined : { scale: 1.03, y: -2 }}
      whileTap={isDisabled ? undefined : { scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      {...props}
    >
      {shine && variant === "primary" && <span className="zeglam-btn-shine" aria-hidden />}
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
