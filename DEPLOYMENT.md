# 🚀 Deployment & Distribution Guide

This guide covers building, packaging, and distributing the Minecraft Launcher for production.

---

## Prerequisites

- ✅ Development environment fully set up
- ✅ All tests passing
- ✅ Code reviewed and ready for release
- ✅ Version numbers updated

---

## Build Process

### 1. Clean Previous Builds

```bash
npm run clean
```

This removes:
- `renderer/out/` - React build output
- `renderer/.next/` - Next.js cache
- `sidecar/dist/` - Node.js build output
- `src-tauri/target/` - Rust build artifacts

### 2. Build All Components

```bash
npm run build
```

**This will:**
1. Compile Node.js sidecar (`.ts` → `.js`)
2. Export React to static files
3. Build Tauri application
4. Generate Windows executable

**Expected output:**
```
✓ Sidecar compiled to: sidecar/dist/
✓ React exported to: renderer/out/
✓ Executable created: src-tauri/target/release/minecraft-launcher.exe
✓ Installer created: src-tauri/target/release/bundle/nsis/minecraft-launcher_1.0.0_x64-setup.exe
```

### 3. Verify Build Contents

Check that all components are included:

```bash
# Verify sidecar
ls sidecar/dist/index.js

# Verify React
ls renderer/out/index.html

# Verify executable exists
ls src-tauri/target/release/minecraft-launcher.exe
```

---

## Testing Production Build

### Local Testing

```bash
# Run the built executable
./src-tauri/target/release/minecraft-launcher.exe
```

### Test Cases

