"use client";

import { useEffect } from "react";

const SECTIONS = new Set(["email", "calendar", "drive", "sheets"]);

/** Scroll to a Connections card from ?section= or #hash (server redirects cannot keep #). */
export function ScrollToConnectionSection({ section }: { section?: string | null }) {
  useEffect(() => {
    const fromHash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const id = (section || fromHash || "").trim();
    if (!SECTIONS.has(id)) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [section]);

  return null;
}
