
import { adminAuth, adminDb } from "@/data/admin_db";
import { CertificateDocument } from "./models/certificate.model";
import { EventService } from "./event.service";
import { EventModel } from "./models/event.model";
import { RegistrationCertificate } from "./models/reg.type";
import { COLLECTIONS } from "@/data/collections";
import { BlockchainService } from "./blockchain.service";
import { CertificateTemplateService, initialTemplate } from "./certificate.template.services";

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
    image: cert.digital.design.logoUrl || template.defaultImageUri || '',
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
  },async generateCertificatesForEvent(event_id: string, organizer_id: string) {
  try {
    const event = await EventService.getEventByID(event_id);
    const registrationsSnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();

    if (registrationsSnapshot.empty) {
      return { success: true, count: 0, message: 'No attendees to process.' };
    }

    // Fetch organizer's template once, reused for every certificate in this batch
    const template = await CertificateTemplateService.get_template_of_organizer(organizer_id) || initialTemplate;
    template.eventname = event?.title;

    let certificateCount = 0;
    let mintedCount = 0;
    const mintFailures: { registrationId: string; error: string }[] = [];
    const nowISO = new Date().toISOString();
    const completionDate = nowISO.split('T')[0];

    // Firestore writes still go through BulkWriter — fast, batched, parallel.
    const bulkWriter = adminDb.bulkWriter();

    // Keep track of created certs so we can mint + update blockchain field after flush.
    const createdCerts: { ref: FirebaseFirestore.DocumentReference; payload: CertificateDocument; registrationId: string; attendeeEmail: string }[] = [];

    for (const registrationDoc of registrationsSnapshot.docs) {
      const registrationData = registrationDoc.data();
      const registrationId = registrationDoc.id;

      const newCertDocRef = adminDb.collection(COLLECTIONS.CERTIFICATES).doc();
      const autoGeneratedCertId = newCertDocRef.id;

      const certPayload: CertificateDocument = {
        certificateId: autoGeneratedCertId,
        registrationId: registrationId,
        userId: registrationData.userId || '',
        eventId: event_id,
        organizerId: organizer_id,
        type: 'digital',
        title: 'Certificate of Completion',
        description: `Successfully completed ${event?.title}`,
        status: 'ready',
        content: {
          recipientName: registrationData.userName || 'Attendee',
          eventTitle: event?.title || "",
          completionDate: completionDate,
          duration: 'N/A',
          issuerName: organizer_id,
          issuerSignature: '',
          uniqueId: `UID-${autoGeneratedCertId}`
        },
        digital: {
          pdfUrl: '',
          templateId: template.templateId || 'DEFAULT',
          design: {
            // backgroundColor: template?.backgroundColor || '#FFFFFF',
            // borderColor: template?.borderColor || '#000000',
            // logoUrl: template?.logoUrl || ''
             backgroundColor: '#FFFFFF',
            borderColor: '#000000',
            logoUrl: ''
          },
          downloadCount: 0,
          lastDownloaded: ''
        },
        blockchain: null,
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
        createdAt: nowISO,
        updatedAt: nowISO
      };

      bulkWriter.set(newCertDocRef, certPayload);

      const updatedCertConfig: RegistrationCertificate = {
        issued: true,
        certificateId: autoGeneratedCertId,
        issueDate: completionDate,
        downloadUrl: null,
        sharedOnLinkedIn: false
      };

      bulkWriter.update(adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId), {
        certificateConfig: updatedCertConfig
      });

      createdCerts.push({
        ref: newCertDocRef,
        payload: certPayload,
        registrationId,
        attendeeEmail: registrationData.email || ''
      });

      certificateCount++;
    }

    // Flush all cert-create + registration-update writes first.
    await bulkWriter.close();

    // Mint on-chain, one attendee at a time. A failed mint here does NOT
    // roll back the Firestore cert — cert stays 'ready', blockchain field
    // just remains null until a retry/backfill job picks it up.
    for (const cert of createdCerts) {
      try {
        const alreadyMinted = await BlockchainService.checkHasCertificate(event_id, cert.attendeeEmail);
        if (alreadyMinted) {
          mintFailures.push({ registrationId: cert.registrationId, error: 'Already minted for this email/event.' });
          continue;
        }

        const metadata = buildCertificateMetadata(cert.payload, template);
        const metadataUri = await uploadToIPFS(metadata);

        const mintResult = await BlockchainService.mintSingleCertificate(
          "0x0000000000000000000000000000000000000000", // TODO: swap for real recipient wallet once collected
          cert.payload.content.eventTitle,
          cert.payload.content.recipientName,
          cert.attendeeEmail,
          event_id,
          metadataUri
        );

        await cert.ref.update({
          blockchain: {
            tokenId: mintResult.tokenId,
            txHash: mintResult.explorerUrl,
            metadataUri,
            mintedAt: new Date().toISOString()
          }
        });

        mintedCount++;
      } catch (mintError: any) {
        console.error(`[Mint Failure] cert ${cert.payload.certificateId}:`, mintError);
        mintFailures.push({ registrationId: cert.registrationId, error: mintError?.message || 'Unknown mint error' });
      }
    }

    return {
      success: true,
      count: certificateCount,
      minted: mintedCount,
      mintFailures,
      message: `Generated ${certificateCount} certificates, minted ${mintedCount} on-chain${mintFailures.length ? `, ${mintFailures.length} mint failures` : ''}.`
    };

  } catch (error) {
    console.error('[CertService Critical Failure]:', error);
    return { success: false, count: 0, message: 'Certificate generation failed.' };
  }
}

}