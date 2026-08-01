import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mysql from 'mysql2/promise';

// Paths to configuration files
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
const UPGRADE_CONFIG_PATH = path.join(process.cwd(), 'upgrade-config.json');
const CLOUD_MANIFEST_URL = 'https://aicertification.oss-cn-hangzhou.aliyuncs.com/updates/manifest.json';

/**
 * Fetches the latest version from Aliyun OSS or MySQL Database
 */
async function getRemoteVersion(): Promise<string | null> {
  // 1. Try OSS Manifest
  try {
    console.log(`[Auto-Version] Fetching remote version from Aliyun Manifest...`);
    const response = await axios.get(CLOUD_MANIFEST_URL, { timeout: 5000 });
    if (response.data && response.data.version) {
      const version = response.data.version.replace(/^v/, '');
      console.log(`[Auto-Version] Remote cloud version (OSS) detected: v${version}`);
      return version;
    }
  } catch (err: any) {
    console.warn(`[Auto-Version] OSS manifest not found or restricted: ${err.message}.`);
  }

  // 2. Try MySQL Database (using credentials from publish.ts context)
  try {
    console.log(`[Auto-Version] Fetching remote version from Cloud MySQL...`);
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '39.105.83.161',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'pc',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pc',
      connectTimeout: 5000
    });
    
    const [rows]: any = await conn.query(
      "SELECT version FROM app_versions ORDER BY created_at DESC LIMIT 1"
    );
    await conn.end();
    
    if (rows && rows.length > 0) {
      const version = rows[0].version.replace(/^v/, '');
      console.log(`[Auto-Version] Remote cloud version (DB) detected: v${version}`);
      return version;
    }
  } catch (err: any) {
    console.warn(`[Auto-Version] Database fetch failed: ${err.message}.`);
  }

  return null;
}

/**
 * Increments the patch version in package.json and updates upgrade-config.json
 */
export async function bumpVersion() {
  try {
    if (process.env.SKIP_AUTO_VERSION_BUMP === 'true') {
      console.log('[Auto-Version] Skipping automatic version bump (publishing or building exe in progress)');
      return null;
    }

    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      console.error('[Auto-Version] package.json not found.');
      return null;
    }

    const packageJsonRaw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
    const packageJson = JSON.parse(packageJsonRaw);
    let currentBaseVersion = packageJson.version;

    if (!currentBaseVersion) {
      console.warn('[Auto-Version] No version found in package.json');
      return null;
    }

    // 1. Check Aliyun Cloud Version (Highest Priority)
    const remoteVersion = await getRemoteVersion();
    if (remoteVersion && isVersionHigher(remoteVersion, currentBaseVersion)) {
      console.log(`[Auto-Version] Cloud version (v${remoteVersion}) is higher than local base (v${currentBaseVersion}). Aligning to Cloud.`);
      currentBaseVersion = remoteVersion;
    }

    // 2. Check upgrade-config.json for a higher version to prevent downgrades
    if (fs.existsSync(UPGRADE_CONFIG_PATH)) {
      try {
        const upgradeConfigRaw = fs.readFileSync(UPGRADE_CONFIG_PATH, 'utf-8');
        const upgradeConfig = JSON.parse(upgradeConfigRaw);
        const cloudVersion = upgradeConfig.latestVersion?.replace(/^v/, '');
        
        if (cloudVersion && isVersionHigher(cloudVersion, currentBaseVersion)) {
          console.log(`[Auto-Version] Detected higher version in upgrade-config.json (${cloudVersion} > ${currentBaseVersion}). Using as base.`);
          currentBaseVersion = cloudVersion;
        }
      } catch (err) {
        // Ignore parsing errors, fall back to package.json
      }
    }

    // Parse major.minor.patch
    const versionMatch = currentBaseVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!versionMatch) {
      console.warn(`[Auto-Version] Version format ${currentBaseVersion} is not major.minor.patch`);
      return null;
    }

    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);
    const patch = parseInt(versionMatch[3], 10) + 1;
    const newVersion = `${major}.${minor}.${patch}`;

    // Update package.json
    const oldPackageVersion = packageJson.version;
    packageJson.version = newVersion;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
    console.log(`[Auto-Version] package.json version bumped: ${oldPackageVersion} -> ${newVersion}`);

    // Update upgrade-config.json if it exists
    if (fs.existsSync(UPGRADE_CONFIG_PATH)) {
      try {
        const upgradeConfigRaw = fs.readFileSync(UPGRADE_CONFIG_PATH, 'utf-8');
        const upgradeConfig = JSON.parse(upgradeConfigRaw);
        const oldUpgradeVersion = upgradeConfig.latestVersion;
        
        upgradeConfig.latestVersion = `v${newVersion}`;
        upgradeConfig.releaseDate = new Date().toISOString().split('T')[0];
        
        fs.writeFileSync(UPGRADE_CONFIG_PATH, JSON.stringify(upgradeConfig, null, 2), 'utf-8');
        console.log(`[Auto-Version] upgrade-config.json latestVersion updated: ${oldUpgradeVersion} -> v${newVersion}`);
      } catch (err: any) {
        console.error('[Auto-Version] Failed to update upgrade-config.json:', err.message);
      }
    }

    return newVersion;
  } catch (err: any) {
    console.error('[Auto-Version] Error bumping version:', err.message);
    return null;
  }
}

