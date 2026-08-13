"use client";

import { useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Click a thumbnail, see the picture.
 *
 * Built on the native <dialog>, matching ConfirmDialog: showModal() brings the
 * focus trap, Escape-to-close, the inert background and top-layer stacking with
 * it. Those are the parts of a lightbox that are tedious to get right, and every
 * npm lightbox is a dependency to ship the browser's own behaviour back to us.
 *
 * Renders as a <button> around the thumbnail rather than a div with an onClick, so
 * it is keyboard-reachable and announces itself. The image is the button's only
 * visible content, hence the explicit accessible name.
 *
 * `open` is local state instead of a bare ref call because the dialog's contents
 * are only mounted while it is open — the full-size image should not be fetched
 * for a picture nobody has asked to see.
 */
export function ImageLightbox({
    src,
    alt,
    children,
    className = "",
}: {
    src: string;
    /** Describes the image. Also names the trigger, as "Expand <alt>". */
    alt: string;
    /** The thumbnail. */
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);

    function show() {
        setOpen(true);
        ref.current?.showModal();
    }

    function hide() {
        ref.current?.close();
        setOpen(false);
    }

    return (
        <>
            <button
                type="button"
                onClick={show}
                aria-label={`Expand ${alt}`}
                className={`group/zoom relative block cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
            >
                {children}
                {/* Affordance, not decoration: a picture that expands is
                    indistinguishable from one that does not until you try it. Fades in
                    on hover and is always present for keyboard focus. */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover/zoom:opacity-100 group-focus-visible/zoom:opacity-100"
                >
                    <Maximize2 size={14} />
                </span>
            </button>

            <dialog
                ref={ref}
                // Escape fires `cancel`, which would close the element while this
                // component still thought it was open.
                onCancel={(e) => {
                    e.preventDefault();
                    hide();
                }}
                // The dialog fills the viewport, so a click that lands on it rather
                // than on the figure inside is a backdrop click.
                onClick={(e) => {
                    if (e.target === ref.current) hide();
                }}
                // Width is auto, capped — NOT a fixed w-[72rem]. With a fixed width a
                // square banner letterboxes inside a wide box, and the caption then
                // stretches to the box rather than the picture, so it floats out to the
                // left of an image it is supposedly labelling. Sizing to the content
                // keeps the caption's edges on the image's edges whatever its aspect.
                // `on-ink`, not a focus-visible:outline-* utility on the button. The
                // base :focus-visible rule in globals.css is UNLAYERED, and unlayered
                // CSS outranks every @layer — so a Tailwind outline-colour utility can
                // never override it however specific it looks. Measured: the computed
                // outlineColor stayed rgb(108,92,231) with the utility applied. `.on-ink`
                // is the mechanism globals.css provides for exactly this, swapping the
                // ring to --accent-on-ink (9.8:1 on a dark surface).
                className="on-ink m-auto max-h-[92vh] w-fit max-w-[min(72rem,calc(100vw-2rem))] bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
            >
                {open ? (
                    <figure className="relative m-0 flex max-h-[92vh] w-fit flex-col">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={src}
                            alt={alt}
                            className="max-h-[86vh] w-auto max-w-full rounded-2xl object-contain"
                        />
                        <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-white">
                            <span className="min-w-0 truncate">{alt}</span>
                            <button
                                type="button"
                                onClick={hide}
                                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
                            >
                                <X size={14} aria-hidden="true" />
                                Close
                            </button>
                        </figcaption>
                    </figure>
                ) : null}
            </dialog>
        </>
    );
}
