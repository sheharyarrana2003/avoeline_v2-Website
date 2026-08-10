/**
 * The one button look.
 *
 * A string rather than a <Button> component, deliberately. This app's buttons are
 * a mix of <button>, <Link>, <a> and <SubmitButton> (which carries no styling of
 * its own by design), so a component would need an `asChild` escape hatch, and
 * that means a dependency the project has ruled out. A string composes with all
 * four for free.
 *
 *   <button className={buttonClass()}>Save</button>
 *   <Link href="/x" className={buttonClass("secondary")}>Cancel</Link>
 *   <SubmitButton className={buttonClass("primary", "lg")}>Publish</SubmitButton>
 *
 * Primary is filled and destructive is outlined, not the other way round: the
 * filled black draws the eye to the safe path, and every destructive action in
 * this app already confirms through ConfirmDialog, which is where the actual
 * safety lives.
 */

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
    primary: "border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 hover:border-gray-700",
    secondary: "border border-gray-300 bg-white text-gray-900 hover:border-gray-900 hover:bg-gray-50",
    ghost: "border border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    destructive: "border border-gray-900 bg-white text-gray-900 hover:bg-gray-900 hover:text-white",
};

const SIZE: Record<Size, string> = {
    sm: "h-8 gap-1.5 px-3 text-xs",
    md: "h-10 gap-2 px-4 text-sm",
    lg: "h-11 gap-2 px-5 text-sm",
};

const BASE =
    "inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
    return `${BASE} ${VARIANT[variant]} ${SIZE[size]}${extra ? ` ${extra}` : ""}`;
}
