import { adminDb } from "@/data/admin_db";
import { formatDate, toIsoString } from "@/src/lib/datetime";
import { absoluteUrl } from "@/src/lib/appUrl";
import { supabaseAdmin, CERTIFICATES_BUCKET } from "@/data/supabase";
import { renderCertificatePdf } from "@/src/features/certificates/renderCertificatePdf";
import { CertificateDocument } from "./models/certificate.model";
import type {
  CertificateGenerationAttendeeResult,
  CertificateGenerationResult,
} from "./models/certificate.model";
import { EventService } from "./event.service";
import { RegistrationCertificate } from "./models/reg.type";
import { COLLECTIONS } from "@/data/collections";
import { BlockchainService, isBlockchainConfigured } from "./blockchain.service";
import { CertificateTemplate, CertificateTemplateService, initialTemplate } from "./certificate.template.services";

import { PinataSDK } from "pinata";
import { UserService } from "./user.service";
import { QuerySnapshot } from "firebase-admin/firestore";
import { AttendeeService } from "../features/event_attendee/attendee.service";
import { AttendeeCertificate } from "../features/event_attendee/type";

export type { CertificateGenerationAttendeeResult, CertificateGenerationResult };

// Initialize Pinata SDK instance
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
});

export async function uploadToIPFS(metadata: CertificateTemplate): Promise<string> {
  try {

    // 2. Upload file to IPFS
    const upload = await pinata.upload.public.json(metadata);

    // 3. Return IPFS URI string (e.g. ipfs://QmXOYpizj...)
    return `ipfs://${upload.cid}`;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw new Error("Failed to upload metadata to IPFS via Pinata.");
  }
}

function buildCertificateMetadata(cert: CertificateDocument, template: any) {
  return {
    name: cert.title,
    description: cert.description,
    image: cert?.digital?.design.logoUrl || template.defaultImageUri || '',
    external_url: cert.validation.verificationUrl,
    attributes: [
      { trait_type: "Recipient", value: cert.content.recipientName },
      { trait_type: "Event", value: template.eventname || cert.content.eventTitle },
      { trait_type: "Completion Date", value: cert.content.completionDate },
      { trait_type: "Issuer", value: cert.content.issuerName },
      { trait_type: "Verification Code", value: cert.validation.verificationCode }
    ]
  };
}


/**
 * Read-mapper for a stored certificate.
 *
 * `createCertificateDocument` below was being used for this job, which was the
 * bug: it is a *builder* full of placeholders, so every certificate read back
 * out of Firestore had its real fields overwritten — `certificateId` became
 * `CERT` + `padStart(undefined)`, `grade` became "A+", and `digital.pdfUrl`
 * became a fabricated storage.eventflow.com URL. The issued-certificates table
 * rendered that as a live "View PDF" link to a domain nobody owns.
 *
 * This returns what is actually stored, and nothing else.
 */
