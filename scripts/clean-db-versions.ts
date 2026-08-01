import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG_FILE = path.join(process.cwd(), 'db-config.json');
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

const DEFAULT_DB_CONFIG = {
  host: '39.105.83.161',
  port: 3306,
  user: 'pc',
  password: 'root',
  database: 'pc',
};

async function getDbConfig() {
  try {
    if (fs.existsSync(DB_CONFIG_FILE)) {
      const data = fs.readFileSync(DB_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_DB_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {}
  return DEFAULT_DB_CONFIG;
}

async function main() {
  // Read current version in package.json
  let currentPackageVersion = '1.0.39';
  try {
    if (fs.existsSync(PACKAGE_JSON_PATH)) {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
      currentPackageVersion = pkg.version;
    }
  } catch (err) {
    console.warn('⚠️ Could not read package.json version, using fallback:', currentPackageVersion);
  }

  // Get maximum version specified by CLI args (e.g. v1.0.39)
  let maxAllowedVersion = process.argv[2] || `v${currentPackageVersion}`;
  if (!maxAllowedVersion.startsWith('v')) {
    maxAllowedVersion = 'v' + maxAllowedVersion;
  }

  console.log(`🧹 Database Version Clean-up Utility`);
  console.log(`📦 Current Package Version: v${currentPackageVersion}`);
  console.log(`🎯 Retaining versions up to: ${maxAllowedVersion}\n`);

  const dbConfig = await getDbConfig();
  let conn;

  try {
    console.log(`🔌 Connecting to database at ${dbConfig.host}:${dbConfig.port}...`);
    conn = await mysql.createConnection({
      host: dbConfig.host,
      port: Number(dbConfig.port),
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    console.log(`✅ Connected successfully!\n`);

    // Fetch all current version records
    const [rows]: any = await conn.query('SELECT * FROM app_versions ORDER BY created_at DESC');
    if (!rows || rows.length === 0) {
      console.log('📝 No version records found in the database.');
      await conn.end();
      return;
    }

    console.log(`📊 Found ${rows.length} total version records in database:`);
    console.log(`------------------------------------------------------------------------------------------------`);
    console.log(`${'ID'.padEnd(5)} | ${'Version'.padEnd(10)} | ${'Status'.padEnd(12)} | ${'URL'.padEnd(50)}`);
    console.log(`------------------------------------------------------------------------------------------------`);

    const toDeleteIds: number[] = [];
    const toDeleteVersions: string[] = [];

    // Simple SemVer comparison helper
    const parseVersion = (vStr: string) => {
      const match = vStr.replace(/^v/i, '').split('.');
      return match.map(n => parseInt(n, 10) || 0);
    };

    const compareVersions = (v1: string, v2: string) => {
      const parts1 = parseVersion(v1);
      const parts2 = parseVersion(v2);
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 !== p2) return p1 - p2;
      }
      return 0;
    };

    for (const row of rows) {
      const isUndefinedUrl = !row.url || row.url.includes('undefined');
      const isSpeculative = compareVersions(row.version, maxAllowedVersion) > 0;
      let action = 'KEEP';

      if (isUndefinedUrl) {
        action = 'DELETE (Invalid Domain)';
        toDeleteVersions.push(row.version);
      } else if (isSpeculative) {
        action = `DELETE (>${maxAllowedVersion})`;
        toDeleteVersions.push(row.version);
      }

      const displayUrl = row.url ? (row.url.length > 50 ? row.url.substring(0, 47) + '...' : row.url) : 'NULL';
      console.log(`${String(row.created_at ? '✓' : '?').padEnd(5)} | ${row.version.padEnd(10)} | ${action.padEnd(12)} | ${displayUrl}`);
    }
    console.log(`------------------------------------------------------------------------------------------------\n`);

    if (toDeleteVersions.length === 0) {
      console.log('✨ No polluted or speculative version records need to be deleted.');
    } else {
      console.log(`⚠️ Ready to delete ${toDeleteVersions.length} polluted or speculative version records from app_versions...`);
      
      // Perform the deletion
      for (const ver of toDeleteVersions) {
        await conn.query('DELETE FROM app_versions WHERE version = ?', [ver]);
        console.log(`🗑️ Deleted record: ${ver}`);
      }
      console.log(`\n🎉 Successfully cleaned up the app_versions table!`);
    }

    // Double check the new latest version in DB
    const [newLatest]: any = await conn.query('SELECT * FROM app_versions ORDER BY created_at DESC LIMIT 1');
    if (newLatest && newLatest.length > 0) {
      console.log(`🌟 New Latest Cloud Version in DB: ${newLatest[0].version}`);
      console.log(`🔗 Release URL: ${newLatest[0].url}`);
    } else {
      console.log(`🌟 No version records remain in the DB.`);
    }

    await conn.end();
  } catch (err: any) {
    console.error('❌ Error during database operations:', err.message);
    if (conn) {
      try {
        await conn.end();
      } catch (e) {}
    }
  }
}

main();
