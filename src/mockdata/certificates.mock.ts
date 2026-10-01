export const mockCertificates = [{
  "certificateId": "CERT001",
  "registrationId": "REG001",
  "userId": "U001",
  "eventId": "EVT001",
  "organizerId": "U002",
  "type": "both",
  "title": "Certificate of Completion",
  "description": "Successfully completed Advanced Flutter Workshop",
  "content": {
    "recipientName": "Ali Ahmed Khan",
    "eventTitle": "Advanced Flutter & Firebase Workshop",
    "completionDate": "2026-04-16",
    "grade": "A+",
    "duration": "14 hours",
    "issuerName": "NED University Department of CS",
    "issuerSignature": "https://storage/signatures/sig1.png",
    "uniqueId": "CERT-2026-001-001"
  },
  "digital": {
    "pdfUrl": "https://storage/certificates/CERT001.pdf",
    "templateId": "TEMPLATE_01",
    "design": {
      "backgroundColor": "#FFFFFF",
      "borderColor": "#1E3A8A",
      "logoUrl": "https://storage/logos/ned_logo.png",
      "watermark": "EVENTFLOW CERTIFIED"
    },
    "downloadCount": 3,
    "lastDownloaded": "2026-04-17T10:22:01Z"
  },
  "blockchain": {
    "minted": true,
    "network": "Polygon",
    "tokenId": "123456",
    "tokenStandard": "ERC-721",
    "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e123456789a",
    "transactionHash": "0xabc123def45678901234567890abcdef1234567890abcdef12345678901234",
    "blockNumber": 41234567,
    "gasUsed": "0.0021 MATIC",
    "metadata": {
      "ipfsHash": "QmXyz123789abc",
      "ipfsUrl": "https://ipfs.io/ipfs/QmXyz123789abc",
      "metadataJson": "https://ipfs.io/ipfs/QmXyz123789abc/metadata.json"
    },
    "verificationUrl": "https://polygonscan.com/token/0x742d35Cc6634C0532925a3b844Bc9e123456789a?a=123456",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?data=https://eventflow.com/verify/CERT001"
  },
  "validation": {
    "verificationCode": "EVT2026-001-ABC123",
    "verificationUrl": "https://eventflow.com/verify/CERT001",
    "isVerified": true,
    "verifiedBy": "U003",
    "verifiedAt": "2026-04-18T14:00:00Z",
    "verificationCount": 5
  },
  "socialSharing": {
    "sharedOnLinkedIn": true,
    "linkedInPostId": "urn:li:share:123456",
    "sharedOnTwitter": false,
    "sharedOnFacebook": false,
    "shareCount": 1
  },
  "status": "issued",
  "revokeReason": null,
  "revokedAt": null,
  "createdAt": "2026-04-16T08:00:00Z",
  "issuedAt": "2026-04-16T09:30:00Z",
  "expiresAt": "2031-04-16",
  "updatedAt": "2026-04-18T14:00:00Z"
}]