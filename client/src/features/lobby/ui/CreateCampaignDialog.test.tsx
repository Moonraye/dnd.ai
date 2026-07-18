import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateCampaignDialog } from './CreateCampaignDialog';

const replace = jest.fn();
const push = jest.fn();
let createParam: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'create' ? createParam : null),
  }),
}));

describe('CreateCampaignDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createParam = null;
  });

  it('stays closed and leaves the URL alone when ?create=1 is absent', () => {
    render(<CreateCampaignDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('auto-opens when ?create=1 is present and strips the param', () => {
    createParam = '1';
    render(<CreateCampaignDialog />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/lobby');
  });

  it('opens when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateCampaignDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
