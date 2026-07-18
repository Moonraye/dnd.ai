import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Shallow liveness check — no DB round trip. Render's health checker and the
 * client's wake-up/wait-room poll only need to know the process is up past
 * cold start; a DB check would add latency and a second failure mode (DB
 * down but server up) that would misreport "still asleep".
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
