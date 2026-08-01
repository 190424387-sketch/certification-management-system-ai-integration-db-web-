import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import OSS from 'ali-oss';
import { glob } from 'glob';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || 'LTAI5t84pEEENiF8oibVJbzB',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || 'fGjhtzCp0kVRMJxinOcDNXZ0EseucA',
  bucket: process.env.OSS_BUCKET || 'aicertification',
  timeout: 600000, // 10 minutes timeout for large exe files
});

async function publish() {
  let targetVersion = process.argv[2];
  let changelog = process.argv[3];

  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (!targetVersion) {
    const parts = (pkgData.version || '1.0.0').split('.');
    if (parts.length === 3) {
      parts[2] = String(Number(parts[2]) + 1);
      targetVersion = parts.join('.');
      console.log(`🤖 No version provided. Auto-incremented to ${targetVersion}`);
    } else {
      targetVersion = '1.0.1';
    }
  } else {
    // Remove leading 'v' if present for package.json standardization
    targetVersion = targetVersion.replace(/^v/i, '');
  }

  if (!changelog) {
    changelog = '常规更新，修复已知缺陷及性能优化。';
    console.log(`🤖 No changelog provided. Using default: ${changelog}`);
  }

  console.log(`🚀 Preparing to publish version ${targetVersion}...`);

  // 1. Synchronize Version to package.json to ensure electron-builder uses it
  if (pkgData.version !== targetVersion) {
    console.log(`📝 Updating package.json version from ${pkgData.version} to ${targetVersion}...`);
    pkgData.version = targetVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
  }

  // Also synchronize to upgrade-config.json to prevent client-side version discrepancy
  const upgradeConfigPath = path.resolve(process.cwd(), 'upgrade-config.json');
  if (fs.existsSync(upgradeConfigPath)) {
    try {
      const upgradeConfigRaw = fs.readFileSync(upgradeConfigPath, 'utf-8');
      const upgradeConfig = JSON.parse(upgradeConfigRaw);
      const oldUpgradeVersion = upgradeConfig.latestVersion;
      
      upgradeConfig.latestVersion = `v${targetVersion}`;
      upgradeConfig.releaseDate = new Date().toISOString().split('T')[0];
      
      fs.writeFileSync(upgradeConfigPath, JSON.stringify(upgradeConfig, null, 2), 'utf-8');
      console.log(`📝 Updated upgrade-config.json latestVersion: ${oldUpgradeVersion} -> v${targetVersion}`);
    } catch (err: any) {
      console.error('⚠️ Failed to update upgrade-config.json:', err.message);
    }
  }

  // 2. Clean old builds and Regenerate the native application
  console.log(`🧹 Cleaning previous build and publish artifacts (dist, dist-exe, publish)...`);
  try {
    fs.rmSync(path.join(process.cwd(), 'dist'), { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), 'dist-exe'), { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), 'publish'), { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), 'electron/server.cjs'), { force: true });
  } catch (e) {
    console.warn(`⚠️ Clean script issue (safe to ignore if files didn't exist)`);
  }

  console.log(`🏗️ Compiling and Packaging native application (Please wait, this will take some time)...`);
  try {
    // Set environment flag to skip automatic version bump in prebuild/predev scripts
    process.env.SKIP_AUTO_VERSION_BUMP = 'true';
    execSync('npm run build:exe', { stdio: 'inherit', env: { ...process.env, SKIP_AUTO_VERSION_BUMP: 'true' } });
  } catch (err) {
    console.error('❌ Build failed. Aborting publish process.');
    process.exit(1);
  }

  const distDir = path.resolve(process.cwd(), 'publish');
  if (!fs.existsSync(distDir)) {
    console.error('❌ publish directory not found. The post-build script might have failed.');
    process.exit(1);
  }

  // 3. Generate Incremental Manifest.json
  const files = glob.sync('**/*', { cwd: distDir, nodir: true }).filter(f => f !== 'manifest.json' && f !== 'setup.exe');
  const manifest: Record<string, string> = {};

  for (const file of files) {
    const filePath = path.join(distDir, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    manifest[file] = hash;
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json incremental hash list generated.');

  // 4. Locate the newly built executable
  const exeDir = path.resolve(process.cwd(), 'dist-exe');
  let setupExePath = '';
  if (fs.existsSync(exeDir)) {
    const exeFiles = glob.sync('**/*.exe', { cwd: exeDir, nodir: true }).filter(f => !f.includes('blockmap') && !f.includes('unpacked'));
    if (exeFiles.length > 0) {
      // Sort by modification time descending
      exeFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(exeDir, a));
        const statB = fs.statSync(path.join(exeDir, b));
        return statB.mtimeMs - statA.mtimeMs;
      });
      setupExePath = path.join(exeDir, exeFiles[0]);
      console.log(`✅ Located Native Installation Package (Newest): ${exeFiles[0]}`);
    }
  }

  if (!fs.existsSync(setupExePath)) {
    console.error('❌ CRITICAL ERROR: Native executable (.exe) was not found in dist-exe after electron-builder completed.');
    process.exit(1);
  }

  // 5. Upload to OSS Cloud Storage
  console.log('☁️ Initializing OSS Cloud Upload Protocol...');
  // Standardize the cloud path to explicitly append 'v' for release directories
  const baseOssPath = `updates/v${targetVersion}`;

  try {
    const { name: url } = await ossClient.put(`${baseOssPath}/setup.exe`, setupExePath, {
      headers: { 'x-oss-object-acl': 'public-read' }
    });
    console.log(`🚀 setup.exe uploaded successfully: ${url}`);

    const { name: manifestUrl } = await ossClient.put(`${baseOssPath}/manifest.json`, manifestPath, {
      headers: { 'x-oss-object-acl': 'public-read' }
    });
    console.log(`🚀 manifest.json uploaded successfully: ${manifestUrl}`);

    // Upload incremental sub files for hot-updates
    console.log(`🚀 Uploading ${files.length} incremental files...`);
    for (const file of files) {
      await ossClient.put(`${baseOssPath}/files/${file.replace(/\\/g, '/')}`, path.join(distDir, file), {
        headers: { 'x-oss-object-acl': 'public-read' }
      });
    }
    console.log(`✅ Cloud upload phase completed flawlessly.`);

    // 6. Register deployment Version to Central MySQL Database
    console.log('💾 Syncing release records to Cloud Management Database...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '39.105.83.161',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'pc',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pc',
    });

    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_versions (
        version VARCHAR(50) PRIMARY KEY,
        url VARCHAR(255),
        manifest_url VARCHAR(255),
        changelog TEXT,
        is_delta BOOLEAN,
        force_update BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fully qualify the OSS resource paths
    const bucket = process.env.OSS_BUCKET || 'aicertification';
    const region = process.env.OSS_REGION || 'oss-cn-hangzhou';
    const bucketDomain = `https://${bucket}.${region}.aliyuncs.com`;
    const fullExeUrl = `${bucketDomain}/${url}`;
    const fullManifestUrl = `${bucketDomain}/${manifestUrl}`;
    const finalVersionName = `v${targetVersion}`;

    await conn.query(
      `INSERT INTO app_versions (version, url, manifest_url, changelog, is_delta, force_update)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         url = VALUES(url), 
         manifest_url = VALUES(manifest_url), 
         changelog = VALUES(changelog)`,
      [finalVersionName, fullExeUrl, fullManifestUrl, changelog, true, false]
    );

    await conn.end();
    console.log(`✅ System upgrade record locked. Clients will now receive version ${finalVersionName}.`);
    console.log('🎉 One-Click End-to-End Build & Publish Workflow Terminated Gracefully.');

  } catch (err) {
    console.error('❌ Fatal exception during Cloud Network Data Transmission: ', err);
    process.exit(1);
  }
}

publish();