function mapToCertificate(raw: any, fallbackId?: string): CertificateDocument {
  return {
    certificateId: String(raw?.certificateId || fallbackId || ""),
    registrationId: String(raw?.registrationId || ""),
    userId: String(raw?.userId || ""),
    eventId: String(raw?.eventId || ""),
    organizerId: String(raw?.organizerId || ""),
    type: raw?.type === "digital" || raw?.type === "blockchain" ? raw.type : "both",
    title: String(raw?.title || ""),
    description: String(raw?.description || ""),
    content: {
      recipientName: String(raw?.content?.recipientName || ""),
      eventTitle: String(raw?.content?.eventTitle || ""),
      completionDate: toIsoString(raw?.content?.completionDate) || String(raw?.content?.completionDate || ""),
      grade: raw?.content?.grade ? String(raw.content.grade) : undefined,
      duration: String(raw?.content?.duration || ""),
      issuerName: String(raw?.content?.issuerName || ""),
      issuerSignature: String(raw?.content?.issuerSignature || ""),
      // Certificates issued before roles existed read as "Attendee", which is
      // what they were.
      role: String(raw?.content?.role || "Attendee"),
      uniqueId: String(raw?.content?.uniqueId || ""),
    },
    digital: raw?.digital
      ? {
          pdfPath: String(raw.digital.pdfPath || ""),
          pdfUrl: String(raw.digital.pdfUrl || ""),
          templateId: String(raw.digital.templateId || ""),
          design: {
            backgroundColor: String(raw.digital.design?.backgroundColor || ""),
            borderColor: String(raw.digital.design?.borderColor || ""),
            logoUrl: String(raw.digital.design?.logoUrl || ""),
            watermark: raw.digital.design?.watermark ? String(raw.digital.design.watermark) : undefined,
          },
          downloadCount: Number(raw.digital.downloadCount ?? 0),
          lastDownloaded: toIsoString(raw.digital.lastDownloaded) || "",
        }
      : null,
    blockchain: raw?.blockchain
      ? {
          minted: !!raw.blockchain.minted,
          network: String(raw.blockchain.network || ""),
          tokenId: String(raw.blockchain.tokenId || ""),
          tokenStandard: raw.blockchain.tokenStandard === "ERC-1155" ? "ERC-1155" : "ERC-721",
          contractAddress: String(raw.blockchain.contractAddress || ""),
          transactionHash: String(raw.blockchain.transactionHash || ""),
          blockNumber: Number(raw.blockchain.blockNumber ?? 0),
          gasUsed: String(raw.blockchain.gasUsed || ""),
          metadata: {
            ipfsHash: String(raw.blockchain.metadata?.ipfsHash || ""),
            ipfsUrl: String(raw.blockchain.metadata?.ipfsUrl || ""),
            metadataJson: String(raw.blockchain.metadata?.metadataJson || ""),
          },
          verificationUrl: String(raw.blockchain.verificationUrl || ""),
          qrCodeUrl: String(raw.blockchain.qrCodeUrl || ""),
        }
      : null,
    validation: {
      verificationCode: String(raw?.validation?.verificationCode || ""),
      verificationUrl: String(raw?.validation?.verificationUrl || ""),
      isVerified: !!raw?.validation?.isVerified,
      verifiedBy: raw?.validation?.verifiedBy ?? null,
      verifiedAt: toIsoString(raw?.validation?.verifiedAt),
      verificationCount: Number(raw?.validation?.verificationCount ?? 0),
    },
    socialSharing: {
      sharedOnLinkedIn: !!raw?.socialSharing?.sharedOnLinkedIn,
      linkedInPostId: raw?.socialSharing?.linkedInPostId ?? null,
      sharedOnTwitter: !!raw?.socialSharing?.sharedOnTwitter,
      sharedOnFacebook: !!raw?.socialSharing?.sharedOnFacebook,
      shareCount: Number(raw?.socialSharing?.shareCount ?? 0),
    },
    status: ["generating", "ready", "issued", "revoked"].includes(raw?.status) ? raw.status : "generating",
    revokeReason: raw?.revokeReason ?? null,
    revokedAt: toIsoString(raw?.revokedAt),
    createdAt: toIsoString(raw?.createdAt) || "",
    emailedAt: toIsoString(raw?.emailedAt),
    issuedAt: toIsoString(raw?.issuedAt),
    expiresAt: toIsoString(raw?.expiresAt),
    updatedAt: toIsoString(raw?.updatedAt) || "",
  };
}

