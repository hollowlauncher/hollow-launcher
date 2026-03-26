# 🏛️ Architecture Document

## System Design Overview

This document describes the complete architecture of the Minecraft Launcher, including component interaction, data flow, and design decisions.

---

## 1. High-Level Architecture

### Layered Design

```
┌────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│  React + Material UI (Browser Window within Tauri)       │
│  • Dashboard, Instances, Mods, Downloads, Settings       │
│  • Material Design components                             │
│  • Zustand state management                               │
└────────────────────────────────────────────────────────────┘
                            ↕ HTTP JSON
┌────────────────────────────────────────────────────────────┐
│                      API LAYER                             │
│  Express.js REST API (Port 7680)                          │
│  • Request validation                                      │
│  • Response serialization                                  │
│  • CORS protection                                         │
│  • Error handling                                          │
└────────────────────────────────────────────────────────────┘
                            ↕
┌────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                    │
│  • Instance Manager - manages game instances              │
│  • XMCL Manager - handles Minecraft launching              │
│  • Download Manager - tracks concurrent downloads         │
└────────────────────────────────────────────────────────────┘
                            ↕
┌────────────────────────────────────────────────────────────┐
│                      DATA LAYER                            │
│  • File System (JSON configs)                              │
│  • .minecraft directories                                  │
│  • Instance profiles                                       │
│  • Mod storage                                             │
└────────────────────────────────────────────────────────────┘
```

### Tauri Layer (Desktop Integration)

```
Tauri Rust Process
├── Manages lifecycle of Node.js sidecar
├── Provides file system access
├── Handles application window
└── Bridges frontend ↔ backend communication
```

---

## 2. Component Details

### 2.1 Frontend (React + Material UI)

**Location:** `renderer/`

**Key Files:**
- `pages/index.tsx` - Main entry point
- `App.tsx` - Root component with theme management
- `components/Layout.tsx` - Main UI layout with navigation
- `components/screens/*.tsx` - Feature screens
- `api/client.ts` - HTTP client for sidecar
- `store/index.ts` - Global state (Zustand)
- `theme/index.ts` - Material UI theme configuration

**State Management (Zustand):**
```typescript
interface StoreState {
  instances: Instance[];
  selectedInstanceId?: string;
  downloads: Download[];
  settings: Settings;
  currentScreen: 'dashboard' | 'instances' | 'mods' | 'downloads' | 'settings';
  isLaunching: boolean;
}
```

**Screen Components:**
1. **Dashboard** - Selected instance overview, quick launch
2. **Instances** - Create, view, delete instances
3. **Mods** - Install, manage, remove mods per instance
4. **Downloads** - Track active downloads, pause/resume
5. **Settings** - RAM allocation, Java path, theme

**Material UI Implementation:**
- Custom theme with dark/light modes
- Responsive grid layout
- Proper component hierarchy (AppBar, Drawer, Cards)
- Theme palette for consistent styling

---

### 2.2 Sidecar Service (Node.js + Express)

**Location:** `sidecar/`

**Architecture:**
```
Express.js (main entry: src/index.ts)
├── Middleware
│   ├── CORS (localhost only)
│   ├── JSON parsing
│   └── Request logging
├── Routes
│   ├── /api/instances - instance CRUD
│   ├── /api/versions - version management
│   ├── /api/launch - game launching
│   ├── /api/downloads - download tracking
│   ├── /api/mods - mod management
│   └── /health - health check
└── Core Services
    ├── InstanceManager - instance lifecycle
    ├── XmclManager - Minecraft integration
    └── Logger - structured logging
```

**Instance Manager Flow:**
```
createInstance(config)
  ├── Generate UUID
  ├── Create directory structure
  ├── Initialize .minecraft folder
  ├── Save instance.json config
  └── Return Instance object
```

**XMCL Manager Flow:**
```
launchGame(config)
  ├── Resolve Java path
  ├── Build JVM arguments
  ├── Execute minecraft launcher
  ├── Monitor process
  └── Return PID & status
```

**API Response Format:**
```typescript
{
  "success": boolean,
  "data": T | undefined,
  "error": string | undefined,
  "timestamp": number
}
```

---

### 2.3 Tauri Backend (Rust)

**Location:** `src-tauri/`

**Responsibilities:**
1. **Sidecar Process Management**
   - Spawn Node.js process on app launch
   - Monitor process health
   - Clean shutdown on exit

2. **System Integration**
   - File system access
   - Process management
   - Window management

