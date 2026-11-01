import { GALLERY_SEEDS } from "./gallerySeeds";

/** Gallery seeds exposed to DesignPicker (legacy name). */
export const CERTIFICATE_DESIGNS = GALLERY_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  description: `Start from the ${seed.name} layout.`,
  swatch: [
    seed.layout.page.background.color || "#ffffff",
    seed.layout.elements.find((e) => e.style?.color)?.style?.color || "#111111",
    "#64748b",
  ] as [string, string, string],
}));

export function isDesignId(id: string): boolean {
  return GALLERY_SEEDS.some((s) => s.id === id);
}
