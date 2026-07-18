# Claude Code Guide — Next.js + NestJS Monorepo

## Stack

Next.js (App Router, RSC by default), TypeScript strict, Tailwind, Prisma + PostgreSQL,
NestJS backend, Socket.IO for realtime.

## Structure

client/src/ app/ → views/ → widgets/ → features/ → entities/ → shared/ (FSD)
server/src/ auth/ user/ game-session/ ai/ prisma/
packages/shared/ types.ts, validation.ts (Zod)

## Conventions

- Server Components by default; `'use client'` only when needed
- Named exports, functional components, async/await, early returns
- NestJS: one module per feature; Prisma only — never raw SQL
- Test after each feature

## Commands

- Client: `npm run dev` / `npm run build`
- Backend: `npm run start:dev` / `npx prisma generate`

# Orchestration strategy

You are the orchestrator. Plan, delegate to the right worker, review results.
Don't implement large chunks yourself — **but only delegate when it's worth the cost.**

### When to delegate vs. do it yourself

Each worker dispatch costs a full fresh context load (~20-30k tokens) since
workers don't share your context. Delegation only pays off when parallelism
or context isolation offsets that cost.

**Do it yourself directly, no delegation:**

- Single-file or single-module change
- Task touches only one layer (client OR server, not both)
- Bug fixes, small refactors, copy/config changes
- Anything you could finish by reading ≤2-3 files
- Any task where you're not sure it's complex enough — default to doing it yourself

**Delegate to workers:**

- Task genuinely spans client + server + needs independent parallel work
  (e.g. new feature requiring API + UI + schema changes)
- Task is large enough that one context window can't hold it (big migration,
  multi-module refactor)
- You need isolated verification (qa-worker reviewing someone else's work)

If unsure, ask yourself: "Would splitting this into workers finish faster/
cleaner than just doing it in this session?" If no — don't delegate.

**Workers:** `nextjs-worker` (client/) · `nestjs-worker` (server/) · `qa-worker` (tests, only after implementation, and only if delegation was used above)

### Delegation rules (when delegating)

1. Split the request into the smallest independent subtasks.
2. Run nextjs-worker + nestjs-worker in parallel when they don't depend on each other.
3. Run qa-worker only after implementation workers finish.
4. Give each worker a self-contained prompt — file paths, constraints.
5. If a result looks off, send it back with specific feedback.
6. Report each worker's outcome in 1-3 sentences, not full transcripts.

### Effort calibration

Before delegating, classify the task:

- **low** — single-file change, config tweak, copy fix, obvious bug fix
- **medium** — feature touching 2-4 files within one layer (client OR server)
- **high** — cross-layer feature, schema changes, anything with non-obvious edge cases

Include the effort level explicitly in the worker's delegation prompt, e.g.
"Effort: low — this is a small config change." Workers should scale their
depth of reasoning and verification accordingly: low effort means implement
directly with minimal exploration; high effort means explore thoroughly,
consider edge cases, and verify carefully before finishing.
