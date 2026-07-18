
import { adminAuth, adminDb } from "@/data/admin_db";
import { CertificateDocument } from "./models/certificate.model";
import { EventService } from "./event.service";
import { EventModel } from "./models/event.model";
import { RegistrationCertificate } from "./models/reg.type";
import { COLLECTIONS } from "@/data/collections";

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
      const registrationsSnapshot = await adminDb.collection(COLLECTIONS.REGISTRATIONS).where("eventId", "==", event_id).get();

      if (registrationsSnapshot.empty) {
        return { success: true, count: 0, message: 'No attendees to process.' };
      }

      let certificateCount = 0;
      const nowISO = new Date().toISOString();
      const completionDate = nowISO.split('T')[0];

      // Use a BulkWriter so the 2 writes per registration (cert create + reg
      // update) are batched and flushed in parallel instead of awaited one at a
      // time (previously 2N sequential round-trips).
      const bulkWriter = adminDb.bulkWriter();

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
            templateId: 'DEFAULT',
            design: { backgroundColor: '#FFFFFF', borderColor: '#000000', logoUrl: '' },
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

        certificateCount++;
      }

      // Flush all buffered writes and wait for them to complete.
      await bulkWriter.close();

      return {
        success: true,
        count: certificateCount,
        message: `Successfully generated ${certificateCount} certificates.`
      };

    } catch (error) {
      console.error('[CertService Critical Failure]:', error);
      return { success: false, count: 0, message: 'Certificate generation failed.' };
    }
  }
}