export const CertificateService = {
  /**
   * Every certificate one person has earned, newest first — the query behind an
   * attendee's own certificate list. `cert_for_attendee` below returns only the
   * first and has no callers; this replaces it for anything user-facing.
   *
   * Sorted in memory rather than with orderBy, because a where + orderBy pair
   * needs a composite index and none is declared for `certificates`.
   */
  async certsForUser(user_id: string): Promise<CertificateDocument[]> {
    if (!user_id) return [];
    const snap = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("userId", "==", user_id).get();
    return snap.docs
      .map((d: FirebaseFirestore.QueryDocumentSnapshot) => mapToCertificate(d.data(), d.id))
      .sort((a: CertificateDocument, b: CertificateDocument) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
      );
  },

  /**
   * One certificate by its id, for the public verification page.
   *
   * A plain document read: the id IS the Firestore doc id, so there is no query
   * and no index involved. Returns null for anything unknown rather than
   * throwing, because a stranger mistyping an id is the normal case here.
   */
  async getCertificateById(certificateId: string): Promise<CertificateDocument | null> {
    const id = String(certificateId ?? "").trim();
    if (!id) return null;
    try {
      const snap = await adminDb.collection(COLLECTIONS.CERTIFICATES).doc(id).get();
      return snap.exists ? mapToCertificate(snap.data(), snap.id) : null;
    } catch (err) {
      console.error("[getCertificateById] Firestore read failed", { id, err });
      return null;
    }
  },

  async cert_for_attendee(id: String) {
    const querySnapshot = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("userId", "==", id).limit(1).get();
    if (querySnapshot.empty) {
      return null;
    }
    return mapToCertificate(querySnapshot.docs[0].data(), querySnapshot.docs[0].id);
  },

  // Batch: fetch every certificate for an event once and index by userId,
  // replacing one cert_for_attendee query per attendee (N+1).
  async getCertsOfEventByUser(event_id: string): Promise<Map<string, CertificateDocument>> {
    const querySnapshot = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("eventId", "==", event_id).get();
    const map = new Map<string, CertificateDocument>();
    querySnapshot.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = d.data();
      if (data.userId) {
        map.set(String(data.userId), mapToCertificate(data, d.id));
      }
    });
    return map;
  },

  /**
   * Certificates for one event, indexed by REGISTRATION id.
   *
   * getCertsOfEventByUser keys on userId, which is "" for every public sign-up,
   * so those all collapsed onto one map entry and the page could not tell whose
   * certificate was whose. The registration id is unique per registrant.
   */
  async getCertsOfEventByRegistration(event_id: string): Promise<Map<string, CertificateDocument>> {
    const snap = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("eventId", "==", event_id).get();
    const map = new Map<string, CertificateDocument>();
    snap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = d.data();
      if (data.registrationId) map.set(String(data.registrationId), mapToCertificate(data, d.id));
    });
    return map;
  },

  async generateCertificatesForEvent(
    event_id: string,
    organizer_id: string,
    /**
     * REGISTRATION ids to issue for. Keyed on the registration rather than the
     * user, because a public sign-up has no userId -- selecting by user made
     * every account-less registrant unaddressable.
     */
    selectedRegistrationIds?: string[],
    /** Role per registration id, e.g. { regId: "Winner" }. Defaults to Attendee. */
    rolesByRegistrationId?: Record<string, string>,
  ): Promise<CertificateGenerationResult> {
    const results: CertificateGenerationAttendeeResult[] = [];

    try {
      const event = await EventService.getEventByID(event_id);
      console.log(`[CERT_GEN] Fetched Event Data:`, JSON.stringify(event, null, 2));

      const registrationsSnapshot: QuerySnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();
      console.log(`[CERT_GEN] Registrations Query returned ${registrationsSnapshot.size} document(s).`);

      if (registrationsSnapshot.empty) {
        console.warn(`[CERT_GEN] No registrations found for eventId: ${event_id}. Terminating execution.`);
        return { success: true, count: 0, failedCount: 0, message: 'No attendees to process.', results: [] };
      }

      // An empty selection means NOBODY, and the distinction is expensive: the
      // default template has blockchain.enabled = true, so falling through to
      // "every registration" mints a real on-chain certificate per attendee and
      // spends real funds, irreversibly. `undefined` still means the whole event
      // for callers that genuinely want that; `[]` is a no-op.
      if (Array.isArray(selectedRegistrationIds) && selectedRegistrationIds.length === 0) {
        console.warn(`[CERT_GEN] refusing an empty selection for event ${event_id}`);
        return {
          success: false,
          count: 0,
          failedCount: 0,
          message: 'Select at least one attendee before generating certificates.',
          results: [],
        };
      }

      const selectedSet = selectedRegistrationIds ? new Set(selectedRegistrationIds.map(String)) : null;

      const docsToProcess = selectedSet
        ? registrationsSnapshot.docs.filter((doc) => selectedSet.has(String(doc.id)))
        : registrationsSnapshot.docs;

      if (docsToProcess.length === 0) {
        return {
          success: true,
          count: 0,
          failedCount: 0,
          message: 'No matching attendees to process.',
          results: [],
        };
      }

      const template: CertificateTemplate = await CertificateTemplateService.get_template_of_organizer(event_id) || initialTemplate;
      console.log(`[CERT_GEN] Loaded Template Data:`, JSON.stringify(template, null, 2));

      template.templateName = event?.title || "event";
      console.log(`[CERT_GEN] Updated templateName to: "${template.templateName}"`);

      console.log(`[CERT_GEN] Initializing Firestore BulkWriter...`);
      const bulkWriter = adminDb.bulkWriter();
      let certificate_count = 0;

      console.log(`[CERT_GEN] Beginning loop through ${docsToProcess.length} registration document(s)...`);

      for (const [index, registrationDoc] of docsToProcess.entries()) {
        console.log(`\n------------------ [ATTENDEE ${index + 1}/${docsToProcess.length}] ------------------`);
        const registrationData = registrationDoc.data();
        const registrationId = registrationDoc.id;
        const userId = String(registrationData.userId || '');
        const recipientName = registrationData.userName || 'Attendee';

        console.log(`[CERT_GEN] Processing Registration ID: ${registrationId}`);
        console.log(`[CERT_GEN] Registration Data:`, JSON.stringify(registrationData, null, 2));

        try {
          const newCertDocRef = adminDb.collection(COLLECTIONS.CERTIFICATES).doc();
          const autoGeneratedCertId = newCertDocRef.id;

          /*
           * A public sign-up has no account, so there is no user document and no
           * attendee profile to read -- the registration's own contact details
           * are all that exist. Looking these up unconditionally threw on the
           * empty userId and took the whole batch down.
           */
          const attendee_user = userId ? await UserService.getUserById(userId).catch(() => null) : null;
          const attendee = userId ? await AttendeeService.getAttendeebyuserid(userId).catch(() => null) : null;

          const recipient =
            attendee_user?.profile?.fullName ||
            String(registrationData.attendee?.name || "") ||
            recipientName;
          const recipientEmail =
            attendee_user?.email || String(registrationData.attendee?.email || "");

          const issuedOn = new Date();
          template.name_content = recipient;
          template.date_content = formatDate(issuedOn);

          // The role the certificate is awarded for. Set per attendee by the
          // organizer before generating; "Attendee" when they did not choose.
          const role = String(rolesByRegistrationId?.[String(registrationId)] || "Attendee");

          /*
           * Gated on blockchain.enabled, like the mint below.
           *
           * This pin ran unconditionally, so every generation pushed one
           * document per attendee to Pinata even on events with the chain
           * turned off -- a paid external write, and an irreversible one, for
           * data nothing then read. The mint two hundred lines down was already
           * gated; this never was.
           */
          /*
           * Both the pin and the mint additionally require the chain to be
           * configured at all. The default template ships with
           * blockchain.enabled = true, so without this check every deployment
           * lacking Pinata and Polygon credentials failed to issue ANY
           * certificate -- the IPFS upload threw inside the per-attendee try and
           * each one was recorded as a failure. A digital certificate does not
           * need a blockchain; it should not be held hostage to one.
           */
          const onChain = template.blockchain.enabled && isBlockchainConfigured();

          let metadata_ipfs = "";
          if (onChain) {
            metadata_ipfs = await uploadToIPFS(template);
            console.log("[CERT_GEN] IPFS upload complete:", metadata_ipfs);
          }

          // The PDF is what the attendee actually receives, so it is rendered
          // and stored now rather than on demand: generation is the one moment
          // the template, the name and the date are all in hand together.
          let pdfPath = "";
          try {
            const bytes = await renderCertificatePdf(template, {
              recipientName: recipient,
              eventTitle: event?.title || "",
              dateText: formatDate(issuedOn),
              role,
              certificateId: autoGeneratedCertId,
              verifyUrl: await absoluteUrl(`/verify/${autoGeneratedCertId}`).catch(() => ""),
            });
            const key = `certificates/${event_id}/${autoGeneratedCertId}.pdf`;
            const { error: uploadError } = await supabaseAdmin.storage
              .from(CERTIFICATES_BUCKET)
              .upload(key, bytes, { contentType: "application/pdf", upsert: true });
            if (uploadError) throw uploadError;
            pdfPath = key;
          } catch (err) {
            // A certificate without its PDF is recoverable -- it can be
            // re-rendered from the stored template. Losing the record is not.
            console.error("[CERT_GEN] could not render or store the PDF", { autoGeneratedCertId, err });
          }

          const certPayload: CertificateDocument = {
            certificateId: autoGeneratedCertId,
            registrationId: registrationId,
            userId,
            eventId: event_id,
            organizerId: organizer_id,
            type: onChain ? "both" : "digital",
            title: template.heading_content,
            description: template.achievement_content,
            status: 'ready',
            content: {
              recipientName: recipient,
              eventTitle: event?.title || "",
              completionDate: new Date().toISOString(),
              duration: 'N/A',
              issuerName: template.issuer_name_content,
              issuerSignature: '',
              role,
              uniqueId: `UID-${autoGeneratedCertId}`
            },
            digital: {
              // Storage key, not a URL: a signed URL expires within the hour and
              // would be a dead link by the time the attendee opened the email.
              pdfPath,
              pdfUrl: '',
              templateId: template.templateId || 'DEFAULT',
              design: {
                backgroundColor: template?.primary_color || '#FFFFFF',
                borderColor: template?.border_color || '#000000',
                logoUrl: template?.logo_src || ''
              },
              downloadCount: 0,
              lastDownloaded: ''
            },
            blockchain: {
              minted: false,
              network: "Polygon",
              tokenId: "",
              tokenStandard: "ERC-721",
              contractAddress: process.env.CERTIFICATE_CONTRACT_ADDRESS || "",
              transactionHash: "",
              blockNumber: 0,
              gasUsed: "",
              metadata: {
                ipfsHash: "",
                ipfsUrl: metadata_ipfs,
                metadataJson: ""
              },
              verificationUrl: "",
              qrCodeUrl: ""
            },
            validation: {
              verificationCode: `VCODE-${autoGeneratedCertId}`,
              // Was a hardcoded https://eventflow.com/... — a domain this project
              // does not own, so every issued certificate carried a dead link.
              // Stored as a path; the verification page makes it absolute.
              verificationUrl: `/verify/${autoGeneratedCertId}`,
              isVerified: false,
              verificationCount: 0
            },
            socialSharing: {
              sharedOnLinkedIn: false,
              sharedOnTwitter: false,
              sharedOnFacebook: false,
              shareCount: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          console.log(`[CERT_GEN] Built Cert Payload:`, JSON.stringify(certPayload, null, 2));
          console.log("[CERT_GEN] Evaluating blockchain condition...");
          console.log(`[CERT_GEN] Value of certPayload.type: "${certPayload.type}"`);

          let mintErrorMessage: string | undefined;

          if (onChain) {

            try {
              const alreadyMinted = await BlockchainService.checkHasCertificate(event_id, recipientEmail);
              console.log(`[CERT_GEN] alreadyMinted status: ${alreadyMinted}`);

              if (alreadyMinted) {
                console.warn(`[CERT_GEN] already minted on-chain for ${recipientEmail}; skipping.`);
              } else {
                const mintResult = await BlockchainService.mintSingleCertificate(
                  "", // Falls back to owner wallet if not provided or invalid
                  event?.title || "unknown event",
                  recipient,
                  recipientEmail,
                  event_id,
                  metadata_ipfs
                );
                console.log(`[CERT_GEN] On-chain minting successful! Mint Result:`, JSON.stringify(mintResult, null, 2));

                if (mintResult) {
                  certPayload.blockchain = {
                    ...certPayload.blockchain!,
                    minted: true,
                    tokenId: mintResult.tokenId || "",
                    transactionHash: mintResult.transactionHash || "",
                    verificationUrl: mintResult.explorerUrl || "",
                  };
                }
              }
            } catch (mintError: any) {
              console.error(`[Mint Failure] cert :`, mintError);
              mintErrorMessage = mintError?.message || 'Blockchain mint failed';
            }
          } else {
            console.log(`[CERT_GEN] Skipping blockchain minting (certPayload.type "${certPayload.type}" condition was false).`);
          }

          console.log(`[CERT_GEN] Staging Certificate set operation in BulkWriter for Doc ID: ${autoGeneratedCertId}...`);
          bulkWriter.set(newCertDocRef, certPayload);

          const updatedCertConfig: RegistrationCertificate = {
            type: certPayload.type,
            issued: true,
            certificateId: autoGeneratedCertId,
            issueDate: new Date().toISOString(),
            downloadUrl: null,
            sharedOnLinkedIn: false
          };

          console.log(`[CERT_GEN] Staging Registration update operation in BulkWriter for Doc ID: ${registrationId}...`);
          console.log(`[CERT_GEN] Registration update payload:`, JSON.stringify(updatedCertConfig, null, 2));

          bulkWriter.update(adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId), {
            certificateConfig: updatedCertConfig
          });

          // Only when there is a profile to append to. A public sign-up has no
          // attendees document, and the certificate itself already records who
          // it belongs to -- this array is a convenience index, not the source.
          if (attendee?.attendeeId) {
            const attendee_cert: AttendeeCertificate[] = [
              ...(attendee.certificates ?? []),
              {
                certificateId: certPayload.certificateId,
                eventId: event_id,
                issuedAt: new Date().toISOString(),
                type: certPayload.type,
                verificationUrl: `/verify/${certPayload.certificateId}`,
              },
            ];

            bulkWriter.update(adminDb.collection(COLLECTIONS.ATTENDEES).doc(attendee.attendeeId), {
              certificates: attendee_cert,
            });
          }

          certificate_count++;
          console.log(`[CERT_GEN] Successfully staged attendee #${certificate_count}`);

          results.push({
            userId,
            registrationId,
            recipientName,
            success: true,
            ...(mintErrorMessage ? { error: mintErrorMessage } : {}),
          });
        } catch (attendeeError: any) {
          console.error(`[CERT_GEN] Failed for registration ${registrationId}:`, attendeeError);
          results.push({
            userId,
            registrationId,
            recipientName,
            success: false,
            error: attendeeError?.message || 'Certificate generation failed for this attendee.',
          });
        }
      }

      console.log(`\n[CERT_GEN] Flushes and committing all staged BulkWriter operations...`);
      await bulkWriter.close();
      console.log(`[CERT_GEN] BulkWriter closed successfully. Total certificates processed: ${certificate_count}`);

      const failedCount = results.filter((r) => !r.success).length;

      return {
        success: failedCount === 0,
        count: certificate_count,
        failedCount,
        message:
          failedCount === 0
            ? `Generated ${certificate_count} certificate(s) successfully.`
            : `Generated ${certificate_count} certificate(s); ${failedCount} failed.`,
        results,
      };
    } catch (error: any) {
      console.error('[CertService Critical Failure]:', error);
      return {
        success: false,
        count: 0,
        failedCount: results.filter((r) => !r.success).length || results.length,
        message: error?.message || 'Certificate generation failed.',
        results,
      };
    }
  }

}
