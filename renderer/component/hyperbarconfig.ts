import {
  HyperBarArmorHudElement,
  HyperBarHudElement,
  HyperBarKeystrokesHudElement,
  HyperBarMinimapHudElement,
  HyperBarSyncState,
  HyperBarTextHudElement,
  HyperBarWidgetId,
} from '../../../shared/types';

export const defaultWidgetVisibility: Record<HyperBarWidgetId, boolean> = {
  fps: true,
  ping: true,
  coords: true,
  direction: true,
  yaw: true,
  keystrokes: true,
  armorHud: true,
  minimap: false,
};

export const widgetControls: Array<{ widget: HyperBarWidgetId; label: string; category: string }> = [
  { widget: 'fps', label: 'FPS Text', category: 'Text' },
  { widget: 'ping', label: 'Ping Text', category: 'Text' },
  { widget: 'coords', label: 'Coords Text', category: 'Text' },
  { widget: 'direction', label: 'Direction Text', category: 'Text' },
  { widget: 'yaw', label: 'Yaw Text', category: 'Text' },
  { widget: 'keystrokes', label: 'Keystrokes', category: 'Widgets' },
  { widget: 'armorHud', label: 'Armor HUD', category: 'Widgets' },
  { widget: 'minimap', label: 'Minimap', category: 'Widgets' },
];

export interface HudWidgetPosition {
  x: number;
  y: number;
}

export interface HudTextOptions extends HudWidgetPosition {
  text: string;
  color: string;
  scale: number;
}

export interface HudKeystrokesOptions extends HudWidgetPosition {
  color: string;
  activeColor: string;
  textColor: string;
}

export type HudArmorOptions = HudWidgetPosition;

export interface HudMinimapOptions extends HudWidgetPosition {
  size: number;
  range: number;
  color: string;
}

export interface HudCustomizationOptions {
  texts: Record<'fps' | 'ping' | 'coords' | 'direction' | 'yaw', HudTextOptions>;
  keystrokes: HudKeystrokesOptions;
  armorHud: HudArmorOptions;
  minimap: HudMinimapOptions;
}

export const defaultHudCustomization: HudCustomizationOptions = {
  texts: {
    fps: { text: 'FPS: {fps}', color: '#FFFFFF', x: 10, y: 10, scale: 1 },
    ping: { text: 'Ping: {ping}', color: '#FFFFFF', x: 10, y: 28, scale: 1 },
    coords: { text: 'XYZ: {x}, {y}, {z}', color: '#FFFFFF', x: 10, y: 46, scale: 1 },
    direction: { text: 'Facing: {direction}', color: '#FFFFFF', x: 10, y: 64, scale: 1 },
    yaw: { text: 'Yaw: {yaw}', color: '#FFFFFF', x: 10, y: 82, scale: 1 },
  },
  keystrokes: {
    x: 10,
    y: 108,
    color: '#80000000',
    activeColor: '#FFFFFFFF',
    textColor: '#00FF00',
  },
  armorHud: {
    x: 10,
    y: 196,
  },
  minimap: {
    x: 300,
    y: 10,
    size: 64,
    range: 32,
    color: '#80000000',
  },
};

function normalizeHexColor(value: string, fallback: string) {
  return /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value.toUpperCase() : fallback;
}

function asTextWidget(
  config: HyperBarHudElement[],
  placeholder: string,
  fallback: HudTextOptions,
): HudTextOptions {
  const item = config.find(
    (entry): entry is HyperBarTextHudElement =>
      entry.type === 'text' && entry.text.toLowerCase().includes(placeholder),
  );

  return {
    text: item?.text || fallback.text,
    color: item?.color || fallback.color,
    x: item?.x ?? fallback.x,
    y: item?.y ?? fallback.y,
    scale: item?.scale ?? fallback.scale,
  };
}

function asKeystrokesWidget(
  config: HyperBarHudElement[],
  fallback: HudKeystrokesOptions,
): HudKeystrokesOptions {
  const item = config.find((entry): entry is HyperBarKeystrokesHudElement => entry.type === 'keystrokes');

  return {
    x: item?.x ?? fallback.x,
    y: item?.y ?? fallback.y,
    color: item?.color || fallback.color,
    activeColor: item?.activeColor || fallback.activeColor,
    textColor: item?.textColor || fallback.textColor,
  };
}

function asArmorWidget(
  config: HyperBarHudElement[],
  fallback: HudArmorOptions,
): HudArmorOptions {
  const item = config.find((entry): entry is HyperBarArmorHudElement => entry.type === 'armor');

  return {
    x: item?.x ?? fallback.x,
    y: item?.y ?? fallback.y,
  };
}

