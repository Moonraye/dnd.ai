import { AiTurnScheduler } from './ai-turn-scheduler.service';
import { COOLDOWN_MS } from '@dnd/shared';

describe('AiTurnScheduler', () => {
  let scheduler: AiTurnScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = new AiTurnScheduler();
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  const runFn = () => jest.fn().mockResolvedValue(undefined);

  it('runs immediately on the first request for a session', () => {
    const run = runFn();
    scheduler.requestEvaluation('s1', run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('defers a request arriving during the cooldown into a single trailing run', async () => {
    const first = runFn();
    const second = runFn();

    scheduler.requestEvaluation('s1', first);
    expect(first).toHaveBeenCalledTimes(1);

    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(COOLDOWN_MS / 3);
    scheduler.requestEvaluation('s1', second);
    expect(second).not.toHaveBeenCalled();

    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(COOLDOWN_MS);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('coalesces multiple mid-cooldown requests, running only the latest closure once', async () => {
    const first = runFn();
    const a = runFn();
    const b = runFn();
    const c = runFn();

    scheduler.requestEvaluation('s1', first);
    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', a);
    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', b);
    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', c);

    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(COOLDOWN_MS);

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(c).toHaveBeenCalledTimes(1);
  });

  it('runs immediately again once the cooldown has fully elapsed', async () => {
    const first = runFn();
    const second = runFn();

    scheduler.requestEvaluation('s1', first);
    await Promise.resolve(); // Flush microtasks chain
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(COOLDOWN_MS + 1);
    scheduler.requestEvaluation('s1', second);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('tracks cooldowns per session independently', () => {
    const s1 = runFn();
    const s2 = runFn();
    scheduler.requestEvaluation('s1', s1);
    scheduler.requestEvaluation('s2', s2);
    expect(s1).toHaveBeenCalledTimes(1);
    expect(s2).toHaveBeenCalledTimes(1);
  });

  it('clears pending timers on destroy', async () => {
    const first = runFn();
    const deferred = runFn();
    scheduler.requestEvaluation('s1', first);
    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', deferred);
    await Promise.resolve(); // Flush microtasks

    scheduler.onModuleDestroy();
    jest.advanceTimersByTime(COOLDOWN_MS * 2);
    expect(deferred).not.toHaveBeenCalled();
  });
});
