# BuiltByBitter

BuiltByBitter is an open source macOS desktop application for BuiltByBit creators. It provides a native interface to manage resources and addons, review sales and history, look up members, and publish updates with formatted BBCode changelogs.

Built specifically for macOS on Apple Silicon (arm64).

## Features

- **Resource & Addon Management:** Browse resources with covers, pricing, download stats, and associated addons.
- **Bulk Updates:** Stage updates for a product and its addons simultaneously. Drag and drop update files directly onto cards, compose the changelog once, and publish the entire release package in one step.
- **BBCode Changelog Composer:** Structured field-based editor that generates clean BBCode formatted for BuiltByBit releases.
- **Member Lookup:** Search members by ID, username, or Discord ID directly from the app.
- **Encrypted Keystore:** BuiltByBit Ultimate API keys and OAuth secrets are encrypted via Electron `safeStorage` in the macOS Keychain. Secrets are never sent to the renderer or stored unencrypted.
- **Zero-Config Database:** Uses an embedded SQLite database stored in your user profile with automatic migrations. No local Postgres or Docker setup required.

## Requirements

- macOS 11.0 or later
- Apple Silicon Mac (`arm64`)
- Node.js 20+ (for building from source)
- A BuiltByBit account with an Ultimate upgrade (required for API access)

## Getting Started

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/BuiltByBitter.git
cd BuiltByBitter
npm install
```

2. Start the application in development mode:

```bash
npm run dev
```

3. Configure authentication:
   - **BuiltByBit OAuth:** Follow the in-app prompt to enter your OAuth Client ID and Secret (redirect URI: `http://localhost:8788/api/auth/callback/builtbybit`).
   - **API Key:** Under Settings, paste your BuiltByBit Ultimate API key. It is verified and stored securely in your macOS Keychain.

## Packaging

To create a signed/notarized DMG build for Apple Silicon:

```bash
npm run build
```

The output DMG is generated in `dist/`.

## License

MIT License. See [LICENSE](LICENSE) for details.
