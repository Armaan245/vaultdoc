export type Theme = 'dark' | 'light' | 'system';

export interface ThemeConfig {
  mode: 'system' | 'light' | 'dark';
  lightTheme: {
    preset: string;
    accent: string;
    background: string;
    foreground: string;
    uiFont: string;
    uiFontWeight: string;
    codeFont: string;
    codeFontWeight: string;
    translucentSidebar: boolean;
    contrast: number;
  };
  darkTheme: {
    preset: string;
    accent: string;
    background: string;
    foreground: string;
    uiFont: string;
    uiFontWeight: string;
    codeFont: string;
    codeFontWeight: string;
    translucentSidebar: boolean;
    contrast: number;
  };
  preferences: {
    usePointerCursors: boolean;
    reduceMotion: 'system' | 'on' | 'off';
    uiFontSize: number;
    codeFontSize: number;
    diffMarkers: 'color' | '+/-';
  };
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'dark',
  lightTheme: {
    preset: 'Codex',
    accent: '#339CFF',
    background: '#FFFFFF',
    foreground: '#1A1C1F',
    uiFont: 'System default',
    uiFontWeight: 'Regular',
    codeFont: 'System default',
    codeFontWeight: 'Regular',
    translucentSidebar: true,
    contrast: 45
  },
  darkTheme: {
    preset: 'Codex',
    accent: '#339CFF',
    background: '#181818',
    foreground: '#FFFFFF',
    uiFont: 'System default',
    uiFontWeight: 'Regular',
    codeFont: 'System default',
    codeFontWeight: 'Regular',
    translucentSidebar: true,
    contrast: 60
  },
  preferences: {
    usePointerCursors: false,
    reduceMotion: 'system',
    uiFontSize: 14,
    codeFontSize: 12,
    diffMarkers: 'color'
  }
};

const STORAGE_KEY = 'vaultdoc_theme_config';
const LEGACY_STORAGE_KEY = 'vaultdoc_theme';

export const getStoredThemeConfig = (): ThemeConfig => {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME_CONFIG, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_THEME_CONFIG;
};

export const getStoredTheme = (): Theme => {
  const config = getStoredThemeConfig();
  return config.mode;
};

export const applyThemeConfig = (config: ThemeConfig) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Determine active visual mode
  let isDark = true;
  if (config.mode === 'light') {
    isDark = false;
  } else if (config.mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.remove('light');
    root.classList.add('dark');
    root.style.setProperty('--accent-color', config.darkTheme.accent);
    root.style.setProperty('--bg-primary', config.darkTheme.background);
    root.style.setProperty('--text-primary', config.darkTheme.foreground);
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.setProperty('--accent-color', config.lightTheme.accent);
    root.style.setProperty('--bg-primary', config.lightTheme.background);
    root.style.setProperty('--text-primary', config.lightTheme.foreground);
  }

  root.style.setProperty('--ui-font-size', `${config.preferences.uiFontSize}px`);
  root.style.setProperty('--code-font-size', `${config.preferences.codeFontSize}px`);
  
  if (config.preferences.usePointerCursors) {
    root.classList.add('use-pointer-cursors');
  } else {
    root.classList.remove('use-pointer-cursors');
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  localStorage.setItem(LEGACY_STORAGE_KEY, isDark ? 'dark' : 'light');
  window.dispatchEvent(new CustomEvent('vaultdoc_theme_config_change', { detail: config }));
  window.dispatchEvent(new Event('vaultdoc_theme_change'));
};

export const applyTheme = (theme: Theme) => {
  const config = getStoredThemeConfig();
  config.mode = theme;
  applyThemeConfig(config);
};
