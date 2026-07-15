'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CharacterCreationForm,
  useMyCharacter,
} from '@/features/character-sheet';
import { DiceRollerPanel, useRollDice } from '@/features/dice-roller';
import { ChatInput, ChatWindow, useSessionSocket } from '@/features/session-chat';
import { ThemeToggle } from '@/features/theme';
import { useTranslation, type Dictionary } from '@/shared/i18n';
import { useAuthStore } from '@/shared/store/authStore';
import type { JoinStatus } from '@/shared/store/sessionStore';
import {
  Badge,
  Button,
  buttonVariants,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { CharacterHud } from '@/widgets/character-hud';
import { CampaignJournal } from '@/widgets/campaign-journal';
import { SessionRail } from '@/widgets/session-rail';

interface SessionPageProps {
  sessionId: string;
}

function ConnectionPill({ status, t }: { status: JoinStatus; t: Dictionary }) {
  if (status === 'joined') return <Badge variant="success">{t.session.connected}</Badge>;
  if (status === 'error') return <Badge variant="danger">{t.session.disconnected}</Badge>;
  return <Badge variant="warning">{t.session.connecting}</Badge>;
}

export function SessionPage({ sessionId }: SessionPageProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const { session, messages, joinStatus, joinError, retry } =
    useSessionSocket(sessionId);
  const { myCharacter, isKnown } = useMyCharacter();
  const { roll } = useRollDice(sessionId);
  const [diceOpen, setDiceOpen] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  if (authStatus === 'loading') {
    return (
      <main className="flex h-dvh flex-col">
        <div className="h-14 border-b border-border" />
        <div className="flex-1 animate-pulse bg-bg-subtle/40" />
      </main>
    );
  }

  if (authStatus !== 'authenticated') return null;

  const needsCharacter = isKnown && !myCharacter;
  const disabled = joinStatus !== 'joined';

  // Character-creation gate — forge your hero before taking a seat.
  if (needsCharacter) {
    return (
      <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />
        </div>
        <div className="w-full max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
            {t.session.beforeYouTakeYourSeat}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">
            {t.session.forgeYourHero}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {t.session.forgeYourHeroSubtitle}
          </p>
          <div className="mt-8">
            <CharacterCreationForm sessionId={sessionId} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col">
      {/* Immersive session header */}
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 font-display text-lg font-semibold tracking-tight text-fg transition-colors hover:text-primary"
          >
            DunDrAI
          </Link>
          <span aria-hidden className="text-fg-subtle">
            /
          </span>
          <h1 className="truncate font-display text-base font-medium text-fg">
            {session?.title ?? t.session.loadingTitle}
          </h1>
          <ConnectionPill status={joinStatus} t={t} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Party drawer trigger — below xl, where the rail is hidden. */}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="secondary" size="sm" className="xl:hidden">
                {t.session.party}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerTitle className="font-display text-lg text-fg">
                {t.session.theParty}
              </DrawerTitle>
              <SessionRail sessionId={sessionId} />
            </DrawerContent>
          </Drawer>
          <ThemeToggle />
          <Link
            href="/lobby"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {t.session.leave}
          </Link>
        </div>
      </header>

      {joinStatus === 'error' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/30 bg-danger/5 px-4 py-2">
          <p role="alert" className="text-sm text-danger">
            {joinError || t.session.unableToConnect}
          </p>
          <Button variant="danger" size="sm" onClick={retry}>
            {t.session.retryConnection}
          </Button>
        </div>
      ) : null}

      {/* Table: rail | center | right (progressively disclosed) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_20rem] xl:grid-cols-[15rem_1fr_22rem]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-border p-5 xl:block">
          <SessionRail sessionId={sessionId} />
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
            <ChatWindow messages={messages} />
            {diceOpen ? (
              <DiceRollerPanel sessionId={sessionId} disabled={disabled} />
            ) : null}
            <ChatInput
              sessionId={sessionId}
              disabled={disabled}
              onRollCommand={roll}
              diceOpen={diceOpen}
              onToggleDice={() => setDiceOpen((open) => !open)}
            />
          </div>

          {/* Mobile toolbar — Sheet/Journal below md; Party comes via header. */}
          <div className="flex gap-2 border-t border-border p-2 md:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary" size="sm" className="flex-1">
                  {t.session.sheet}
                </Button>
              </DrawerTrigger>
              <DrawerContent side="bottom">
                <DrawerTitle className="font-display text-lg text-fg">
                  {t.session.character}
                </DrawerTitle>
                <CharacterHud sessionId={sessionId} />
              </DrawerContent>
            </Drawer>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="secondary" size="sm" className="flex-1">
                  {t.session.journal}
                </Button>
              </DrawerTrigger>
              <DrawerContent side="bottom">
                <DrawerTitle className="font-display text-lg text-fg">
                  {t.session.campaignJournal}
                </DrawerTitle>
                <CampaignJournal />
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col overflow-hidden border-l border-border p-5 md:flex">
          <Tabs defaultValue="sheet" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="sheet">{t.session.sheet}</TabsTrigger>
              <TabsTrigger value="journal">{t.session.journal}</TabsTrigger>
            </TabsList>
            <TabsContent
              value="sheet"
              className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
            >
              <CharacterHud sessionId={sessionId} />
            </TabsContent>
            <TabsContent
              value="journal"
              className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
            >
              <CampaignJournal />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </main>
  );
}
