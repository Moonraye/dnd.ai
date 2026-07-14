# Council Audit: Making the AI DM Remember (Context / Memory Fix)

> LLM Council session — 5 advisors, independent analysis + anonymized peer
> review + chairman synthesis. Subject: the AI Dungeon Master (Gemini Flash)
> repeats itself and contradicts earlier events as a session grows.

---

## The problem (grounded in code)

Current memory architecture — `server/src/ai/ai-orchestration.service.ts`,
`evaluateTurns`:

- Every AI DM turn is a **stateless** `generateContent` call. The entire context
  is rebuilt from scratch in the prompt each turn — no multi-turn conversation.
- Context per turn = (a) only the **last 15 chat messages** (`take: 15`), (b) a
  `GameStateLog` row (`activeQuests[]`, `npcRelationships{}`, one
  `campaignSummary` string), (c) character sheets (name, HP, stats, inventory).
- The model returns `messageText` + an **optional** `stateUpdate`. The system
  prompt says only include it "when the turn actually changes state," so it's
  frequently omitted. When `campaignSummary` is returned it **overwrites
  wholesale** (lossy).
- `gemini-flash-latest`, `thinkingConfig.thinkingBudget: 0`, `maxOutputTokens: 2048`.
- Mitigations already present: `AiTurnScheduler` (`ai-turn-scheduler.service.ts`)
  throttles to one evaluation per 15s per session; `AiResponseSchema` /
  `AiStateUpdateSchema` bound the output.

---

## Council Verdict

### Where the Council Agrees

- **Root cause is the WRITE path, not retrieval.** No clever read strategy helps
  when memory was never reliably stored. Two mechanisms destroy canon:
  optional `stateUpdate` (the forgetful model gatekeeps its own persistence) and
  wholesale `campaignSummary` overwrite (one sloppy turn erases the story).
