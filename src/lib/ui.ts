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

/**
 * Semantic tokens, not ramp steps, so these flip with the theme. The hover fill on
 * primary/destructive is --ink-soft rather than a lighter grey or a brightness()
 * filter, and that is the load-bearing choice: ink-soft is LIGHTER than ink in light
 * mode (#707070 vs #171717) and DARKER than it in dark mode (#a1a1a1 vs #fafafa), so
 * one class moves the hover in the correct direction in both. brightness() only ever
 * goes one way and inverts into a bug the moment the theme flips. Label contrast
 * holds on both: 4.7:1 light, 6.9:1 dark.
 */
const VARIANT: Record<Variant, string> = {
    primary: "border border-ink bg-ink text-ink-invert shadow-xs hover:bg-ink-soft hover:border-ink-soft",
    secondary: "border border-line-loud bg-paper text-ink hover:border-ink hover:bg-muted",
    ghost: "border border-transparent bg-transparent text-ink-soft hover:bg-muted hover:text-ink",
    destructive: "border border-ink bg-paper text-ink hover:bg-ink hover:text-ink-invert",
};

const SIZE: Record<Size, string> = {
    sm: "h-8 gap-1.5 px-3 text-xs",
    md: "h-10 gap-2 px-4 text-sm",
    lg: "h-11 gap-2 px-5 text-sm",
};

const BASE =
    "inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition duration-150 disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
    return `${BASE} ${VARIANT[variant]} ${SIZE[size]}${extra ? ` ${extra}` : ""}`;
}

/**
 * The one form-field look. Strings again, for the same reason as buttonClass:
 * <input>, <select> and <textarea> all take it as-is.
 *
 * border-line-loud, not border-line: on an achromatic ramp the faint hairline
 * that reads fine under a row of table cells disappears as a field boundary.
 * The focus outline is gray-900 (17:1 on the #FAFAFA canvas, far past the 3:1
 * UI floor) and is an outline rather than a ring so focus never reflows layout.
 */
export const fieldClass =
    "w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink disabled:opacity-50";

/** ink-soft = 4.75:1, i.e. AA body, because a field label is read, not decoration. */
export const labelClass = "block text-2xs font-medium uppercase text-ink-soft";

/**
 * The table recipe, from RecentRegistrations. pr-6 is load-bearing: without a
 * gutter two adjacent headings render as one word ("ATTENDEEEVENT").
 * A right-aligned last column adds `text-right` and drops the gutter itself.
 */
export const tableHead = "pb-3 pr-6 text-left text-2xs font-medium uppercase text-ink-soft";
export const tableCell = "py-3 pr-6 text-sm text-ink";
/** The muted hover is below every contrast floor on purpose — affordance, never state. */
export const tableRow = "border-b border-line transition-colors last:border-b-0 hover:bg-muted";
