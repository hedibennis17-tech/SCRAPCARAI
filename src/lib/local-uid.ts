/**
 * Generates and persists a local anonymous UID.
 * Used as a fallback when Firebase anonymous auth is unavailable.
 * Stored in sessionStorage to survive navigation but not cross-session.
 */
export function getOrCreateLocalUid(): string {
  const key = 'scrapcarai_uid';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const uid = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, uid);
    return uid;
  } catch {
    return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
