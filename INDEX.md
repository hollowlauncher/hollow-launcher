# 📑 Documentation Index

Complete guide to the Minecraft Launcher documentation.

---

## 🚀 Getting Started

**Start here!** These docs help you get up and running.

1. **[QUICKSTART.md](QUICKSTART.md)** ⚡
   - 5-minute setup
   - Basic commands
   - First test run
   - **Read this first if you're new**

2. **[DEVELOPMENT.md](DEVELOPMENT.md)** 💻
   - Complete prerequisites
   - Step-by-step setup
   - Development workflow
   - Debugging tips
   - VSCode configuration

---

## 📚 Understanding the System

Deep dive into how everything works.

3. **[ARCHITECTURE.md](ARCHITECTURE.md)** 🏛️
   - System design overview
   - Component interactions
   - Data flow diagrams
   - State management
   - Error handling
   - Security model
   - Performance optimization
   - Extension points

4. **[README.md](README.md)** 📋
   - Project overview
   - Feature list
   - API documentation
   - Build commands
   - Troubleshooting
   - Feature roadmap

---

## 💡 Implementation Guide

Learn how to add features.

5. **[EXAMPLES.md](EXAMPLES.md)** 📚
   - Example 1: Play time tracking
   - Example 2: Mod search & download
   - Example 3: Game log viewer
   - Example 4: Backup/export instances
   - Step-by-step implementation patterns

---

## 🚀 Deployment & Release

Prepare for production.

6. **[DEPLOYMENT.md](DEPLOYMENT.md)** 🎯
   - Build process
   - Testing production build
   - Package creation
   - Release checklist
   - Distribution channels
   - Performance optimization
   - Security considerations
   - Version management

---

## 📁 File Organization

### Documentation by Topic

#### Project Setup
- 🚀 **Starting Development**: QUICKSTART.md → DEVELOPMENT.md
- 🛠️ **System Customization**: Modify `package.json` scripts
- 📦 **Dependencies**: See `package.json` files

#### Frontend Development
- 📖 **React Components**: `renderer/src/components/`
- 🎨 **Material UI Theming**: `renderer/src/theme/index.ts`
- 🔌 **API Integration**: `renderer/src/api/client.ts`
- 📊 **State Management**: `renderer/src/store/index.ts`

#### Backend Development
- 🔧 **Core Logic**: `sidecar/src/core/`
- 🌐 **API Routes**: `sidecar/src/routes/`
- 📝 **Logging**: `sidecar/src/utils/logger.ts`

#### Desktop Integration
- 🦀 **Rust/Tauri**: `src-tauri/src/`
- ⚙️ **Configuration**: `src-tauri/tauri.conf.json`

---

## 🎯 Common Tasks

### I want to...

#### Get started quickly
→ [QUICKSTART.md](QUICKSTART.md)

#### Set up my development environment
→ [DEVELOPMENT.md](DEVELOPMENT.md)

#### Understand how the app works
→ [ARCHITECTURE.md](ARCHITECTURE.md)

