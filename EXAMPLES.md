# 📚 Implementation Examples

This document provides step-by-step examples of how to extend the launcher with new features.

---

## Example 1: Add Version History Tracking

### Goal
Track how much time each instance has been played and when it was last played.

### Steps

#### 1. Update Shared Types

**File:** `shared/types.ts`

```typescript
export interface Instance {
  // ... existing fields ...
  playtime: number;           // Already exists!
  lastPlayed?: string;        // Already exists!
  totalSessions: number;      // NEW
  averageSessionLength: number; // NEW
}

// NEW: Session tracking
export interface PlaySession {
  instanceId: string;
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
}
```

#### 2. Update Backend

**File:** `sidecar/src/core/instance-manager.ts`

Add method to record play sessions:

```typescript
async recordPlaySession(
  instanceId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  const duration = endTime.getTime() - startTime.getTime();
  const instance = await this.getInstance(instanceId);
  
  if (!instance) throw new Error(`Instance ${instanceId} not found`);
  
  instance.playtime += Math.round(duration / 1000); // Convert to seconds
  instance.totalSessions = (instance.totalSessions || 0) + 1;
  instance.averageSessionLength = instance.playtime / instance.totalSessions;
  instance.lastPlayed = endTime.toISOString();
  
  await this.updateInstance(instanceId, instance);
}
```

#### 3. Add API Route Handler

**File:** `sidecar/src/routes/instances.ts`

Add new endpoint:

