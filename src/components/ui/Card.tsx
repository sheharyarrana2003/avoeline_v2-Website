import React, { type ReactNode } from "react";

export type CardTone = "flat" | "raised" | "panel";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: CardTone;
  title?: ReactNode;
  action?: ReactNode;
  interactive?: boolean;
}

const TONE_CLASSES: Record<CardTone, string> = {
  flat: "border border-line bg-paper shadow-xs",
  raised: "border border-line bg-paper shadow-sm",
  panel: "ink-panel on-ink border border-neutral-800 shadow-sm",
};

export function Card({
  tone = "flat",
  title,
  action,
  interactive = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl ${TONE_CLASSES[tone]} ${
        interactive ? "transition-transform hover:-translate-y-0.5" : ""
      } ${className}`.trim()}
      {...props}
    >
      {title ? (
        <div
          className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${
            tone === "panel" ? "border-white/10 text-white" : "border-line text-ink"
          }`}
        >
          <div className="font-display text-base font-semibold">{title}</div>
          {action ? <div className="shrink-0 text-sm text-ink-soft">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1.5 p-5 pb-3 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`font-display text-base font-semibold leading-none tracking-tight text-ink ${className}`.trim()}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-ink-soft ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 pt-0 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center border-t border-line p-5 pt-4 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
