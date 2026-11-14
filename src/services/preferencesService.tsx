import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { TelemetryTimeWindowSec } from '../types/telemetry';

export type UiDensity = 'comfortable' | 'compact';

export interface UserPreferences {
  bootAnimationEnabled: boolean;
  reducedMotion: boolean;
  density: UiDensity;
  defaultTimeWindowSec: TelemetryTimeWindowSec;
  startInPresentationMode: boolean;
}

const STORAGE_KEY = 'battvision.preferences.v1';

function detectSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loadPreferences(): UserPreferences {
  const defaults: UserPreferences = {
    bootAnimationEnabled: true,
    reducedMotion: detectSystemReducedMotion(),
    density: 'comfortable',
    defaultTimeWindowSec: 60,
    startInPresentationMode: false,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      bootAnimationEnabled:
        typeof parsed.bootAnimationEnabled === 'boolean'
          ? parsed.bootAnimationEnabled
          : defaults.bootAnimationEnabled,
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean'
          ? parsed.reducedMotion
          : defaults.reducedMotion,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      defaultTimeWindowSec:
        parsed.defaultTimeWindowSec === 30 ||
        parsed.defaultTimeWindowSec === 60 ||
        parsed.defaultTimeWindowSec === 300 ||
        parsed.defaultTimeWindowSec === 900
          ? parsed.defaultTimeWindowSec
          : 60,
      startInPresentationMode:
        typeof parsed.startInPresentationMode === 'boolean'
          ? parsed.startInPresentationMode
          : false,
    };
  } catch {
    return defaults;
  }
}

interface PreferencesContextValue {
  prefs: UserPreferences;
  updatePrefs: (patch: Partial<UserPreferences>) => void;
  resetPrefs: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage quota errors
    }
    const root = document.documentElement;
    root.setAttribute('data-density', prefs.density);
    root.setAttribute('data-reduced-motion', prefs.reducedMotion ? 'true' : 'false');
  }, [prefs]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      updatePrefs: (patch) => setPrefs((prev) => ({ ...prev, ...patch })),
      resetPrefs: () =>
        setPrefs({
          bootAnimationEnabled: true,
          reducedMotion: detectSystemReducedMotion(),
          density: 'comfortable',
          defaultTimeWindowSec: 60,
          startInPresentationMode: false,
        }),
    }),
    [prefs]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
