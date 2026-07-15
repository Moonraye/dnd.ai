import { detectBrowserLanguage } from './detectLanguage';

const setNavigatorLanguages = (languages: string[] | undefined) => {
  Object.defineProperty(navigator, 'languages', {
    value: languages,
    configurable: true,
  });
};

const setNavigatorLanguage = (language: string) => {
  Object.defineProperty(navigator, 'language', {
    value: language,
    configurable: true,
  });
};

describe('detectBrowserLanguage', () => {
  afterEach(() => {
    setNavigatorLanguages(undefined);
    setNavigatorLanguage('en-US');
  });

  it('maps "uk-UA" to "uk"', () => {
    setNavigatorLanguages(undefined);
    setNavigatorLanguage('uk-UA');
    expect(detectBrowserLanguage()).toBe('uk');
  });

  it('maps "en-US" to "en"', () => {
    setNavigatorLanguages(undefined);
    setNavigatorLanguage('en-US');
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('maps "fr-FR" to "en" (unsupported locale falls back)', () => {
    setNavigatorLanguages(undefined);
    setNavigatorLanguage('fr-FR');
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('detects "uk" when navigator.languages contains a uk* entry anywhere', () => {
    setNavigatorLanguages(['fr-FR', 'de-DE', 'uk-UA']);
    expect(detectBrowserLanguage()).toBe('uk');
  });

  it('falls back to "en" when navigator is undefined', () => {
    const originalNavigator = globalThis.navigator;
    // @ts-expect-error — simulating an environment without `navigator`.
    delete globalThis.navigator;

    try {
      expect(detectBrowserLanguage()).toBe('en');
    } finally {
      globalThis.navigator = originalNavigator;
    }
  });
});
