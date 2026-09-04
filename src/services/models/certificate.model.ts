export type CertificateType = 'digital' | 'blockchain' | 'both';
export type CertificateStatus = 'generating' | 'ready' | 'issued' | 'revoked';

/** The roles a certificate can be awarded for (spec 6.1). */
export const CERTIFICATE_ROLES = ["Attendee", "Winner", "Speaker", "Volunteer", "Organizer"] as const;
export type CertificateRole = (typeof CERTIFICATE_ROLES)[number];

export interface CertificateContent {
  recipientName: string;
  eventTitle: string;
  completionDate: string; // ISO date string
  /** Attendee / Winner / Speaker / Volunteer / Organizer. Free-form on read so
   *  a stored value outside the list survives rather than being dropped. */
  role: string;
  grade?: string;
  duration: string;
  issuerName: string;
  issuerSignature: string; // URL
  uniqueId: string;
}

export interface DigitalCertificate {
  /**
   * Storage key of the rendered PDF in the private certificates bucket. A key
   * rather than a URL, because a signed URL expires within the hour and would
   * be dead by the time an emailed link was opened; downloads sign it on demand.
   */
  pdfPath: string;
  /** Legacy. Was written as "" on every certificate and never populated. */
  pdfUrl: string;
  templateId: string;
  design: {
    backgroundColor: string;
    borderColor: string;
    logoUrl: string;
    watermark?: string;
  };
  downloadCount: number;
  lastDownloaded: Date | string;
}

export interface BlockchainCertificate {
  minted: boolean;
  network: string;
  tokenId: string;
  tokenStandard: 'ERC-721' | 'ERC-1155';
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  metadata: {
    ipfsHash: string;
    ipfsUrl: string;
    metadataJson: string;
  };
  verificationUrl: string;
  qrCodeUrl: string;
}

export interface CertificateValidation {
  verificationCode: string;
  verificationUrl: string;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | string | null;
  verificationCount: number;
}

export interface SocialSharing {
  sharedOnLinkedIn: boolean;
  linkedInPostId?: string | null;
  sharedOnTwitter: boolean;
  sharedOnFacebook: boolean;
  shareCount: number;
}

export interface CertificateDocument {
  certificateId: string;
  registrationId: string;
  userId: string;
  eventId: string;
  organizerId: string;
  type: CertificateType;
  title: string;
  description: string;
  content: CertificateContent;
  digital?: DigitalCertificate | null;
  blockchain?: BlockchainCertificate | null;
  validation: CertificateValidation;
  socialSharing: SocialSharing;
  status: CertificateStatus;
  revokeReason?: string | null;
  revokedAt?: Date | string | null;
  createdAt: Date | string;
  issuedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  updatedAt: Date | string;
}

export type CertificateGenerationAttendeeResult = {
  userId: string;
  registrationId: string;
  recipientName: string;
  success: boolean;
  error?: string;
};

export type CertificateGenerationResult = {
  success: boolean;
  count: number;
  failedCount: number;
  message: string;
  results: CertificateGenerationAttendeeResult[];
};