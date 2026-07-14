import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  COOLDOWN_MS,
  INITIATE_SILENCE_MS,
  MAX_UNPROMPTED_CALLS_PER_HOUR,
} from '@dnd/shared';

interface QueueTask {
  run: () => Promise<void>;
  isTargeted: boolean;
  targetId?: string;
}

interface SessionSchedule {
  /** Epoch ms of the last evaluation that actually ran. */
  lastRunAt: number;
  /** Queue of pending evaluation tasks. */
  queue: QueueTask[];
  /** Whether the queue processor is actively running. */
  running: boolean;
  /** Active timeout reference if waiting for cooldown. */
  timer?: NodeJS.Timeout;
  /** Active timeout reference for silence-triggered unprompted speech. */
  silenceTimer?: NodeJS.Timeout;
  /** Log of unprompted call timestamps in the last hour. */
  unpromptedCallTimestamps?: number[];
}

/**
 * Per-session queue and rate limiter for AI turn evaluation: a cooldown with
 * queueing for targeted messages and coalescing for public ones.
 */
@Injectable()
export class AiTurnScheduler implements OnModuleDestroy {
  private readonly logger = new Logger(AiTurnScheduler.name);
  private readonly schedules = new Map<string, SessionSchedule>();
  private silenceCallback?: (sessionId: string) => Promise<void>;

  /**
   * Request an AI turn evaluation for a session.
   */
  requestEvaluation(
    sessionId: string,
    run: () => Promise<void>,
    options?: { isTargeted?: boolean; targetId?: string },
  ): void {
    let schedule = this.schedules.get(sessionId);
    if (!schedule) {
      schedule = { lastRunAt: 0, queue: [], running: false, unpromptedCallTimestamps: [] };
      this.schedules.set(sessionId, schedule);
    }

    const isTargeted = options?.isTargeted ?? false;
    const targetId = options?.targetId;

    if (!isTargeted) {
      // Coalesce public runs to prevent burst API calls.
      const existingPublic = schedule.queue.find((t) => !t.isTargeted);
      if (existingPublic) {
        existingPublic.run = run;
      } else {
        schedule.queue.push({ run, isTargeted });
      }
    } else {
      // Targeted commands must never be dropped; queue them up.
      schedule.queue.push({ run, isTargeted, targetId });
    }

    this.resetSilenceTimer(sessionId);
    this.processQueue(sessionId);
  }

  /**
   * Register the gateway callback to fire when silence threshold is reached.
   */
  registerSilenceCallback(callback: (sessionId: string) => Promise<void>): void {
    this.silenceCallback = callback;
  }

  /**
   * Reset the inactivity silence timer for a session.
   */
  resetSilenceTimer(sessionId: string): void {
    let schedule = this.schedules.get(sessionId);
    if (!schedule) {
      schedule = { lastRunAt: 0, queue: [], running: false, unpromptedCallTimestamps: [] };
      this.schedules.set(sessionId, schedule);
    }

    if (schedule.silenceTimer) {
      clearTimeout(schedule.silenceTimer);
    }

    schedule.silenceTimer = setTimeout(() => {
      void this.triggerSilence(sessionId);
    }, INITIATE_SILENCE_MS);
  }

  /**
   * Check if a session can execute an unprompted initiation call.
   */
  canInitiateUnprompted(sessionId: string): boolean {
    const schedule = this.schedules.get(sessionId);
    if (!schedule) return true;

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    schedule.unpromptedCallTimestamps = (schedule.unpromptedCallTimestamps || [])
      .filter((ts) => ts > oneHourAgo);

    return schedule.unpromptedCallTimestamps.length < MAX_UNPROMPTED_CALLS_PER_HOUR;
  }

  /**
   * Record that an unprompted initiation call was triggered.
   */
  recordUnpromptedCall(sessionId: string): void {
    const schedule = this.schedules.get(sessionId);
    if (schedule) {
      if (!schedule.unpromptedCallTimestamps) {
        schedule.unpromptedCallTimestamps = [];
      }
      schedule.unpromptedCallTimestamps.push(Date.now());
    }
  }

  private async triggerSilence(sessionId: string): Promise<void> {
    if (this.silenceCallback) {
      try {
        await this.silenceCallback(sessionId);
      } catch (error) {
        this.logger.error(`Silence-triggered callback failed for session ${sessionId}: ${error}`);
      }
    }
    // Set timer again for periodic checks if silence persists
    this.resetSilenceTimer(sessionId);
  }

  private processQueue(sessionId: string): void {
    const schedule = this.schedules.get(sessionId);
    if (!schedule || schedule.running || schedule.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - schedule.lastRunAt;
    const delay = Math.max(COOLDOWN_MS - elapsed, 0);

    schedule.running = true;

    if (schedule.timer) {
      clearTimeout(schedule.timer);
    }

    if (delay > 0) {
      schedule.timer = setTimeout(() => {
        schedule.timer = undefined;
        schedule.running = false;
        this.runNext(sessionId);
      }, delay);
    } else {
      schedule.running = false;
      this.runNext(sessionId);
    }
  }

  private runNext(sessionId: string): void {
    const schedule = this.schedules.get(sessionId);
    if (!schedule || schedule.queue.length === 0) {
      return;
    }

    const task = schedule.queue.shift();
    if (task) {
      schedule.lastRunAt = Date.now();
      schedule.running = true;

      void task.run()
        .catch((error: unknown) => {
          this.logger.error(
            `Scheduled AI evaluation failed for session ${sessionId}: ${
              error instanceof Error ? error.stack : String(error)
            }`,
          );
        })
        .finally(() => {
          schedule.running = false;
          this.processQueue(sessionId);
        });
    }
  }

  onModuleDestroy(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.timer) clearTimeout(schedule.timer);
      if (schedule.silenceTimer) clearTimeout(schedule.silenceTimer);
    }
    this.schedules.clear();
  }
}