```typescript
router.post('/:id/session', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime required'
      });
    }
    
    await instanceManager.recordPlaySession(
      req.params.id,
      new Date(startTime),
      new Date(endTime)
    );
    
    res.json({
      success: true,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

#### 4. Update API Client

**File:** `renderer/src/api/client.ts`

Add method:

```typescript
async recordPlaySession(
  instanceId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  await this.client.post(`/instances/${instanceId}/session`, {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  });
}
```

#### 5. Update Frontend

**File:** `renderer/src/components/screens/Dashboard.tsx`

Display statistics:

```tsx
<Box>
  <Typography variant="subtitle2" color="text.secondary">
    Play Statistics
  </Typography>
  <Stack spacing={1} sx={{ mt: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2">Total Sessions:</Typography>
      <Typography variant="body2" color="primary">
        {selectedInstance.totalSessions || 0}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2">Average Session:</Typography>
      <Typography variant="body2" color="primary">
        {formatDuration(selectedInstance.averageSessionLength || 0)}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2">Total Playtime:</Typography>
      <Typography variant="body2" color="primary">
        {formatDuration(selectedInstance.playtime)}
      </Typography>
    </Box>
  </Stack>
</Box>

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
```

---

## Example 2: Implement Mod Search & Download

### Goal
Add ability to search and download mods from Modrinth API.

### Steps

#### 1. Add Types

**File:** `shared/types.ts`

```typescript
export interface ModrinthMod {
  id: string;
  slug: string;
  name: string;
  description: string;
  downloads: number;
  versions: string[];
  icon_url?: string;
  author: string;
}

export interface ModSearchRequest {
  query: string;
  gameVersion: string;
  limit?: number;
  offset?: number;
}
```

#### 2. Create Service

**File:** `sidecar/src/services/modrinth.ts`

```typescript
import axios from 'axios';
import { ModrinthMod, ModSearchRequest } from '../../shared/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('modrinth');
const MODRINTH_API = 'https://api.modrinth.com/v2';

export class ModrinthService {
  async searchMods(request: ModSearchRequest): Promise<ModrinthMod[]> {
    try {
      const response = await axios.get(`${MODRINTH_API}/search`, {
        params: {
          query: request.query,
          facets: JSON.stringify([
            [`game_versions:"${request.gameVersion}"`],
            ['project_type:"mod"']
          ]),
          limit: request.limit || 10,
          offset: request.offset || 0
        }
      });

      return response.data.hits;
    } catch (error) {
      logger.error('Modrinth search failed', error);
      throw error;
    }
  }

  async downloadMod(
    modId: string,
    version: string,
    destinationPath: string
  ): Promise<string> {
    try {
      // Get mod versions
      const versionsResponse = await axios.get(
        `${MODRINTH_API}/project/${modId}/version`
      );

      const targetVersion = versionsResponse.data.find(
        (v: any) => v.version_number === version
      );

      if (!targetVersion) {
        throw new Error(`Version ${version} not found`);
      }

      // Download file
      const file = targetVersion.files[0];
      const response = await axios.get(file.url, {
        responseType: 'arraybuffer'
      });

      const fs = require('fs-extra');
      const filePath = require('path').join(destinationPath, file.filename);
      await fs.writeFile(filePath, response.data);

      logger.info(`Downloaded mod: ${modId} v${version}`);
      return filePath;
    } catch (error) {
      logger.error('Mod download failed', error);
      throw error;
    }
  }
}

export const modrinthService = new ModrinthService();
```

#### 3. Add Routes

**File:** `sidecar/src/routes/mods.ts` (extend existing)

```typescript
import { modrinthService } from '../services/modrinth';

// Search Modrinth
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query, gameVersion } = req.query;
    
    const mods = await modrinthService.searchMods({
      query: query as string,
      gameVersion: gameVersion as string
    });

    res.json({
      success: true,
      data: mods,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download mod from Modrinth
router.post('/:instanceId/download', async (req: Request, res: Response) => {
  try {
    const { modId, version } = req.body;
    const instance = await instanceManager.getInstance(req.params.instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    const modsDir = path.join(instance.gameDir, 'mods');
    const modPath = await modrinthService.downloadMod(
      modId,
      version,
      modsDir
    );

    // Add to instance
    const mod = {
      id: uuidv4(),
      name: path.basename(modPath),
      filename: path.basename(modPath),
      source: 'modrinth' as const,
      enabled: true
    };

    instance.mods.push(mod);
    await instanceManager.updateInstance(req.params.instanceId, instance);

    res.json({
      success: true,
      data: mod,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

#### 4. Update API Client

**File:** `renderer/src/api/client.ts`

```typescript
async searchMods(query: string, gameVersion: string) {
  const { data } = await this.client.get('/mods/search', {
    params: { query, gameVersion }
  });
  return data.data;
}

async downloadModFromModrinth(
  instanceId: string,
  modId: string,
  version: string
) {
  const { data } = await this.client.post(
    `/mods/${instanceId}/download`,
    { modId, version }
  );
  return data.data;
}
```

#### 5. Create Mods Browser Component

**File:** `renderer/src/components/screens/ModBrowser.tsx`

```tsx
import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import { Search as SearchIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../api/client';

export default function ModBrowser() {
  const { selectedInstanceId, instances } = useStore();
  const [query, setQuery] = useState('');
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstance] = useState(
    instances.find(i => i.id === selectedInstanceId)
  );

  const handleSearch = async () => {
    if (!query.trim() || !selectedInstance) return;

    try {
      setLoading(true);
      const results = await api.searchMods(
        query,
        selectedInstance.version
      );
      setMods(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (modId: string, version: string) => {
    if (!selectedInstanceId) return;

    try {
      await api.downloadModFromModrinth(
        selectedInstanceId,
        modId,
        version
      );
      alert('Mod installed successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download mod');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Mod Browser</Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Search mods..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={!query.trim() || !selectedInstance || loading}
        >
          Search
        </Button>
      </Box>

      {loading && <CircularProgress />}

      <Grid container spacing={2}>
        {mods.map((mod) => (
          <Grid item xs={12} sm={6} md={4} key={mod.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{mod.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  by {mod.author}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {mod.description.substring(0, 100)}...
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`${mod.downloads} downloads`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(mod.id, mod.versions[0])}
                  color="primary"
                >
                  Install
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
```

---

## Example 3: Add Game Log Viewer

### Goal
Display real-time game logs in a new screen.

### Steps

#### 1. Create Log Service

**File:** `sidecar/src/services/log-watcher.ts`

```typescript
import fs from 'fs-extra';
import path from 'path';
import EventEmitter from 'events';
import { createLogger } from '../utils/logger';

const logger = createLogger('log-watcher');

export class LogWatcher extends EventEmitter {
  private logPath: string;
  private watcher?: fs.FSWatcher;
  private lastSize = 0;

  constructor(logPath: string) {
    super();
    this.logPath = logPath;
  }

  start(): void {
    if (!fs.existsSync(this.logPath)) {
      logger.warn(`Log file not found: ${this.logPath}`);
      return;
    }

    const stats = fs.statSync(this.logPath);
    this.lastSize = stats.size;

    this.watcher = fs.watch(
      this.logPath,
      { persistent: true },
      this.handleChange.bind(this)
    );

    logger.info(`Watching log file: ${this.logPath}`);
  }

  private handleChange(): void {
    try {
      const stats = fs.statSync(this.logPath);
      if (stats.size > this.lastSize) {
        const stream = fs.createReadStream(this.logPath, {
          start: this.lastSize
        });

        let newLines = '';
        stream.on('data', (chunk) => {
          newLines += chunk.toString();
        });

        stream.on('end', () => {
          this.emit('newLines', newLines);
          this.lastSize = stats.size;
        });
      }
    } catch (error) {
      logger.error('Error watching log', error);
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      logger.info('Stopped watching log');
    }
  }
}
```

#### 2. Add WebSocket Route (for real-time logs)

**File:** `sidecar/src/routes/logs.ts`

```typescript
import { Router, Request, Response } from 'express';
import { LogWatcher } from '../services/log-watcher';

const router = Router();
const logWatchers = new Map<string, LogWatcher>();

router.get('/:instanceId', (req: Request, res: Response) => {
  try {
    const instanceId = req.params.instanceId;
    const logPath = `~/.minecraft-launcher/instances/${instanceId}/.minecraft/logs/latest.log`;

    const existingWatcher = logWatchers.get(instanceId);
    if (existingWatcher) {
      existingWatcher.stop();
    }

    const watcher = new LogWatcher(logPath);
    watcher.start();

    let buffer = '';
    watcher.on('newLines', (lines: string) => {
      buffer += lines;
    });

    // Return buffered logs
    res.json({
      success: true,
      data: { logs: buffer },
      timestamp: Date.now()
    });

    logWatchers.set(instanceId, watcher);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## Example 4: Add Instance Backup/Export

### Goal
Allow users to backup instances or export them for sharing.

### Steps

**File:** `sidecar/src/core/instance-manager.ts`

```typescript
async backupInstance(instanceId: string, outputPath: string): Promise<void> {
  const instance = await this.getInstance(instanceId);
  if (!instance) throw new Error('Instance not found');

  const fs = await import('fs-extra');
  const archiver = require('archiver');

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(instance.gameDir, false);
  archive.file(
    path.join(this.instancesPath, instanceId, 'instance.json'),
    { name: 'instance.json' }
  );

  await archive.finalize();

  logger.info(`Instance backed up: ${instanceId}`);
}

async restoreInstance(backupPath: string): Promise<Instance> {
  const extract = require('extract-zip');
  const tempDir = path.join(this.instancesPath, `.temp-${Date.now()}`);

  await extract(backupPath, { dir: tempDir });

  const configPath = path.join(tempDir, 'instance.json');
  const instance = await fs.readJSON(configPath);

  // Assign new ID
  instance.id = uuidv4();

  const instanceDir = path.join(this.instancesPath, instance.id);
  await fs.copy(tempDir, instanceDir);
  await fs.remove(tempDir);

  logger.info(`Instance restored: ${instance.id}`);
  return instance;
}
```

---

## Summary

These examples demonstrate how to:

1. ✅ Add new data fields to types
2. ✅ Implement backend logic
3. ✅ Create API endpoints
4. ✅ Update the API client
5. ✅ Build frontend UI components
6. ✅ Integrate external services (Modrinth API)
7. ✅ Handle real-time data (log watching)
8. ✅ Implement file operations (backups)

All features follow the same architectural pattern and can be added without major refactoring.
