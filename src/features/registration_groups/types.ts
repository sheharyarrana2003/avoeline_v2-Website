export type RegistrationGroup = {
  id: string;
  eventId: string;
  groupName: string;
  leadRegistrationId: string | null;
  paymentStatus: string;
  paymentProofPath: string | null;
  memberIds: string[];
  createdAt: string;
};
