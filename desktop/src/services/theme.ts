export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'vaultdoc_theme';

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark';
};

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event('vaultdoc_theme_change'));
};
