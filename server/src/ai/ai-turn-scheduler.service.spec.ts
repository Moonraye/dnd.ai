import { AiTurnScheduler, COOLDOWN_MS } from './ai-turn-scheduler.service';

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

  it('defers a request arriving during the cooldown into a single trailing run', () => {
    const first = runFn();
    const second = runFn();

    scheduler.requestEvaluation('s1', first);
    expect(first).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(COOLDOWN_MS / 3);
    scheduler.requestEvaluation('s1', second);
    expect(second).not.toHaveBeenCalled();

    jest.advanceTimersByTime(COOLDOWN_MS);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('coalesces multiple mid-cooldown requests, running only the latest closure once', () => {
    const first = runFn();
    const a = runFn();
    const b = runFn();
    const c = runFn();

    scheduler.requestEvaluation('s1', first);
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', a);
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', b);
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', c);

    jest.advanceTimersByTime(COOLDOWN_MS);

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(c).toHaveBeenCalledTimes(1);
  });

  it('runs immediately again once the cooldown has fully elapsed', () => {
    const first = runFn();
    const second = runFn();

    scheduler.requestEvaluation('s1', first);
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

  it('clears pending timers on destroy', () => {
    const first = runFn();
    const deferred = runFn();
    scheduler.requestEvaluation('s1', first);
    jest.advanceTimersByTime(1_000);
    scheduler.requestEvaluation('s1', deferred);

    scheduler.onModuleDestroy();
    jest.advanceTimersByTime(COOLDOWN_MS * 2);
    expect(deferred).not.toHaveBeenCalled();
  });
});
