import "server-only";

import {
  ensureTemplateForEvent,
  getTemplateForEvent,
  saveTemplateDraft,
  publishTemplate,
} from "@/src/features/certificates/certificates.service";
import { defaultLayout, type CertificateLayout } from "@/src/features/certificates/layout.types";
import type { CertificateTemplateRow } from "@/src/features/certificates/types";

export type { CertificateTemplateRow };
export type { CertificateLayout };

/** @deprecated Use CertificateTemplateRow + layout JSON. */
export type CertificateTemplate = CertificateTemplateRow;

export const initialTemplateLayout = defaultLayout();

/**
 * Thin facade. Template reads/writes go through the feature service.
 * `organizer_id` arguments historically meant event id — callers pass eventId.
 */
export const CertificateTemplateService = {
  async get_template_of_organizer(eventId: string): Promise<CertificateTemplateRow | null> {
    return getTemplateForEvent(eventId);
  },

  async save_template_of_organizer(
    template: {
      layout: CertificateLayout;
      name?: string;
      assets?: Record<string, string>;
      emailAttachPdf?: boolean;
    },
    eventId: string,
    organizerId?: string,
  ) {
    const existing = await getTemplateForEvent(eventId);
    const org = organizerId || existing?.organizerId;
    if (!org) throw new Error("organizerId required to save template");
    return saveTemplateDraft({
      eventId,
      organizerId: org,
      layout: template.layout,
      name: template.name,
      assets: template.assets,
      emailAttachPdf: template.emailAttachPdf,
    });
  },

  async publish(eventId: string, organizerId: string) {
    return publishTemplate(eventId, organizerId);
  },

  /** Ensure a draft template exists for a newly created event. */
  async insert_generic_Template(eventId: string, organizerId: string) {
    return ensureTemplateForEvent(eventId, organizerId);
  },
};

export {
  ensureTemplateForEvent,
  getTemplateForEvent,
  saveTemplateDraft,
  publishTemplate,
  defaultLayout,
};
