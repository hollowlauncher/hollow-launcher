import { create } from 'zustand';
import { AppState, Download, Instance, InstanceCreationRequest, RecentAccount, Settings } from '../../../shared/types';
import { api } from '../api/client';

interface StoreState extends AppState {
  loadInstances: () => Promise<void>;
  createInstance: (config: InstanceCreationRequest) => Promise<Instance>;
  updateInstance: (id: string, updates: Partial<Instance>) => Promise<Instance>;
  deleteInstance: (id: string) => Promise<void>;
  selectInstance: (id: string) => void;

  loadDownloads: () => Promise<void>;
  replaceDownload: (download: Download) => void;

  updateSettings: (settings: Partial<Settings>) => void;
  pushRecentAccount: (account: RecentAccount) => void;
  setCurrentScreen: (screen: AppState['currentScreen']) => void;
  setLaunching: (value: boolean) => void;
  setLaunchState: (state: AppState['launchState'], message?: string) => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  primaryColor: '#90caf9',
  secondaryColor: '#ce93d8',
  windowTopbarTheme: 'match',
  forceDialogBackdropBlur: false,
  dialogBackdropBlurIntensity: 10,
  sidebarMode: 'default',
  hyperBarEnabled: true,
  defaultRamMin: 512,
  defaultRamMax: 2048,
  discordRpcEnabled: false,
  microsoftAccount: null,
  language: 'en',
  autoDownloadJava: true,
  concurrentDownloads: 3,
  forceWindowResolution: false,
  windowResolutionWidth: 1280,
  windowResolutionHeight: 720,
  username: 'Player',
  accountType: 'offline',
  recentAccounts: [],
};

export const useStore = create<StoreState>((set, get) => ({
  selectedInstanceId: undefined,
  currentScreen: 'dashboard',
  isLaunching: false,
  launchState: 'idle',
  launchStatusMessage: undefined,
  downloads: [],
  instances: [],
  settings: defaultSettings,

  loadInstances: async () => {
    const instances = await api.getInstances();
    set({
      instances,
      selectedInstanceId: get().selectedInstanceId && instances.some((instance) => instance.id === get().selectedInstanceId)
        ? get().selectedInstanceId
        : instances[0]?.id,
    });
  },

  createInstance: async (config: InstanceCreationRequest) => {
    const instance = await api.createInstance(config);
    set({
      instances: [instance, ...get().instances],
      selectedInstanceId: instance.id,
    });
    return instance;
  },

  updateInstance: async (id: string, updates: Partial<Instance>) => {
    const instance = await api.updateInstance(id, updates);
    set({
      instances: get().instances.map((entry) => entry.id === id ? instance : entry),
      selectedInstanceId: get().selectedInstanceId || instance.id,
    });
    return instance;
  },

  deleteInstance: async (id: string) => {
    await api.deleteInstance(id);
    const instances = get().instances.filter((instance) => instance.id !== id);
    set({
      instances,
      selectedInstanceId: get().selectedInstanceId === id ? instances[0]?.id : get().selectedInstanceId,
    });
  },

  selectInstance: (id: string) => set({ selectedInstanceId: id }),

  loadDownloads: async () => {
    const downloads = await api.getDownloads();
    set({ downloads });
  },

  replaceDownload: (download: Download) => {
    const downloads = get().downloads;
    const exists = downloads.some((entry) => entry.id === download.id);
    set({
      downloads: exists
        ? downloads.map((entry) => entry.id === download.id ? download : entry)
        : [download, ...downloads],
    });
  },

  updateSettings: (newSettings: Partial<Settings>) => {
    const settings = { ...get().settings, ...newSettings };
    localStorage.setItem('launcher-settings', JSON.stringify(settings));
    set({ settings });
  },

  pushRecentAccount: (account: RecentAccount) => {
    const recentAccounts = [
      account,
      ...(get().settings.recentAccounts || []).filter((entry) => entry.id !== account.id),
    ].slice(0, 6);
    get().updateSettings({ recentAccounts });
  },

  setCurrentScreen: (screen: AppState['currentScreen']) => set({ currentScreen: screen }),
  setLaunching: (value: boolean) => set({ isLaunching: value }),
  setLaunchState: (launchState: AppState['launchState'], launchStatusMessage?: string) => set({
    launchState,
    launchStatusMessage,
    isLaunching: launchState === 'launching',
  }),
}));