/**
 * Compares two semver versions (major.minor.patch)
 */
function isVersionHigher(v1: string, v2: string): boolean {
  const parts1 = v1.split('.').map(p => parseInt(p, 10));
  const parts2 = v2.split('.').map(p => parseInt(p, 10));
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return true;
    if (parts1[i] < parts2[i]) return false;
  }
  return false;
}

// Watcher setup
let watchTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 3000; // 3 seconds debounce

export function startWatcher() {
  console.log('[Auto-Version] Initializing code change watcher...');
  const watchTargets = ['src', 'components', 'electron'];
  
  const ignoredFiles = [
    'package.json',
    'package-lock.json',
    'upgrade-config.json',
    'upgrade-history.json',
    'db-config.json',
    'ai-settings.json',
  ];

  const ignoredFolders = [
    'node_modules',
    'dist',
    'publish',
    'dist-exe',
    '.git',
    'tmp',
    'workspace'
  ];

  const handleFileChange = (filePath: string) => {
    // Exclude ignored files and directories
    const relativePath = path.relative(process.cwd(), filePath);
    const parts = relativePath.split(path.sep);
    
    if (parts.some(part => ignoredFolders.includes(part) || part.startsWith('.'))) {
      return;
    }

    const fileName = path.basename(filePath);
    if (ignoredFiles.includes(fileName) || fileName.startsWith('.')) {
      return;
    }

    // Only watch source file extensions
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json'];
    if (!validExtensions.includes(ext)) {
      return;
    }

    // Debounce the bump to avoid multiple saves triggering multiple increments
    if (watchTimeout) {
      clearTimeout(watchTimeout);
    }

    watchTimeout = setTimeout(() => {
      console.log(`\n[Auto-Version] Detected program modification at: ${relativePath}`);
      bumpVersion();
    }, DEBOUNCE_MS);
  };

  // Setup recursive watch for each target directory
  watchTargets.forEach(target => {
    const fullPath = path.join(process.cwd(), target);
    if (fs.existsSync(fullPath)) {
      recursiveWatch(fullPath, handleFileChange);
    }
  });

  // Also watch index.html and vite.config.ts in the root
  const rootFiles = ['index.html', 'vite.config.ts'];
  rootFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      fs.watch(fullPath, (event) => {
        if (event === 'change') {
          handleFileChange(fullPath);
        }
      });
    }
  });

  console.log(`[Auto-Version] Watcher started. Watching folders: ${watchTargets.join(', ')}`);
}

function recursiveWatch(dirPath: string, callback: (filePath: string) => void) {
  try {
    fs.watch(dirPath, (event, filename) => {
      if (filename) {
        callback(path.join(dirPath, filename));
      }
    });
  } catch (e) {}

  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const ignoredFolders = ['node_modules', 'dist', 'publish', 'dist-exe', '.git', 'tmp'];
          if (!ignoredFolders.includes(file) && !file.startsWith('.')) {
            recursiveWatch(fullPath, callback);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

// Support direct command-line execution (e.g. tsx scripts/auto-version.ts --bump)
if (process.argv.includes('--bump')) {
  (async () => {
    await bumpVersion();
  })();
} else if (process.argv.includes('--watch')) {
  startWatcher();
}
