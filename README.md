# 🎮 Hollow Launcher 

A high-performance, lightweight Minecraft launcher built with Tauri, React, Material UI, and Node.js XMCL backend.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 TAURI DESKTOP SHELL                     │
│          (manages sidecar, IPC, file system)            │
└─────────────────────────────────────────────────────────┘
                            ↕
        ┌───────────────────────────────────────┐
        │  Browser Window (Chromium)            │
        │  React + Material UI Frontend         │
        └───────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────┐
│        NODE.JS SIDECAR SERVICE (PORT 7680)             │
│  - Express.js API                                      │
│  - Instance Management                                 │
│  - Download Manager                                    │
│  - XMCL Core Integration                              │
│  ┌─────────────────────────────────────────────────┐  │
│  │        XMCL CORE / XMCL RUNTIME                 │  │
│  │  - Version Management                           │  │
│  │  - Minecraft Launching                          │  │
│  │  - Fabric/Forge Loader Support                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
                  [MINECRAFT GAME]
```

## 📋 Prerequisites

### Windows 10+ (or other OS)
- **Node.js**: 18.0.0 or later
- **Rust**: Latest stable (for Tauri compilation)
- **Cargo**: Comes with Rust
- **Git**: For version control
- **Java**: Auto-detection or manual path configuration

### Installation Steps

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version` (should be ≥ 18.0.0)

2. **Install Rust**
   ```bash
   # On Windows, download from https://www.rust-lang.org/
   # Or use rustup:
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   - Verify: `rustc --version` and `cargo --version`

3. **Install Tauri CLI (Optional but recommended)**
   ```bash
   npm install -g @tauri-apps/cli
   ```

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
# Install all dependencies
npm install-all
```

This will install:
- Root dependencies
- React/Next.js frontend dependencies
- Node.js sidecar dependencies

### 2. Development Mode

Run all three components concurrently:

```bash
npm run dev
```

This starts:
- **Sidecar API** on `http://localhost:7680`
- **React Dev Server** on `http://localhost:3000`
- **Tauri Window** with hot-reload

The app will open automatically. Any changes to React/frontend code will hot-reload in the window.

### 3. Build for Production

```bash
npm run build
```

This will:
1. Build the Node.js sidecar (`dist/` folder)
2. Build the React frontend (static export to `renderer/out/`)
3. Build the Tauri application (final `.exe` in `src-tauri/target/release/`)

### 4. Run Production Build

```bash
./src-tauri/target/release/minecraft-launcher.exe
```

---

## 📁 Project Structure

```
minecraft-launcher/
├── shared/
│   └── types.ts                 # Shared TypeScript interfaces
│
├── sidecar/                     # Node.js Express API
│   ├── src/
│   │   ├── index.ts            # Express server entry
│   │   ├── core/
│   │   │   ├── xmcl-manager.ts # XMCL integration
│   │   │   └── instance-manager.ts # Instance management
│   │   ├── routes/
│   │   │   ├── instances.ts    # Instance endpoints
│   │   │   ├── versions.ts     # Version management
│   │   │   ├── launch.ts       # Game launching
│   │   │   ├── downloads.ts    # Download tracking
│   │   │   └── mods.ts         # Mod management
│   │   └── utils/
│   │       └── logger.ts       # Logging utility
│   ├── package.json
│   └── tsconfig.json
│
├── renderer/                    # React + Next.js Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _document.tsx   # HTML wrapper
│   │   │   └── index.tsx       # Main page
│   │   ├── components/
│   │   │   ├── Layout.tsx      # Main layout & navigation
│   │   │   └── screens/
│   │   │       ├── Dashboard.tsx
│   │   │       ├── Instances.tsx
│   │   │       ├── Mods.tsx
│   │   │       ├── Downloads.tsx
│   │   │       └── Settings.tsx
│   │   ├── api/
│   │   │   └── client.ts       # API client
│   │   ├── store/
│   │   │   └── index.ts        # Zustand state management
│   │   ├── hooks/
│   │   │   └── useInitialize.ts # App initialization
│   │   ├── theme/
│   │   │   └── index.ts        # Material UI theme
│   │   └── App.tsx             # Root component
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── src-tauri/                   # Tauri Rust Backend
│   ├── src/
│   │   ├── main.rs             # Tauri entry point & setup
│   │   └── sidecar.rs          # Sidecar process management
│   ├── Cargo.toml              # Rust dependencies
│   ├── build.rs
│   └── tauri.conf.json         # Tauri configuration
│
└── package.json                # Root package.json
```

---

## 🔌 API Endpoints

All endpoints are prefixed with `http://localhost:7680/api`

### Instances
- `GET /instances` - Get all instances
- `GET /instances/:id` - Get specific instance
- `POST /instances` - Create instance
- `PUT /instances/:id` - Update instance
- `DELETE /instances/:id` - Delete instance

### Versions
- `GET /versions/manifest` - Get Minecraft version manifest
- `POST /versions/install` - Install a version
  ```json
  {
    "version": "1.20.1",
    "loader": "fabric",
    "loaderVersion": "latest"
  }
  ```

