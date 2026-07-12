import type { GameStateLogPayload } from '@dnd/shared';
import { render, screen } from '@testing-library/react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { CampaignJournal } from './CampaignJournal';

const makeLog = (
  overrides: Partial<GameStateLogPayload> = {},
): GameStateLogPayload => ({
  sessionId: 'session-1',
  activeQuests: [],
  npcRelationships: {},
  campaignSummary: '',
  keyFacts: [],
  updatedAt: '2026-07-12T00:00:00.000Z',
  ...overrides,
});

describe('CampaignJournal', () => {
  beforeEach(() => useSessionStore.getState().reset());

  it('renders quests, NPCs, and the summary when the log is populated', () => {
    useSessionStore.getState().setStateLog(
      makeLog({
        activeQuests: ['Find the lost relic'],
        npcRelationships: { Gandalf: 'trusted ally' },
        campaignSummary: 'The party set out at dawn.',
        keyFacts: [
          { text: 'Gandalf gave the party a silver key', source: 'dm' },
          { text: 'Boromir claims noble birth', source: 'player' },
        ],
      }),
    );

    render(<CampaignJournal />);

    expect(screen.getByText('Find the lost relic')).toBeInTheDocument();
    expect(screen.getByText('Gandalf')).toBeInTheDocument();
    expect(screen.getByText('trusted ally')).toBeInTheDocument();
    expect(screen.getByText('The party set out at dawn.')).toBeInTheDocument();
    expect(
      screen.getByText('Gandalf gave the party a silver key'),
    ).toBeInTheDocument();
    // Provenance badges distinguish dm-canon from player-claims.
    expect(screen.getByText('canon')).toBeInTheDocument();
    expect(screen.getByText('claim')).toBeInTheDocument();
  });

  it('shows an empty state when there is no campaign memory yet', () => {
    useSessionStore.getState().setStateLog(null);

    render(<CampaignJournal />);

    expect(screen.getByText(/tale has yet to be written/i)).toBeInTheDocument();
  });
});
