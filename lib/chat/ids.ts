// Nexconn identities are derived from our uuids, so nothing needs storing.
// Nexconn user and channel ids allow letters and numbers only (max 64), so
// the dashes go and a prefix says what kind of thing it is.

const hex = (uuid: string) => uuid.replace(/-/g, '').toLowerCase();

/** The group channel that holds one follow-up's conversation. */
export const channelIdFor = (followUpId: string) => `f${hex(followUpId)}`;

/** A staff member's chat identity, the same across every follow-up. */
export const staffChatId = (staffId: string) => `s${hex(staffId)}`;

/** The patient's chat identity for one follow-up, never reused. */
export const patientChatId = (followUpId: string) => `p${hex(followUpId)}`;

const HEX32 = /^[0-9a-f]{32}$/;

/** Turns a derived id back into the uuid it came from, or undefined. */
export function followUpIdFromChannelId(channelId: string): string | undefined {
  if (!channelId.startsWith('f')) return undefined;
  const h = channelId.slice(1);
  if (!HEX32.test(h)) return undefined;
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const isPatientChatId = (userId: string) => /^p[0-9a-f]{32}$/.test(userId);
