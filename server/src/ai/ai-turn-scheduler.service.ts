import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

/**
 * Minimum gap between AI turn evaluations for a single session. Every chat
 * message and dice roll would otherwise fire a paid Gemini call; this throttles
 * bursts down to at most one evaluation per window per session.
 */
export const COOLDOWN_MS = 15_000;

interface SessionSchedule {
  /** Epoch ms of the last evaluation that actually ran. */
  lastRunAt: number;
  /** A single deferred evaluation queued during the cooldown, if any. */
  pending?: NodeJS.Timeout;
}

/**
 * Per-session rate limiter for AI turn evaluation: a cooldown with trailing
 * debounce. The first request runs immediately; requests arriving during the
 * cooldown coalesce into ONE deferred run at cooldown expiry, always executing
 * the most recent closure so the AI responds to the latest game state rather
 * than going silent.
 *
 * State is in-memory — acceptable while the app is single-instance (see
 * AUDIT KLUDGE-3). A Redis-backed limiter is the Phase 6 scale-out story.
 */
@Injectable()
export class AiTurnScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(AiTurnScheduler.name);
  private readonly schedules = new Map<string, SessionSchedule>();

  /**
   * Request an AI turn evaluation for a session. Runs `run` now if the cooldown
   * has elapsed and nothing is queued; otherwise defers a single trailing run.
   */
  requestEvaluation(sessionId: string, run: () => Promise<void>): void {
    const now = Date.now();
    const schedule = this.schedules.get(sessionId);

    if (!schedule) {
      this.runNow(sessionId, run);
      return;
    }

    const elapsed = now - schedule.lastRunAt;
    if (elapsed >= COOLDOWN_MS && !schedule.pending) {
      this.runNow(sessionId, run);
      return;
    }

    // Within cooldown (or a run is already queued): remember the latest closure
    // and ensure exactly one trailing timer is armed.
    const delay = Math.max(COOLDOWN_MS - elapsed, 0);
    if (schedule.pending) {
      clearTimeout(schedule.pending);
    }
    schedule.pending = setTimeout(() => {
      schedule.pending = undefined;
      this.runNow(sessionId, run);
    }, delay);
  }

  private runNow(sessionId: string, run: () => Promise<void>): void {
    const schedule = this.schedules.get(sessionId) ?? { lastRunAt: 0 };
    schedule.lastRunAt = Date.now();
    this.schedules.set(sessionId, schedule);

    void run().catch((error: unknown) => {
      this.logger.error(
        `Scheduled AI evaluation failed for session ${sessionId}: ${
          error instanceof Error ? error.stack : String(error)
        }`,
      );
    });
  }

  onModuleDestroy(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.pending) clearTimeout(schedule.pending);
    }
    this.schedules.clear();
  }
}
