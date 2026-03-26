# 🚀 Development Setup Guide

## Prerequisites Installation

### 1. Node.js & NPM

**Windows (Recommended: use Microsoft Store or Installer)**

```powershell
# Using Chocolatey (if installed)
choco install nodejs

# Or download from https://nodejs.org/
```

Verify installation:
```bash
node --version    # v18.0.0 or higher
npm --version     # 9.0.0 or higher
```

### 2. Rust & Cargo

**Install Rustup (Rust toolchain manager)**

```powershell
# Download and run installer from: https://www.rust-lang.org/tools/install
# Or use Windows Package Manager:
winget install Rustlang.Rust.GNU

# Verify installation
rustc --version
cargo --version
```

**Enable 64-bit target (for Windows):**
```bash
rustup target add x86_64-pc-windows-msvc
```

### 3. Git

```powershell
# Using Chocolatey
choco install git

# Or Windows Package Manager
winget install Git.Git
```

Verify:
```bash
git --version
```

### 4. Tauri Requirements (Windows)

**Install Windows Build Tools:**

```powershell
# Install Microsoft C++ Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Choose "Desktop development with C++" workload

# OR use chocolatey:
choco install microsoft-cpp-build-tools
```

---

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/minecraft-launcher.git
cd minecraft-launcher
```

### 2. Install Dependencies

**Install all dependencies at once:**

```bash
npm run install-all
```

**Or install separately:**

```bash
# Root dependencies
npm install

# Renderer (React/Next.js)
npm install --prefix renderer

# Sidecar (Node.js/Express)
npm install --prefix sidecar

# Tauri (Rust)
cd src-tauri
cargo build
cd ..
```

### 3. Verify Setup

Test each component:

```bash
# Test sidecar health
node sidecar/dist/index.js &
curl http://localhost:7680/health
# Should return: { "status": "ok", "timestamp": ... }

# Test React build
npm run build --prefix renderer

# Test Tauri
npm run tauri -- info
```

---

## Development Workflow

### Start Development Environment

**Terminal 1: Start All Components**
```bash
npm run dev
```

This starts:
- Sidecar API (localhost:7680)
- React dev server (localhost:3000)
- Tauri window (auto-launches)

### Alternative: Start Components Separately

**Terminal 1: Sidecar**
```bash
npm run dev:sidecar
```

**Terminal 2: React Frontend**
```bash
npm run dev:renderer
```

**Terminal 3: Tauri**
```bash
npm run dev:tauri
```

---

## File Structure for Development

```
project_launcher_01/
├── shared/
│   └── types.ts                 ← Shared types (edit & sync)
│
├── sidecar/                     ← Node.js Backend
│   ├── src/
│   │   └── index.ts             ← Main server entry
│   └── package.json
│
├── renderer/                    ← React Frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── store/
│   └── package.json
│
├── src-tauri/                   ← Tauri (Rust)
│   ├── src/
│   │   └── main.rs              ← Tauri setup & sidecar management
│   └── Cargo.toml
│
└── package.json                 ← Root configuration
```

---

## Key Development Tasks

### Adding a New Instance Feature

1. **Update Shared Types** (`shared/types.ts`)
   ```typescript
   export interface Instance {
     // Add your field
     myNewField: string;
   }
   ```

2. **Update Sidecar API** (`sidecar/src/routes/instances.ts`)
   ```typescript
   // Add validation and handling
   ```

3. **Update React Component** (`renderer/src/components/screens/Instances.tsx`)
   ```tsx
   // Add UI for the new field
   ```

4. **Test End-to-End**
   ```bash
   npm run dev
   # Test in the Tauri window
   ```

### Adding a New API Endpoint

1. Create route file: `sidecar/src/routes/new-feature.ts`
2. Export router
3. Import and register in `sidecar/src/index.ts`
4. Create API client method in `renderer/src/api/client.ts`
5. Use in React component

Example:
```typescript
// sidecar/src/routes/new-feature.ts
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

