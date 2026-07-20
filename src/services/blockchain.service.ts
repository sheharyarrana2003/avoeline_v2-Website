import { ethers } from "ethers";
import { AVOELINE_CERTIFICATE_ABI } from "./models/blockchain.model";

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL!);
const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

const contract = new ethers.Contract(
  process.env.CERTIFICATE_CONTRACT_ADDRESS!,
  AVOELINE_CERTIFICATE_ABI,
  signer
);

export interface CertificateDetails {
  eventName: string;
  attendeeName: string;
  attendeeEmail: string;
  eventId: string;
  issuedAt: number;
  isValid: boolean;
  metadataURI: string;
}

export const BlockchainService = {
  /**
   * Mint a single certificate on Polygon Amoy
   */
  async mintSingleCertificate(
    recipientWallet: string,
    eventName: string,
    attendeeName: string,
    attendeeEmail: string,
    eventId: string,
    metadataURI: string
  ) {
    // Optional fallback to owner address if recipient has no wallet yet
    const toAddress = recipientWallet && ethers.isAddress(recipientWallet) 
      ? recipientWallet 
      : signer.address;

    const tx = await contract.mintCertificate(
      toAddress,
      eventName,
      attendeeName,
      attendeeEmail,
      eventId,
      metadataURI
    );

    const receipt = await tx.wait();
    
    // Parse event logs to get the created tokenId
    const log = receipt.logs.find(
      (l: any) => l.topics[0] === contract.interface.getEvent("CertificateMinted")?.topicHash
    );
    const parsedLog = contract.interface.parseLog(log);
    const tokenId = parsedLog?.args.tokenId.toString();

    return {
      transactionHash: receipt.hash,
      tokenId: tokenId ?? null,
      explorerUrl: `https://amoy.polygonscan.com/tx/${receipt.hash}`
    };
  },

  /**
   * Check if a certificate was already minted for an email and event
   */
  async checkHasCertificate(eventId: string, attendeeEmail: string): Promise<boolean> {
    return await contract.hasCertificate(eventId, attendeeEmail);
  },

  /**
   * Read certificate details directly from the chain
   */
  async getCertificate(tokenId: string | number): Promise<CertificateDetails> {
    const cert = await contract.getCertificate(tokenId);
    return {
      eventName: cert.eventName,
      attendeeName: cert.attendeeName,
      attendeeEmail: cert.attendeeEmail,
      eventId: cert.eventId,
      issuedAt: Number(cert.issuedAt),
      isValid: cert.isValid,
      metadataURI: cert.metadataURI,
    };
  },

  /**
   * Fetch all token IDs issued for a given event ID
   */
  async getEventCertificates(eventId: string): Promise<string[]> {
    const tokenIds: bigint[] = await contract.getEventCertificates(eventId);
    return tokenIds.map((id) => id.toString());
  },

  /**
   * Revoke an issued certificate
   */
  async revokeCertificate(tokenId: string | number) {
    const tx = await contract.revokeCertificate(tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }
};