# ⚡ Quick Start Guide

Get the Minecraft Launcher up and running in 5 minutes.

---

## 1️⃣ Prerequisites

Install once:

```bash
# Node.js 18+
https://nodejs.org/

# Rust
https://www.rust-lang.org/tools/install

# Git
https://git-scm.com/

# Windows Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# (Optional: Install via `npm install -g windows-build-tools`)
```

---

## 2️⃣ Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/minecraft-launcher.git
cd minecraft-launcher

# Install all dependencies
npm run install-all
```

**⏱️ Takes 2-3 minutes** (first time downloads packages)

---

## 3️⃣ Start Development

```bash
npm run dev
```

✅ Application window opens automatically

**What starts:**
- Sidecar API: `http://localhost:7680`
- React Dev: `http://localhost:3000`
- Tauri Window: Opens with hot-reload

---

## 4️⃣ Try It Out

In the launcher window:

1. **Dashboard Tab** - Shows sidecar health check
2. **Instances Tab** - Create a test instance
   - Name: "Test"
   - Version: "1.20.1"
   - Loader: "Vanilla"
   - Click "Create"
3. **See Stats** - Back to Dashboard
4. **Theme Toggle** - Click moon/sun icon in top-right

---

## 5️⃣ Make a Change

Try editing React code to see hot-reload:

**File:** `renderer/src/components/screens/Dashboard.tsx`

Change line ~14:
```tsx
// From:
<Typography variant="h4">
  Dashboard
</Typography>

// To:
<Typography variant="h4">
  🎮 Minecraft Dashboard
</Typography>
```

**Save** → Watch the window update instantly!

---

## Common Commands

```bash
# Start development (all 3 components)
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean

# Lint code
npm run lint

# Run just one component
npm run dev:sidecar       # Terminal 1
npm run dev:renderer      # Terminal 2
npm run dev:tauri        # Terminal 3
```

---

## Project Structure (Essential Files)

```
minecraft-launcher/
├── shared/types.ts              ← Type definitions
├── sidecar/src/
│   ├── index.ts                 ← Express server
│   └── routes/                  ← API endpoints
├── renderer/src/
│   ├── App.tsx                  ← Root component
│   ├── components/              ← UI screens
│   ├── api/client.ts            ← API calls
│   └── store/index.ts           ← State management
└── src-tauri/
    └── src/main.rs              ← Tauri setup
```

---

## Troubleshooting

### Port 7680 in use?
```bash
# Find process
netstat -ano | findstr :7680

# Kill it
taskkill /PID <PID> /F
```

### React not reloading?
```bash
# Kill process on port 3000
npm run dev:renderer
```

### Tauri won't build?
```bash
rustup update
npm run build:tauri
```

---

## Next Steps

After getting comfortable:

1. 📖 Read [README.md](README.md) - Full documentation
2. 🏗️ Read [ARCHITECTURE.md](ARCHITECTURE.md) - System design
3. 💻 Read [DEVELOPMENT.md](DEVELOPMENT.md) - Dev setup
4. 📚 Read [EXAMPLES.md](EXAMPLES.md) - How to add features
5. 🚀 Read [DEPLOYMENT.md](DEPLOYMENT.md) - Build for release

---

## Need Help?

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for setup issues
- See [EXAMPLES.md](EXAMPLES.md) for code examples
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for design questions

---

**Happy coding! 🚀**
