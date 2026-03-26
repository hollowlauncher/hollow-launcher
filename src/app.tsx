import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, CssBaseline, GlobalStyles, ThemeProvider, Typography } from '@mui/material';
import { createAppTheme } from './theme';
import Layout from './components/Layout';
import HyperBarOverlay from './components/HyperBarOverlay';
import LoadingScreen from './components/LoadingScreen';
import { useStore } from './store';
import { useInitialize } from './hooks/useInitialize';

type AppThemeMode = 'light' | 'dark' | 'oled';

interface AppProps {
  overlayMode?: boolean;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

export default function App({ overlayMode = false }: AppProps) {
  const { settings } = useStore();
  const [themeMode, setThemeMode] = useState<AppThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  const { isInitializing, progress, message } = useInitialize();

  useEffect(() => {
    setMounted(true);
    if (settings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(isDark ? 'dark' : 'light');
    } else {
      setThemeMode(settings.theme);
    }
    document.documentElement.lang = settings.language || 'en';
  }, [settings.theme, settings.language]);

  useEffect(() => {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke) {
      return;
    }

    const resolvedTopbarTheme = settings.windowTopbarTheme === 'match'
      ? (themeMode === 'light' ? 'light' : 'dark')
      : (settings.windowTopbarTheme || 'match');

    void invoke('set_window_theme', { theme: resolvedTopbarTheme }).catch(() => {
      // Best effort: unsupported platforms or shells can ignore this safely.
    });
  }, [settings.windowTopbarTheme, themeMode]);

  const theme = createAppTheme(
    themeMode,
    settings.primaryColor,
    settings.secondaryColor,
    settings.forceDialogBackdropBlur,
    settings.dialogBackdropBlurIntensity,
  );

  const overlayLoadingState = (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 1.5,
        background: 'transparent',
      }}
    >
      <CircularProgress size={30} />
      <Typography variant="body2" color="text.secondary">
        {isInitializing ? message : 'Preparing HyperBar overlay...'}
      </Typography>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {overlayMode && (
        <GlobalStyles
          styles={{
            html: { background: 'transparent' },
            body: { background: 'transparent' },
            '#__next': { background: 'transparent' },
          }}
        />
      )}
      {!mounted ? (
        overlayMode ? (
          overlayLoadingState
        ) : (
          <LoadingScreen
            title="Starting HollowLauncher"
            message="Loading theme, restoring preferences, and preparing the interface."
          />
        )
      ) : isInitializing ? (
        overlayMode ? (
          overlayLoadingState
        ) : (
          <LoadingScreen
            title="Preparing HollowLauncher"
            message={message}
            progress={progress}
          />
        )
      ) : (
        overlayMode
          ? (
            settings.hyperBarEnabled
              ? <HyperBarOverlay />
              : (
                <Box
                  sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    px: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    HyperBar is disabled in Settings - Developer Options.
                  </Typography>
                </Box>
              )
          )
          : <Layout />
      )}
    </ThemeProvider>
  );
}
