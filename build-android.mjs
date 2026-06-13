import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootBuildDir = path.join(__dirname, 'build');

// Ensure root build directory exists
if (!fs.existsSync(rootBuildDir)) {
  fs.mkdirSync(rootBuildDir, { recursive: true });
}

const runCommand = (command, args, cwd) => {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')} (in ${cwd})`);
    const proc = spawn(command, args, { cwd, stdio: 'inherit', shell: true });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
};

const build = async () => {
  const chatAppDir = path.join(__dirname, 'ChatApp');
  const apkDest = path.join(rootBuildDir, 'app-release.apk');
  const aabDest = path.join(rootBuildDir, 'app-release.aab');

  try {
    console.log('📦 Starting Android Builds...');

    // 1. Build APK (preview profile)
    console.log('\n--- Building APK (Preview Profile) ---');
    await runCommand(
      'npx',
      ['eas-cli', 'build', '--platform', 'android', '--profile', 'preview', '--local', `--output=${apkDest}`],
      chatAppDir
    );
    console.log(`✅ APK Build finished: ${apkDest}`);

    // 2. Build AAB (production profile)
    console.log('\n--- Building AAB (Production Profile) ---');
    await runCommand(
      'npx',
      ['eas-cli', 'build', '--platform', 'android', '--profile', 'production', '--local', `--output=${aabDest}`],
      chatAppDir
    );
    console.log(`✅ AAB Build finished: ${aabDest}`);

    console.log('\n🎉 Both builds completed successfully! Files are inside the "build" folder.');
  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
  }
};

build();
