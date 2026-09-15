// electron-builder afterPack hook.
//
// Installs the compiled Icon Composer asset catalog (build/Assets.car) into the packed
// .app and sets CFBundleIconName so macOS 26+ renders the dynamic "Liquid Glass" app icon.
// Runs before code signing, so the added resources and plist change are signed correctly.
// The static build/icon.icns (wired via CFBundleIconFile by electron-builder) remains the
// fallback on the DMG, in Finder, and on macOS < 26.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const projectDir = context.packager.info.projectDir;
  const carSrc = path.join(projectDir, 'build', 'Assets.car');

  if (!fs.existsSync(carSrc)) {
    console.warn(
      '[afterPack] build/Assets.car not found — skipping the macOS 26 Liquid Glass icon ' +
        '(the static icon.icns still applies). Run "npm run build:icon" to generate it.'
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const resourcesDir = path.join(appPath, 'Contents', 'Resources');
  const infoPlist = path.join(appPath, 'Contents', 'Info.plist');

  fs.copyFileSync(carSrc, path.join(resourcesDir, 'Assets.car'));
  execFileSync('plutil', ['-replace', 'CFBundleIconName', '-string', 'MainIcon', infoPlist]);

  console.log('[afterPack] Installed Assets.car + CFBundleIconName=MainIcon (macOS 26 Liquid Glass icon).');
};
