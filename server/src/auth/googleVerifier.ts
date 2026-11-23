import { OAuth2Client } from "google-auth-library";
import { HttpError } from "../http/errors.js";

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

export type VerifyIdToken = (idToken: string) => Promise<GoogleIdentity>;

// Checks the token's signature, expiry and audience with Google's keys.
export function makeGoogleVerifier(clientId: string): VerifyIdToken {
  const client = new OAuth2Client();
  return async (idToken) => {
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Invalid sign-in token");
    }
    if (!payload?.sub || !payload.email) {
      throw new HttpError(401, "Invalid sign-in token");
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
    };
  };
}
