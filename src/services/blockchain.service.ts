import { ethers } from "ethers";
import { AVOELINE_CERTIFICATE_ABI } from "./models/blockchain.model";

/**
 * Provider, signer and contract, built on first use rather than on import.
 *
 * They used to be module-scope constants, which meant merely *importing* this
 * file threw when ADMIN_PRIVATE_KEY was absent -- `new ethers.Wallet(undefined!)`
 * fails immediately. Nothing had to call a single method. That took down every
 * route whose import graph reached here: the certificates page, and any page
 * touching CertificateService, which now includes an attendee's own certificate
 * list. It is also why `npm run build` failed at page-data collection.
 *
 * Deferring construction means a page can read or list certificates with no
 * chain credentials configured at all, and only an actual on-chain call needs
 * them -- which is the correct division, since reading a certificate document
 * has nothing to do with the chain. The error is still loud, and still thrown,
 * at the point somebody genuinely tries to mint.
 */
let cached: { signer: ethers.Wallet; contract: ethers.Contract } | null = null;

function chain() {
  if (cached) return cached;

  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
  const privateKey = process.env.ADMIN_PRIVATE_KEY;
  const contractAddress = process.env.CERTIFICATE_CONTRACT_ADDRESS;

  const missing = [
    !rpcUrl && "POLYGON_AMOY_RPC_URL",
    !privateKey && "ADMIN_PRIVATE_KEY",
    !contractAddress && "CERTIFICATE_CONTRACT_ADDRESS",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Blockchain certificates are not configured. Missing: ${missing.join(", ")}.`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey!, provider);
  const contract = new ethers.Contract(contractAddress!, AVOELINE_CERTIFICATE_ABI, signer);

  cached = { signer, contract };
  return cached;
}

/** Whether an on-chain call can be attempted at all. */
export function isBlockchainConfigured(): boolean {
  return !!(
    process.env.POLYGON_AMOY_RPC_URL &&
    process.env.ADMIN_PRIVATE_KEY &&
    process.env.CERTIFICATE_CONTRACT_ADDRESS
  );
}

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
    const { signer, contract } = chain();
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
    const { contract } = chain();
    return await contract.hasCertificate(eventId, attendeeEmail);
  },

  /**
   * Read certificate details directly from the chain
   */
  async getCertificate(tokenId: string | number): Promise<CertificateDetails> {
    const { contract } = chain();
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
    const { contract } = chain();
    const tokenIds: bigint[] = await contract.getEventCertificates(eventId);
    return tokenIds.map((id) => id.toString());
  },

  /**
   * Revoke an issued certificate
   */
  async revokeCertificate(tokenId: string | number) {
    const { contract } = chain();
    const tx = await contract.revokeCertificate(tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }
};