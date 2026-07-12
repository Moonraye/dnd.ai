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
  return name.includes('dungeon master') || name.includes('dm');
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