#### Add a new feature
→ [EXAMPLES.md](EXAMPLES.md) → [ARCHITECTURE.md](ARCHITECTURE.md#8-extension-points)

#### Build for production
→ [DEPLOYMENT.md](DEPLOYMENT.md)

#### Troubleshoot an issue
→ [DEVELOPMENT.md](DEVELOPMENT.md#troubleshooting) or [README.md](README.md#-troubleshooting)

#### Understand the API
→ [README.md](README.md#-api-endpoints) or [ARCHITECTURE.md](ARCHITECTURE.md#3-data-flow-scenarios)

#### Deploy to users
→ [DEPLOYMENT.md](DEPLOYMENT.md#distribution-channels)

#### Optimize performance
→ [ARCHITECTURE.md](ARCHITECTURE.md#7-performance-considerations) or [DEPLOYMENT.md](DEPLOYMENT.md#performance-optimization-checklist)

---

## 📊 Document Quick Reference

| Document | Purpose | Length | Best For |
|----------|---------|--------|----------|
| QUICKSTART.md | Fast setup | 5 min read | New developers |
| DEVELOPMENT.md | Complete setup & workflow | 30 min read | First-time setup |
| ARCHITECTURE.md | System design | 40 min read | Understanding system |
| README.md | Project overview | 20 min read | General reference |
| EXAMPLES.md | How to add features | 45 min read | Feature development |
| DEPLOYMENT.md | Production release | 30 min read | Building & releasing |
| Documentation Index | Navigation | 5 min read | Finding docs |

---

## 🔍 Search Guide

### By Technology
- **React/TypeScript**: DEVELOPMENT.md → EXAMPLES.md
- **Node.js/Express**: ARCHITECTURE.md#2.2, EXAMPLES.md
- **Tauri/Rust**: ARCHITECTURE.md#2.3, DEVELOPMENT.md
- **Material UI**: ARCHITECTURE.md#4, README.md

### By Phase
- **Setup**: QUICKSTART.md → DEVELOPMENT.md
- **Development**: DEVELOPMENT.md, ARCHITECTURE.md
- **Enhancement**: EXAMPLES.md
- **Release**: DEPLOYMENT.md

### By Problem
- **Doesn't start**: QUICKSTART.md#troubleshooting
- **Port conflicts**: DEVELOPMENT.md#troubleshooting
- **Build fails**: DEVELOPMENT.md#troubleshooting
- **App crashes**: DEPLOYMENT.md#troubleshooting-production-builds
- **Performance**: ARCHITECTURE.md#7, DEPLOYMENT.md#performance-optimization-checklist

---

## 💡 Pro Tips

### Before Starting
1. Read QUICKSTART.md (5 min)
2. Install prerequisites
3. Run `npm run install-all`
4. Run `npm run dev`

### During Development
1. Keep ARCHITECTURE.md open for reference
2. Check EXAMPLES.md for similar features
3. Use DEVELOPMENT.md for debugging

### Before Release
1. Follow DEPLOYMENT.md checklist
2. Test with DEPLOYMENT.md test cases
3. Review security section

### When Stuck
1. Check relevant section in DEVELOPMENT.md
2. Search through ARCHITECTURE.md for similar pattern
3. Look at EXAMPLES.md for implementation reference

---

## 📝 Document Conventions

### Code Blocks
```bash
# Shell commands
npm run dev
```

```typescript
// TypeScript/JavaScript code
const instance = await api.getInstance(id);
```

```rust
// Rust code
fn start_sidecar() { }
```

### Formatting
- **Bold** for emphasis
- `code` for technical terms
- Emoji for visual scanning (🚀, 📖, ⚡, etc.)
- Links to related docs [like this](ARCHITECTURE.md)

### Terminology
- **Frontend/Renderer**: React + Material UI
- **Backend/Sidecar**: Node.js + Express
- **Desktop Layer/Tauri**: Rust/Tauri
- **Instance**: A Minecraft game installation
- **Mod**: Plugin/enhancement for Minecraft

---

## 🔄 Update Path

When you see outdated information:

1. Check if a newer version of a doc exists
2. Submit an issue on GitHub
3. Create a pull request with corrections
4. Update the relevant section

---

## 📞 Support

Can't find what you're looking for?

- **General questions**: Check ARCHITECTURE.md
- **Setup issues**: See DEVELOPMENT.md#troubleshooting
- **Adding features**: Go to EXAMPLES.md
- **Release questions**: Check DEPLOYMENT.md
- **Report bugs**: GitHub Issues

---

## 🎓 Learning Path

**Recommended reading order for new developers:**

1. QUICKSTART.md (fast overview)
2. DEVELOPMENT.md (complete setup)
3. ARCHITECTURE.md (understand system)
4. README.md (reference)
5. EXAMPLES.md (learn patterns)
6. Source code (explore implementation)

---

## 🚀 Next Steps

Choose based on your goal:

- **I want to run it**: [QUICKSTART.md](QUICKSTART.md)
- **I want to develop**: [DEVELOPMENT.md](DEVELOPMENT.md) → [ARCHITECTURE.md](ARCHITECTURE.md)
- **I want to add features**: [EXAMPLES.md](EXAMPLES.md)
- **I want to release**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **I want overview**: [README.md](README.md)

---

**Happy developing! 🎮**

[Back to README](README.md)
