import type { CertificateTemplate, Style_attributes } from "@/src/services/certificate.template.services";

/**
 * Spec 6.1: "at least two selectable certificate template designs".
 *
 * Presets over a second collection. A template is already stored per event and
 * auto-seeded at event creation, and there is already an editor for it -- so a
 * design is a starting point for that editor, not a new kind of document. That
 * keeps generation reading exactly one template per event, which is what makes
 * a re-issue reproducible, and it means an organizer can still move anything
 * afterwards.
 *
 * Only the look is set here: colours, fonts, weights, the border, and the
 * positions that have to move with a font size. The wording
 * (`*_content`) and the blockchain setting are carried over from whatever the
 * event already has, because those are the organizer's decisions and a design
 * change must not silently re-enable minting or throw away edited copy.
 *
 * Client-safe, and the import above must stay `import type`. Its module
 * reaches `adminDb` / the service-role client. The template to restyle is
 * passed in instead.
 */

export type DesignId = "classic" | "modern" | "minimal";

export type CertificateDesign = {
    id: DesignId;
    name: string;
    description: string;
    /** For the picker, most prominent first: paper, ink, accent. */
    swatch: [string, string, string];
};

export const CERTIFICATE_DESIGNS: CertificateDesign[] = [
    {
        id: "classic",
        name: "Classic",
        description: "Serif name on white with a heavy slate frame. The default.",
        swatch: ["#ffffff", "#0f172a", "#475569"],
    },
    {
        id: "modern",
        name: "Modern",
        description: "Sans-serif throughout on warm ivory, with a thin gold rule.",
        swatch: ["#fffdf7", "#1c1917", "#a16207"],
    },
    {
        id: "minimal",
        name: "Minimal",
        description: "No frame, small caps, and the name doing all the work.",
        swatch: ["#ffffff", "#171717", "#737373"],
    },
];

export function isDesignId(value: unknown): value is DesignId {
    return CERTIFICATE_DESIGNS.some((d) => d.id === value);
}

/** Restyle one text block, keeping its box so nothing lands off the canvas. */
function restyle(style: Style_attributes, patch: Partial<Style_attributes>): Style_attributes {
    return { ...style, ...patch };
}

const SANS = "'Inter', 'Arial', sans-serif";
const SERIF = "'Georgia', 'Times New Roman', serif";

/**
 * Apply a design to a template.
 *
 * Returns a new object; the caller saves it and supplies the template to
 * restyle -- there is no default here, because the only sensible default lives
 * behind `adminDb`. Falls back to Classic for an unknown id rather than
 * returning the template unchanged, so a mistyped id cannot look like a
 * successful no-op.
 */
export function applyDesign(template: CertificateTemplate, design: DesignId): CertificateTemplate {
    const base = template;

    if (design === "modern") {
        return {
            ...base,
            primary_color: "#fffdf7",
            secondary_color: "#1c1917",
            border_color: "#a16207",
            border_size: 2,
            border_style: "solid",
            heading_styling: restyle(base.heading_styling, {
                fontFamily: SANS, fontSize: 13, fontWeight: "700", color: "#a16207",
            }),
            title_styling: restyle(base.title_styling, {
                fontFamily: SANS, fontSize: 11, fontWeight: "500", color: "#78716c",
            }),
            name_styling: restyle(base.name_styling, {
                fontFamily: SANS, fontSize: 34, fontWeight: "bold", color: "#1c1917",
            }),
            achievement_styling: restyle(base.achievement_styling, {
                fontFamily: SANS, fontSize: 13, color: "#44403c",
            }),
            date_styling: restyle(base.date_styling, { fontFamily: SANS, color: "#78716c" }),
            issuer_name_styling: restyle(base.issuer_name_styling, {
                fontFamily: SANS, fontSize: 16, fontWeight: "bold", color: "#1c1917",
            }),
            issuer_designation_styling: restyle(base.issuer_designation_styling, {
                fontFamily: SANS, fontSize: 10, color: "#a16207",
            }),
        };
    }

    if (design === "minimal") {
        return {
            ...base,
            primary_color: "#ffffff",
            secondary_color: "#171717",
            border_color: "#ffffff",
            // The renderer draws no visible frame at 0, which is the design.
            border_size: 0,
            border_style: "none",
            heading_styling: restyle(base.heading_styling, {
                fontFamily: SANS, fontSize: 11, fontWeight: "600", color: "#737373",
            }),
            title_styling: restyle(base.title_styling, {
                fontFamily: SANS, fontSize: 10, fontWeight: "normal", color: "#a3a3a3",
            }),
            name_styling: restyle(base.name_styling, {
                fontFamily: SANS, fontSize: 40, fontWeight: "normal", color: "#171717",
            }),
            achievement_styling: restyle(base.achievement_styling, {
                fontFamily: SANS, fontSize: 12, color: "#525252",
            }),
            date_styling: restyle(base.date_styling, { fontFamily: SANS, fontSize: 11, color: "#a3a3a3" }),
            issuer_name_styling: restyle(base.issuer_name_styling, {
                fontFamily: SANS, fontSize: 14, fontWeight: "600", color: "#171717",
            }),
            issuer_designation_styling: restyle(base.issuer_designation_styling, {
                fontFamily: SANS, fontSize: 9, color: "#a3a3a3",
            }),
        };
    }

    return {
        ...base,
        primary_color: "#ffffff",
        secondary_color: "#1e293b",
        border_color: "#0f172a",
        border_size: 4,
        border_style: "solid",
        heading_styling: restyle(base.heading_styling, {
            fontFamily: SANS, fontSize: 16, fontWeight: "600", color: "#475569",
        }),
        title_styling: restyle(base.title_styling, {
            fontFamily: SANS, fontSize: 12, fontWeight: "normal", color: "#94a3b8",
        }),
        name_styling: restyle(base.name_styling, {
            fontFamily: SERIF, fontSize: 32, fontWeight: "bold", color: "#0f172a",
        }),
        achievement_styling: restyle(base.achievement_styling, {
            fontFamily: SANS, fontSize: 14, color: "#334155",
        }),
        date_styling: restyle(base.date_styling, { fontFamily: SANS, fontSize: 12, color: "#64748b" }),
        issuer_name_styling: restyle(base.issuer_name_styling, {
            fontFamily: SERIF, fontSize: 18, fontWeight: "bold", color: "#0f172a",
        }),
        issuer_designation_styling: restyle(base.issuer_designation_styling, {
            fontFamily: SANS, fontSize: 10, fontWeight: "600", color: "#64748b",
        }),
    };
}
