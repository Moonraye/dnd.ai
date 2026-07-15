import { render, screen } from '@testing-library/react';
import type { SessionSummary } from '@dnd/shared';
import { CampaignCard } from './CampaignCard';

const baseLobby: SessionSummary = {
  id: 'lobby-uuid',
  title: 'The Sunless Citadel',
  creatorId: 'user-uuid',
  status: 'LOBBY',
  createdAt: '2026-07-10T12:00:00.000Z',
  language: 'en',
};

describe('CampaignCard', () => {
  it('shows an EN badge for an English-language campaign', () => {
    render(<CampaignCard lobby={baseLobby} />);
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('shows a УКР badge for a Ukrainian-language campaign', () => {
    render(<CampaignCard lobby={{ ...baseLobby, language: 'uk' }} />);
    expect(screen.getByText('УКР')).toBeInTheDocument();
  });
});