3. **Inter-Process Communication**
   - Invoke handlers for frontend commands
   - Managed state for process references

**Main Rust Flow:**
```rust
main()
  ├── Setup app state (SidecarState)
  ├── Call setup hook
  │   ├── Start sidecar process
  │   ├── Verify health check
  │   └── Handle errors
  ├── Register invoke handlers
  └── Handle exit event (cleanup sidecar)
```

**Key Functions:**
- `start_sidecar()` - Spawns Node.js process
- `kill_sidecar()` - Gracefully terminates sidecar
- `get_sidecar_status()` - Checks if running

---

## 3. Data Flow Scenarios

### Scenario 1: Create and Launch a Game Instance

```
1. USER ACTION
   ├── Fills "Create Instance" dialog
   └── Clicks "Create" button

2. FRONTEND (React)
   ├── Validates form input
   ├── Calls api.createInstance(config)
   └── Updates Zustand store

3. API REQUEST
   ├── POST /api/instances
   ├── Body: { name, version, loader, ram }
   └── Sent to http://localhost:7680

4. BACKEND (Express)
   ├── Validates request
   ├── Calls instanceManager.createInstance()
   ├── Generates UUID: e.g., "550e8400-e29b-41d4-a716-446655440000"
   ├── Creates directory: ~/.minecraft-launcher/instances/{UUID}/.minecraft/mods
   ├── Saves instance.json config
   └── Returns Instance object

5. API RESPONSE
   ├── 201 Created
   ├── Body: { success: true, data: Instance, timestamp }
   └── Sent to frontend

6. FRONTEND (React)
   ├── Receives response
   ├── Adds instance to store.instances
   ├── Selects new instance
   └── Updates UI

7. LAUNCH REQUEST
   ├── User clicks "Play" button
   ├── Frontend calls api.launchGame(instanceId, username)

8. BACKEND
   ├── POST /api/launch
   ├── instanceManager.getInstance(instanceId)
   ├── xmclManager.launchGame(config)
   ├── Spawns Minecraft process
   ├── Returns { success: true, pid: 12345 }

9. FRONTEND
   ├── Shows "Game launched" message
   ├── Updates lastPlayed timestamp
   └── Disables launch button while running
```

### Scenario 2: Install a Mod

```
1. USER ACTION
   ├── Navigates to Mods tab
   ├── Clicks "Add Mod"
   └── Selects mod file

2. FRONTEND
   ├── Calls api.addMod(instanceId, modPath)
   ├── Shows loading indicator

3. BACKEND
   ├── POST /api/mods/{instanceId}/add
   ├── Validates mod file
   ├── Copies mod to instance/.minecraft/mods/
   ├── Updates instance config
   └── Returns Mod object

4. FRONTEND
   ├── Adds mod to store.instances[instanceId].mods
   ├── Updates mod list UI
   └── Shows success notification
```

### Scenario 3: Download Manager

```
1. FRONTEND
   ├── User initiates download
   ├── Calls api.startDownload(name, url, type)

2. BACKEND
   ├── Creates Download object with UUID
   ├── Starts async download simulation
   ├── Returns Download object with id

3. POLLING (Frontend)
   ├── Every 1 second: api.getDownloads()
   ├── Updates progress bar
   ├── Shows ETA and speed

4. BACKEND (Async)
   ├── Simulates download progress
   ├── Updates Download.progress, .downloaded, .speed
   ├── On complete: status = 'completed'

5. FRONTEND
   ├── Detects completion
   ├── Shows success notification
```

---

## 4. State Management

### Zustand Store Architecture

```typescript
// Single global store
const useStore = create<StoreState>((set, get) => ({
  // State
  instances: [],
  selectedInstanceId: undefined,
  downloads: [],
  settings: {...},
  currentScreen: 'dashboard',
  isLaunching: false,

  // Actions
  loadInstances: async () => {
    // Fetch from API
    // Call set() to update state
  },
  
  createInstance: async (config) => {
    // Call API
    // Update store
  },
  
  // etc...
}))
```

**Benefits:**
- Single source of truth
- No prop drilling
- Simple subscription model
- Good TypeScript support

**State Persistence:**
- Settings saved to localStorage
- Instances loaded from sidecar on startup
- Downloads tracked in memory during session

---

## 5. Error Handling

### API Error Flow

```
Frontend Error ─→ Call api.method()
                    │
                    ├─→ Catch block
                    │   ├─→ Log error
                    │   ├─→ Show notification
                    │   └─→ Reset loading state
                    │
Backend Error ─→ Express Error Handler
                    ├─→ Log to console/file
                    ├─→ Serialize error message
                    ├─→ Return 4xx/5xx status
                    └─→ JSON error response
```

