import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPageMetadata } from "../pageMetadata";
import {
  MARKETING_ROBOTS_DISALLOW,
  MARKETING_SITEMAP_PATHS,
  buildFaqPageJsonLd,
} from "../seo.logic";
import sitemap from "@/src/app/sitemap";
import robots from "@/src/app/robots";

describe("buildPageMetadata", () => {
  const paths = ["/", "/plans", "/about", "/partners", "/contact", "/privacy", "/terms"] as const;

  for (const path of paths) {
    it(`includes title, description, canonical, and OG for ${path}`, () => {
      const meta = buildPageMetadata(
        { title: `T ${path}`, description: `D ${path}`, ogImage: "https://cdn.example/og.webp" },
        { title: "Fallback", description: "Fallback desc", path },
      );
      assert.equal(meta.title, `T ${path}`);
      assert.equal(meta.description, `D ${path}`);
      assert.ok(meta.alternates?.canonical);
      assert.ok(
        String(meta.alternates?.canonical).endsWith(path === "/" ? "" : path) ||
          String(meta.alternates?.canonical).includes(path),
      );
      assert.ok(meta.openGraph?.title);
      assert.ok(meta.openGraph?.description);
      assert.ok(meta.openGraph?.images);
    });
  }
});

describe("sitemap + robots", () => {
  it("sitemap includes marketing paths and excludes app / unsubscribe", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    for (const path of MARKETING_SITEMAP_PATHS) {
      if (path === "/") {
        assert.ok(
          urls.some((u) => !u.includes("/plans") && !u.includes("/about") && /https?:\/\//.test(u)),
          "missing home origin URL",
        );
        continue;
      }
      assert.ok(
        urls.some((u) => u.endsWith(path)),
        `missing ${path}`,
      );
    }
    assert.equal(
      urls.some((u) => u.includes("/unsubscribe")),
      false,
    );
    assert.equal(
      urls.some((u) => u.includes("/organizer")),
      false,
    );
    assert.equal(
      urls.some((u) => /\/admin(\/|$)/.test(u)),
      false,
    );
  });

  it("robots disallows organizer/vendor/attendee/admin", () => {
    const doc = robots();
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    const disallow = rules.flatMap((r) => {
      const d = r?.disallow;
      if (!d) return [] as string[];
      return Array.isArray(d) ? d : [d];
    });
    for (const prefix of MARKETING_ROBOTS_DISALLOW) {
      assert.ok(
        disallow.some((d) => d === prefix || d === `${prefix}/` || d.startsWith(`${prefix}/`)),
        `missing disallow ${prefix}`,
      );
    }
  });
});

describe("buildFaqPageJsonLd", () => {
  it("returns null when no real FAQ rows", () => {
    assert.equal(buildFaqPageJsonLd("https://example.com", []), null);
    assert.equal(buildFaqPageJsonLd("https://example.com", [{ question: " ", answer: "x" }]), null);
  });

  it("emits FAQPage when rows exist", () => {
    const ld = buildFaqPageJsonLd("https://example.com", [
      { question: "What is Avoeline?", answer: "Event ops platform." },
    ]);
    assert.ok(ld);
    assert.equal(ld!["@type"], "FAQPage");
    assert.equal((ld!.mainEntity as unknown[]).length, 1);
  });
});