function asMinimapWidget(
  config: HyperBarHudElement[],
  fallback: HudMinimapOptions,
): HudMinimapOptions {
  const item = config.find((entry): entry is HyperBarMinimapHudElement => entry.type === 'minimap');

  return {
    x: item?.x ?? fallback.x,
    y: item?.y ?? fallback.y,
    size: item?.size ?? fallback.size,
    range: item?.range ?? fallback.range,
    color: item?.color || fallback.color,
  };
}

export function buildHudConfig(
  widgetVisibility: Record<HyperBarWidgetId, boolean>,
  customization: HudCustomizationOptions = defaultHudCustomization,
): HyperBarHudElement[] {
  const config: HyperBarHudElement[] = [];

  const pushText = (widget: 'fps' | 'ping' | 'coords' | 'direction' | 'yaw', fallbackText: string) => {
    if (!widgetVisibility[widget]) {
      return;
    }

    const textConfig = customization.texts[widget];
    config.push({
      type: 'text',
      text: textConfig.text || fallbackText,
      x: textConfig.x,
      y: textConfig.y,
      color: normalizeHexColor(textConfig.color, '#FFFFFF'),
      scale: Math.max(0.5, Math.min(3, textConfig.scale)),
    });
  };

  pushText('fps', 'FPS: {fps}');
  pushText('ping', 'Ping: {ping}');
  pushText('coords', 'XYZ: {x}, {y}, {z}');
  pushText('direction', 'Facing: {direction}');
  pushText('yaw', 'Yaw: {yaw}');

  if (widgetVisibility.keystrokes) {
    config.push({
      type: 'keystrokes',
      x: customization.keystrokes.x,
      y: customization.keystrokes.y,
      color: normalizeHexColor(customization.keystrokes.color, '#80000000'),
      activeColor: normalizeHexColor(customization.keystrokes.activeColor, '#FFFFFFFF'),
      textColor: normalizeHexColor(customization.keystrokes.textColor, '#00FF00'),
    });
  }

  if (widgetVisibility.armorHud) {
    config.push({
      type: 'armor',
      x: customization.armorHud.x,
      y: customization.armorHud.y,
    });
  }

  if (widgetVisibility.minimap) {
    config.push({
      type: 'minimap',
      x: customization.minimap.x,
      y: customization.minimap.y,
      size: Math.max(32, Math.round(customization.minimap.size)),
      range: Math.max(1, customization.minimap.range),
      color: normalizeHexColor(customization.minimap.color, '#80000000'),
    });
  }

  return config;
}

export function deriveWidgetVisibility(syncState: HyperBarSyncState | null) {
  if (!syncState) {
    return defaultWidgetVisibility;
  }

  const config = syncState.hudConfig || [];

  return {
    fps: config.some((item) => item.type === 'text' && item.text.toLowerCase().includes('{fps}')),
    ping: config.some((item) => item.type === 'text' && item.text.toLowerCase().includes('{ping}')),
    coords: config.some((item) => item.type === 'text' && item.text.toLowerCase().includes('{x}')),
    direction: config.some((item) => item.type === 'text' && item.text.toLowerCase().includes('{direction}')),
    yaw: config.some((item) => item.type === 'text' && item.text.toLowerCase().includes('{yaw}')),
    keystrokes: config.some((item) => item.type === 'keystrokes'),
    armorHud: config.some((item) => item.type === 'armor'),
    minimap: config.some((item) => item.type === 'minimap'),
  };
}

export function deriveHudCustomization(syncState: HyperBarSyncState | null): HudCustomizationOptions {
  if (!syncState) {
    return defaultHudCustomization;
  }

  const config = syncState.hudConfig || [];

  return {
    texts: {
      fps: asTextWidget(config, '{fps}', defaultHudCustomization.texts.fps),
      ping: asTextWidget(config, '{ping}', defaultHudCustomization.texts.ping),
      coords: asTextWidget(config, '{x}', defaultHudCustomization.texts.coords),
      direction: asTextWidget(config, '{direction}', defaultHudCustomization.texts.direction),
      yaw: asTextWidget(config, '{yaw}', defaultHudCustomization.texts.yaw),
    },
    keystrokes: asKeystrokesWidget(config, defaultHudCustomization.keystrokes),
    armorHud: asArmorWidget(config, defaultHudCustomization.armorHud),
    minimap: asMinimapWidget(config, defaultHudCustomization.minimap),
  };
}

export function deriveHudLayout(syncState: HyperBarSyncState | null) {
  const customization = deriveHudCustomization(syncState);
  return {
    x: customization.texts.fps.x,
    y: customization.texts.fps.y,
    scale: customization.texts.fps.scale,
  };
}

export function parseHexColor(color: string) {
  if (color === '-1') {
    return '';
  }

  return /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? color.toUpperCase() : '';
}
