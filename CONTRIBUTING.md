# Contributing to BuiltByBitter

BuiltByBitter is an open source desktop application for BuiltByBit creators built with Electron, React, shadcn/ui, and Tailwind CSS.

## Platform Target

- **Operating System:** macOS 11.0+
- **Architecture:** Apple Silicon (`arm64`) only. Intel (`x64`) is not supported or targeted.

## Architecture Overview

- **Main Process:** Electron application lifecycle, native macOS window customization, and IPC handlers.
- **Embedded Server:** Local Hono server listening exclusively on loopback for authentication via BetterAuth and proxying API interactions.
- **Data Layer:** Embedded SQLite database located in macOS `app.getPath('userData')`, managed via Drizzle ORM. Zero external database required.
- **Security & Keystore:** Sensitive secrets (OAuth Client Secret, BuiltByBit Ultimate API key) are encrypted via Electron `safeStorage` in the macOS Keychain. Secrets are never stored in plaintext, never saved to SQLite, and never exposed to the renderer process.
- **API Integration:** BuiltByBit operations use the `@builtbybit/api-wrapper` Node.js package with rate limiting and retry handling.
- **Renderer:** Vite + React, Tailwind CSS, shadcn/ui primitives (Radix UI), and Lucide icons.

## Development Setup

Requirements:
- Node.js 20+ (recommended: Node 22+)
- macOS running Apple Silicon

```bash
npm install
npm run dev
```

### Packaging

Build the Apple Silicon macOS DMG:

```bash
npm run build
```

## Guidelines for Contributions

1. **Clean Code:**
   - Write concise, readable, and strongly-typed TypeScript.
   - Do not add conversational, narrative, or redundant comments. Code should be self-documenting.
   - Do not leave commented-out code blocks or debugging logs in commits.

2. **UI & Styling:**
   - Keep UI consistent with shadcn/ui and macOS dark mode aesthetics.
   - Place reusable primitives in `src/renderer/src/components/ui/`.
   - Maintain drag-and-drop support for fast file uploads.

3. **Security Standards:**
   - Never expose API keys or OAuth secrets to the renderer or external logs.
   - Guard local API endpoints with session tokens.
   - Verify IPC arguments and handle errors gracefully.

4. **Git Workflow:**
   - Run `npm run typecheck` before committing changes.
   - Write clear, imperative commit messages.
   - Keep commits local; do not push without approval.
