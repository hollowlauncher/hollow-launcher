import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Hub as HyperBarIcon,
  Keyboard as KeystrokesIcon,
  Map as MinimapIcon,
  MonitorHeart as FpsIcon,
  NearMe as DirectionIcon,
  NetworkPing as PingIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Shield as ArmorIcon,
  Straighten as YawIcon,
  ViewInAr as CoordsIcon,
  ZoomIn as ZoomIcon,
  Refresh as RefreshIcon,
  FolderOpen as FolderOpenIcon,
  Cloud as WeatherIcon,
  Palette as ColorIcon,
  Visibility as HudEnabledIcon,
  WbSunny as FullbrightIcon,
} from '@mui/icons-material';
import { api } from '../api/client';
import {
  buildHudConfig,
  defaultHudCustomization,
  defaultWidgetVisibility,
  deriveHudCustomization,
  deriveWidgetVisibility,
  parseHexColor,
  widgetControls,
} from './hyperBarConfig';
import { useHyperBarSocket } from '../hooks/useHyperBarSocket';
import { useStore } from '../store';
import { formatDateTime } from '../utils/locale';
import {
  HyperBarCommand,
  HyperBarConnectionInfo,
  HyperBarWeather,
  HyperBarWidgetId,
} from '../../../shared/types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

const widgetIcons: Record<HyperBarWidgetId, typeof FpsIcon> = {
  fps: FpsIcon,
  ping: PingIcon,
  coords: CoordsIcon,
  direction: DirectionIcon,
  yaw: YawIcon,
  keystrokes: KeystrokesIcon,
  armorHud: ArmorIcon,
  minimap: MinimapIcon,
};

type VisualControlId = 'hudEnabled' | 'fullbright' | 'zoom' | 'fogColor' | 'outlineColor' | 'weather';
type VisualSettingsOverride = Partial<{
  hudEnabled: boolean;
  zoomEnabled: boolean;
  fogEnabled: boolean;
  outlineEnabled: boolean;
  weatherEnabled: boolean;
  fogColor: string;
  outlineColor: string;
  zoomLevel: string;
  weather: HyperBarWeather;
  fullbright: boolean;
  zoomKeybind: string;
  scrollbarZooming: boolean;
}>;

const visualControls: Array<{ id: VisualControlId; label: string; icon: typeof ZoomIcon; category: string }> = [
  { id: 'hudEnabled', label: 'HUD Enabled', icon: HudEnabledIcon, category: 'Global' },
  { id: 'fullbright', label: 'Fullbright', icon: FullbrightIcon, category: 'Global' },
  { id: 'zoom', label: 'Zoom', icon: ZoomIcon, category: 'Visuals' },
  { id: 'fogColor', label: 'Fog Color', icon: ColorIcon, category: 'Visuals' },
  { id: 'outlineColor', label: 'Outline Color', icon: ColorIcon, category: 'Visuals' },
  { id: 'weather', label: 'Weather', icon: WeatherIcon, category: 'Visuals' },
];

const textPlaceholders = ['{fps}', '{x}', '{y}', '{z}', '{ping}', '{biome}', '{yaw}', '{pitch}', '{direction}', '{cps}'];

function normalizeKeybindValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }

  return trimmed
    .replace(/\s+/g, '')
    .replace(/^Key([A-Z])$/, '$1')
    .replace(/^Digit([0-9])$/, '$1');
}

function keybindFromEvent(event: KeyboardEvent) {
  return normalizeKeybindValue(event.code || event.key || '');
}

function formatKeybindLabel(value: string) {
  const normalized = normalizeKeybindValue(value);
  if (!normalized) {
    return 'Not set';
  }

  const specialLabels: Record<string, string> = {
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    Space: 'Space',
    Escape: 'Escape',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
  };

  return specialLabels[normalized] || normalized;
}

function matchesKeybind(value: string, event: KeyboardEvent) {
  const normalized = normalizeKeybindValue(value);
  return !!normalized && (
    normalized === normalizeKeybindValue(event.code || '')
    || normalized === normalizeKeybindValue(event.key || '')
  );
}

