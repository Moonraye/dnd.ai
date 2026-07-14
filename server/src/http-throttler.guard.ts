import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Global throttler scoped to HTTP requests. `@nestjs/throttler` reads the
 * request/response off the HTTP context, so letting the APP_GUARD run for
 * `GameSessionGateway`'s WS contexts would misbehave — the gateway enforces
 * its own per-socket rate limiting instead.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return Promise.resolve(true);
    return super.canActivate(context);
  }
}
