/**
 * Per-session role caps (COUNCIL-AUDIT Phase 2 follow-up): a session hosts at
 * most one AI Dungeon Master and a party of up to five players. "Players" are
 * all non-DM sheets — human players and AI companions counted together.
 */
export const MAX_DMS_PER_SESSION = 1;
export const MAX_PLAYERS_PER_SESSION = 5;

/**
 * Whether a sheet is the AI Dungeon Master. Mirrors the AI orchestrator's DM
 * detection (name contains "dm"/"dungeon master") but gated on being AI-driven,
 * so a human whose name merely contains those letters is never counted as DM.
 */
export function isDungeonMasterSheet(sheet: {
  name: string;
  aiProvider: string | null;
}): boolean {
  if (sheet.aiProvider === null) return false;
  const name = sheet.name.toLowerCase();
  // Word-bounded so free-text companion names like "Edmund" or "Handmaiden"
  // (which contain "dm") are never counted as the Dungeon Master.
  return /\bdungeon master\b/.test(name) || /\bdm\b/.test(name);
}

/** Count DMs and players (non-DM sheets) among a session's character sheets. */
export function countSessionRoles(
  sheets: Array<{ name: string; aiProvider: string | null }>,
): { dms: number; players: number } {
  let dms = 0;
  for (const sheet of sheets) {
    if (isDungeonMasterSheet(sheet)) dms += 1;
  }
  return { dms, players: sheets.length - dms };
}

/**
 * Phase C: Interactivity Limits
 */
export const BANTER_MAX_HOPS = 1;
export const INITIATE_SILENCE_MS = 180_000; // 3 minutes
export const MAX_UNPROMPTED_CALLS_PER_HOUR = 10;
export const COOLDOWN_MS = 15_000;