function keybindFromVirtualKey(vkCode: number) {
  if (vkCode >= 0x41 && vkCode <= 0x5A) {
    return String.fromCharCode(vkCode);
  }

  if (vkCode >= 0x30 && vkCode <= 0x39) {
    return String.fromCharCode(vkCode);
  }

  const special: Record<number, string> = {
    0x08: 'Backspace',
    0x09: 'Tab',
    0x0D: 'Enter',
    0x1B: 'Escape',
    0x20: 'Space',
    0xA0: 'ShiftLeft',
    0xA1: 'ShiftRight',
    0xA2: 'ControlLeft',
    0xA3: 'ControlRight',
    0xA4: 'AltLeft',
    0xA5: 'AltRight',
  };

  return special[vkCode] || '';
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

async function hideOverlayWindow() {
  const invoke = window.__TAURI_INTERNALS__?.invoke;
  if (invoke) {
    await invoke('set_hyperbar_overlay_interactive', { interactive: false });
  }
}

export default function HyperBarOverlay() {
  const theme = useTheme();
  const { selectedInstanceId, settings, launchState, instances } = useStore();
  const [hyperBarConnection, setHyperBarConnection] = useState<HyperBarConnectionInfo | null>(null);
  const [hyperBarError, setHyperBarError] = useState<string | null>(null);
  const [hyperBarNotice, setHyperBarNotice] = useState<string | null>(null);
  const [widgetVisibility, setWidgetVisibility] = useState<Record<HyperBarWidgetId, boolean>>(defaultWidgetVisibility);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [outlineEnabled, setOutlineEnabled] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [fogColor, setFogColor] = useState('');
  const [outlineColor, setOutlineColor] = useState('');
  const [zoomLevel, setZoomLevel] = useState('1');
  const [weather, setWeather] = useState<HyperBarWeather>('default');
  const [fullbright, setFullbright] = useState(false);
  const [zoomKeybind, setZoomKeybind] = useState('');
  const [scrollbarZooming, setScrollbarZooming] = useState(false);
  const [textSettings, setTextSettings] = useState(defaultHudCustomization.texts);
  const [keystrokesSettings, setKeystrokesSettings] = useState(defaultHudCustomization.keystrokes);
  const [armorHudSettings, setArmorHudSettings] = useState(defaultHudCustomization.armorHud);
  const [minimapSettings, setMinimapSettings] = useState(defaultHudCustomization.minimap);
  const [menuOpen, setMenuOpen] = useState(true);
  const [visualDialogOpen, setVisualDialogOpen] = useState(false);
  const [activeVisualCard, setActiveVisualCard] = useState<VisualControlId | null>(null);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [activeWidgetCard, setActiveWidgetCard] = useState<HyperBarWidgetId | null>(null);
  const [isCapturingZoomKeybind, setIsCapturingZoomKeybind] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCardCategory, setSelectedCardCategory] = useState('all');
  const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId);
  const {
    status: hyperBarSocketStatus,
    syncState,
    lastMessageAt: hyperBarLastMessageAt,
    error: hyperBarSocketError,
    sendCommand: sendHyperBarCommand,
    reconnect: reconnectHyperBar,
  } = useHyperBarSocket(hyperBarConnection?.wsUrl);
  const activeWidgetControl = useMemo(
    () => widgetControls.find((item) => item.widget === activeWidgetCard) || null,
    [activeWidgetCard],
  );
  const activeVisualControl = useMemo(
    () => visualControls.find((item) => item.id === activeVisualCard) || null,
    [activeVisualCard],
  );
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const cardCategories = useMemo(
    () => ['all', ...Array.from(new Set([
      ...widgetControls.map((control) => control.category),
      ...visualControls.map((control) => control.category),
    ]))],
    [],
  );
  const filteredWidgetControls = useMemo(
    () => widgetControls.filter((control) => {
      const matchesSearch = !normalizedSearchTerm || [
        control.label,
        control.category,
        control.widget,
      ].some((value) => value.toLowerCase().includes(normalizedSearchTerm));
      const matchesCategory = selectedCardCategory === 'all' || control.category === selectedCardCategory;
      return matchesSearch && matchesCategory;
    }),
    [normalizedSearchTerm, selectedCardCategory],
  );
  const filteredVisualControls = useMemo(
    () => visualControls.filter((control) => {
      const matchesSearch = !normalizedSearchTerm || [
        control.label,
        control.category,
        control.id,
      ].some((value) => value.toLowerCase().includes(normalizedSearchTerm));
      const matchesCategory = selectedCardCategory === 'all' || control.category === selectedCardCategory;
      return matchesSearch && matchesCategory;
    }),
    [normalizedSearchTerm, selectedCardCategory],
  );

  const triggerZoomHotkey = useCallback(() => {
    const nextZoomEnabled = !zoomEnabled;
    setZoomEnabled(nextZoomEnabled);

    const currentLevel = Number(zoomLevel);
    const sendZoomCommand = nextZoomEnabled
      ? { type: 'zoom', level: Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : 2 }
      : { type: 'zoom', level: 1 };

    if (!sendHyperBarCommand(sendZoomCommand as HyperBarCommand)) {
      setHyperBarNotice('Hyper socket is not connected yet.');
      return;
    }

    const parsedZoom = Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : 2;
    sendHyperBarCommand({
      type: 'settings',
      hudEnabled,
      fogColor: fogEnabled ? fogColor || undefined : undefined,
      outlineColor: outlineEnabled ? outlineColor || undefined : undefined,
      zoomLevel: nextZoomEnabled ? parsedZoom : 1,
      weather: weatherEnabled ? weather : 'default',
      fullbright,
      zoomKeybind: normalizeKeybindValue(zoomKeybind) || undefined,
      scrollbarZooming,
    });
    setHyperBarNotice(`Zoom ${nextZoomEnabled ? 'enabled' : 'disabled'} via keybind.`);
  }, [
    fogColor,
    fogEnabled,
    fullbright,
    hudEnabled,
    outlineColor,
    outlineEnabled,
    scrollbarZooming,
    sendHyperBarCommand,
    weather,
    weatherEnabled,
    zoomEnabled,
    zoomKeybind,
    zoomLevel,
  ]);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        void hideOverlayWindow();
        return;
      }

      if (isCapturingZoomKeybind) {
        return;
      }

      if (event.repeat || isTypingTarget(event.target)) {
        return;
      }

      if (matchesKeybind(zoomKeybind, event)) {
        event.preventDefault();
        triggerZoomHotkey();
      }
    };

    const handleWindowFocus = () => {
      setMenuOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [
    isCapturingZoomKeybind,
    zoomKeybind,
    triggerZoomHotkey,
  ]);

  useEffect(() => {
    const handleGlobalKeyUp = (event: Event) => {
      if (menuOpen || isCapturingZoomKeybind) {
        return;
      }

      const detail = (event as CustomEvent<{ vkCode?: number }>).detail;
      const vkCode = detail?.vkCode;
      if (typeof vkCode !== 'number') {
        return;
      }

      const keybind = keybindFromVirtualKey(vkCode);
      if (!keybind || normalizeKeybindValue(keybind) !== normalizeKeybindValue(zoomKeybind)) {
        return;
      }

      triggerZoomHotkey();
    };

    window.addEventListener('hyperbar-global-keyup', handleGlobalKeyUp as EventListener);

    return () => {
      window.removeEventListener('hyperbar-global-keyup', handleGlobalKeyUp as EventListener);
    };
  }, [isCapturingZoomKeybind, menuOpen, triggerZoomHotkey, zoomKeybind]);

  useEffect(() => {
    if (!isCapturingZoomKeybind) {
      return;
    }

    const handleZoomCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const keyName = keybindFromEvent(event);
      setZoomKeybind(keyName);
      setIsCapturingZoomKeybind(false);
      setHyperBarNotice(`Zoom keybind set to ${formatKeybindLabel(keyName)}`);
    };

    window.addEventListener('keydown', handleZoomCapture, true);

    return () => {
      window.removeEventListener('keydown', handleZoomCapture, true);
    };
  }, [isCapturingZoomKeybind]);

  useEffect(() => {
    if (!selectedInstanceId) {
      setHyperBarConnection(null);
      setHyperBarError('Select a Minecraft instance in the launcher first.');
      return;
    }

    let cancelled = false;

    const loadConnection = async () => {
      try {
        const connection = await api.getHyperBarConnection(selectedInstanceId, 500);
        if (!cancelled) {
          setHyperBarConnection(connection);
          setHyperBarError(connection.found ? null : 'Waiting for Hyper to print its WebSocket address to latest.log.');
        }
      } catch (error: any) {
        if (!cancelled) {
          setHyperBarError(error.message || 'Failed to inspect Hyper logs.');
        }
      }
    };

    void loadConnection();
    const interval = window.setInterval(() => {
      void loadConnection();
    }, launchState === 'running' || launchState === 'launching' ? 2500 : 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedInstanceId, launchState]);

  useEffect(() => {
    if (!syncState) {
      return;
    }

    const nextCustomization = deriveHudCustomization(syncState);
    const nextFogColor = parseHexColor(syncState.fogColor);
    const nextOutlineColor = parseHexColor(syncState.outlineColor);
    setWidgetVisibility(deriveWidgetVisibility(syncState));
    setHudEnabled(syncState.guiEnabled);
    setFogColor(nextFogColor);
    setOutlineColor(nextOutlineColor);
    setZoomLevel(String(syncState.zoomLevel));
    setWeather(syncState.weather);
    setFullbright(syncState.fullbright);
    setZoomEnabled(syncState.zoomLevel > 1);
    setFogEnabled(!!nextFogColor);
    setOutlineEnabled(!!nextOutlineColor);
    setWeatherEnabled(syncState.weather !== 'default');
    setZoomKeybind(normalizeKeybindValue(syncState.zoomKeybind || ''));
    setScrollbarZooming(syncState.scrollbarZooming ?? false);
    setTextSettings(nextCustomization.texts);
    setKeystrokesSettings(nextCustomization.keystrokes);
    setArmorHudSettings(nextCustomization.armorHud);
    setMinimapSettings(nextCustomization.minimap);
  }, [syncState]);

  const handleSendLiveCommand = (command: HyperBarCommand, successMessage: string) => {
    setHyperBarError(null);

    if (!sendHyperBarCommand(command)) {
      setHyperBarNotice('Hyper socket is not connected yet.');
      return false;
    }

    setHyperBarNotice(successMessage);
    return true;
  };

  const pushHudLayout = (nextVisibility = widgetVisibility) => {
    return handleSendLiveCommand(
      {
        type: 'hud_update',
        config: buildHudConfig(nextVisibility, {
          texts: textSettings,
          keystrokes: keystrokesSettings,
          armorHud: armorHudSettings,
          minimap: minimapSettings,
        }),
      },
      'HUD layout sent to Hyper.',
    );
  };

  const handleWidgetToggle = (widget: HyperBarWidgetId, enabled: boolean) => {
    const nextVisibility = {
      ...widgetVisibility,
      [widget]: enabled,
    };
    setWidgetVisibility(nextVisibility);
    pushHudLayout(nextVisibility);
  };

  const handleApplyWidgetSettings = () => {
    pushHudLayout();
    setActiveWidgetCard(null);
    setWidgetDialogOpen(false);
  };

  const handleApplyVisualAndClose = () => {
    handleApplyVisualSettings();
    setActiveVisualCard(null);
    setVisualDialogOpen(false);
  };

  const handleResetActiveWidget = () => {
    if (!activeWidgetCard) {
      return;
    }

    if (activeWidgetCard === 'fps' || activeWidgetCard === 'ping' || activeWidgetCard === 'coords' || activeWidgetCard === 'direction' || activeWidgetCard === 'yaw') {
      setTextSettings((current) => ({
        ...current,
        [activeWidgetCard]: defaultHudCustomization.texts[activeWidgetCard],
      }));
      return;
    }

    if (activeWidgetCard === 'keystrokes') {
      setKeystrokesSettings(defaultHudCustomization.keystrokes);
      return;
    }

    if (activeWidgetCard === 'armorHud') {
      setArmorHudSettings(defaultHudCustomization.armorHud);
      return;
    }

    if (activeWidgetCard === 'minimap') {
      setMinimapSettings(defaultHudCustomization.minimap);
    }
  };

  const handleResetVisualSettings = () => {
    setHudEnabled(true);
    setZoomEnabled(false);
    setFogEnabled(false);
    setOutlineEnabled(false);
    setWeatherEnabled(false);
    setFogColor('');
    setOutlineColor('');
    setZoomLevel('1');
    setWeather('default');
    setFullbright(false);
    setZoomKeybind('');
    setScrollbarZooming(false);
  };

  const handleApplyVisualSettings = (overrides: VisualSettingsOverride = {}) => {
    const nextHudEnabled = overrides.hudEnabled ?? hudEnabled;
    const nextZoomEnabled = overrides.zoomEnabled ?? zoomEnabled;
    const nextFogEnabled = overrides.fogEnabled ?? fogEnabled;
    const nextOutlineEnabled = overrides.outlineEnabled ?? outlineEnabled;
    const nextWeatherEnabled = overrides.weatherEnabled ?? weatherEnabled;
    const nextFogColor = overrides.fogColor ?? fogColor;
    const nextOutlineColor = overrides.outlineColor ?? outlineColor;
    const nextZoomLevel = overrides.zoomLevel ?? zoomLevel;
    const nextWeather = overrides.weather ?? weather;
    const nextFullbright = overrides.fullbright ?? fullbright;
    const nextZoomKeybind = overrides.zoomKeybind ?? zoomKeybind;
    const nextScrollbarZooming = overrides.scrollbarZooming ?? scrollbarZooming;
    const parsedZoom = Number(nextZoomLevel);
    if (!Number.isFinite(parsedZoom)) {
      setHyperBarNotice('Zoom level must be numeric.');
      return;
    }

    if (nextZoomEnabled && !nextZoomKeybind.trim()) {
      setHyperBarNotice('Zoom enabled but keybind is empty; set a keybind first.');
      return;
    }

    const normalizedZoomKeybind = normalizeKeybindValue(nextZoomKeybind);

    handleSendLiveCommand(
      {
        type: 'settings',
        hudEnabled: nextHudEnabled,
        fogColor: nextFogEnabled ? nextFogColor || undefined : undefined,
        outlineColor: nextOutlineEnabled ? nextOutlineColor || undefined : undefined,
        zoomLevel: nextZoomEnabled ? parsedZoom : 1,
        weather: nextWeatherEnabled ? nextWeather : 'default',
        fullbright: nextFullbright,
        zoomKeybind: normalizedZoomKeybind || undefined,
        scrollbarZooming: nextScrollbarZooming,
      },
      'Visual settings sent to Hyper.',
    );
  };

  const socketChipColor = hyperBarSocketStatus === 'connected'
    ? 'success'
    : hyperBarSocketStatus === 'reconnecting'
      ? 'warning'
      : hyperBarSocketStatus === 'connecting'
        ? 'info'
        : 'default';

  const handleCopyHyperBarAddress = async () => {
    if (!hyperBarConnection?.wsUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(hyperBarConnection.wsUrl);
      setHyperBarNotice('Hyper address copied.');
    } catch {
      setHyperBarNotice(`Copy this address manually: ${hyperBarConnection.wsUrl}`);
    }
  };

  const openWidgetDetail = (widget: HyperBarWidgetId | VisualControlId) => {
    if (visualControls.some((control) => control.id === widget)) {
      setActiveVisualCard(widget as VisualControlId);
      setVisualDialogOpen(true);
    } else {
      setActiveWidgetCard(widget as HyperBarWidgetId);
      setWidgetDialogOpen(true);
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {menuOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            p: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(10, 12, 16, 0)',
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) {
              return;
            }
            setMenuOpen(false);
            void hideOverlayWindow();
          }}
        >
          <Card
            onClick={(event) => event.stopPropagation()}
            sx={{
              width: 'min(1180px, calc(100vw - 48px))',
              maxWidth: '100%',
              maxHeight: 'min(860px, calc(100vh - 48px))',
              overflow: 'hidden',
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[12],
            }}
          >
            <Box
              data-tauri-drag-region
              sx={{
                px: 3,
                py: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                cursor: 'move',
              }}
            >
              <Box>
                <Typography variant="h6">Hyper Overlay</Typography>
                <Typography variant="caption" color="text.secondary">
                  Per-HUD cards with quick toggles and options based on `API_SPEC.md`.
                </Typography>
              </Box>
              <IconButton onClick={() => {
                setMenuOpen(false);
                void hideOverlayWindow();
              }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Box
              sx={{
                maxHeight: 'calc(min(860px, calc(100vh - 48px)) - 73px)',
                minHeight: 'calc(min(860px, calc(100vh - 48px)) - 73px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                '&::-webkit-scrollbar': { width: 12 },
                '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.background.default },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: 999,
                  border: `3px solid ${theme.palette.background.default}`,
                },
              }}
            >
              <CardContent>
                <Stack spacing={2.5}>
                  {hyperBarError && <Alert severity="warning">{hyperBarError}</Alert>}
                  {hyperBarSocketError && <Alert severity="warning">{hyperBarSocketError}</Alert>}
                  {hyperBarNotice && <Alert severity="success">{hyperBarNotice}</Alert>}

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Tooltip title={selectedInstance?.name || 'No instance selected'}>
                      <IconButton sx={{ border: `1px solid ${theme.palette.divider}` }}>
                        <HyperBarIcon color={selectedInstance ? 'primary' : 'disabled'} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={`Socket ${hyperBarSocketStatus}`}>
                      <IconButton sx={{ border: `1px solid ${theme.palette.divider}` }}>
                        <SettingsIcon color={socketChipColor === 'success' ? 'success' : socketChipColor === 'warning' ? 'warning' : socketChipColor === 'info' ? 'info' : 'disabled'} />
                      </IconButton>
                    </Tooltip>
                    {hyperBarLastMessageAt && (
                      <Tooltip title={`Last packet ${formatDateTime(hyperBarLastMessageAt, settings.language)}`}>
                        <IconButton sx={{ border: `1px solid ${theme.palette.divider}` }}>
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedInstance?.name || 'No instance selected'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Socket {hyperBarSocketStatus}</Typography>
                    </Stack>
                    <Box sx={{ flexGrow: 1 }} />
                    <TextField
                      size="small"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search cards or categories"
                      sx={{ minWidth: 260, pointerEvents: 'auto' }}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {cardCategories.map((category) => (
                      <Chip
                        key={category}
                        label={category === 'all' ? 'All Cards' : category}
                        color={selectedCardCategory === category ? 'primary' : 'default'}
                        variant={selectedCardCategory === category ? 'filled' : 'outlined'}
                        onClick={() => setSelectedCardCategory(category)}
                      />
                    ))}
                  </Stack>

                  {hyperBarConnection?.found ? (
                    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                      <CardContent sx={{ p: 2.25 }}>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                          <Typography sx={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}>
                            Hyper websocket detected and ready.
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Copy HyperBar address">
                              <IconButton color="primary" onClick={handleCopyHyperBarAddress}>
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reconnect socket">
                              <IconButton onClick={reconnectHyperBar}>
                                <RefreshIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Open logs folder">
                              <span>
                                <IconButton onClick={() => void api.openMinecraftLogsDirectory(selectedInstanceId || '')} disabled={!selectedInstanceId}>
                                  <FolderOpenIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="info">
                      Launch Minecraft to let Hyper print its WebSocket address into `latest.log`.
                    </Alert>
                  )}

                  <Grid container spacing={2} sx={{ minHeight: 560, alignContent: 'flex-start' }}>
                    {filteredWidgetControls.map((control) => {
                      const Icon = widgetIcons[control.widget];
                      const enabled = widgetVisibility[control.widget];

                      return (
                        <Grid item xs={12} sm={6} md={4} lg={4} key={control.widget}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: 272,
                              minWidth: 240,
                              borderRadius: 2,
                              borderColor: activeWidgetCard === control.widget && widgetDialogOpen ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                            onClick={() => openWidgetDetail(control.widget)}
                          >
                            <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                                <Box>
                                  <Typography variant="overline" color="text.secondary">
                                    {control.category}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                    {control.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                    {control.widget === 'keystrokes'
                                        ? 'Live movement and click inputs with customizable colors.'
                                        : control.widget === 'armorHud'
                                          ? 'Display worn armor and durability at a fixed HUD anchor.'
                                          : control.widget === 'minimap'
                                            ? 'Radar-style minimap with size and range controls.'
                                            : 'Editable HUD text with Hyper placeholders and live positions.'}
                                  </Typography>
                                </Box>
                                <Chip size="small" label={enabled ? 'On' : 'Off'} color={enabled ? 'primary' : 'default'} variant={enabled ? 'filled' : 'outlined'} />
                              </Stack>

                              <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                                <Icon sx={{ fontSize: 56, color: enabled ? 'primary.main' : 'text.disabled' }} />
                              </Box>

                              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 'auto' }}>
                                <IconButton
                                  size="small"
                                  sx={{ border: `1px solid ${theme.palette.divider}` }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openWidgetDetail(control.widget);
                                  }}
                                >
                                  <SettingsIcon />
                                </IconButton>
                                <Button
                                  size="small"
                                  variant={enabled ? 'contained' : 'outlined'}
                                  sx={{ minWidth: 140, flexGrow: 1 }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleWidgetToggle(control.widget, !enabled);
                                  }}
                                >
                                  {enabled ? 'Enabled' : 'Disabled'}
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                    {filteredVisualControls.map((control) => {
                      const Icon = control.icon;
                      const enabled = control.id === 'hudEnabled' ? hudEnabled :
                                     control.id === 'fullbright' ? fullbright :
                                     control.id === 'zoom' ? zoomEnabled :
                                     control.id === 'fogColor' ? fogEnabled :
                                     control.id === 'outlineColor' ? outlineEnabled :
                                     control.id === 'weather' ? weatherEnabled : false;

                      return (
                        <Grid item xs={12} sm={6} md={4} lg={4} key={control.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: 272,
                              minWidth: 240,
                              borderRadius: 2,
                              borderColor: activeVisualCard === control.id && visualDialogOpen ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                            onClick={() => {
                              setActiveVisualCard(control.id);
                              setVisualDialogOpen(true);
                            }}
                          >
                            <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                                <Box>
                                  <Typography variant="overline" color="text.secondary">
                                    {control.category}
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                    {control.label}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                                    {control.id === 'hudEnabled'
                                      ? 'Master toggle for the complete Hyper HUD.'
                                      : control.id === 'fullbright'
                                        ? 'Force brighter world lighting through Hyper.'
                                        : control.id === 'zoom'
                                          ? `Zoom level, keybind, and scroll behavior. Current key: ${formatKeybindLabel(zoomKeybind)}.`
                                          : control.id === 'weather'
                                            ? 'Override local weather with clear, rain, or thunder.'
                                            : 'Apply a custom visual color override from the launcher.'}
                                  </Typography>
                                </Box>
                                <Chip size="small" label={enabled ? 'On' : 'Off'} color={enabled ? 'primary' : 'default'} variant={enabled ? 'filled' : 'outlined'} />
                              </Stack>

                              <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
                                <Icon sx={{ fontSize: 56, color: enabled ? 'primary.main' : 'text.disabled' }} />
                              </Box>

                              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 'auto' }}>
                                <IconButton
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveVisualCard(control.id);
                                    setVisualDialogOpen(true);
                                  }}
                                  sx={{ border: `1px solid ${theme.palette.divider}` }}
                                >
                                  <SettingsIcon />
                                </IconButton>
                                <Button
                                  size="small"
                                  variant={enabled ? 'contained' : 'outlined'}
                                  sx={{ minWidth: 140, flexGrow: 1 }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (control.id === 'hudEnabled') {
                                      const nextValue = !hudEnabled;
                                      setHudEnabled(nextValue);
                                    } else if (control.id === 'fullbright') {
                                      const nextValue = !fullbright;
                                      setFullbright(nextValue);
                                    } else if (control.id === 'zoom') {
                                      const nextValue = !zoomEnabled;
                                      setZoomEnabled(nextValue);
                                    } else if (control.id === 'fogColor') {
                                      const nextValue = !fogEnabled;
                                      setFogEnabled(nextValue);
                                    } else if (control.id === 'outlineColor') {
                                      const nextValue = !outlineEnabled;
                                      setOutlineEnabled(nextValue);
                                    } else if (control.id === 'weather') {
                                      const nextValue = !weatherEnabled;
                                      setWeatherEnabled(nextValue);
                                    }
                                  }}
                                >
                                  {enabled ? 'Enabled' : 'Disabled'}
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {filteredWidgetControls.length === 0 && filteredVisualControls.length === 0 && (
                    <Alert severity="info">
                      No cards match this search yet. Try a broader term like `text`, `visuals`, or `keystrokes`.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Box>
          </Card>

          <Dialog
            open={widgetDialogOpen}
            onClose={(_, reason) => {
              if (reason === 'backdropClick') {
                return;
              }
              setActiveWidgetCard(null);
              setWidgetDialogOpen(false);
            }}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
          >
            <DialogTitle>
              {activeWidgetControl?.label} Settings
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                {activeWidgetCard && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Switch
                      checked={widgetVisibility[activeWidgetCard]}
                      onChange={(event) => handleWidgetToggle(activeWidgetCard, event.target.checked)}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Show this HUD widget
                    </Typography>
                  </Stack>
                )}

                {(activeWidgetCard === 'fps' || activeWidgetCard === 'ping' || activeWidgetCard === 'coords' || activeWidgetCard === 'direction' || activeWidgetCard === 'yaw') && (
                  <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField label="X" type="number" value={textSettings[activeWidgetCard].x} onChange={(event) => {
                        const key = activeWidgetCard;
                        setTextSettings((current) => ({ ...current, [key]: { ...current[key], x: Number(event.target.value) || 0 } }));
                      }} fullWidth />
                      <TextField label="Y" type="number" value={textSettings[activeWidgetCard].y} onChange={(event) => {
                        const key = activeWidgetCard;
                        setTextSettings((current) => ({ ...current, [key]: { ...current[key], y: Number(event.target.value) || 0 } }));
                      }} fullWidth />
                    </Stack>
                    <TextField label="Text" value={textSettings[activeWidgetCard].text} onChange={(event) => {
                      const key = activeWidgetCard;
                      setTextSettings((current) => ({ ...current, [key]: { ...current[key], text: event.target.value } }));
                    }} fullWidth />
                    <TextField
                      label="Text Color"
                      type="color"
                      value={textSettings[activeWidgetCard].color || '#ffffff'}
                      onChange={(event) => {
                        const key = activeWidgetCard;
                        setTextSettings((current) => ({ ...current, [key]: { ...current[key], color: event.target.value } }));
                      }}
                      fullWidth
                    />
                    <TextField label="Scale" type="number" value={textSettings[activeWidgetCard].scale} onChange={(event) => {
                      const key = activeWidgetCard;
                      setTextSettings((current) => ({ ...current, [key]: { ...current[key], scale: Number(event.target.value) || 1 } }));
                    }} inputProps={{ step: 0.1, min: 0.5, max: 3 }} fullWidth />
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {textPlaceholders.map((placeholder) => (
                        <Chip
                          key={placeholder}
                          label={placeholder}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const key = activeWidgetCard;
                            setTextSettings((current) => ({
                              ...current,
                              [key]: {
                                ...current[key],
                                text: current[key].text.includes(placeholder)
                                  ? current[key].text
                                  : `${current[key].text}${current[key].text ? ' ' : ''}${placeholder}`,
                              },
                            }));
                          }}
                        />
                      ))}
                    </Stack>
                  </>
                )}

                {activeWidgetCard === 'keystrokes' && (
                  <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField label="X" type="number" value={keystrokesSettings.x} onChange={(event) => setKeystrokesSettings((current) => ({ ...current, x: Number(event.target.value) || 0 }))} fullWidth />
                      <TextField label="Y" type="number" value={keystrokesSettings.y} onChange={(event) => setKeystrokesSettings((current) => ({ ...current, y: Number(event.target.value) || 0 }))} fullWidth />
                    </Stack>
                    <TextField label="Background" type="color" value={keystrokesSettings.color || '#808080'} onChange={(event) => setKeystrokesSettings((current) => ({ ...current, color: event.target.value }))} fullWidth />
                    <TextField label="Active Background" type="color" value={keystrokesSettings.activeColor || '#ffffff'} onChange={(event) => setKeystrokesSettings((current) => ({ ...current, activeColor: event.target.value }))} fullWidth />
                    <TextField label="Text Color" type="color" value={keystrokesSettings.textColor || '#00ff00'} onChange={(event) => setKeystrokesSettings((current) => ({ ...current, textColor: event.target.value }))} fullWidth />
                  </>
                )}

                {activeWidgetCard === 'minimap' && (
                  <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField label="X" type="number" value={minimapSettings.x} onChange={(event) => setMinimapSettings((current) => ({ ...current, x: Number(event.target.value) || 0 }))} fullWidth />
                      <TextField label="Y" type="number" value={minimapSettings.y} onChange={(event) => setMinimapSettings((current) => ({ ...current, y: Number(event.target.value) || 0 }))} fullWidth />
                    </Stack>
                    <TextField label="Size" type="number" value={minimapSettings.size} onChange={(event) => setMinimapSettings((current) => ({ ...current, size: Number(event.target.value) || current.size }))} fullWidth />
                    <TextField label="Range" type="number" value={minimapSettings.range} onChange={(event) => setMinimapSettings((current) => ({ ...current, range: Number(event.target.value) || current.range }))} fullWidth />
                    <TextField label="Background" type="color" value={minimapSettings.color || '#808080'} onChange={(event) => setMinimapSettings((current) => ({ ...current, color: event.target.value }))} fullWidth />
                  </>
                )}

                {activeWidgetCard === 'armorHud' && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField label="X" type="number" value={armorHudSettings.x} onChange={(event) => setArmorHudSettings((current) => ({ ...current, x: Number(event.target.value) || 0 }))} fullWidth />
                    <TextField label="Y" type="number" value={armorHudSettings.y} onChange={(event) => setArmorHudSettings((current) => ({ ...current, y: Number(event.target.value) || 0 }))} fullWidth />
                  </Stack>
                )}

                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="outlined" onClick={handleResetActiveWidget} fullWidth>
                    Reset Widget
                  </Button>
                  <Button variant="contained" onClick={handleApplyWidgetSettings} fullWidth>
                    Apply {activeWidgetControl?.label || 'HUD'} Settings
                  </Button>
                </Stack>
              </Stack>
            </DialogContent>
          </Dialog>

          <Dialog
            open={visualDialogOpen}
            onClose={(_, reason) => {
              if (reason === 'backdropClick') {
                return;
              }
              setActiveVisualCard(null);
              setVisualDialogOpen(false);
            }}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
          >
            <DialogTitle>
              {activeVisualControl?.label} Settings
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch checked={hudEnabled} onChange={(event) => setHudEnabled(event.target.checked)} />
                  <Typography variant="caption" color="text.secondary">
                    HUD enabled
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch checked={fullbright} onChange={(event) => setFullbright(event.target.checked)} />
                  <Typography variant="caption" color="text.secondary">
                    Fullbright
                  </Typography>
                </Stack>

                {activeVisualCard === 'hudEnabled' && (
                  <Alert severity="info">
                    This is the global `hudEnabled` setting from the Hyper API spec. Turn it off to hide the full HUD without deleting the layout.
                  </Alert>
                )}

                {activeVisualCard === 'fullbright' && (
                  <Alert severity="info">
                    This maps directly to the Hyper `fullbright` command and general settings payload.
                  </Alert>
                )}

                {activeVisualCard === 'zoom' && (
                  <>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={zoomEnabled} onChange={(event) => setZoomEnabled(event.target.checked)} />
                      <Typography variant="caption" color="text.secondary">
                        Zoom enabled
                      </Typography>
                    </Stack>
                    <TextField label="Zoom Level" type="number" value={zoomLevel} onChange={(event) => setZoomLevel(event.target.value)} inputProps={{ step: 0.1, min: 0.1 }} fullWidth />
                    <TextField
                      label="Keybind"
                      value={zoomKeybind}
                      onChange={(event) => setZoomKeybind(normalizeKeybindValue(event.target.value))}
                      placeholder="e.g., Z or ShiftRight"
                      helperText={`Current keybind: ${formatKeybindLabel(zoomKeybind)}`}
                      fullWidth
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                      <Button
                        variant={isCapturingZoomKeybind ? 'contained' : 'outlined'}
                        color={isCapturingZoomKeybind ? 'secondary' : 'primary'}
                        onClick={() => setIsCapturingZoomKeybind((current) => !current)}
                        fullWidth
                      >
                        {isCapturingZoomKeybind ? 'Press any key...' : 'Capture Keybind'}
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                        Click Capture then press the key you want for zoom toggle.
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={scrollbarZooming} onChange={(event) => setScrollbarZooming(event.target.checked)} />
                      <Typography variant="caption" color="text.secondary">
                        Scrollbar Zooming
                      </Typography>
                    </Stack>
                  </>
                )}

                {activeVisualCard === 'fogColor' && (
                  <>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={fogEnabled} onChange={(event) => setFogEnabled(event.target.checked)} />
                      <Typography variant="caption" color="text.secondary">
                        Fog color enabled
                      </Typography>
                    </Stack>
                    <TextField label="Fog Color" type="color" value={fogColor || '#ffffff'} onChange={(event) => setFogColor(event.target.value)} fullWidth />
                  </>
                )}

                {activeVisualCard === 'outlineColor' && (
                  <>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={outlineEnabled} onChange={(event) => setOutlineEnabled(event.target.checked)} />
                      <Typography variant="caption" color="text.secondary">
                        Outline enabled
                      </Typography>
                    </Stack>
                    <TextField label="Outline Color" type="color" value={outlineColor || '#000000'} onChange={(event) => setOutlineColor(event.target.value)} fullWidth />
                  </>
                )}

                {activeVisualCard === 'weather' && (
                  <>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={weatherEnabled} onChange={(event) => setWeatherEnabled(event.target.checked)} />
                      <Typography variant="caption" color="text.secondary">
                        Weather override enabled
                      </Typography>
                    </Stack>
                    <TextField select label="Weather" value={weather} onChange={(event) => setWeather(event.target.value as HyperBarWeather)} fullWidth>
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="clear">Clear</MenuItem>
                      <MenuItem value="rain">Rain</MenuItem>
                      <MenuItem value="thunder">Thunder</MenuItem>
                    </TextField>
                  </>
                )}

                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="outlined" onClick={handleResetVisualSettings} fullWidth>
                    Reset Visuals
                  </Button>
                  <Button variant="contained" onClick={handleApplyVisualAndClose} fullWidth>
                    Apply {activeVisualControl?.label || 'Visual'} Settings
                  </Button>
                </Stack>
              </Stack>
            </DialogContent>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
