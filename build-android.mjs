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

// Automatically detect Java installation on Windows
const findJavaHome = () => {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }

  const searchPaths = [
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
  ];

  for (const basePath of searchPaths) {
    if (fs.existsSync(basePath)) {
      const isJavaBin = (p) => fs.existsSync(path.join(p, 'bin', 'java.exe')) || fs.existsSync(path.join(p, 'bin', 'java'));
      if (isJavaBin(basePath)) {
        return basePath;
      }
      try {
        const subdirs = fs.readdirSync(basePath);
        for (const subdir of subdirs) {
          const fullPath = path.join(basePath, subdir);
          if (isJavaBin(fullPath)) {
            return fullPath;
          }
        }
      } catch (e) {
        // ignore read errors
      }
    }
  }
  return null;
};

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

const configureAndroidSdk = (androidDir) => {
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\ssiya';
  const sdkPath = path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk');

  if (fs.existsSync(sdkPath)) {
    console.log(`🤖 Auto-detected Android SDK at: ${sdkPath}`);
    process.env.ANDROID_HOME = sdkPath;
    
    if (fs.existsSync(androidDir)) {
      const localPropsPath = path.join(androidDir, 'local.properties');
      const escapedPath = sdkPath.replace(/\\/g, '\\\\');
      fs.writeFileSync(localPropsPath, `sdk.dir=${escapedPath}\n`);
      console.log(`📝 Created local.properties with sdk.dir configuration`);
    }
  } else {
    console.warn('⚠️ Warning: Android SDK directory could not be found.');
  }
};

const configureGradleProperties = (androidDir) => {
  const gradlePropsPath = path.join(androidDir, 'gradle.properties');
  if (fs.existsSync(gradlePropsPath)) {
    let content = fs.readFileSync(gradlePropsPath, 'utf8');
    content = content.replace(
      /org\.gradle\.jvmargs=.*/g,
      'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m'
    );
    fs.writeFileSync(gradlePropsPath, content, 'utf8');
    console.log('📝 Patched gradle.properties with increased memory (-Xmx4096m -XX:MaxMetaspaceSize=1024m)');
  }
};

const build = async () => {
  const chatAppDir = path.join(__dirname, 'ChatApp');
  const androidDir = path.join(chatAppDir, 'android');
  
  const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const generatedAab = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  
  const destApk = path.join(rootBuildDir, 'app-release.apk');
  const destAab = path.join(rootBuildDir, 'app-release.aab');

  // Detect and apply Java env
  const javaHome = findJavaHome();
  if (javaHome) {
    console.log(`☕ Auto-detected Java installation: ${javaHome}`);
    process.env.JAVA_HOME = javaHome;
    process.env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH}`;
  } else {
    console.warn('⚠️ Warning: No Java installation (JAVA_HOME) could be automatically detected.');
  }

  try {
    console.log('📦 Starting Local Windows Android build via Expo Prebuild...');

    // 1. Generate Android Directory
    console.log('\n--- Running Expo Prebuild ---');
    await runCommand('npx', ['expo', 'prebuild', '--platform', 'android'], chatAppDir);

    // Configure Android SDK path and local.properties
    configureAndroidSdk(androidDir);
    
    // Patch Gradle properties memory limits
    configureGradleProperties(androidDir);

    // 2. Build Release APK and AAB using Gradle
    console.log('\n--- Building Release APK & AAB via Gradle ---');
    const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    
    // Build APK
    await runCommand(gradlewCmd, ['assembleRelease'], androidDir);
    
    // Build AAB
    await runCommand(gradlewCmd, ['bundleRelease'], androidDir);

    // 3. Copy outputs to root build/ folder
    console.log('\n--- Copying build assets ---');
    if (fs.existsSync(generatedApk)) {
      fs.copyFileSync(generatedApk, destApk);
      console.log(`✅ Copied APK to: ${destApk}`);
    } else {
      console.warn('⚠️ Warning: Generated APK file not found.');
    }

    if (fs.existsSync(generatedAab)) {
      fs.copyFileSync(generatedAab, destAab);
      console.log(`✅ Copied AAB to: ${destAab}`);
    } else {
      console.warn('⚠️ Warning: Generated AAB file not found.');
    }

    console.log('\n🎉 Build process finished!');
  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
  }
};

build();
