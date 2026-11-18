import {createHash, randomBytes} from 'node:crypto';

/** A new patient link token: 32 random bytes, base64url (43 characters). */
export function generateToken() {
  return randomBytes(32).toString('base64url');
}

/** What gets stored and looked up. The raw token is never saved or logged. */
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
