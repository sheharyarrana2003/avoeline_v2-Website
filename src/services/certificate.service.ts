import {  adminDb } from "@/data/admin_db";
import { CertificateDocument } from "./models/certificate.model";
import type {
  CertificateGenerationAttendeeResult,
  CertificateGenerationResult,
} from "./models/certificate.model";
import { EventService } from "./event.service";
import { RegistrationCertificate } from "./models/reg.type";
import { COLLECTIONS } from "@/data/collections";
import { BlockchainService } from "./blockchain.service";
import { CertificateTemplate, CertificateTemplateService, initialTemplate } from "./certificate.template.services";

import { PinataSDK } from "pinata";
import { UserService } from "./user.service";

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

function createCertificateDocument(input: any) {
  const now = new Date().toISOString();
  const padId = String(input.index).padStart(3, '0');
  const certificateId = `CERT${padId}`;
  const uniqueId = `CERT-${new Date().getFullYear()}-${padId}`;

  // 5 Year expiry logic
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);

  const doc: CertificateDocument = {
    certificateId,
    registrationId: input.registrationId,
    userId: input.userId,
    eventId: input.eventId,
    organizerId: input.organizerId,
    type: input.type,
    title: "Certificate of Completion",
    description: `Successfully completed ${input.eventTitle}`,
    content: {
      recipientName: input.recipientName,
      eventTitle: input.eventTitle,
      completionDate: now.split('T')[0],
      grade: "A+",
      duration: input.duration,
      issuerName: input.issuerName,
      issuerSignature: `https://storage.eventflow.com/signatures/${input.organizerId}.png`,
      uniqueId: uniqueId
    },
    validation: {
      verificationCode: `EVT-${certificateId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      verificationUrl: `https://eventflow.com/verify/${certificateId}`,
      isVerified: false,
      verificationCount: 0
    },
    socialSharing: {
      sharedOnLinkedIn: false,
      sharedOnTwitter: false,
      sharedOnFacebook: false,
      shareCount: 0
    },
    status: 'generating',
    createdAt: now,
    updatedAt: now,
    expiresAt: expiryDate.toISOString().split('T')[0]
  };

  // Conditionals based on dynamic Type mapping
  if (input.type === 'digital' || input.type === 'both') {
    doc.digital = {
      pdfUrl: `https://storage.eventflow.com/certificates/${certificateId}.pdf`,
      templateId: "TEMPLATE_DEFAULT_01",
      design: {
        backgroundColor: "#FFFFFF",
        borderColor: "#1E3A8A",
        logoUrl: "https://storage.eventflow.com/logos/default_logo.png",
        watermark: "EVENTFLOW VERIFIED"
      },
      downloadCount: 0,
      lastDownloaded: ""
    };
  }

  if (input.type === 'blockchain' || input.type === 'both') {
    doc.blockchain = {
      minted: false, // Initially false until cron/worker picks it up to mint
      network: "Polygon",
      tokenId: "",
      tokenStandard: "ERC-721",
      contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e...", // System deployment contract
      transactionHash: "",
      blockNumber: 0,
      gasUsed: "",
      metadata: {
        ipfsHash: "",
        ipfsUrl: "",
        metadataJson: ""
      },
      verificationUrl: "",
      qrCodeUrl: ""
    };
  }

  return doc;
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

export const CertificateService = {
  async cert_for_attendee(id: String) {
    const querySnapshot = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("userId", "==", id).limit(1).get();
    if (querySnapshot.empty) {
      return null;
    }
    return createCertificateDocument(querySnapshot.docs[0].data());
  },

  // Batch: fetch every certificate for an event once and index by userId,
  // replacing one cert_for_attendee query per attendee (N+1).
  async getCertsOfEventByUser(event_id: string): Promise<Map<string, CertificateDocument>> {
    const querySnapshot = await adminDb.collection(COLLECTIONS.CERTIFICATES).where("eventId", "==", event_id).get();
    const map = new Map<string, CertificateDocument>();
    querySnapshot.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = d.data();
      if (data.userId) {
        map.set(String(data.userId), createCertificateDocument(data));
      }
    });
    return map;
  },

  async generateCertificatesForEvent(
    event_id: string,
    organizer_id: string,
    selectedUserIds?: string[],
  ): Promise<CertificateGenerationResult> {
    const results: CertificateGenerationAttendeeResult[] = [];

    try {
      const event = await EventService.getEventByID(event_id);
      console.log(`[CERT_GEN] Fetched Event Data:`, JSON.stringify(event, null, 2));

      const registrationsSnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();
      console.log(`[CERT_GEN] Registrations Query returned ${registrationsSnapshot.size} document(s).`);

      if (registrationsSnapshot.empty) {
        console.warn(`[CERT_GEN] No registrations found for eventId: ${event_id}. Terminating execution.`);
        return { success: true, count: 0, failedCount: 0, message: 'No attendees to process.', results: [] };
      }

      const selectedSet =
        selectedUserIds && selectedUserIds.length > 0
          ? new Set(selectedUserIds.map(String))
          : null;

      const docsToProcess = selectedSet
        ? registrationsSnapshot.docs.filter((doc) => selectedSet.has(String(doc.data().userId || '')))
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

          const attendee_user = await UserService.getUserById(registrationData.userId);

          template.name_content = attendee_user.profile.fullName;
          template.date_content = new Date().toISOString();
          console.log(`[CERT_GEN] Configured Template -> Name: "${template.name_content}", Date: "${template.date_content}"`);

          console.log("[CERT_GEN] About to upload template to IPFS/Pinata...");
          const metadata_ipfs = await uploadToIPFS(template);
          console.log("[CERT_GEN] IPFS Upload complete! Metadata IPFS URI:", metadata_ipfs);

          const certPayload: CertificateDocument = {
            certificateId: autoGeneratedCertId,
            registrationId: registrationId,
            userId,
            eventId: event_id,
            organizerId: organizer_id,
            type: template.blockchain.enabled ? "both" : "digital",
            title: template.heading_content,
            description: template.achievement_content,
            status: 'ready',
            content: {
              recipientName,
              eventTitle: event?.title || "",
              completionDate: new Date().toISOString(),
              duration: 'N/A',
              issuerName: template.issuer_name_content,
              issuerSignature: '',
              uniqueId: `UID-${autoGeneratedCertId}`
            },
            digital: {
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
              verificationUrl: `https://eventflow.com/verify/${autoGeneratedCertId}`,
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

          if (template.blockchain.enabled) {
            console.log("[CERT_GEN] Blockchain check passed. Proceeding with minting check...");

            try {
              console.log(`[CERT_GEN] Checking if already minted on-chain for event_id: ${event_id}, email: ${attendee_user.email}...`);
              const alreadyMinted = await BlockchainService.checkHasCertificate(event_id, attendee_user.email);
              console.log(`[CERT_GEN] alreadyMinted status: ${alreadyMinted}`);

              if (alreadyMinted) {
                console.warn(`[CERT_GEN] Certificate already minted on-chain for ${attendee_user.email}. Skipping mint.`);
              } else {
                console.log(`[CERT_GEN] Minting single certificate on-chain for ${attendee_user.email}...`);
                const mintResult = await BlockchainService.mintSingleCertificate(
                  "", // Falls back to owner wallet if not provided or invalid
                  event?.title || "unknown event",
                  attendee_user.profile.fullName,
                  attendee_user.email,
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
