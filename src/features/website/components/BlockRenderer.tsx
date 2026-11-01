import type { ComponentType } from "react";
import { getBlockEntry } from "../blocks/registry";
import { parseBlockDraft, type BlockType } from "../blocks/schemas";

export type BlockLiveContext = {
  /** When provided, callers may pre-merge live data into `data` before render. */
  statsReady?: boolean;
};

export type BlockRendererProps = {
  type: string;
  data: unknown;
  /** When false, render nothing (admin visible toggle). Default true. */
  visible?: boolean;
  /** Optional live context flag for callers that enrich block data. */
  live?: BlockLiveContext;
};

/**
 * Renders a published (or preview) block by type from the registry.
 * Invalid type / schema → null. Empty required content → renderer returns null.
 * Live marketing sections are enriched by `MarketingPageBlocks` before calling this.
 */
export function BlockRenderer({ type, data, visible = true }: BlockRendererProps) {
  if (!visible) return null;

  const entry = getBlockEntry(type);
  if (!entry) return null;

  const parsed = parseBlockDraft(type, data);
  if (!parsed.ok) return null;

  const Renderer = entry.Renderer as ComponentType<{ data: unknown }>;
  return <Renderer data={parsed.data} />;
}

export type { BlockType };
