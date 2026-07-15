import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLanguageStore } from '@/shared/store/languageStore';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  afterEach(() => {
    useLanguageStore.setState({ language: 'en' });
  });

  it('renders both language options once opened', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('menuitem', { name: /english/i })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /українська/i }),
    ).toBeInTheDocument();
  });

  it('updates the store when selecting Українська', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: /українська/i }));

    expect(useLanguageStore.getState().language).toBe('uk');
  });

  it('shows the checkmark on the active language item', async () => {
    useLanguageStore.setState({ language: 'uk' });
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button'));

    const activeItem = screen.getByRole('menuitem', { name: /українська/i });
    expect(activeItem.querySelector('svg')).toBeInTheDocument();

    const inactiveItem = screen.getByRole('menuitem', { name: /english/i });
    expect(inactiveItem.querySelector('svg')).not.toBeInTheDocument();
  });
});