export default router;
```

```typescript
// sidecar/src/index.ts
import newFeatureRoutes from './routes/new-feature';
app.use('/api/new-feature', newFeatureRoutes);
```

---

## Environment Variables

### Sidecar
Create `.env` in `sidecar/`:
```bash
NODE_ENV=development
PORT=7680
LOG_LEVEL=debug
```

### Renderer
Create `.env.local` in `renderer/`:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:7680/api
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Tauri
Managed via `src-tauri/tauri.conf.json`

---

## Debugging

### Debug Sidecar (Node.js)

```typescript
// In sidecar code
const logger = createLogger('feature-name');
logger.info('Message', { data: value });
logger.error('Error', error);
```

View logs in terminal where sidecar is running.

### Debug React Frontend

```typescript
// In React component
console.log('Debug:', value);

// Or use browser DevTools
// In Tauri window: Ctrl+Shift+I
```

### Debug Tauri (Rust)

```rust
// In src-tauri/src/main.rs
println!("Debug: {:?}", value);

// Check stdout in terminal running Tauri
```

---

## Building for Production

### Build All Components

```bash
npm run build
```

This:
1. Builds sidecar to `sidecar/dist/`
2. Builds React to `renderer/out/`
3. Builds Tauri to `src-tauri/target/release/`

### Optimize for Production

**Reduce Bundle Size:**
```bash
# Analyze React bundle
npm run build --prefix renderer
npx next-bundle-analyzer

# Check Tauri binary size
cargo tree --release --prefix=depth
```

**Minify & Compress:**
- Next.js automatically minifies
- Tauri uses `opt-level = "z"` in Cargo.toml

---

## Testing

### Unit Tests (Setup)

**Create test file:**
```typescript
// sidecar/src/__tests__/instance-manager.test.ts
import { instanceManager } from '../core/instance-manager';

describe('InstanceManager', () => {
  it('should create instance', async () => {
    const instance = await instanceManager.createInstance({
      name: 'Test Instance',
      version: '1.20.1'
    });
    expect(instance.id).toBeDefined();
  });
});
```

**Run tests:**
```bash
npm test --prefix sidecar
```

---

## Common Issues & Solutions

### Issue: "Port 7680 already in use"
```bash
# Find process using port
netstat -ano | findstr :7680

# Kill process
taskkill /PID <PID> /F

# Or change port in sidecar/src/index.ts
```

### Issue: "Cannot find module '@xmcl/core'"
```bash
# Reinstall sidecar dependencies
rm -rf sidecar/node_modules package-lock.json
npm install --prefix sidecar
```

### Issue: "Tauri build fails"
```bash
# Update Rust
rustup update

# Clear cache
cargo clean

# Try building again
npm run build:tauri
```

### Issue: "React not hot-reloading"
```bash
# Stop Tauri
# Kill any Node processes on port 3000
# Restart: npm run dev:renderer
```

---

## VSCode Setup (Recommended)

### Extensions
- **Rust-analyzer** (for Rust intellisense)
- **Thunder Client** or **REST Client** (for API testing)
- **ES7+ React/Redux snippets**
- **Prettier** (code formatting)
- **ESLint**

### Workspace Settings (`.vscode/settings.json`)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

### Launch Configuration (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Sidecar",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/sidecar/dist/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Next Steps

1. ✅ Complete setup and verify all components run
2. ✅ Explore the codebase structure
3. ✅ Try making a small frontend change and see hot-reload
4. ✅ Make a test API call using the client
5. ✅ Build a test instance and try launching
6. ✅ Read ARCHITECTURE.md for deeper understanding

---

## Additional Resources

- [Tauri Docs](https://tauri.app/)
- [React Docs](https://react.dev/)
- [Material UI Docs](https://mui.com/)
- [Next.js Docs](https://nextjs.org/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Rust Book](https://doc.rust-lang.org/book/)

---

**Happy Coding! 🚀**
