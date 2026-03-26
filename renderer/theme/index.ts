import { createTheme, darken, lighten } from '@mui/material/styles';

type AppThemeMode = 'light' | 'dark' | 'oled';

export const createAppTheme = (
  mode: AppThemeMode = 'dark',
  customPrimaryColor?: string,
  customSecondaryColor?: string,
  forceDialogBackdropBlur = false,
  dialogBackdropBlurIntensity = 10,
) => {
  const paletteMode = mode === 'light' ? 'light' : 'dark';
  const isOled = mode === 'oled';
  const isDark = paletteMode === 'dark';
  const backgroundDefault = isOled ? '#020202' : isDark ? '#121212' : '#f5f5f5';
  const backgroundPaper = isOled ? '#0d0d0d' : isDark ? '#1e1e1e' : '#ffffff';
  const appBarBackground = isOled ? '#090909' : isDark ? '#1f1f1f' : '#1976d2';
  const drawerBackground = isOled ? '#080808' : isDark ? '#1e1e1e' : '#ffffff';
  const darkBorder = isOled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)';
  const darkShadow = isOled ? '0 1px 8px rgba(0,0,0,0.28)' : '0 2px 10px rgba(0,0,0,0.24)';
  const defaultPrimaryMain = isOled ? '#9dc5e8' : isDark ? '#90caf9' : '#1976d2';
  const validCustomPrimary = customPrimaryColor && /^#([0-9a-f]{6})$/i.test(customPrimaryColor)
    ? customPrimaryColor
    : undefined;
  const primaryMain = validCustomPrimary || defaultPrimaryMain;
  const primaryLight = lighten(primaryMain, 0.18);
  const primaryDark = darken(primaryMain, 0.2);
  const secondaryMain = isOled ? '#c8a2d6' : isDark ? '#ce93d8' : '#9c27b0';
  const validCustomSecondary = customSecondaryColor && /^#([0-9a-f]{6})$/i.test(customSecondaryColor)
    ? customSecondaryColor
    : undefined;
  const resolvedSecondaryMain = validCustomSecondary || secondaryMain;
  const secondaryLight = lighten(resolvedSecondaryMain, 0.18);
  const secondaryDark = darken(resolvedSecondaryMain, 0.2);
  const textPrimary = isOled ? 'rgba(255, 255, 255, 0.92)' : isDark ? '#ffffff' : '#111111';
  const textSecondary = isOled ? 'rgba(255, 255, 255, 0.64)' : isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
  const blurIntensity = Math.max(0, Math.min(Math.round(dialogBackdropBlurIntensity || 0), 24));
  const backdropBaseColor = isOled
    ? 'rgba(0, 0, 0, 0.86)'
    : isDark
      ? 'rgba(12, 14, 20, 0.66)'
      : 'rgba(240, 243, 248, 0.56)';

  return createTheme({
    palette: {
      mode: paletteMode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
      },
      secondary: {
        main: resolvedSecondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      success: {
        main: '#2e7d32',
      },
      error: {
        main: '#d32f2f',
      },
      warning: {
        main: '#ed6c02',
      },
      info: {
        main: '#0288d1',
      },
    },
    typography: {
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      h4: {
        fontSize: '1.6rem',
        fontWeight: 700,
      },
      h5: {
        fontSize: '1.2rem',
        fontWeight: 700,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
        letterSpacing: 0.1,
      },
    },
    shape: {
      borderRadius: 20,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: 'none',
            backgroundColor: backgroundDefault,
            backgroundAttachment: 'fixed',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isDark ? (isOled ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.3)') : '0 1px 4px rgba(0,0,0,0.12)',
            backdropFilter: 'none',
            backgroundColor: appBarBackground,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 22,
            border: `1px solid ${isDark ? darkBorder : 'rgba(0, 0, 0, 0.08)'}`,
            boxShadow: isDark ? darkShadow : '0 1px 6px rgba(0,0,0,0.12)',
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 42,
            borderRadius: 16,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          root: {
            '& .MuiBackdrop-root': {
              backgroundColor: backdropBaseColor,
              backdropFilter: forceDialogBackdropBlur ? `blur(${blurIntensity}px)` : 'none',
              WebkitBackdropFilter: forceDialogBackdropBlur ? `blur(${blurIntensity}px)` : 'none',
            },
          },
          paper: {
            borderRadius: 24,
            backgroundImage: 'none',
            backgroundColor: backgroundPaper,
            border: `1px solid ${isDark ? darkBorder : 'rgba(0, 0, 0, 0.12)'}`,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            backgroundColor: backgroundPaper,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            backgroundColor: backgroundPaper,
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            backgroundColor: backgroundPaper,
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: backdropBaseColor,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 20,
          },
        },
      },
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: isOled ? primaryMain : undefined,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            overflow: 'hidden',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? drawerBackground : '#ffffff',
            borderRight: `1px solid ${isDark ? darkBorder : 'rgba(0, 0, 0, 0.12)'}`,
          },
        },
      },
    },
  });
};
