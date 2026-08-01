export type CertificateType = 'digital' | 'blockchain' | 'both';
export type CertificateStatus = 'generating' | 'ready' | 'issued' | 'revoked';

export interface CertificateContent {
  recipientName: string;
  eventTitle: string;
  completionDate: string; // ISO date string
  grade?: string;
  duration: string;
  issuerName: string;
  issuerSignature: string; // URL
  uniqueId: string;
}

export interface DigitalCertificate {
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