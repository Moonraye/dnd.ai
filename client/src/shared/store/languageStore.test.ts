import { LANGUAGE_STORAGE_KEY, useLanguageStore } from './languageStore';

describe('languageStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useLanguageStore.setState({ language: 'en' });
  });

  it('defaults to "en" before hydration', () => {
    expect(useLanguageStore.getState().language).toBe('en');
  });

  it('persists an explicit choice under the "dundrai-language" key', () => {
    useLanguageStore.getState().setLanguage('uk');

    expect(useLanguageStore.getState().language).toBe('uk');
    const stored = JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '{}');
    expect(stored.state.language).toBe('uk');
  });

  it('restores a stored value on persist.rehydrate()', async () => {
    // Simulate a choice persisted in an earlier session by writing directly
    // to localStorage — going through `setLanguage`/`setState` would also
    // write through the persist middleware and defeat the point of the test.
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify({ state: { language: 'uk' }, version: 0 }),
    );
    expect(useLanguageStore.getState().language).toBe('en');

    await useLanguageStore.persist.rehydrate();

    expect(useLanguageStore.getState().language).toBe('uk');
  });

  it('falls back to "en" for a tampered/corrupt persisted language', async () => {
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify({ state: { language: 'fr' }, version: 0 }),
    );

    await useLanguageStore.persist.rehydrate();

    expect(useLanguageStore.getState().language).toBe('en');
  });
});
