
import { adminAuth, adminDb } from "@/data/admin_db";
import { CertificateDocument } from "./models/certificate.model";
import { EventService } from "./event.service";
import { EventModel } from "./models/event.model";
import { RegistrationCertificate } from "./models/reg.type";
import { COLLECTIONS } from "@/data/collections";
import { formatDate } from "@/src/lib/datetime";
import { BlockchainService } from "./blockchain.service";
import { CertificateTemplate, CertificateTemplateService, initialTemplate } from "./certificate.template.services";

import { PinataSDK } from "pinata";
import { AttendeeService } from "../features/event_attendee/attendee.service";
import { Attendee } from "../features/event_attendee/type";
import { UserService } from "./user.service";

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

  async generateCertificatesForEvent(event_id: string, organizer_id: string) {
    try {

      const event = await EventService.getEventByID(event_id);
      console.log(`[CERT_GEN] Fetched Event Data:`, JSON.stringify(event, null, 2));

      const registrationsSnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();
      console.log(`[CERT_GEN] Registrations Query returned ${registrationsSnapshot.size} document(s).`);

      if (registrationsSnapshot.empty) {
        console.warn(`[CERT_GEN] No registrations found for eventId: ${event_id}. Terminating execution.`);
        return { success: true, count: 0, message: 'No attendees to process.' };
      }

      const template: CertificateTemplate = await CertificateTemplateService.get_template_of_organizer(event_id) || initialTemplate;
      console.log(`[CERT_GEN] Loaded Template Data:`, JSON.stringify(template, null, 2));

      const attendees =
        template.templateName = event?.title || "event";
      console.log(`[CERT_GEN] Updated templateName to: "${template.templateName}"`);

      console.log(`[CERT_GEN] Initializing Firestore BulkWriter...`);
      const bulkWriter = adminDb.bulkWriter();
      let certificate_count = 0;

      console.log(`[CERT_GEN] Beginning loop through ${registrationsSnapshot.docs.length} registration document(s)...`);

      for (const [index, registrationDoc] of registrationsSnapshot.docs.entries()) {
        console.log(`\n------------------ [ATTENDEE ${index + 1}/${registrationsSnapshot.docs.length}] ------------------`);
        const registrationData = registrationDoc.data();
        const registrationId = registrationDoc.id;
        console.log(`[CERT_GEN] Processing Registration ID: ${registrationId}`);
        console.log(`[CERT_GEN] Registration Data:`, JSON.stringify(registrationData, null, 2));

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
          userId: registrationData.userId || '',
          eventId: event_id,
          organizerId: organizer_id,
          type: registrationData.certificate?.type || "both",
          title: template.heading_content,
          description: `Successfully completed ${event?.title}`,
          status: 'ready',
          content: {
            recipientName: registrationData.userName || 'Attendee',
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

        //!TODO : remove this true and complete changes
        // if (certPayload.type in ['both', 'blockchain']) {
        if (true) {
          console.log("[CERT_GEN] Blockchain check passed. Proceeding with minting check...");
          let mintResult: {
            transactionHash: string,
            tokenId: string | null,
            explorerUrl: string
          }

          try {
            console.log(`[CERT_GEN] Checking if already minted on-chain for event_id: ${event_id}, email: ${attendee_user.email}...`);
            const alreadyMinted = await BlockchainService.checkHasCertificate(event_id, attendee_user.email);
            console.log(`[CERT_GEN] alreadyMinted status: ${alreadyMinted}`);

            if (alreadyMinted) {
              console.warn(`[CERT_GEN] Certificate already minted on-chain for ${attendee_user.email}. Skipping iteration.`);
              continue;
            } else {
              console.log(`[CERT_GEN] Minting single certificate on-chain for ${attendee_user.email}...`);
              mintResult = await BlockchainService.mintSingleCertificate(
                "", // Falls back to owner wallet if not provided or invalid
                event?.title || "unknown event",
                attendee_user.profile.fullName,
                attendee_user.email,
                event_id,
                metadata_ipfs
              );
              console.log(`[CERT_GEN] On-chain minting successful! Mint Result:`, JSON.stringify(mintResult, null, 2));
            }

          } catch (mintError: any) {
            console.error(`[Mint Failure] cert :`, mintError);
          }
        } else {
          console.log(`[CERT_GEN] Skipping blockchain minting (certPayload.type "${certPayload.type}" condition was false).`);
        }

        console.log(`[CERT_GEN] Staging Certificate set operation in BulkWriter for Doc ID: ${autoGeneratedCertId}...`);
        bulkWriter.set(newCertDocRef, certPayload);

        const updatedCertConfig: RegistrationCertificate = {
          type: registrationData.certificate?.type || "both",
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
      }

      console.log(`\n[CERT_GEN] Flushes and committing all staged BulkWriter operations...`);
      await bulkWriter.close();
      console.log(`[CERT_GEN] BulkWriter closed successfully. Total certificates processed: ${certificate_count}`);

      //use that link 

      //       Your Next.js App
      //        │
      //        │ Create JSON object
      //        ▼
      // {
      //   eventName: "AI Workshop",
      //   attendeeName: "Ali Khan",
      //   ...
      // }
      //        │
      //        │ Upload JSON
      //        ▼
      //      Pinata
      //        │
      //        │ Pin to IPFS
      //        ▼
      //       IPFS
      //        │
      //        │ Returns CID
      //        ▼
      // ipfs://QmABC123...
      //        │
      //        │ Store URI
      //        ▼
      // Smart Contract
      //        │
      //        ▼
      // Polygon Amoy





      // // Firestore writes still go through BulkWriter — fast, batched, parallel.
      // const bulkWriter = adminDb.bulkWriter();

      // // Keep track of created certs so we can mint + update blockchain field after flush.
      // const createdCerts: { ref: FirebaseFirestore.DocumentReference; payload: CertificateDocument; registrationId: string; attendeeEmail: string; walletAddress: string }[] = [];

      // for (const registrationDoc of registrationsSnapshot.docs) {
      //   const registrationData = registrationDoc.data();
      //   const registrationId = registrationDoc.id;

      //   const newCertDocRef = adminDb.collection(COLLECTIONS.CERTIFICATES).doc();
      //   const autoGeneratedCertId = newCertDocRef.id;

      //   const certPayload: CertificateDocument = {
      //     certificateId: autoGeneratedCertId,
      //     registrationId: registrationId,
      //     userId: registrationData.userId || '',
      //     eventId: event_id,
      //     organizerId: organizer_id,
      //     type: 'both',
      //     title: 'Certificate of Completion',
      //     description: `Successfully completed ${event?.title}`,
      //     status: 'ready',
      //     content: {
      //       recipientName: registrationData.userName || 'Attendee',
      //       eventTitle: event?.title || "",
      //       completionDate: completionDate,
      //       duration: 'N/A',
      //       issuerName: organizer_id,
      //       issuerSignature: '',
      //       uniqueId: `UID-${autoGeneratedCertId}`
      //     },
      //     digital: {
      //       // STORAGE HOOK (follow-up): once real PDF generation exists, upload the
      //       // generated file to the private "certificates" bucket via supabaseAdmin
      //       // and store its path here, e.g.
      //       //   const { path } = await supabaseAdmin.storage
      //       //     .from(CERTIFICATES_BUCKET)
      //       //     .upload(`${event_id}/${autoGeneratedCertId}.pdf`, pdfBytes, { contentType: "application/pdf" });
      //       // then serve on download with getSignedUrl(CERTIFICATES_BUCKET, path).
      //       // The private bucket + getSignedUrl helper are already in place (data/supabase.ts).
      //       pdfUrl: '',
      //       templateId: template.templateId || 'DEFAULT',
      //       design: {
      //         // backgroundColor: template?.backgroundColor || '#FFFFFF',
      //         // borderColor: template?.borderColor || '#000000',
      //         // logoUrl: template?.logoUrl || ''
      //         backgroundColor: '#FFFFFF',
      //         borderColor: '#000000',
      //         logoUrl: ''
      //       },
      //       downloadCount: 0,
      //       lastDownloaded: ''
      //     },
      //     blockchain: {
      //       minted: false,
      //       network: "Polygon",
      //       tokenId: "",
      //       tokenStandard: "ERC-721",
      //       contractAddress: process.env.CERTIFICATE_CONTRACT_ADDRESS || "",
      //       transactionHash: "",
      //       blockNumber: 0,
      //       gasUsed: "",
      //       metadata: {
      //         ipfsHash: "",
      //         ipfsUrl: "",
      //         metadataJson: ""
      //       },
      //       verificationUrl: "",
      //       qrCodeUrl: ""
      //     },
      //     validation: {
      //       verificationCode: `VCODE-${autoGeneratedCertId}`,
      //       verificationUrl: `https://eventflow.com/verify/${autoGeneratedCertId}`,
      //       isVerified: false,
      //       verificationCount: 0
      //     },
      //     socialSharing: {
      //       sharedOnLinkedIn: false,
      //       sharedOnTwitter: false,
      //       sharedOnFacebook: false,
      //       shareCount: 0
      //     },
      //     createdAt: nowDate,
      //     updatedAt: nowDate
      //   };

      //   bulkWriter.set(newCertDocRef, certPayload);

      //   const updatedCertConfig: RegistrationCertificate = {
      //     issued: true,
      //     certificateId: autoGeneratedCertId,
      //     issueDate: completionDate,
      //     downloadUrl: null,
      //     sharedOnLinkedIn: false
      //   };

      //   bulkWriter.update(adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId), {
      //     certificateConfig: updatedCertConfig
      //   });

      //   createdCerts.push({
      //     ref: newCertDocRef,
      //     payload: certPayload,
      //     registrationId,
      //     attendeeEmail: registrationData.email || '',
      //     walletAddress: registrationData.walletAddress || ''
      //   });

      //   certificateCount++;
      // }

      // // Flush all cert-create + registration-update writes first.
      // await bulkWriter.close();

      // // Mint on-chain, one attendee at a time. A failed mint here does NOT
      // // roll back the Firestore cert — cert stays 'ready', blockchain field
      // // just remains null until a retry/backfill job picks it up.
      // const mintBulkWriter = adminDb.bulkWriter();
      // for (const cert of createdCerts) {
      //   try {
      //     const alreadyMinted = await BlockchainService.checkHasCertificate(event_id, cert.attendeeEmail);
      //     if (alreadyMinted) {
      //       mintFailures.push({ registrationId: cert.registrationId, error: 'Already minted for this email/event.' });
      //       continue;
      //     }

      //     const metadata = buildCertificateMetadata(cert.payload, template);
      //     const metadataUri = await uploadToIPFS(metadata);

      //     const mintResult = await BlockchainService.mintSingleCertificate(
      //       cert.walletAddress, // Falls back to owner wallet if not provided or invalid
      //       cert.payload.content.eventTitle,
      //       cert.payload.content.recipientName,
      //       cert.attendeeEmail,
      //       event_id,
      //       metadataUri
      //     );

      //     mintBulkWriter.update(cert.ref, {
      //       'blockchain.minted': true,
      //       'blockchain.tokenId': mintResult.tokenId,
      //       'blockchain.transactionHash': mintResult.transactionHash,
      //       'blockchain.metadata.ipfsUrl': metadataUri,
      //       'blockchain.verificationUrl': mintResult.explorerUrl,
      //       'blockchain.mintedAt': new Date()
      //     });

      //     mintedCount++;
      //   } catch (mintError: any) {
      //     console.error(`[Mint Failure] cert ${cert.payload.certificateId}:`, mintError);
      //     mintFailures.push({ registrationId: cert.registrationId, error: mintError?.message || 'Unknown mint error' });
      //   }
      // }
      // await mintBulkWriter.close();

      // return {
      //   success: true,
      //   count: certificateCount,
      //   minted: mintedCount,
      //   mintFailures,
      //   message: `Generated ${certificateCount} certificates, minted ${mintedCount} on-chain${mintFailures.length ? `, ${mintFailures.length} mint failures` : ''}.`
      // };

    } catch (error) {
      console.error('[CertService Critical Failure]:', error);
      return { success: false, count: 0, message: 'Certificate generation failed.' };
    }
  }

}