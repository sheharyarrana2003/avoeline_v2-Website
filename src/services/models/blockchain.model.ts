export const AVOELINE_CERTIFICATE_ABI = [
  "function mintCertificate(address to, string eventName, string attendeeName, string attendeeEmail, string eventId, string metadataURI) external returns (uint256)",
  "function batchMintCertificates(address[] recipients, string[] eventNames, string[] attendeeNames, string[] attendeeEmails, string eventId, string[] metadataURIs) external returns (uint256[])",
  "function getCertificate(uint256 tokenId) external view returns (string eventName, string attendeeName, string attendeeEmail, string eventId, uint256 issuedAt, bool isValid, string metadataURI)",
  "function hasCertificate(string eventId, string attendeeEmail) external view returns (bool)",
  "function getEventCertificates(string eventId) external view returns (uint256[])",
  "function totalCertificates() external view returns (uint256)",
  "function revokeCertificate(uint256 tokenId) external",
  "event CertificateMinted(uint256 indexed tokenId, address indexed recipient, string eventId, string attendeeEmail, uint256 timestamp)"
];