### Launching
- `POST /launch` - Launch Minecraft
  ```json
  {
    "instanceId": "uuid",
    "username": "Player"
  }
  ```

### Downloads
- `GET /downloads` - Get active downloads
- `POST /downloads/start` - Start download
- `POST /downloads/pause/:id` - Pause download
- `POST /downloads/resume/:id` - Resume download
- `DELETE /downloads/:id` - Cancel download

### Mods
- `GET /mods/:instanceId` - Get instance mods
- `POST /mods/:instanceId/add` - Add mod
- `DELETE /mods/:instanceId/:modId` - Remove mod

### Health
- `GET /health` - Health check

---

## 🎨 Material UI Implementation

The frontend uses official Material UI (`@mui/material`) with:

- **Theme System**: Light/Dark/System modes
- **Components**: AppBar, Drawer, Cards, Dialogs, Sliders, etc.
- **Styling**: `theme.palette`, `theme.spacing`, `theme.typography`
- **Responsive**: Mobile-first design with breakpoints

### Theme Colors
- **Primary**: `#3F51B5` (Indigo)
- **Secondary**: `#FF6B6B` (Red)
- **Success**: `#4CAF50`
- **Error**: `#F44336`
- **Warning**: `#FFA726`

---

## 🛠️ Development Commands

```bash
# Install all dependencies
npm run install-all

# Start development (all 3 components)
npm run dev

# Start only sidecar
npm run dev:sidecar

# Start only React frontend
npm run dev:renderer

# Start only Tauri
npm run dev:tauri

# Build everything
npm run build

# Build individual components
npm run build:sidecar
npm run build:renderer
npm run build:tauri

# Open Tauri CLI
npm run tauri

# Lint code
npm run lint

# Clean build artifacts
npm run clean

# Run tests (if implemented)
npm run test
```

---

## 📦 Building for Distribution

### Windows Executable

```bash
npm run build
```

Output:
```
src-tauri/target/release/minecraft-launcher.exe
```

### Bundling the Sidecar

The Node.js sidecar is bundled inside the Tauri app:

1. Built executable: `sidecar/dist/index.js`
2. Bundled in: `src-tauri/tauri.conf.json`'s `externalBin`
3. Launched automatically on app startup

### Installer/MSI (Windows)

Tauri automatically creates an NSIS installer:
```
src-tauri/target/release/bundle/nsis/
```

---

## 🔐 Security Considerations

1. **No Direct Node Access**: Frontend communicates only via localhost HTTP
2. **Input Validation**: All API endpoints validate inputs
3. **File Path Validation**: Mods and versions are stored in managed directories
4. **Restricted Shell Access**: Tauri shell plugin is restricted (sidecar only)
5. **CORS Protection**: Sidecar accepts requests only from localhost

---

## 🚨 Troubleshooting

### Sidecar Not Starting
```bash
# Check if port 7680 is in use
netstat -ao | findstr :7680

# Kill the process and try again
taskkill /PID <PID> /F
npm run dev
```

### React App Not Reloading
```bash
# Clear Next.js cache
npx next telemetry disable
rm -rf renderer/.next renderer/out
npm run dev:renderer
```

### Tauri Build Fails
```bash
# Update Rust
rustup update

# Clean build
cargo clean
npm run build:tauri
```

### Port Conflicts
Edit the port in `sidecar/src/index.ts`:
```typescript
const PORT = process.env.PORT || 7680;
```

---

## 📊 Performance Optimization

### Frontend
- Next.js static export for smaller bundle
- Material UI tree-shaking
- Zustand for minimal re-renders

### Backend
- Concurrent downloads with node-fetch
- In-memory caching for manifest
- Efficient file I/O with fs-extra

### Tauri
- Rust native compilation (faster than Electron)
- Minimal memory footprint
- Direct system access for file operations

---

## 🔄 Version Management

### Update XMCL
```bash
# In sidecar/package.json
"@xmcl/core": "^2.9.2",
"@xmcl/installer": "^2.9.2",
"@xmcl/runtime": "^0.45.0"

npm install --prefix sidecar
```

### Update Tauri
```bash
# In src-tauri/Cargo.toml
tauri = { version = "1.5", ... }
```

### Update React/MUI
```bash
npm install @mui/material@latest @mui/icons-material@latest --prefix renderer
```

---

## 📝 Feature Roadmap

- [ ] **Curseforge Integration**: Download mods from Curseforge
- [ ] **Modrinth Support**: Mod browser from Modrinth
- [ ] **Auto-Update**: Self-updating launcher
- [ ] **Multiplayer**: Quick join servers
- [ ] **Mod Profiles**: Mod pack support
- [ ] **Custom Skin**: Player skin manager
- [ ] **Performance Monitor**: FPS overlay
- [ ] **Cloud Saves**: Save sync to cloud

---

## 📄 License

MIT License - See LICENSE file

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

---

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@minecraftlauncher.dev

---

## 🙏 Acknowledgments

- **Tauri**: Desktop runtime
- **React**: UI framework
- **Material UI**: Component library
- **XMCL**: Minecraft launcher library
- **Express.js**: Backend framework

---

**Built with ❤️ by the Hollow Launcher Team**