- **Two distinct diseases.** _Forgetting_ = lossy write path. _Repetition_ = a
  generation problem (no anti-repetition rule; `thinkingBudget: 0` means the
  model can't self-check). A model with perfect recall still repeats if nothing
  forces it forward.
- **15 messages is too few, but widening alone won't fix it** — it's _which_
  facts are remembered (names, deaths, promises, player-authored details), not
  quantity.
- **Vector/RAG and native multi-turn chat are premature and would make it worse**
  on Flash: unbounded cost, and re-injecting the contradictions being escaped.

### Where the Council Clashes

- **How ambitious now.** Executor/Contrarian want the smallest fix that stops the
  bleeding; the Expansionist wants memory as narrative infrastructure (per-NPC
  entities, foreshadowing/open-threads table, per-character arcs, a cross-session
  campaign bible). Resolution = sequencing, not either/or.
- **Is "keep detailed context" even the goal?** The Contrarian: _"Detail is the
  enemy."_ You need **non-lossy** tokens, not more tokens.

### Blind Spots the Council Caught (peer review)

- **One Flash call can't reliably narrate creatively AND extract structured state
  every turn.** Eventually split extraction into its own pass (or restore a small
  thinking budget for the DM turn — contradicts current `thinkingBudget: 0`).
- **Append-only ledger grows unbounded** → will need eviction/summarization, but
  for the _right_ reason (bounded growth, not lossy-by-default).
- **Player-authored ledger poisoning** → facts eventually need a source tag
  (DM-canon vs player-claim).
- **No success metric** → currently no way to prove repetition/contradiction fell.
- Multiplayer row race + per-turn cost are largely **mitigated** by the existing
  15s-per-session scheduler.

### The Recommendation

Phased. Start small; keep the Expansionist's vision as the destination.

1. **Phase 1 (this week):** `stateUpdate` mandatory every turn; `campaignSummary`
   **append-only with a cap**; add append-only `keyFacts[]` for immutable canon;
   add **anti-repetition + forced-forward-motion** to the prompt; `take: 15 → 40`.
2. **Phase 2 (after validation):** split narration/extraction, ledger eviction,
   fact provenance, richer NPC/character entities.
3. **Don't build** vector/RAG or multi-turn chat yet.

### The One Thing to Do First

**Kill the amnesia:** change `campaignSummary` from wholesale-overwrite to
**append-only**, and make `stateUpdate` **mandatory** every turn — in
`applyStateLogUpdate` + `SYSTEM_INSTRUCTIONS`. Highest-leverage fix; everything
else compounds on top.

---

## Appendix: raw advisor responses

### The Contrarian

The fatal flaw isn't which retrieval strategy you pick — it's that your **write
path is lossy, so no read path can save you**. `stateUpdate` is optional and the
instruction tells the model to omit it, so the model that forgets is the sole
gatekeeper of what gets persisted — forgetting compounds. `campaignSummary`
overwrites wholesale — one sloppy turn nukes twenty turns of canon. RAG and
native multi-turn chat make this _worse_: chat grows the window unboundedly (cost
explodes on Flash, re-inherits contradictions since thinking is disabled and
Flash is unreliable over long context); RAG over past chat messages retrieves raw
banter and hallucinated narration — garbage in, retrieved garbage out. "Wants
detailed context kept" is questionable — detail is the enemy. Prove the cheap fix
fails first: mandatory `stateUpdate`, append-only event log, separate immutable
facts from mutable state. THEN talk retrieval.

### The First Principles Thinker

The repetition is not primarily a memory problem — it's a generation problem
masquerading as one. A model with perfect recall still repeats if nothing forces
divergence, and thinking is disabled so it can't check its own output. A coherent
DM needs exactly three things: (1) an immutable append-only **event ledger**; (2)
the **current world state**; (3) **open threads** (promises made, guns on the
wall). The wholesale-overwrite `campaignSummary` is the smoking gun — you delete
history every turn then ask why it forgets. Fix the overwrite first. Repetition is
separate: add an anti-repetition constraint and forced forward motion ("do not
restate these recent beats; advance an open thread"). Make `stateUpdate`
mandatory. RAG and multi-turn chat are premature — they solve "too much true
history to fit," which you don't have yet.

### The Expansionist

A rolling summary is the timid version. Treat memory as **narrative
infrastructure**, not context compression. The `GameStateLog` throws away the one
thing that makes a DM feel alive: a durable, append-only **event ledger** of
consequential beats, timestamped, never overwritten. This unlocks the magic tier:
callbacks to 40-turn-old details ("the AI remembered"); evolving NPCs (give each
NPC a row with goals, grudges, last-seen location, knowledge state); foreshadowing
via an "open threads / planted seeds" table; per-character arcs (add
backstory/bonds to sheets). Biggest prize: the ledger **persists across
sessions** — a compounding **campaign bible**, a moat no context window buys.
Structured, append-only, entity-per-row. Retrieval is a later optimization; the
durable schema is the real asset.

### The Outsider

What makes a DM feel like they remember is small, specific promises and
player-authored details — the bribed guard who nods at you six hours later, the
dead sister's name that recurs. A plot summary throws exactly that away.
Coherence breaks the instant the DM contradicts a fact you can't un-know: a killed
NPC alive again, an iron door now oak, a changed reward — trust-enders. 15
messages is obviously too few, but bumping to 50 won't fix it: the problem is
_which_ things are remembered, not quantity. A DM's memory is hard facts: names,
who's alive/dead, promises made, items given, places described, player
self-declarations — permanent, never summarized away. Repetition is the tell that
the AI can't see its own last scene; track what's been introduced and stop
reintroducing it.

### The Executor

Fix the memory leak in state first. `stateUpdate` is optional AND
`campaignSummary` overwrites wholesale — a plot-advancing turn that omits
`stateUpdate` loses the event; a turn that emits a summary blows away everything
prior. Three changes, minimal infra: (1) make `stateUpdate` mandatory and
`campaignSummary` append-not-replace ("every turn, echo running summary plus one
new sentence"), stop overwriting, cap ~1500 chars; (2) bump `take:15` to
`take:40` — Flash context is huge, 15 is starving it; (3) add
`keyFacts: string[]` to the state row (append immutable facts: names, deaths,
promises, locations). Over-engineering now: vector/RAG (single-session,
dozens-of-messages problem — premature by months) and native multi-turn chat
(throws away the clean stateless retry/replay). Ship #1 today, #2 and #3 this week.

---

## Appendix: implementation plan (recommended approach)

### Phase 1 — Stop the amnesia

- **A. Append-only summary (highest leverage).** `applyStateLogUpdate`: append
  the model's new summary sentence(s) to existing text, cap ~1500–2000 chars
  (`AiStateUpdateSchema.campaignSummary` already bounded to 2000). Stored shape
  stays `{ text }` (`game-state-log.mapper.ts`).
- **B. Append-only `keyFacts` ledger.** Add
  `keyFacts: z.array(z.string().max(200)).max(100).optional()` to
  `AiStateUpdateSchema` (`packages/shared/src/validation.ts`); add to
  `AI_RESPONSE_SCHEMA`; persist by appending (dedup, cap ~100) to a new
  `keyFacts Json` column on `GameStateLog` (Prisma migration); feed accumulated
  facts back into the prompt each turn.
- **C. Mandatory state + anti-repetition prompt.** Rewrite `SYSTEM_INSTRUCTIONS`:
  require `stateUpdate` every turn (≥ one new summary sentence + any new facts);
  add "do not restate/re-offer beats already present; advance an open thread";
  state deaths/names/promises as inviolable.
- **D. Widen window.** `take: 15 → 40` (scheduler already caps call frequency).
- **E. Read path.** Wire `keyFacts` through `game-state-log.mapper.ts`,
  `GameStateLogPayload` (`packages/shared/src/ws-events.ts`), and the
  `client/src/widgets/campaign-journal/` widget.

### Phase 2 — Reliability

- Separate narration from extraction (small thinking budget, or a second
  extraction-only call).
- Ledger cap/eviction (fold oldest facts into summary when over cap).
- Fact provenance tags (DM-canon vs player-claim) to resist injection.
- Richer per-NPC entities; `backstory`/`personality` on character sheets.

### Critical files

- `server/src/ai/ai-orchestration.service.ts` — prompt, schema, `take`,
  `applyStateLogUpdate` (append not overwrite).
- `packages/shared/src/validation.ts` — `AiStateUpdateSchema` (+`keyFacts`).
- `packages/shared/src/ws-events.ts` — `GameStateLogPayload` (+`keyFacts`).
- `server/src/ai/game-state-log.mapper.ts` — map new field.
- `server/prisma/schema.prisma` — `keyFacts Json` on `GameStateLog` (+ migration).
- `client/src/widgets/campaign-journal/` — render key facts.
- `server/src/ai/ai-orchestration.service.spec.ts` — tests.

### Verification

1. **Unit**: assert summary is appended not replaced; `keyFacts` accumulate; a
   turn omitting optional fields never erases stored canon.
2. **Manual e2e**: play 25+ messages; introduce a named NPC + a promise early;
   20+ messages later confirm the DM references them and does NOT re-introduce the
   same hook; kill an NPC and confirm it's never described alive again.
3. **Regression signal**: `campaign-journal` widget — facts/summary grow
   monotonically, never lose earlier entries.
