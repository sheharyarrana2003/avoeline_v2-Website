import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-white shadow-xs hover:bg-primary-hover hover:border-primary-hover focus-visible:outline-accent",
  secondary:
    "border border-line-loud bg-paper text-ink shadow-xs hover:border-ink hover:bg-muted focus-visible:outline-accent",
  outline:
    "border border-line-loud bg-transparent text-ink hover:border-ink hover:bg-muted focus-visible:outline-accent",
  ghost:
    "border border-transparent bg-transparent text-ink-soft hover:bg-muted hover:text-ink focus-visible:outline-accent",
  danger:
    "border border-danger bg-danger text-white shadow-xs hover:brightness-90 focus-visible:outline-danger",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs font-medium",
  md: "h-10 gap-2 px-4 text-sm font-medium",
  lg: "h-11 gap-2.5 px-5 text-sm font-semibold",
};

const BASE_CLASS =
  "inline-flex items-center justify-center rounded-lg whitespace-nowrap transition-colors duration-150 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      href,
      icon,
      iconPosition = "left",
      fullWidth = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const combinedClassName = `${BASE_CLASS} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${
      fullWidth ? "w-full" : ""
    } ${className}`.trim();

    const content = (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
        {!loading && icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {!loading && icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
      </>
    );

    if (href && !disabled && !loading) {
      return (
        <Link href={href} className={combinedClassName}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={combinedClassName}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
