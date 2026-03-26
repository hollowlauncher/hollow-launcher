import axios, { AxiosInstance } from 'axios';
import {
  Download,
  HyperBarConnectionInfo,
  Instance,
  InstanceCreationRequest,
  LauncherConfig,
  MicrosoftAccount,
  ModSearchResult,
  ModVersionOption,
  Settings,
  StopLaunchResponse,
} from '../../../shared/types';

const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8000';
const BRIDGE_FILE_PATH = 'bridge/sidecar.json';

declare global {
  interface Window {
    __TAURI__?: {
      fs?: {
        BaseDirectory?: {
          AppLocalData?: number;
        };
        readTextFile?: (path: string, options?: { baseDir?: number }) => Promise<string>;
      };
    };
  }
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.error;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Request failed';
}

export class SidecarBridge {
  private client: AxiosInstance;
  private apiOriginPromise: Promise<string> | null = null;
  private resolvedBridgeOrigin: string | null = null;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(new Error(getErrorMessage(error))),
    );

    this.client.interceptors.request.use(async (config) => ({
      ...config,
      baseURL: `${await this.getApiOrigin()}/api`,
    }));
  }

  private async getApiOrigin(): Promise<string> {
    if (this.resolvedBridgeOrigin) {
      return this.resolvedBridgeOrigin;
    }

    if (!this.apiOriginPromise) {
      this.apiOriginPromise = this.readApiOriginFromBridgeFile();
    }

    const origin = await this.apiOriginPromise;
    if (origin !== DEFAULT_API_ORIGIN) {
      this.resolvedBridgeOrigin = origin;
    } else {
      this.apiOriginPromise = null;
    }

    return origin;
  }

  private async readApiOriginFromBridgeFile(): Promise<string> {
    try {
      const fsApi = typeof window !== 'undefined' ? window.__TAURI__?.fs : undefined;
      const readTextFile = fsApi?.readTextFile;
      const appLocalData = fsApi?.BaseDirectory?.AppLocalData;

      if (!readTextFile || typeof appLocalData !== 'number') {
        return DEFAULT_API_ORIGIN;
      }

      const content = await readTextFile(BRIDGE_FILE_PATH, {
        baseDir: appLocalData,
      });
      const parsed = JSON.parse(content);

      if (typeof parsed?.origin === 'string' && parsed.origin.trim()) {
        return parsed.origin.trim();
      }
    } catch {
      // Fall back to the local default when the bridge file is not ready yet.
    }

    return DEFAULT_API_ORIGIN;
  }

  async getInstances(): Promise<Instance[]> {
    const { data } = await this.client.get('/instances');
    return data.data || [];
  }

  async getInstance(id: string): Promise<Instance> {
    const { data } = await this.client.get(`/instances/${id}`);
    return data.data;
  }

  async createInstance(request: InstanceCreationRequest): Promise<Instance> {
    const { data } = await this.client.post('/instances', request);
    return data.data;
  }

  async updateInstance(id: string, updates: Partial<Instance>): Promise<Instance> {
    const { data } = await this.client.put(`/instances/${id}`, updates);
    return data.data;
  }

  async deleteInstance(id: string): Promise<void> {
    await this.client.delete(`/instances/${id}`);
  }

  async fetchVersionManifest() {
    const { data } = await this.client.get('/versions/manifest');
    return data.data;
  }

  async fetchLoaderVersions(version: string, loader: 'fabric' | 'forge') {
    const { data } = await this.client.get('/versions/loaders', {
      params: { version, loader },
    });
    return data.data as string[];
  }

  async installVersion(version: string, loader?: string, loaderVersion?: string, javaPath?: string, allowJavaDiscovery = true) {
    const { data } = await this.client.post('/versions/install', {
      version,
      loader,
      loaderVersion,
      javaPath,
      allowJavaDiscovery,
    }, {
      timeout: 600000
    });
    return data.data;
  }

  async launchGame(
    instanceId: string,
    username?: string,
    settings?: Pick<
      Settings,
      | 'discordRpcEnabled'
      | 'javaPath'
      | 'autoDownloadJava'
      | 'microsoftAccount'
      | 'forceWindowResolution'
      | 'windowResolutionWidth'
      | 'windowResolutionHeight'
    >,
  ) {
    const { data } = await this.client.post('/launch', {
      instanceId,
      username,
      javaPath: settings?.javaPath,
      allowJavaDiscovery: settings?.autoDownloadJava !== false,
      discordRpcEnabled: settings?.discordRpcEnabled,
      microsoftAccount: settings?.microsoftAccount,
      forceWindowResolution: settings?.forceWindowResolution,
      windowResolutionWidth: settings?.windowResolutionWidth,
      windowResolutionHeight: settings?.windowResolutionHeight,
    }, {
      timeout: 600000
    });
    return data.data;
  }

  async stopGame(instanceId: string): Promise<StopLaunchResponse> {
    const { data } = await this.client.post('/launch/stop', {
      instanceId
    });
    return data.data;
  }

  async getLaunchStatus(instanceId: string): Promise<{ running: boolean; pid?: number }> {
    const { data } = await this.client.get(`/launch/status/${instanceId}`);
    return data.data;
  }

  async getDownloads(): Promise<Download[]> {
    const { data } = await this.client.get('/downloads');
    return data.data || [];
  }

  async startDownload(name: string, url: string, type: string) {
    const { data } = await this.client.post('/downloads/start', {
      name,
      url,
      type
    });
    return data.data;
  }

  async pauseDownload(id: string) {
    const { data } = await this.client.post(`/downloads/pause/${id}`);
    return data.data;
  }

  async resumeDownload(id: string) {
    const { data } = await this.client.post(`/downloads/resume/${id}`);
    return data.data;
  }

  async cancelDownload(id: string) {
    await this.client.delete(`/downloads/${id}`);
  }

  async getMods(instanceId: string) {
    const { data } = await this.client.get(`/mods/${instanceId}`);
    return data.data || [];
  }

  async addMod(instanceId: string, modPath: string, contentType: 'mod' | 'resourcepack' | 'shader' = 'mod') {
    const { data } = await this.client.post(`/mods/${instanceId}/add`, {
      modPath,
      contentType,
    });
    return data.data;
  }

  async removeMod(instanceId: string, modId: string) {
    await this.client.delete(`/mods/${instanceId}/${modId}`);
  }

  async searchMods(query: string, instanceId?: string, contentType: 'mod' | 'resourcepack' | 'shader' = 'mod'): Promise<ModSearchResult[]> {
    const { data } = await this.client.get('/mods/search/projects', {
      params: {
        query,
        instanceId,
        contentType,
      }
    });
    return data.data || [];
  }

  async getRecommendedMods(instanceId?: string, contentType: 'mod' | 'resourcepack' | 'shader' = 'mod'): Promise<ModSearchResult[]> {
    const { data } = await this.client.get('/mods/recommended/projects', {
      params: {
        instanceId,
        contentType,
      }
    });
    return data.data || [];
  }

  async getModVersions(projectId: string, instanceId: string, contentType: 'mod' | 'resourcepack' | 'shader' = 'mod'): Promise<ModVersionOption[]> {
    const { data } = await this.client.get(`/mods/project/${projectId}/versions`, {
      params: {
        instanceId,
        contentType,
      }
    });
    return data.data || [];
  }

  async installModrinthMod(instanceId: string, projectId: string, versionId?: string, contentType: 'mod' | 'resourcepack' | 'shader' = 'mod') {
    const { data } = await this.client.post(`/mods/${instanceId}/install-modrinth`, {
      projectId,
      versionId,
      contentType,
    }, {
      timeout: 600000
    });
    return data.data;
  }

  async searchModpacks(query: string): Promise<ModSearchResult[]> {
    const { data } = await this.client.get('/modpacks/search', {
      params: { query },
    });
    return data.data || [];
  }

  async getModpackVersions(projectId: string): Promise<ModVersionOption[]> {
    const { data } = await this.client.get(`/modpacks/project/${projectId}/versions`);
    return data.data || [];
  }

  async installModrinthModpack(projectId: string, versionId?: string, instanceName?: string): Promise<Instance> {
    const { data } = await this.client.post('/modpacks/install-modrinth', {
      projectId,
      versionId,
      instanceName,
    }, {
      timeout: 600000,
    });
    return data.data;
  }

  async retryDownload(id: string) {
    const { data } = await this.client.post(`/downloads/retry/${id}`);
    return data.data;
  }

  async getLogs(instanceId: string, lines = 200) {
    const { data } = await this.client.get('/system/logs', {
      params: {
        instanceId,
        lines,
      }
    });
    return data.data as {
      content: string;
      filePath: string;
      lineCount: number;
      exists: boolean;
    };
  }

  async getHyperBarConnection(instanceId: string, lines = 400) {
    const { data } = await this.client.get('/system/hyperbar-connection', {
      params: {
        instanceId,
        lines,
      }
    });
    return data.data as HyperBarConnectionInfo;
  }

  async openLauncherDirectory() {
    const { data } = await this.client.post('/system/open-path', { kind: 'launcher' });
    return data.data;
  }

  async openLogsDirectory() {
    const { data } = await this.client.post('/system/open-path', { kind: 'logs' });
    return data.data;
  }

  async openMinecraftLogsDirectory(instanceId: string) {
    const { data } = await this.client.post('/system/open-path', {
      kind: 'minecraft-logs',
      instanceId,
    });
    return data.data;
  }

  async openExternalUrl(url: string) {
    const { data } = await this.client.post('/system/open-url', { url });
    return data.data as { url: string };
  }

  async openInstanceDirectory(instanceId: string) {
    const { data } = await this.client.post('/system/open-path', {
      kind: 'instance',
      instanceId,
    });
    return data.data;
  }

  async getLauncherConfig(): Promise<LauncherConfig> {
    const { data } = await this.client.get('/system/config');
    return data.data;
  }

  async updateLauncherConfig(config: Partial<LauncherConfig>): Promise<LauncherConfig> {
    const { data } = await this.client.put('/system/config', config);
    return data.data;
  }

  async startMicrosoftDeviceCode(clientId: string) {
    const { data } = await this.client.post('/auth/microsoft/device-code/start', { clientId });
    return data.data as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      verification_uri_complete?: string;
      expires_in: number;
      interval: number;
      message?: string;
    };
  }

  async pollMicrosoftDeviceCode(clientId: string, deviceCode: string) {
    const { data } = await this.client.post('/auth/microsoft/device-code/poll', {
      clientId,
      deviceCode,
    });
    return data.data as {
      status: 'authorization_pending' | 'slow_down' | 'completed';
      account?: MicrosoftAccount;
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const origin = await this.getApiOrigin();
      const response = await axios.get(`${origin}/health`, {
        timeout: 800
      });
      return response.status === 200;
    } catch {
      if (!this.resolvedBridgeOrigin) {
        this.apiOriginPromise = null;
      }
      return false;
    }
  }

  async shutdownSidecar(): Promise<void> {
    try {
      await this.client.post('/system/shutdown', {}, {
        timeout: 2000
      });
    } catch (error) {
      // Sidecar may exit before returning response, this is expected
      // Just log and continue
    }
  }
}

export const sidecarBridge = new SidecarBridge();
export const api = sidecarBridge;
