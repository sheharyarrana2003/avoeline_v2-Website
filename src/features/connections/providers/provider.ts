import type { ConnectionCapability, ConnectionSendInput, ConnectionSendResult } from "../types";

export type OAuthStartParams = {
  state: string;
  codeChallenge: string;
  scopes: string[];
  loginHint?: string;
  redirectUri: string;
  clientId: string;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiryMs: number;
  idToken?: string;
  scope?: string;
};

export type VerifiedIdToken = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  /** Google Workspace hosted domain claim — present for Workspace accounts. */
  hd?: string;
};

export interface OAuthProvider {
  buildAuthorizeUrl(params: OAuthStartParams): string;
  exchangeCode(opts: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
  }): Promise<OAuthTokenSet>;
  refreshAccessToken(opts: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ accessToken: string; expiryMs: number }>;
  verifyIdToken(idToken: string, clientId: string): Promise<VerifiedIdToken>;
  revokeToken(token: string, clientId: string): Promise<void>;
}

export interface EmailSender {
  send(
    accessToken: string,
    input: ConnectionSendInput & { fromEmail: string; fromName?: string | null },
  ): Promise<ConnectionSendResult>;
}

export type ProviderCapabilityMap = Partial<Record<ConnectionCapability, boolean>>;