**Error Response Format:**
```json
{
  "success": false,
  "error": "Instance not found",
  "timestamp": 1234567890
}
```

---

## 6. Security Model

### Trust Boundaries

```
┌─────────────────────────────────────┐
│    UNTRUSTED: User-Provided Input   │
└──────────────────┬──────────────────┘
                   │ Validate input
                   ▼
┌─────────────────────────────────────┐
│    TRUSTED: Backend/Filesystem      │
├─────────────────────────────────────┤
│ • No arbitrary code execution       │
│ • Sanitized file paths              │
│ • Restricted to game directories    │
└─────────────────────────────────────┘
```

**Security Measures:**
1. **Input Validation**
   - Check instance names (alphanumeric)
   - Validate version IDs
   - Verify mod files are .jar

2. **Path Sanitization**
   - All paths relative to ~/.minecraft-launcher/
   - No ../ traversal allowed
   - Restrict to specific subdirectories

3. **Network Security**
   - Only localhost HTTP (7680)
   - CORS protection enabled
   - No cross-domain requests

4. **File Access**
   - Tauri fs plugin restricted to safe paths
   - No direct access to System32, etc.
   - Instance directories isolated

---

## 7. Performance Considerations

### Frontend Performance

**Optimization Strategies:**
- Next.js static export reduces bundle size
- Material UI tree-shaking removes unused components
- Zustand minimizes re-renders with selectors
- Image optimization (if added)
- Code splitting at route level

**Bundle Analysis:**
```bash
# Check final bundle size
npm run build --prefix renderer
# Output files in renderer/out/
```

### Backend Performance

**Optimization Strategies:**
- Async/await for I/O operations
- Connection pooling (for future DB)
- Caching frequently accessed data
- Efficient logging (pino)
- Indexed file searches

**Scaling Considerations:**
- Current: In-memory download tracking
- Future: Database for persistent storage
- Queue system for large operations
- Worker threads for CPU-intensive tasks

### Tauri Performance

**Advantages:**
- Rust native compilation (faster than Electron)
- Smaller memory footprint
- Direct system access without Chromium overhead
- Single combined binary

---

## 8. Extension Points

### Adding New Routes

```
1. Create dto/request file: sidecar/src/routes/newfeature.ts
2. Define validation and logic
3. Register in sidecar/src/index.ts: app.use('/api/newfeature', routes)
4. Create API method in renderer/src/api/client.ts
5. Add Zustand action in renderer/src/store/index.ts
6. Build UI component in renderer/src/components/
```

### Adding New Screens

```
1. Create component: renderer/src/components/screens/NewScreen.tsx
2. Add screen type to AppState['currentScreen']
3. Add navigation item in Layout.tsx
4. Create route handler in Layout navigation
```

### Adding XMCL Features

```
1. Add method to XmclManager: sidecar/src/core/xmcl-manager.ts
2. Create route handler in appropriate router file
3. Expose through API
4. Implement frontend UI
```

---

## 9. Testing Strategy

### Unit Tests (Per Component)

```typescript
// sidecar/src/__tests__/instance-manager.test.ts
describe('InstanceManager', () => {
  it('should create instance with valid config', async () => {
    const instance = await instanceManager.createInstance({
      name: 'Test',
      version: '1.20.1'
    });
    expect(instance.id).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// tests/api.integration.test.ts
describe('Instance API', () => {
  it('should create and retrieve instance', async () => {
    const created = await api.createInstance({...});
    const retrieved = await api.getInstance(created.id);
    expect(retrieved.id).toEqual(created.id);
  });
});
```

### E2E Tests (Tauri)

```typescript
// tests/launcher.e2e.test.ts
describe('Launcher Flow', () => {
  it('should launch game', async () => {
    // Tauri test suite (to be implemented)
  });
});
```

---

## 10. Deployment Strategy

### Development
- Hot reload enabled
- Source maps available
- Debug logging
- CORS permissive

### Production
- Minified builds
- Source maps disabled
- Error tracking enabled
- CORS restricted

### Distribution
- Single .exe file (bundled)
- Node.js sidecar included
- Auto-updates (future)
- Digital signing (future)

---

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Scalable structure for new features
- ✅ Secure inter-process communication
- ✅ Efficient resource usage
- ✅ Professional Material UI appearance

The modular design allows incremental feature additions without major refactoring.