- [ ] Application starts without errors
- [ ] Sidecar service starts automatically
- [ ] Health check responds (http://localhost:7680/health)
- [ ] Can create instances
- [ ] Can launch game
- [ ] Can add mods
- [ ] Theme toggle works
- [ ] Settings persist
- [ ] Clean shutdown (no orphaned processes)

### Verify No Development Dependencies

```bash
# Check that dev dependencies aren't bundled
unzip -l src-tauri/target/release/minecraft-launcher.exe | grep node_modules
# Should return no results
```

---

## Package Distribution

### Windows Installer (NSIS)

Tauri automatically creates an NSIS installer:

```
📦 src-tauri/target/release/bundle/nsis/
├── minecraft-launcher_1.0.0_x64-setup.exe
└── minecraft-launcher_1.0.0_x64-setup.nsis.log
```

**Features included:**
- Install to Program Files
- Create Start Menu shortcuts
- Add to Programs & Features
- Uninstall support
- Auto-detect existing installation

**Test installer:**
```bash
# Run the installer
./src-tauri/target/release/bundle/nsis/minecraft-launcher_1.0.0_x64-setup.exe

# Test:
1. Launch from Start Menu
2. Check Program Files location
3. Test uninstall
```

### Portable Executable

For portable/USB distribution:

```bash
# Copy the executable
cp src-tauri/target/release/minecraft-launcher.exe minecraft-launcher-portable.exe

# Works from any location without installation
```

**Advantages:**
- No installation required
- Runs from USB drive
- No registry changes
- Portable to other machines

---

## Release Checklist

### Pre-Release

- [ ] Version number updated in:
  - [ ] `package.json` (root)
  - [ ] `sidecar/package.json`
  - [ ] `renderer/package.json`
  - [ ] `src-tauri/Cargo.toml`
  - [ ] `src-tauri/tauri.conf.json`

- [ ] Changelog updated (`CHANGELOG.md`)
  
- [ ] All tests passing
  ```bash
  npm run lint
  npm test
  ```

- [ ] Code review completed

- [ ] Dependencies up to date
  ```bash
  npm outdated --prefix renderer
  npm outdated --prefix sidecar
  cargo outdated
  ```

### Build Release

```bash
# Ensure clean state
npm run clean

# Build
npm run build

# Verify artifacts
ls -la src-tauri/target/release/
```

### Sign Executable (Optional but Recommended)

```powershell
# Using Microsoft Authenticode (paid certificate)
signtool sign /f certificate.pfx /p password /fd SHA256 minecraft-launcher.exe

# Verify signature
signtool verify /pa minecraft-launcher.exe
```

### Create Release Notes

**File:** `RELEASE_NOTES.md`

```markdown
# Minecraft Launcher v1.0.0

## Features
- Create and manage Minecraft instances
- Install Fabric/Forge loaders
- Manage mods per instance
- Download tracking
- Material UI interface

## Bug Fixes
- Fixed sidecar startup timing
- Improved error messages

## Downloads
- minecraft-launcher_1.0.0_x64-setup.exe (Installer)
- minecraft-launcher-portable.exe (Portable)

## Installation
1. Download the installer
2. Run the setup wizard
3. Launch from Start Menu

## System Requirements
- Windows 10 or later
- 2GB RAM minimum
- 1GB disk space
```

---

## Distribution Channels

### GitHub Releases

1. **Create Release**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Upload on GitHub**
   - Create release on GitHub
   - Upload `.exe` files
   - Add release notes

### Direct Download

Host on a server:
```bash
scp minecraft-launcher_1.0.0_x64-setup.exe user@server:/var/www/html/download/
```

Provide download link:
```
https://download.minecraftlauncher.dev/minecraft-launcher_1.0.0_x64-setup.exe
```

### Auto-Update (Future)

Tauri supports auto-updates:

```rust
// src-tauri/src/main.rs
use tauri::updater::builder;

.setup(|app| {
  builder(app.handle())
    .check_updates()
    .on_window_event(|_window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
      }
    })
    .build()
})
```

---

## Performance Optimization Checklist

### Binary Size Optimization

```toml
# src-tauri/Cargo.toml
[profile.release]
panic = "abort"          # Smaller panic handler
codegen-units = 1       # Better optimization
lto = true              # Link-time optimization
opt-level = "z"         # Optimize for size (not speed)
strip = true            # Remove debug symbols
```

**Result:** ~20-30% smaller binary

### Memory Usage

```bash
# Monitor during startup
tasklist /v | findstr minecraft-launcher

# Should use < 200MB at startup
```

### Startup Time

Measure startup time:
```powershell
Measure-Command { & 'src-tauri/target/release/minecraft-launcher.exe' }
```

Target: < 3 seconds

---

## Troubleshooting Production Builds

### Issue: Executable won't run

**Solution:** Check Visual C++ Runtime:
```powershell
# Install VC++ Redistributable
# Download from: https://support.microsoft.com/en-us/help/2977003
```

### Issue: Sidecar not starting in production

**Solution:** Verify bundled Node.js:
```bash
# Check tauri.conf.json for correct bundle path
# Check that dist/ exists in bundle

# In production, sidecar should be in:
# %APPDATA%/minecraftlauncher/resources/sidecar/
```

### Issue: Installer fails

**Solution:** Check NSIS configuration:
```bash
# View detailed installer log
cat src-tauri/target/release/bundle/nsis/*.log
```

### Issue: App crashes on startup

**Solution:** Check logs:
```bash
# Tauri logs to:
# %APPDATA%/minecraftlauncher/logs/

tail -f "$env:APPDATA/minecraftlauncher/logs/*"
```

---

## Post-Release

### Monitor Crash Reports

Implement crash reporting:
```typescript
// renderer/src/App.tsx
window.addEventListener('error', (event) => {
  // Send crash report to server
  reportCrash(event.error);
});
```

### Collect User Feedback

- GitHub Issues
- Email support
- Feedback form in app

### Update Roadmap

Track feature requests and bugs:
- High priority issues
- Common pain points
- Requested features

### Plan Minor Updates

For bug fixes and small features:
```bash
# Update version to 1.0.1
npm version patch --prefix renderer
npm version patch --prefix sidecar
```

---

## Security Considerations for Release

### Before Publishing

1. **Security Audit**
   - Review API endpoints for vulnerabilities
   - Check for hardcoded secrets
   - Verify input validation

2. **Dependency Audit**
   ```bash
   npm audit --prefix renderer
   npm audit --prefix sidecar
   cargo audit
   ```

3. **Code Review**
   - Security-focused code review
   - Check for privilege escalation risks
   - Verify file access is restricted

### Code Signing (Highly Recommended)

1. **Get Code Signing Certificate**
   - From DigiCert, Sectigo, etc.
   - ~$300-400/year

2. **Sign Executable**
   ```powershell
   signtool sign /f certificate.pfx /p password /fd SHA256 /tr http://timestamp.sectigo.com minecraft-launcher.exe
   ```

3. **Benefits:**
   - Windows doesn't show "Unknown Publisher" warning
   - Users trust the application more
   - Better reputation

### Update Tauri Security Policy

```json
{
  "tauri": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'"
    }
  }
}
```

---

## Version Management

### Semantic Versioning

```
1.0.0
│ │ └─ Patch (bug fixes)
│ └─── Minor (new features)
└───── Major (breaking changes)
```

**Examples:**
- 1.0.0 - Initial release
- 1.0.1 - Bug fixes
- 1.1.0 - New feature (backward compatible)
- 2.0.0 - Major rewrite

### Update All Versions

Create a script to update all version numbers:

```bash
#!/bin/bash
VERSION="1.0.1"

# Update root
npm version --no-git-tag-version ${VERSION}

# Update sidecar
npm version --no-git-tag-version ${VERSION} --prefix sidecar

# Update renderer
npm version --no-git-tag-version ${VERSION} --prefix renderer

# Update Tauri
sed -i "s/version = \".*\"/version = \"${VERSION}\"/" src-tauri/Cargo.toml
sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json

echo "Version updated to ${VERSION}"
```

---

## Rollback Plan

If a release has critical issues:

1. **Immediately discontinue distribution**
2. **Post-security notice**
3. **Fix the issue**
4. **Rebuild and test thoroughly**
5. **Release hotfix (1.0.1)**
6. **Notify users**

---

## Success Metrics

After release, monitor:

- ✅ Number of downloads
- ✅ Crash rate (should be < 1%)
- ✅ User adoption
- ✅ GitHub stars
- ✅ Feature requests
- ✅ Bug reports

---

**Congratulations! 🎉 Your launcher is ready for production!**
