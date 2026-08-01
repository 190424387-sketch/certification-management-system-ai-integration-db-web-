var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/auto-version.ts
var auto_version_exports = {};
__export(auto_version_exports, {
  bumpVersion: () => bumpVersion,
  startWatcher: () => startWatcher
});
async function getRemoteVersion() {
  try {
    console.log(`[Auto-Version] Fetching remote version from Aliyun Manifest...`);
    const response = await import_axios.default.get(CLOUD_MANIFEST_URL, { timeout: 5e3 });
    if (response.data && response.data.version) {
      const version = response.data.version.replace(/^v/, "");
      console.log(`[Auto-Version] Remote cloud version (OSS) detected: v${version}`);
      return version;
    }
  } catch (err) {
    console.warn(`[Auto-Version] OSS manifest not found or restricted: ${err.message}.`);
  }
  try {
    console.log(`[Auto-Version] Fetching remote version from Cloud MySQL...`);
    const conn = await import_promise.default.createConnection({
      host: process.env.DB_HOST || "39.105.83.161",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "pc",
      password: process.env.DB_PASSWORD || "root",
      database: process.env.DB_NAME || "pc",
      connectTimeout: 5e3
    });
    const [rows] = await conn.query(
      "SELECT version FROM app_versions ORDER BY created_at DESC LIMIT 1"
    );
    await conn.end();
    if (rows && rows.length > 0) {
      const version = rows[0].version.replace(/^v/, "");
      console.log(`[Auto-Version] Remote cloud version (DB) detected: v${version}`);
      return version;
    }
  } catch (err) {
    console.warn(`[Auto-Version] Database fetch failed: ${err.message}.`);
  }
  return null;
}
async function bumpVersion() {
  try {
    if (process.env.SKIP_AUTO_VERSION_BUMP === "true") {
      console.log("[Auto-Version] Skipping automatic version bump (publishing or building exe in progress)");
      return null;
    }
    if (!import_fs.default.existsSync(PACKAGE_JSON_PATH)) {
      console.error("[Auto-Version] package.json not found.");
      return null;
    }
    const packageJsonRaw = import_fs.default.readFileSync(PACKAGE_JSON_PATH, "utf-8");
    const packageJson = JSON.parse(packageJsonRaw);
    let currentBaseVersion = packageJson.version;
    if (!currentBaseVersion) {
      console.warn("[Auto-Version] No version found in package.json");
      return null;
    }
    const remoteVersion = await getRemoteVersion();
    if (remoteVersion && isVersionHigher(remoteVersion, currentBaseVersion)) {
      console.log(`[Auto-Version] Cloud version (v${remoteVersion}) is higher than local base (v${currentBaseVersion}). Aligning to Cloud.`);
      currentBaseVersion = remoteVersion;
    }
    if (import_fs.default.existsSync(UPGRADE_CONFIG_PATH)) {
      try {
        const upgradeConfigRaw = import_fs.default.readFileSync(UPGRADE_CONFIG_PATH, "utf-8");
        const upgradeConfig = JSON.parse(upgradeConfigRaw);
        const cloudVersion = upgradeConfig.latestVersion?.replace(/^v/, "");
        if (cloudVersion && isVersionHigher(cloudVersion, currentBaseVersion)) {
          console.log(`[Auto-Version] Detected higher version in upgrade-config.json (${cloudVersion} > ${currentBaseVersion}). Using as base.`);
          currentBaseVersion = cloudVersion;
        }
      } catch (err) {
      }
    }
    const versionMatch = currentBaseVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!versionMatch) {
      console.warn(`[Auto-Version] Version format ${currentBaseVersion} is not major.minor.patch`);
      return null;
    }
    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);
    const patch = parseInt(versionMatch[3], 10) + 1;
    const newVersion = `${major}.${minor}.${patch}`;
    const oldPackageVersion = packageJson.version;
    packageJson.version = newVersion;
    import_fs.default.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + "\n", "utf-8");
    console.log(`[Auto-Version] package.json version bumped: ${oldPackageVersion} -> ${newVersion}`);
    if (import_fs.default.existsSync(UPGRADE_CONFIG_PATH)) {
      try {
        const upgradeConfigRaw = import_fs.default.readFileSync(UPGRADE_CONFIG_PATH, "utf-8");
        const upgradeConfig = JSON.parse(upgradeConfigRaw);
        const oldUpgradeVersion = upgradeConfig.latestVersion;
        upgradeConfig.latestVersion = `v${newVersion}`;
        upgradeConfig.releaseDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        import_fs.default.writeFileSync(UPGRADE_CONFIG_PATH, JSON.stringify(upgradeConfig, null, 2), "utf-8");
        console.log(`[Auto-Version] upgrade-config.json latestVersion updated: ${oldUpgradeVersion} -> v${newVersion}`);
      } catch (err) {
        console.error("[Auto-Version] Failed to update upgrade-config.json:", err.message);
      }
    }
    return newVersion;
  } catch (err) {
    console.error("[Auto-Version] Error bumping version:", err.message);
    return null;
  }
}
function isVersionHigher(v1, v2) {
  const parts1 = v1.split(".").map((p) => parseInt(p, 10));
  const parts2 = v2.split(".").map((p) => parseInt(p, 10));
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return true;
    if (parts1[i] < parts2[i]) return false;
  }
  return false;
}
function startWatcher() {
  console.log("[Auto-Version] Initializing code change watcher...");
  const watchTargets = ["src", "components", "electron"];
  const ignoredFiles = [
    "package.json",
    "package-lock.json",
    "upgrade-config.json",
    "upgrade-history.json",
    "db-config.json",
    "ai-settings.json"
  ];
  const ignoredFolders = [
    "node_modules",
    "dist",
    "publish",
    "dist-exe",
    ".git",
    "tmp",
    "workspace"
  ];
  const handleFileChange = (filePath) => {
    const relativePath = import_path.default.relative(process.cwd(), filePath);
    const parts = relativePath.split(import_path.default.sep);
    if (parts.some((part) => ignoredFolders.includes(part) || part.startsWith("."))) {
      return;
    }
    const fileName = import_path.default.basename(filePath);
    if (ignoredFiles.includes(fileName) || fileName.startsWith(".")) {
      return;
    }
    const ext = import_path.default.extname(filePath).toLowerCase();
    const validExtensions = [".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".json"];
    if (!validExtensions.includes(ext)) {
      return;
    }
    if (watchTimeout) {
      clearTimeout(watchTimeout);
    }
    watchTimeout = setTimeout(() => {
      console.log(`
[Auto-Version] Detected program modification at: ${relativePath}`);
      bumpVersion();
    }, DEBOUNCE_MS);
  };
  watchTargets.forEach((target) => {
    const fullPath = import_path.default.join(process.cwd(), target);
    if (import_fs.default.existsSync(fullPath)) {
      recursiveWatch(fullPath, handleFileChange);
    }
  });
  const rootFiles = ["index.html", "vite.config.ts"];
  rootFiles.forEach((file) => {
    const fullPath = import_path.default.join(process.cwd(), file);
    if (import_fs.default.existsSync(fullPath)) {
      import_fs.default.watch(fullPath, (event) => {
        if (event === "change") {
          handleFileChange(fullPath);
        }
      });
    }
  });
  console.log(`[Auto-Version] Watcher started. Watching folders: ${watchTargets.join(", ")}`);
}
function recursiveWatch(dirPath, callback) {
  try {
    import_fs.default.watch(dirPath, (event, filename) => {
      if (filename) {
        callback(import_path.default.join(dirPath, filename));
      }
    });
  } catch (e) {
  }
  try {
    const files = import_fs.default.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = import_path.default.join(dirPath, file);
      try {
        const stat = import_fs.default.statSync(fullPath);
        if (stat.isDirectory()) {
          const ignoredFolders = ["node_modules", "dist", "publish", "dist-exe", ".git", "tmp"];
          if (!ignoredFolders.includes(file) && !file.startsWith(".")) {
            recursiveWatch(fullPath, callback);
          }
        }
      } catch (e) {
      }
    }
  } catch (e) {
  }
}
var import_fs, import_path, import_axios, import_promise, PACKAGE_JSON_PATH, UPGRADE_CONFIG_PATH, CLOUD_MANIFEST_URL, watchTimeout, DEBOUNCE_MS;
var init_auto_version = __esm({
  "scripts/auto-version.ts"() {
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    import_axios = __toESM(require("axios"), 1);
    import_promise = __toESM(require("mysql2/promise"), 1);
    PACKAGE_JSON_PATH = import_path.default.join(process.cwd(), "package.json");
    UPGRADE_CONFIG_PATH = import_path.default.join(process.cwd(), "upgrade-config.json");
    CLOUD_MANIFEST_URL = "https://aicertification.oss-cn-hangzhou.aliyuncs.com/updates/manifest.json";
    watchTimeout = null;
    DEBOUNCE_MS = 3e3;
    if (process.argv.includes("--bump")) {
      (async () => {
        await bumpVersion();
      })();
    } else if (process.argv.includes("--watch")) {
      startWatcher();
    }
  }
});

// server.ts
var import_multer = __toESM(require("multer"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
var import_pizzip = __toESM(require("pizzip"), 1);
var import_docxtemplater = __toESM(require("docxtemplater"), 1);
var crypto = __toESM(require("crypto"), 1);
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_socket = require("socket.io");
var import_path2 = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);
var import_url = require("url");
var import_os = __toESM(require("os"), 1);
var import_axios2 = __toESM(require("axios"), 1);
var import_promise2 = __toESM(require("mysql2/promise"), 1);
var import_ali_oss = __toESM(require("ali-oss"), 1);
var import_child_process = require("child_process");
var import_https = __toESM(require("https"), 1);
var import_fs3 = require("fs");
var import_meta = {};
var getDirname = () => {
  try {
    if (typeof __dirname !== "undefined") return __dirname;
    return import_path2.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
  } catch (e) {
    return process.cwd();
  }
};
var currentDir = getDirname();
var DB_CONFIG_FILE = process.env.DB_CONFIG_PATH || import_path2.default.join(process.cwd(), "db-config.json");
var AI_SETTINGS_FILE = process.env.AI_SETTINGS_PATH || import_path2.default.join(process.cwd(), "ai-settings.json");
var UPGRADE_CONFIG_FILE = process.env.UPGRADE_CONFIG_PATH || import_path2.default.join(process.cwd(), "upgrade-config.json");
var UPGRADE_HISTORY_FILE = process.env.UPGRADE_HISTORY_PATH || import_path2.default.join(process.cwd(), "upgrade-history.json");
var DEFAULT_UPGRADE_CONFIG = {
  currentVersion: "v1.0.11",
  latestVersion: "v1.0.11",
  autoCheck: true,
  upgradeSource: "official",
  channel: "release",
  lastCheckTime: 17818452e5,
  // 2026-06-18
  releaseNotes: "1. \u4F18\u5316AI\u5F15\u64CE\u8FDE\u63A5\u7A33\u5B9A\u6027\uFF0C\u65B0\u589E\u667A\u80FD\u8F6E\u8BE2\u901A\u9053\uFF1B\n2. \u4FEE\u590D\u6392\u7A0B\u7B97\u6CD5\u4E2D\u6781\u5C11\u72B6\u6001\u4E0B\u7684\u65F6\u95F4\u51B2\u7A81\uFF1B\n3. \u4F18\u5316\u9879\u76EE\u8BC4\u5BA1\u5BFC\u51FA\u7684\u6587\u6863\u6837\u5F0F\u6392\u7248\uFF1B\n4. \u65B0\u5EFA\u72EC\u7ACB\u7684\u540E\u53F0\u5728\u7EBF\u5347\u7EA7\u7BA1\u7406\u6A21\u5757\uFF0C\u652F\u6301\u591A\u5347\u7EA7\u6E90\u914D\u7F6E\u4E0E\u5386\u53F2\u8BB0\u5F55\u3002",
  size: "24.5 MB",
  releaseDate: "2026-06-18"
};
var DEFAULT_UPGRADE_HISTORY = [
  {
    version: "v1.0.11",
    date: "2026-06-12",
    operator: "\u84B2\u91D1\u9E4F",
    status: "success",
    notes: "\u9879\u76EE\u8BC4\u5BA1\u5927\u6587\u4EF6\u4F20\u8F93\u6027\u80FD\u63D0\u5347\uFF0C\u6392\u7A0B\u5F15\u64CE\u591A\u56E0\u5B50\u4F18\u5316\u3002"
  },
  {
    version: "v1.2.0",
    date: "2026-05-30",
    operator: "\u674E\u7F8E\u5B50",
    status: "success",
    notes: "\u5927\u6A21\u578B\u914D\u7F6E\u4E2D\u8F6C\u4EE3\u7406\u529F\u80FD\u4E0A\u7EBF\uFF0C\u652F\u6301\u514D\u8D39\u4E2D\u8F6C\u4E0E\u72EC\u4EAB Key \u5207\u6362\u3002"
  },
  {
    version: "v1.1.0",
    date: "2026-05-10",
    operator: "\u6731\u8363\u96EA",
    status: "success",
    notes: "\u8303\u56F4\u68C0\u7D22\u6743\u9650\u652F\u6301\u591A\u7EF4\u5EA6\u5B57\u6BB5\uFF0C\u5BFC\u5165 Excel \u89E3\u6790\u6027\u80FD\u63D0\u5347\u3002"
  }
];
async function getUpgradeConfig() {
  try {
    const data = await import_promises.default.readFile(UPGRADE_CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    await saveUpgradeConfig(DEFAULT_UPGRADE_CONFIG);
    return DEFAULT_UPGRADE_CONFIG;
  }
}
async function saveUpgradeConfig(config) {
  await import_promises.default.writeFile(UPGRADE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
async function getUpgradeHistory() {
  try {
    const data = await import_promises.default.readFile(UPGRADE_HISTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    await saveUpgradeHistory(DEFAULT_UPGRADE_HISTORY);
    return DEFAULT_UPGRADE_HISTORY;
  }
}
async function saveUpgradeHistory(history) {
  await import_promises.default.writeFile(UPGRADE_HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}
var DEFAULT_DB_CONFIG = {
  host: "39.105.83.161",
  port: 3306,
  user: "pc",
  password: "root",
  database: "pc",
  table: "web user"
};
async function getDbConfig() {
  try {
    const data = await import_promises.default.readFile(DB_CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return DEFAULT_DB_CONFIG;
  }
}
async function saveDbConfig(config) {
  await import_promises.default.writeFile(DB_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
async function getAiSettings() {
  try {
    const data = await import_promises.default.readFile(AI_SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}
async function saveAiSettings(settings) {
  await import_promises.default.writeFile(AI_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  let dbPool = null;
  let currentDbConfig = await getDbConfig();
  async function initDbPool() {
    if (dbPool) {
      await dbPool.end().catch((e) => console.warn("DB close error (ignoring):", e.message));
    }
    try {
      const { host, port, user, password, database } = currentDbConfig;
      dbPool = import_promise2.default.createPool({
        host: host || "localhost",
        port: port || 3306,
        user: user || "root",
        password: password || "",
        database: database || "test",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5e3
        // 5 seconds timeout to fail fast
      });
      if (typeof dbPool.on === "function") {
        dbPool.on("error", (err) => {
          console.warn("\u26A0\uFE0F Background MySQL Pool Error:", err.message);
        });
      }
      const conn = await dbPool.getConnection();
      console.log("Connected to MySQL DB!");
      const tableName = currentDbConfig.table || "web user";
      const safeTable = tableName.replace(/[^a-zA-Z0-9_ ]/g, "");
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`${safeTable}\` (
          \`\u5E8F\u53F7\` INT AUTO_INCREMENT PRIMARY KEY,
          \`\u59D3\u540D\` VARCHAR(50) NOT NULL,
          \`\u624B\u673A\u53F7\` VARCHAR(20) NOT NULL UNIQUE,
          \`\u521D\u59CB\u5BC6\u7801\` VARCHAR(255) NOT NULL,
          \`\u66F4\u65B0\u5BC6\u7801\` VARCHAR(255) NOT NULL,
          \`\u5C97\u4F4D\` VARCHAR(50),
          \`\u8303\u56F4\u68C0\u7D22\u6743\u9650\` VARCHAR(50),
          \`\u9879\u76EE\u8BC4\u5BA1\u6743\u9650\` VARCHAR(50),
          \`\u6392\u7A0B\u6743\u9650\` VARCHAR(50),
          \`\u5BA1\u6838\u7B56\u5212\u6743\u9650\` VARCHAR(50),
          \`AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650\` VARCHAR(50),
          \`mac\u5730\u5740\` VARCHAR(255)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`web user\` (
          \`\u5E8F\u53F7\` INT AUTO_INCREMENT PRIMARY KEY,
          \`\u59D3\u540D\` VARCHAR(50) NOT NULL,
          \`\u624B\u673A\u53F7\` VARCHAR(20) NOT NULL UNIQUE,
          \`\u521D\u59CB\u5BC6\u7801\` VARCHAR(255) NOT NULL,
          \`\u66F4\u65B0\u5BC6\u7801\` VARCHAR(255) NOT NULL,
          \`\u5C97\u4F4D\` VARCHAR(50),
          \`\u8303\u56F4\u68C0\u7D22\u6743\u9650\` VARCHAR(50),
          \`\u9879\u76EE\u8BC4\u5BA1\u6743\u9650\` VARCHAR(50),
          \`\u6392\u7A0B\u6743\u9650\` VARCHAR(50),
          \`\u5BA1\u6838\u7B56\u5212\u6743\u9650\` VARCHAR(50),
          \`AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650\` VARCHAR(50),
          \`mac\u5730\u5740\` VARCHAR(255),
          \`\u7528\u6237\u7C7B\u578B\` VARCHAR(50) DEFAULT '\u514D\u8D39\u7528\u6237'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      try {
        await conn.query(`ALTER TABLE \`web user\` ADD COLUMN \`\u7528\u6237\u7C7B\u578B\` VARCHAR(50) DEFAULT '\u514D\u8D39\u7528\u6237'`);
      } catch (e) {
      }
      try {
        await conn.query(`ALTER TABLE \`${safeTable}\` ADD COLUMN \`mac\u5730\u5740\` VARCHAR(255)`);
      } catch (e) {
      }
      await conn.query(`
        CREATE TABLE IF NOT EXISTS app_versions (
          version VARCHAR(50) PRIMARY KEY,
          url VARCHAR(255),
          manifest_url VARCHAR(255),
          changelog TEXT,
          is_delta BOOLEAN,
          force_update BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      try {
        const [countRows] = await conn.query("SELECT COUNT(*) as count FROM app_versions");
        const count = countRows[0]?.count || 0;
        if (count === 0) {
          const pkgRaw = await import_promises.default.readFile(import_path2.default.join(process.cwd(), "package.json"), "utf-8");
          const pkgJson = JSON.parse(pkgRaw);
          const repoVersion = `v${pkgJson.version}`;
          await conn.query(`
            INSERT INTO app_versions (version, url, manifest_url, changelog, is_delta, force_update)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            repoVersion,
            `https://aicertification.oss-cn-hangzhou.aliyuncs.com/updates/${repoVersion}/setup.exe`,
            `https://aicertification.oss-cn-hangzhou.aliyuncs.com/updates/${repoVersion}/manifest.json`,
            "1. \u4FEE\u590D\u4E86\u5BA2\u6237\u7AEF\u5728\u5927\u5E76\u53D1\u8BF7\u6C42\u65F6\u7684\u5B89\u5168\u901A\u4FE1\u96A7\u9053\u5BF9\u8D26\u95EE\u9898\uFF1B\n2. \u5F15\u5165\u4E86\u57FA\u4E8E\u53CC\u5197\u4F59\u7B56\u7565\u7684\u9AD8\u53EF\u7528\u5E95\u5C42\u7194\u65AD\u9632\u5FA1\uFF1B\n3. \u4F18\u5316\u4E86\u4E0E\u4E2D\u82F1\u53CC\u8BED\u7CFB\u7EDF (MySQL 1.35) \u7684\u72EC\u7ACB\u81EA\u73AF\u5883\u3002",
            true,
            false
          ]);
          console.log(`[Database Seeding] Auto-seeded initial version ${repoVersion} because database was empty.`);
        } else {
          console.log(`[Database Seeding] Database already has ${count} version record(s). Skipping automatic version seeding to prevent dev version pollution.`);
        }
      } catch (seedErr) {
        console.warn("\u26A0\uFE0F Non-fatal: Database seeding of latest version failed. Error:", seedErr.message);
      }
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS billing_plans (
            plan_code VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            ai_limit_per_day INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS user_subscriptions (
            phone VARCHAR(20) PRIMARY KEY,
            plan_code VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMP NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS billing_usage_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) NOT NULL,
            request_date DATE NOT NULL,
            messages_count INT DEFAULT 1,
            tokens_used INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY phone_date_idx (phone, request_date)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await conn.query(`
          CREATE TABLE IF NOT EXISTS billing_transactions (
            order_id VARCHAR(100) PRIMARY KEY,
            phone VARCHAR(20) NOT NULL,
            plan_code VARCHAR(50) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        const [plansCount] = await conn.query("SELECT COUNT(*) as count FROM billing_plans");
        if ((plansCount[0]?.count || 0) === 0) {
          await conn.query(`
            INSERT INTO billing_plans (plan_code, name, price, ai_limit_per_day) VALUES
            ('free', '\u514D\u8D39\u7248', 0.00, 2),
            ('pro', '\u4E13\u4E1A\u5546\u7528\u7248', 199.00, 100),
            ('enterprise', '\u4F01\u4E1A\u4E13\u5C5E\u7248', 999.00, 10000)
          `);
          console.log("[Billing Seeding] Auto-seeded default plans.");
        }
        try {
          const [existingWebUser] = await conn.query(
            "SELECT * FROM `web user` WHERE `\u624B\u673A\u53F7` = ?",
            ["17798547783"]
          );
          let pjpUser = existingWebUser[0];
          if (!pjpUser) {
            const [existingOldUser] = await conn.query(
              `SELECT * FROM \`${safeTable}\` WHERE \`\u624B\u673A\u53F7\` = ?`,
              ["17798547783"]
            );
            const oldUser = existingOldUser[0];
            const initialPassword = oldUser ? oldUser["\u521D\u59CB\u5BC6\u7801"] : "123456";
            const updatedPassword = oldUser ? oldUser["\u66F4\u65B0\u5BC6\u7801"] : "123456";
            const role = oldUser ? oldUser["\u5C97\u4F4D"] : "\u4E1A\u52A1";
            const mac = oldUser ? oldUser["mac\u5730\u5740"] : null;
            await conn.query(
              `INSERT INTO \`web user\` (
                \`\u59D3\u540D\`, \`\u624B\u673A\u53F7\`, \`\u521D\u59CB\u5BC6\u7801\`, \`\u66F4\u65B0\u5BC6\u7801\`, \`\u5C97\u4F4D\`,
                \`\u8303\u56F4\u68C0\u7D22\u6743\u9650\`, \`\u9879\u76EE\u8BC4\u5BA1\u6743\u9650\`, \`\u6392\u7A0B\u6743\u9650\`, \`\u5BA1\u6838\u7B56\u5212\u6743\u9650\`, \`AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650\`,
                \`mac\u5730\u5740\`, \`\u7528\u6237\u7C7B\u578B\`
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                "\u84B2\u91D1\u9E4F",
                "17798547783",
                initialPassword,
                updatedPassword,
                role,
                "\u8BFB\u5199",
                "\u8BFB\u5199",
                "\u8BFB\u5199",
                "\u8BFB\u5199",
                "\u8BFB\u5199",
                mac,
                "\u4E13\u4E1A\u7528\u6237"
              ]
            );
            console.log("[Database Seeding] Auto-seeded \u84B2\u91D1\u9E4F into `web user` table.");
          } else {
            await conn.query(
              `UPDATE \`web user\` SET 
                \`\u8303\u56F4\u68C0\u7D22\u6743\u9650\` = '\u8BFB\u5199',
                \`\u9879\u76EE\u8BC4\u5BA1\u6743\u9650\` = '\u8BFB\u5199',
                \`\u6392\u7A0B\u6743\u9650\` = '\u8BFB\u5199',
                \`\u5BA1\u6838\u7B56\u5212\u6743\u9650\` = '\u8BFB\u5199',
                \`AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650\` = '\u8BFB\u5199',
                \`\u7528\u6237\u7C7B\u578B\` = '\u4E13\u4E1A\u7528\u6237'
              WHERE \`\u624B\u673A\u53F7\` = ?`,
              ["17798547783"]
            );
            console.log("[Database Seeding] Updated \u84B2\u91D1\u9E4F permissions in `web user` table to highest.");
          }
        } catch (pjpErr) {
          console.warn("\u26A0\uFE0F Non-fatal: Seeding of \u84B2\u91D1\u9E4F into `web user` failed. Error:", pjpErr.message);
        }
      } catch (billingTableErr) {
        console.warn("\u26A0\uFE0F Non-fatal: SaaS billing tables setup failed. Error:", billingTableErr.message);
      }
      conn.release();
    } catch (err) {
      console.warn("\u26A0\uFE0F Non-fatal: Failed to initialize MySQL on startup. This is expected if the IP is unreachable from this environment. The app will continue running. Error:", err.message);
      dbPool = null;
    }
  }
  initDbPool().catch((err) => console.warn("Skipping DB init on startup (offline):", err.message));
  const uploadDir = import_path2.default.join(process.cwd(), "data", "templates");
  if (!import_fs2.default.existsSync(uploadDir)) {
    import_fs2.default.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = import_multer.default.diskStorage({
    destination: function(req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
      cb(null, originalName);
    }
  });
  const upload = (0, import_multer.default)({ storage });
  app.post("/api/templates/upload", upload.single("template"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (req.file.originalname.toLowerCase().endsWith(".zip") || req.file.mimetype === "application/zip" || req.file.mimetype === "application/x-zip-compressed") {
      try {
        const zip = new import_adm_zip.default(req.file.path);
        const zipEntries = zip.getEntries();
        let extractedCount = 0;
        zipEntries.forEach(function(zipEntry) {
          if (!zipEntry.isDirectory && !zipEntry.entryName.includes("__MACOSX") && !zipEntry.name.startsWith(".")) {
            const ext = import_path2.default.extname(zipEntry.name).toLowerCase();
            if (ext === ".doc" || ext === ".docx") {
              const targetPath = import_path2.default.join(uploadDir, zipEntry.name);
              import_fs2.default.writeFileSync(targetPath, zipEntry.getData());
              extractedCount++;
            }
          }
        });
        import_fs2.default.unlinkSync(req.file.path);
        return res.json({
          success: true,
          message: `Successfully extracted ${extractedCount} template files from ZIP.`,
          extracted: extractedCount
        });
      } catch (err) {
        console.error("ZIP extraction error:", err);
        return res.status(500).json({ error: "Failed to extract ZIP file: " + err.message });
      }
    }
    res.json({ success: true, file: req.file });
  });
  app.get("/api/templates", (req, res) => {
    try {
      if (!import_fs2.default.existsSync(uploadDir)) {
        return res.json([]);
      }
      const files = import_fs2.default.readdirSync(uploadDir);
      const fileList = files.map((file) => {
        const stats = import_fs2.default.statSync(import_path2.default.join(uploadDir, file));
        return {
          name: file,
          size: stats.size,
          mtime: stats.mtime
        };
      });
      res.json(fileList);
    } catch (err) {
      res.status(500).json({ error: "Failed to read templates directory" });
    }
  });
  app.delete("/api/templates/:name", (req, res) => {
    try {
      const fileName = req.params.name;
      const filePath = import_path2.default.join(uploadDir, fileName);
      if (import_fs2.default.existsSync(filePath)) {
        import_fs2.default.unlinkSync(filePath);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });
  app.post("/api/templates/generate", async (req, res) => {
    try {
      const { companyInfo, contactInfo, feeInfo, systems } = req.body;
      const uploadDir2 = import_path2.default.join(process.cwd(), "data", "templates");
      if (!import_fs2.default.existsSync(uploadDir2)) {
        return res.status(404).json({ error: "No templates found" });
      }
      const files = import_fs2.default.readdirSync(uploadDir2).filter((f) => f.endsWith(".docx"));
      if (files.length === 0) {
        return res.status(404).json({ error: "No templates found" });
      }
      const zip = new import_adm_zip.default();
      const generatedFiles = [];
      for (const file of files) {
        try {
          const content = import_fs2.default.readFileSync(import_path2.default.join(uploadDir2, file), "binary");
          const pizzip = new import_pizzip.default(content);
          const doc = new import_docxtemplater.default(pizzip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
            // Return empty string instead of 'undefined'
          });
          doc.render({
            name: companyInfo?.name || "",
            \u4F01\u4E1A\u540D\u79F0: companyInfo?.name || "",
            creditCode: companyInfo?.creditCode || "",
            \u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801: companyInfo?.creditCode || "",
            legalPerson: companyInfo?.legalPerson || "",
            \u6CD5\u5B9A\u4EE3\u8868\u4EBA: companyInfo?.legalPerson || "",
            address: companyInfo?.address || "",
            \u6CE8\u518C\u5730\u5740: companyInfo?.address || "",
            \u8054\u7CFB\u4EBA: contactInfo?.name || "",
            \u8054\u7CFB\u4EBA\u59D3\u540D: contactInfo?.name || "",
            \u8054\u7CFB\u4EBA\u624B\u673A\u53F7: contactInfo?.phone || "",
            \u8054\u7CFB\u7535\u8BDD: contactInfo?.phone || "",
            \u5B9E\u9645\u529E\u516C\u5730\u5740: contactInfo?.officeAddress || companyInfo?.address || "",
            \u529E\u516C\u5730\u5740: contactInfo?.officeAddress || companyInfo?.address || "",
            \u7EC4\u7EC7\u603B\u4EBA\u6570: contactInfo?.totalEmployees || "",
            \u4F01\u4E1A\u603B\u4EBA\u6570: contactInfo?.totalEmployees || "",
            \u4F53\u7CFB\u8986\u76D6\u4EBA\u6570: contactInfo?.coveredEmployees || "",
            \u90AE\u7BB1: contactInfo?.email || "",
            \u5DE5\u4F5C\u65F6\u95F4: contactInfo?.workHours || "",
            \u4F11\u606F\u65E5: contactInfo?.restDays || "",
            \u662F\u5426\u5012\u73ED: contactInfo?.hasShift || "\u5426",
            \u662F\u5426\u8F6C\u673A\u6784: contactInfo?.isTransfer || "\u5426",
            \u521D\u6B21\u8BA4\u8BC1\u8D39: feeInfo?.initialFee || "",
            \u521D\u6B21\u518D\u8BA4\u8BC1\u8D39: feeInfo?.initialFee || "",
            \u5E74\u5EA6\u76D1\u7763\u8D39: feeInfo?.yearlyFee || "",
            \u5176\u4ED6\u8D39\u7528: feeInfo?.otherFee || "",
            \u8BA4\u8BC1\u4F53\u7CFB: (systems || []).join("\u3001"),
            \u4F53\u7CFB: (systems || []).join("\u3001")
          });
          const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
          zip.addFile(file, buf);
          generatedFiles.push(file);
        } catch (e) {
          console.error("Error generating template " + file, e);
          zip.addLocalFile(import_path2.default.join(uploadDir2, file));
          generatedFiles.push(file);
        }
      }
      const docFiles = import_fs2.default.readdirSync(uploadDir2).filter((f) => f.endsWith(".doc"));
      for (const file of docFiles) {
        zip.addLocalFile(import_path2.default.join(uploadDir2, file));
        generatedFiles.push(file);
      }
      const zipBuffer = zip.toBuffer();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=application_materials.zip");
      res.setHeader("X-Generated-Files", encodeURIComponent(JSON.stringify(generatedFiles)));
      res.send(zipBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Generation failed" });
    }
  });
  app.get("/api/db/config", async (req, res) => {
    res.json(currentDbConfig);
  });
  const memSubscriptions = /* @__PURE__ */ new Map();
  const memUsage = /* @__PURE__ */ new Map();
  const memTransactions = /* @__PURE__ */ new Map();
  async function getSubscriptionStatus(phone) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const defaultSub = {
      phone,
      plan_code: "free",
      status: "active",
      start_date: (/* @__PURE__ */ new Date()).toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
      name: "\u514D\u8D39\u7248",
      price: 0,
      ai_limit_per_day: 2,
      used_today: 0,
      tokens_used_today: 0
    };
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          let [subRows] = await conn.query(
            "SELECT s.*, p.name, p.price, p.ai_limit_per_day FROM user_subscriptions s JOIN billing_plans p ON s.plan_code = p.plan_code WHERE s.phone = ?",
            [phone]
          );
          if (phone === "17798547783" && (!subRows[0] || subRows[0].plan_code === "free")) {
            await conn.query(
              "INSERT INTO user_subscriptions (phone, plan_code, status, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE plan_code = 'pro', status = 'active'",
              ["17798547783", "pro", "active", new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3)]
            );
            const [refetched] = await conn.query(
              "SELECT s.*, p.name, p.price, p.ai_limit_per_day FROM user_subscriptions s JOIN billing_plans p ON s.plan_code = p.plan_code WHERE s.phone = ?",
              [phone]
            );
            subRows = refetched;
          }
          let userSub = subRows[0];
          if (!userSub) {
            await conn.query(
              "INSERT INTO user_subscriptions (phone, plan_code, status, end_date) VALUES (?, ?, ?, ?)",
              [phone, "free", "active", new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)]
            );
            userSub = {
              phone,
              plan_code: "free",
              status: "active",
              name: "\u514D\u8D39\u7248",
              price: 0,
              ai_limit_per_day: 2
            };
          }
          const [usageRows] = await conn.query(
            "SELECT messages_count, tokens_used FROM billing_usage_logs WHERE phone = ? AND request_date = ?",
            [phone, today]
          );
          const usage2 = usageRows[0] || { messages_count: 0, tokens_used: 0 };
          try {
            const isPremiumPlan = userSub && userSub.plan_code !== "free" && userSub.status === "active";
            const targetUserType = isPremiumPlan ? "\u4E13\u4E1A\u7528\u6237" : "\u514D\u8D39\u7528\u6237";
            await conn.query(
              "UPDATE `web user` SET `\u7528\u6237\u7C7B\u578B` = ? WHERE `\u624B\u673A\u53F7` = ?",
              [targetUserType, phone]
            );
          } catch (syncErr) {
          }
          return {
            ...userSub,
            plan_name: userSub.name,
            ai_used_today: usage2.messages_count,
            used_today: usage2.messages_count,
            tokens_used_today: usage2.tokens_used
          };
        } finally {
          conn.release();
        }
      } catch (err) {
        console.warn("MySQL subscription fetch failed, falling back to in-memory:", err);
      }
    }
    let sub = memSubscriptions.get(phone);
    if (!sub) {
      sub = {
        plan_code: phone === "17798547783" ? "pro" : "free",
        status: "active",
        start_date: defaultSub.start_date,
        end_date: phone === "17798547783" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString() : defaultSub.end_date
      };
      memSubscriptions.set(phone, sub);
    } else if (phone === "17798547783" && sub.plan_code === "free") {
      sub.plan_code = "pro";
      sub.end_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString();
      memSubscriptions.set(phone, sub);
    }
    const planInfo = sub.plan_code === "pro" ? { name: "\u4E13\u4E1A\u5546\u7528\u7248", price: 199, ai_limit_per_day: 100 } : sub.plan_code === "enterprise" ? { name: "\u4F01\u4E1A\u4E13\u5C5E\u7248", price: 999, ai_limit_per_day: 1e4 } : { name: "\u514D\u8D39\u7248", price: 0, ai_limit_per_day: 2 };
    const userUsageMap = memUsage.get(phone) || /* @__PURE__ */ new Map();
    const usage = userUsageMap.get(today) || { messages_count: 0, tokens_used: 0 };
    return {
      phone,
      plan_code: sub.plan_code,
      status: sub.status,
      start_date: sub.start_date,
      end_date: sub.end_date,
      ...planInfo,
      plan_name: planInfo.name,
      ai_used_today: usage.messages_count,
      used_today: usage.messages_count,
      tokens_used_today: usage.tokens_used
    };
  }
  async function incrementUsage(phone, tokensUsed = 0) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          await conn.query(
            "INSERT INTO billing_usage_logs (phone, request_date, messages_count, tokens_used) VALUES (?, ?, 1, ?) ON DUPLICATE KEY UPDATE messages_count = messages_count + 1, tokens_used = tokens_used + ?",
            [phone, today, tokensUsed, tokensUsed]
          );
        } finally {
          conn.release();
        }
      } catch (dbErr) {
        console.warn("MySQL usage increment failed:", dbErr);
      }
    }
    let userUsageMap = memUsage.get(phone);
    if (!userUsageMap) {
      userUsageMap = /* @__PURE__ */ new Map();
      memUsage.set(phone, userUsageMap);
    }
    const current = userUsageMap.get(today) || { messages_count: 0, tokens_used: 0 };
    userUsageMap.set(today, {
      messages_count: current.messages_count + 1,
      tokens_used: current.tokens_used + tokensUsed
    });
  }
  app.get("/api/billing/status", async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Missing phone" });
    try {
      const status = await getSubscriptionStatus(phone);
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch billing status", message: err.message });
    }
  });
  app.post("/api/billing/subscribe", async (req, res) => {
    const { phone } = req.body;
    const plan_code = req.body.plan_code || req.body.planCode;
    const months = req.body.months || 1;
    if (!phone || !plan_code) return res.status(400).json({ error: "Missing phone or plan_code" });
    const order_id = "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
    const amount = plan_code === "pro" ? 199 : plan_code === "enterprise" ? 999 : 0;
    const totalAmount = amount * months;
    const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1e3);
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          await conn.query(
            "INSERT INTO billing_transactions (order_id, phone, plan_code, amount, status) VALUES (?, ?, ?, ?, ?)",
            [order_id, phone, plan_code, totalAmount, "paid"]
          );
          await conn.query(
            "INSERT INTO user_subscriptions (phone, plan_code, status, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE plan_code = VALUES(plan_code), status = VALUES(status), end_date = VALUES(end_date)",
            [phone, plan_code, "active", endDate]
          );
          conn.release();
          return res.json({ success: true, order_id, amount: totalAmount, plan_code });
        } catch (dbErr) {
          conn.release();
          console.warn("MySQL subscription logging failed, using memory fallback:", dbErr);
        }
      } catch (err) {
      }
    }
    memTransactions.set(order_id, {
      order_id,
      phone,
      plan_code,
      amount: totalAmount,
      status: "paid",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    memSubscriptions.set(phone, {
      plan_code,
      status: "active",
      start_date: (/* @__PURE__ */ new Date()).toISOString(),
      end_date: endDate.toISOString()
    });
    res.json({ success: true, order_id, amount: totalAmount, plan_code });
  });
  app.get("/api/billing/usage", async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Missing phone" });
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          const [usageRows] = await conn.query(
            "SELECT * FROM billing_usage_logs WHERE phone = ? ORDER BY request_date DESC",
            [phone]
          );
          conn.release();
          const logs2 = usageRows.map((row) => ({
            id: row.id,
            created_at: row.created_at || new Date(row.request_date).toISOString(),
            module_name: "AI \u667A\u80FD\u5339\u914D",
            action_type: "\u5927\u6A21\u578B\u8BED\u4E49\u68C0\u7D22\u4E0E\u5408\u89C4\u67E5\u8BE2",
            token_count: row.tokens_used || 0,
            estimated_cost: row.tokens_used ? row.tokens_used * 2e-5 : 0,
            details: `\u5BF9\u8BDD\u8BF7\u6C42\u5DF2\u8BA1\u8D39\uFF0C\u4ECA\u65E5\u7D2F\u8BA1\u8C03\u7528 ${row.messages_count} \u6B21\u3002`
          }));
          return res.json(logs2);
        } catch (dbErr) {
          conn.release();
          console.warn("MySQL usage list failed, using memory fallback:", dbErr);
        }
      } catch (err) {
      }
    }
    const userUsageMap = memUsage.get(phone);
    const logs = [];
    if (userUsageMap) {
      let id = 1;
      for (const [date, val] of userUsageMap.entries()) {
        logs.push({
          id: id++,
          created_at: new Date(date).toISOString(),
          module_name: "AI \u667A\u80FD\u5339\u914D",
          action_type: "\u5927\u6A21\u578B\u8BED\u4E49\u68C0\u7D22\u4E0E\u5408\u89C4\u67E5\u8BE2 (\u672C\u5730\u7F13\u5B58)",
          token_count: val.tokens_used,
          estimated_cost: val.tokens_used ? val.tokens_used * 2e-5 : 0,
          details: `\u5BF9\u8BDD\u8BF7\u6C42\u5DF2\u8BA1\u8D39\uFF0C\u8BE5\u65E5\u7D2F\u8BA1\u8C03\u7528 ${val.messages_count} \u6B21\u3002`
        });
      }
    }
    res.json(logs);
  });
  app.post("/api/billing/pay-simulate", async (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: "Missing order_id" });
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          const [txRows] = await conn.query("SELECT * FROM billing_transactions WHERE order_id = ?", [order_id]);
          const tx2 = txRows[0];
          if (tx2) {
            await conn.query("UPDATE billing_transactions SET status = ? WHERE order_id = ?", ["paid", order_id]);
            await conn.query(
              "INSERT INTO user_subscriptions (phone, plan_code, status, end_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE plan_code = VALUES(plan_code), status = VALUES(status), end_date = VALUES(end_date)",
              [tx2.phone, tx2.plan_code, "active", endDate]
            );
            conn.release();
            return res.json({ success: true, message: "Payment simulated successfully" });
          }
        } catch (dbErr) {
          conn.release();
          console.warn("MySQL simulation update failed, using memory:", dbErr);
        }
      } catch (err) {
      }
    }
    const tx = memTransactions.get(order_id);
    if (tx) {
      tx.status = "paid";
      memSubscriptions.set(tx.phone, {
        plan_code: tx.plan_code,
        status: "active",
        start_date: (/* @__PURE__ */ new Date()).toISOString(),
        end_date: endDate.toISOString()
      });
      return res.json({ success: true, message: "Payment simulated successfully in memory" });
    }
    res.status(404).json({ error: "Order not found" });
  });
  app.get("/api/billing/transactions", async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Missing phone" });
    if (dbPool) {
      try {
        const conn = await dbPool.getConnection();
        try {
          const [txRows] = await conn.query(
            "SELECT * FROM billing_transactions WHERE phone = ? ORDER BY created_at DESC",
            [phone]
          );
          conn.release();
          return res.json(txRows);
        } catch (dbErr) {
          conn.release();
          console.warn("MySQL transaction list failed, using memory:", dbErr);
        }
      } catch (err) {
      }
    }
    const list = Array.from(memTransactions.values()).filter((t) => t.phone === phone).sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(list);
  });
  app.get("/api/admin/upgrade/config", async (req, res) => {
    try {
      const config = await getUpgradeConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: "Failed to read upgrade config", message: err.message });
    }
  });
  app.post("/api/admin/upgrade/config", async (req, res) => {
    try {
      const newConfig = req.body;
      const config = await getUpgradeConfig();
      const updatedConfig = { ...config, ...newConfig };
      await saveUpgradeConfig(updatedConfig);
      res.json({ success: true, config: updatedConfig });
    } catch (err) {
      res.status(500).json({ error: "Failed to update upgrade config", message: err.message });
    }
  });
  app.get("/api/admin/upgrade/history", async (req, res) => {
    try {
      const history = await getUpgradeHistory();
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: "Failed to read upgrade history", message: err.message });
    }
  });
  const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
      const file = (0, import_fs3.createWriteStream)(dest);
      const request = (targetUrl) => {
        const client = targetUrl.startsWith("https") ? import_https.default : import_http.default;
        client.get(targetUrl, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            if (response.headers.location) {
              request(response.headers.location);
            } else {
              reject(new Error(`Redirect status ${response.statusCode} but no Location header`));
            }
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: status code ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        }).on("error", (err) => {
          try {
            (0, import_fs3.unlinkSync)(dest);
          } catch (e) {
          }
          reject(err);
        });
      };
      request(url);
    });
  };
  app.post("/api/admin/upgrade/check", async (req, res) => {
    try {
      const config = await getUpgradeConfig();
      const now = Date.now();
      let targetLatest = config.latestVersion || "v1.0.11";
      let targetNotes = config.releaseNotes || "\u5E38\u89C4\u66F4\u65B0";
      let size = config.size || "42.8 MB";
      let downloadUrl = `https://aicertification.oss-cn-hangzhou.aliyuncs.com/updates/${targetLatest}/setup.exe`;
      if (dbPool) {
        try {
          const [rows] = await dbPool.query(
            "SELECT * FROM app_versions WHERE url IS NOT NULL AND url != '' AND url NOT LIKE '%undefined%' ORDER BY created_at DESC LIMIT 1"
          );
          if (rows && rows.length > 0) {
            const dbVersion = rows[0];
            targetLatest = dbVersion.version;
            targetNotes = dbVersion.changelog;
            size = dbVersion.is_delta ? "24.5 MB" : "140.0 MB";
            if (dbVersion.url) {
              downloadUrl = dbVersion.url;
            }
          }
        } catch (dbErr) {
          console.warn("Skipping real db query (offline):", dbErr.message);
        }
      }
      const isHigher = (v1, v2) => {
        const p1 = v1.replace(/^v/, "").split(".").map(Number);
        const p2 = v2.replace(/^v/, "").split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if (p1[i] > (p2[i] || 0)) return true;
          if (p1[i] < (p2[i] || 0)) return false;
        }
        return false;
      };
      const updated = {
        ...config,
        latestVersion: isHigher(targetLatest, config.latestVersion) ? targetLatest : config.latestVersion,
        releaseNotes: isHigher(targetLatest, config.latestVersion) ? targetNotes : config.releaseNotes,
        size: isHigher(targetLatest, config.latestVersion) ? size : config.size,
        lastCheckTime: now,
        releaseDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      await saveUpgradeConfig(updated);
      res.json({ success: true, config: updated, downloadUrl });
    } catch (err) {
      res.status(500).json({ error: "Failed to check upgrade", message: err.message });
    }
  });
  app.post("/api/admin/upgrade/execute", async (req, res) => {
    try {
      const { operator = "\u7BA1\u7406\u5458" } = req.body;
      const config = await getUpgradeConfig();
      const history = await getUpgradeHistory();
      const oldVersion = config.currentVersion;
      const newVersion = config.latestVersion;
      let downloadUrl = "";
      if (dbPool) {
        try {
          const [rows] = await dbPool.query(
            "SELECT * FROM app_versions WHERE version = ? AND url IS NOT NULL AND url != '' AND url NOT LIKE '%undefined%' LIMIT 1",
            [newVersion]
          );
          if (rows && rows.length > 0) {
            downloadUrl = rows[0].url;
          } else {
            const [latestRows] = await dbPool.query(
              "SELECT * FROM app_versions WHERE url IS NOT NULL AND url != '' AND url NOT LIKE '%undefined%' ORDER BY created_at DESC LIMIT 1"
            );
            if (latestRows && latestRows.length > 0) {
              downloadUrl = latestRows[0].url;
            }
          }
        } catch (dbErr) {
          console.warn("[Online Upgrade] Database query error (ignoring):", dbErr.message);
        }
      }
      let downloadMessage = "";
      let executedRealInstaller = false;
      if (downloadUrl) {
        try {
          const tempDir = import_os.default.tmpdir();
          const fileName = `setup-${newVersion}-${Date.now()}.exe`;
          const tempFilePath = import_path2.default.join(tempDir, fileName);
          console.log(`[Online Upgrade] Downloading installer from ${downloadUrl} to ${tempFilePath}...`);
          await downloadFile(downloadUrl, tempFilePath);
          console.log(`[Online Upgrade] Download completed successfully.`);
          downloadMessage = `\u5B89\u88C5\u5305\u5DF2\u987A\u5229\u4E0B\u8F7D\u5230\u672C\u5730\u4E34\u65F6\u76EE\u5F55\u3002`;
          if (process.platform === "win32") {
            console.log(`[Online Upgrade] Spawning detached installer process: ${tempFilePath}`);
            const child = (0, import_child_process.spawn)(tempFilePath, [], {
              detached: true,
              stdio: "ignore"
            });
            child.unref();
            executedRealInstaller = true;
            downloadMessage += ` \u5347\u7EA7\u7A0B\u5E8F\u5DF2\u6210\u529F\u81EA\u52A8\u542F\u52A8\uFF08\u5B89\u88C5\u6587\u4EF6\uFF1A${tempFilePath}\uFF09\uFF0C\u8BF7\u6309\u7167\u5C4F\u5E55\u63D0\u793A\u5B8C\u6210\u7CFB\u7EDF\u5347\u7EA7\u3002`;
          } else {
            downloadMessage += ` \u68C0\u6D4B\u5230\u5F53\u524D\u670D\u52A1\u5668\u8FD0\u884C\u73AF\u5883\u4E3A\u975E Windows \u684C\u9762\u7CFB\u7EDF (Platform: ${process.platform})\uFF0C\u6545\u8DF3\u8FC7\u6267\u884C\uFF0C\u53EF\u8BBF\u95EE\u4E0B\u8F7D\u94FE\u63A5\u624B\u52A8\u4E0B\u8F7D\u5B89\u88C5\uFF1A${downloadUrl}`;
          }
        } catch (downloadErr) {
          console.warn("[Online Upgrade] Failed to download or execute installer:", downloadErr.message);
          downloadMessage = `\u5B89\u88C5\u5305\u4E0B\u8F7D\u5931\u8D25: ${downloadErr.message}\u3002\u5EFA\u8BAE\u60A8\u590D\u5236\u4EE5\u4E0B\u4E91\u7AEF\u76F4\u8FDE\u94FE\u63A5\u8FDB\u884C\u624B\u52A8\u5347\u7EA7\u5B89\u88C5\uFF1A${downloadUrl}`;
        }
      } else {
        downloadMessage = `\u672A\u80FD\u5728\u4E91\u7AEF\u6570\u636E\u5E93\u4E2D\u68C0\u7D22\u5230\u7248\u672C ${newVersion} \u5BF9\u5E94\u7684\u6709\u6548\u5B89\u88C5\u5305\u4E0B\u8F7D\u5730\u5740\u3002`;
      }
      const updatedConfig = {
        ...config,
        currentVersion: newVersion,
        latestVersion: newVersion
      };
      const newHistoryEntry = {
        version: newVersion,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        operator,
        status: "success",
        notes: `\u5728\u7EBF\u66F4\u65B0\u5B8C\u6210\uFF1A\u4ECE ${oldVersion} \u5347\u7EA7\u81F3 ${newVersion}\u3002${downloadMessage}`
      };
      const updatedHistory = [newHistoryEntry, ...history];
      await saveUpgradeConfig(updatedConfig);
      await saveUpgradeHistory(updatedHistory);
      res.json({
        success: true,
        config: updatedConfig,
        history: updatedHistory,
        executedRealInstaller,
        downloadMessage,
        downloadUrl
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to execute upgrade", message: err.message });
    }
  });
  app.get("/api/app/check-update", async (req, res) => {
    try {
      if (!dbPool) {
        return res.status(500).json({ error: "Database not connected" });
      }
      const [rows] = await dbPool.query(
        "SELECT * FROM app_versions WHERE url IS NOT NULL AND url != '' AND url NOT LIKE '%undefined%' ORDER BY created_at DESC LIMIT 1"
      );
      if (rows && rows.length > 0) {
        res.json({ success: true, data: rows[0] });
      } else {
        res.json({ success: true, data: null, message: "No updates found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to check update", message: err.message });
    }
  });
  app.post("/api/app/publish-version", async (req, res) => {
    try {
      if (!dbPool) {
        return res.status(500).json({ error: "Database not connected" });
      }
      const { version, url, manifest_url, changelog, is_delta = true, force_update = false } = req.body;
      await dbPool.query(
        `INSERT INTO app_versions (version, url, manifest_url, changelog, is_delta, force_update)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           url = VALUES(url), 
           manifest_url = VALUES(manifest_url), 
           changelog = VALUES(changelog),
           is_delta = VALUES(is_delta),
           force_update = VALUES(force_update)`,
        [version, url, manifest_url, changelog, is_delta, force_update]
      );
      res.json({ success: true, message: "Version published successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to publish version", message: err.message });
    }
  });
  app.post("/api/admin/oss/test", async (req, res) => {
    try {
      const { region, accessKeyId, accessKeySecret, bucket } = req.body;
      const client = new import_ali_oss.default({
        region,
        accessKeyId,
        accessKeySecret,
        bucket
      });
      const result = await client.list({ "max-keys": 1 });
      res.json({ success: true, message: "OSS connection successful", count: result.objects?.length || 0 });
    } catch (err) {
      res.status(500).json({ error: "OSS connection failed", message: err.message });
    }
  });
  app.post("/api/admin/db/test_remote", async (req, res) => {
    try {
      const { host, port, user, password, database } = req.body;
      const testConn = await import_promise2.default.createConnection({
        host,
        port: Number(port),
        user,
        password,
        database,
        connectTimeout: 5e3
      });
      await testConn.ping();
      await testConn.query(`
        CREATE TABLE IF NOT EXISTS app_versions (
          version VARCHAR(50) PRIMARY KEY,
          url VARCHAR(255),
          manifest_url VARCHAR(255),
          changelog TEXT,
          is_delta BOOLEAN,
          force_update BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      const [rows] = await testConn.query("SELECT COUNT(*) as count FROM app_versions");
      await testConn.end();
      res.json({ success: true, message: "DB connection successful", count: rows[0].count });
    } catch (err) {
      res.status(500).json({ error: "DB connection failed", message: err.message });
    }
  });
  app.get("/api/ai/config", async (req, res) => {
    try {
      const settings = await getAiSettings();
      if (settings) {
        res.json(settings);
      } else {
        res.status(404).json({ error: "Not configured yet" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to read config", message: err.message });
    }
  });
  app.post("/api/ai/config", async (req, res) => {
    try {
      const newSettings = req.body;
      await saveAiSettings(newSettings);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update config", message: err.message });
    }
  });
  app.post("/api/db/config", async (req, res) => {
    try {
      const newConfig = req.body;
      await saveDbConfig(newConfig);
      currentDbConfig = newConfig;
      await initDbPool();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update config", message: err.message });
    }
  });
  app.post("/api/db/test", async (req, res) => {
    try {
      const config = req.body;
      const testConn = await import_promise2.default.createConnection({
        host: config.host || "localhost",
        port: config.port || 3306,
        user: config.user || "root",
        password: config.password || "",
        database: config.database || "test",
        connectTimeout: 5e3
        // 5 seconds to fail quickly
      });
      await testConn.ping();
      await testConn.end();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Connection failed", message: err.message });
    }
  });
  app.get("/api/db/teachers", async (req, res) => {
    if (!dbPool) return res.status(500).json({ error: "DB not connected" });
    try {
      const [rows] = await dbPool.query("SELECT * FROM `t num`");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/proxy/tencent-docs", async (req, res) => {
    try {
      const { url, headers, method = "GET", data } = req.body;
      const response = await (0, import_axios2.default)({
        method,
        url,
        headers,
        data
      });
      const resData = response.data;
      if (resData && (resData.gridData || resData.data?.gridData)) {
        const grid = resData.gridData || resData.data?.gridData;
        if (grid && grid.rows && grid.rows[3]) {
          console.log("CELL DATA [Row 3]:", JSON.stringify(grid.rows[3].values?.slice(0, 5), null, 2));
        }
      }
      res.json(response.data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message, details: err.response?.data });
    }
  });
  const smsCodes = /* @__PURE__ */ new Map();
  app.post("/api/auth/send-code", (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    smsCodes.set(phone, code);
    console.log(`[SMS] code for ${phone} is ${code}`);
    setTimeout(() => res.json({ success: true, message: "\u9A8C\u8BC1\u7801\u53D1\u9001\u6210\u529F(\u6A21\u62DF)", code }), 500);
  });
  app.post("/api/auth/register", async (req, res) => {
    const { name, phone, code, password, role } = req.body;
    if (!dbPool) return res.status(500).json({ error: "DB not connected" });
    if (!name || !phone || !code || !password || !role) return res.status(400).json({ error: "Missing fields" });
    if (smsCodes.get(phone) !== code) {
      return res.status(401).json({ error: "\u9A8C\u8BC1\u7801\u9519\u8BEF\u6216\u5DF2\u8FC7\u671F" });
    }
    try {
      const tableName = currentDbConfig.table || "web user";
      const safeTable = tableName.replace(/[^a-zA-Z0-9_ ]/g, "");
      const webUserTable = "web user";
      const [existingOld] = await dbPool.query(`SELECT * FROM \`${safeTable}\` WHERE \`\u624B\u673A\u53F7\` = ?`, [phone]);
      const [existingNew] = await dbPool.query(`SELECT * FROM \`${webUserTable}\` WHERE \`\u624B\u673A\u53F7\` = ?`, [phone]);
      if (existingOld.length > 0 || existingNew.length > 0) {
        return res.status(400).json({ error: "\u8BE5\u624B\u673A\u53F7\u5DF2\u6CE8\u518C" });
      }
      let permissions = {
        "\u8303\u56F4\u68C0\u7D22\u6743\u9650": "\u8BFB\u5199",
        "\u9879\u76EE\u8BC4\u5BA1\u6743\u9650": "\u8BFB\u5199",
        "\u6392\u7A0B\u6743\u9650": "\u8BFB\u5199",
        "\u5BA1\u6838\u7B56\u5212\u6743\u9650": role === "\u4E1A\u52A1" ? "\u53EA\u8BFB" : "\u8BFB\u5199",
        "AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650": "\u8BFB\u5199"
      };
      let userType = "\u514D\u8D39\u7528\u6237";
      if (phone === "17798547783") {
        userType = "\u4E13\u4E1A\u7528\u6237";
      } else {
        try {
          const [sub] = await dbPool.query('SELECT plan_code FROM user_subscriptions WHERE phone = ? AND status = "active"', [phone]);
          if (sub.length > 0) {
            const plan = sub[0].plan_code;
            if (plan === "pro" || plan === "enterprise") {
              userType = "\u4E13\u4E1A\u7528\u6237";
            }
          }
        } catch (err) {
        }
      }
      await dbPool.query(
        `INSERT INTO \`${webUserTable}\` (\`\u59D3\u540D\`, \`\u624B\u673A\u53F7\`, \`\u521D\u59CB\u5BC6\u7801\`, \`\u66F4\u65B0\u5BC6\u7801\`, \`\u8303\u56F4\u68C0\u7D22\u6743\u9650\`, \`\u9879\u76EE\u8BC4\u5BA1\u6743\u9650\`, \`\u6392\u7A0B\u6743\u9650\`, \`\u5BA1\u6838\u7B56\u5212\u6743\u9650\`, \`AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650\`, \`\u5C97\u4F4D\`, \`\u7528\u6237\u7C7B\u578B\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, phone, password, password, permissions["\u8303\u56F4\u68C0\u7D22\u6743\u9650"], permissions["\u9879\u76EE\u8BC4\u5BA1\u6743\u9650"], permissions["\u6392\u7A0B\u6743\u9650"], permissions["\u5BA1\u6838\u7B56\u5212\u6743\u9650"], permissions["AI\u5F15\u64CE\u914D\u7F6E\u6743\u9650"], role, userType]
      );
      smsCodes.delete(phone);
      res.json({ success: true });
    } catch (err) {
      console.warn("Registration error (ignoring):", err.message);
      res.status(500).json({ error: "\u6CE8\u518C\u5931\u8D25" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const { phone, password, code, isSmsLogin, macAddress } = req.body;
    if (!dbPool) return res.status(500).json({ error: "DB not connected" });
    try {
      const tableName = currentDbConfig.table || "web user";
      const safeTable = tableName.replace(/[^a-zA-Z0-9_ ]/g, "");
      const webUserTable = "web user";
      let user = null;
      let isFromWebUser = false;
      if (isSmsLogin) {
        if (!code || smsCodes.get(phone) !== code) {
          return res.status(401).json({ error: "\u9A8C\u8BC1\u7801\u9519\u8BEF" });
        }
        smsCodes.delete(phone);
        const [webUsers] = await dbPool.query(`SELECT * FROM \`${webUserTable}\` WHERE \`\u624B\u673A\u53F7\` = ?`, [phone]);
        const webUsersArr = webUsers;
        if (webUsersArr.length > 0) {
          user = webUsersArr[0];
          isFromWebUser = true;
        } else {
          const [users] = await dbPool.query(`SELECT * FROM \`${safeTable}\` WHERE \`\u624B\u673A\u53F7\` = ?`, [phone]);
          const usersArr = users;
          if (usersArr.length === 0) {
            return res.status(404).json({ error: "\u8D26\u6237\u672A\u6CE8\u518C\uFF0C\u8BF7\u5148\u6CE8\u518C" });
          }
          user = usersArr[0];
          user["\u7528\u6237\u7C7B\u578B"] = phone === "17798547783" ? "\u4E13\u4E1A\u7528\u6237" : "\u514D\u8D39\u7528\u6237";
        }
      } else {
        const [webUsers] = await dbPool.query(`SELECT * FROM \`${webUserTable}\` WHERE \`\u624B\u673A\u53F7\` = ? AND (\`\u66F4\u65B0\u5BC6\u7801\` = ? OR \`\u521D\u59CB\u5BC6\u7801\` = ?)`, [phone, password, password]);
        const webUsersArr = webUsers;
        if (webUsersArr.length > 0) {
          user = webUsersArr[0];
          isFromWebUser = true;
        } else {
          const [users] = await dbPool.query(`SELECT * FROM \`${safeTable}\` WHERE \`\u624B\u673A\u53F7\` = ? AND (\`\u66F4\u65B0\u5BC6\u7801\` = ? OR \`\u521D\u59CB\u5BC6\u7801\` = ?)`, [phone, password, password]);
          const usersArr = users;
          if (usersArr.length === 0) return res.status(401).json({ error: "\u624B\u673A\u53F7\u6216\u5BC6\u7801\u9519\u8BEF" });
          user = usersArr[0];
          user["\u7528\u6237\u7C7B\u578B"] = phone === "17798547783" ? "\u4E13\u4E1A\u7528\u6237" : "\u514D\u8D39\u7528\u6237";
        }
      }
      if (user) {
        const incomingMac = macAddress ? String(macAddress) : "";
        if (incomingMac) {
          const targetTable = isFromWebUser ? webUserTable : safeTable;
          await dbPool.query(`UPDATE \`${targetTable}\` SET \`mac\u5730\u5740\` = ? WHERE \`\u5E8F\u53F7\` = ?`, [incomingMac, user["\u5E8F\u53F7"]]);
          user["mac\u5730\u5740"] = incomingMac;
        }
      }
      return res.json({ success: true, user });
    } catch (err) {
      console.warn("Login error (ignoring):", err.message);
      res.status(500).json({ error: "\u767B\u5F55\u5931\u8D25" });
    }
  });
  app.post("/api/proxy/bainiu-company", async (req, res) => {
    try {
      const { key, key_type, version } = req.body;
      const clientId = "tpcMygOk";
      const clientKey = "RcsiUHqvS5p5K7J1";
      const timespan = Math.floor(Date.now() / 1e3).toString();
      const authString = crypto.createHash("md5").update(clientId + "-" + timespan + "-" + clientKey).digest("hex").toUpperCase();
      const params = new URLSearchParams();
      params.append("key", key);
      if (key_type) params.append("key_type", key_type);
      if (version) params.append("version", version);
      const response = await fetch("http://openapi.bainiudata.com/openapi/common/company_detail/", {
        method: "POST",
        headers: {
          "CLIENTID": clientId,
          "Timespan": timespan,
          "Authorization": authString,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      if (!response.ok) {
        throw new Error("API Error: " + response.status);
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch bainiu API", details: err.message });
    }
  });
  app.post("/api/ai-proxy", async (req, res) => {
    let { baseUrl, apiKey, body } = req.body;
    const isMockKey = !apiKey || apiKey === "AIzaSyDTJJfeWqD5JHpimtHB1eQ-K_Pjo0BmrlM" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("INSERT_YOUR_KEY");
    if (isMockKey && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    } else if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("INSERT_YOUR_KEY")) {
      return res.status(401).json({
        error: "API key not valid",
        message: "\u672A\u68C0\u6D4B\u5230\u6709\u6548\u7684 API Key\u3002\u8BF7\u5728 AI Studio \u7684\u201CSecrets\u201D\u9762\u677F\u4E2D\u914D\u7F6E GEMINI_API_KEY\uFF0C\u6216\u5728\u5E94\u7528\u7684\u201CAI\u5F15\u64CE\u914D\u7F6E\u201D\u4E2D\u624B\u52A8\u8F93\u5165\u3002",
        hint: "If you are the developer, ensure you have set the GEMINI_API_KEY secret in the AI Studio Settings."
      });
    }
    if (!body) {
      return res.status(400).json({ error: "Missing request body" });
    }
    try {
      let targetUrl = baseUrl || "https://generativelanguage.googleapis.com";
      const isGeminiNative = !!body.contents;
      const isGeminiUrl = targetUrl.includes("generativelanguage.googleapis.com");
      if (isGeminiNative || isGeminiUrl) {
        const cleanBaseUrl = targetUrl.replace(/\/$/, "");
        const model = body.model || "gemini-1.5-flash";
        const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
        const clientConfig = body.generation_config || body.generationConfig || {};
        const config = {};
        if (clientConfig.temperature !== void 0) config.temperature = clientConfig.temperature;
        if (clientConfig.maxOutputTokens !== void 0) config.maxOutputTokens = clientConfig.maxOutputTokens;
        if (clientConfig.max_output_tokens !== void 0) config.maxOutputTokens = clientConfig.max_output_tokens;
        if (clientConfig.topP !== void 0) config.topP = clientConfig.topP;
        if (clientConfig.top_p !== void 0) config.topP = clientConfig.top_p;
        if (clientConfig.topK !== void 0) config.topK = clientConfig.topK;
        if (clientConfig.top_k !== void 0) config.topK = clientConfig.top_k;
        const responseMimeType = clientConfig.response_mime_type || clientConfig.responseMimeType;
        if (responseMimeType) config.responseMimeType = responseMimeType;
        const responseSchema = clientConfig.response_schema || clientConfig.responseSchema;
        if (responseSchema) {
          const uppercaseSchemaTypes = (schema) => {
            if (!schema || typeof schema !== "object") return schema;
            if (Array.isArray(schema)) {
              return schema.map(uppercaseSchemaTypes);
            }
            const result = {};
            for (const key of Object.keys(schema)) {
              if (key === "type" && typeof schema[key] === "string") {
                result[key] = schema[key].toUpperCase();
              } else {
                result[key] = uppercaseSchemaTypes(schema[key]);
              }
            }
            return result;
          };
          config.responseSchema = uppercaseSchemaTypes(responseSchema);
        }
        const systemInstruction = body.system_instruction || body.systemInstruction;
        let currentModel = cleanModel;
        let fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
        if (baseUrl && (baseUrl.includes("/v1") || baseUrl.includes("generateContent"))) {
          fetchUrl = baseUrl.includes("?") ? `${baseUrl}&key=${apiKey}` : `${baseUrl}?key=${apiKey}`;
        }
        console.log(`[Proxy] Constructing fetchUrl: ${fetchUrl.replace(/key=.*$/, "key=***")}`);
        if (fetchUrl.includes("localhost:3000") || fetchUrl.includes("0.0.0.0:3000")) {
          throw new Error("Detected recursive AI proxy call. Base URL cannot point to the application itself.");
        }
        console.log(`[Proxy] Direct Gemini REST call using Axios to model ${currentModel}`);
        let response = null;
        let retries = 4;
        let attempt = 0;
        let success = false;
        const modelQueue = [
          "gemini-2.5-flash",
          "gemini-1.5-flash",
          "gemini-1.5-flash-8b"
        ];
        while (attempt < retries) {
          attempt++;
          try {
            response = await import_axios2.default.post(fetchUrl, {
              contents: body.contents,
              ...systemInstruction ? { systemInstruction } : {},
              ...body.tools ? { tools: body.tools } : {},
              ...Object.keys(config).length > 0 ? { generationConfig: config } : {}
            }, {
              headers: {
                "Content-Type": "application/json"
              },
              timeout: 6e5,
              validateStatus: () => true
            });
            const hasValidPayload = response?.data && typeof response.data === "object" && Object.keys(response.data).length > 0;
            if (response.status === 200 && hasValidPayload) {
              success = true;
              break;
            }
            const isPermanentUserError = response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404;
            if (attempt === 1 && isPermanentUserError) {
              console.warn(`[Proxy] Permanent parameter or authentication error detected on initial model (Status: ${response.status}). Bypassing retry.`);
              break;
            }
            console.warn(`[Proxy] Attempt ${attempt}/${retries} failed or unsupported. status: ${response.status}, payload: ${JSON.stringify(response?.data)}`);
            if (attempt < retries) {
              const nextModel = modelQueue.find((m) => m !== currentModel && !currentModel.endsWith(m));
              if (nextModel) {
                const containsModelsPath = cleanModel.startsWith("models/");
                currentModel = containsModelsPath ? nextModel.startsWith("models/") ? nextModel : `models/${nextModel}` : nextModel.replace(/^models\//, "");
                fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
                console.log(`[Proxy] Moving to dynamic fallback model: ${currentModel}`);
              }
              const waitMs = 1e3 * attempt + Math.floor(Math.random() * 500);
              console.log(`[Proxy] Waiting ${waitMs}ms before next retry...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
          } catch (axiosErr) {
            console.warn(`[Proxy] Axios post error during attempt ${attempt}:`, axiosErr.message);
            if (attempt < retries) {
              const nextModel = modelQueue.find((m) => m !== currentModel && !currentModel.endsWith(m));
              if (nextModel) {
                const containsModelsPath = cleanModel.startsWith("models/");
                currentModel = containsModelsPath ? nextModel.startsWith("models/") ? nextModel : `models/${nextModel}` : nextModel.replace(/^models\//, "");
                fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
                console.log(`[Proxy] Moving to dynamic fallback model after network error: ${currentModel}`);
              }
              const waitMs = 1500 * attempt;
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            } else {
              if (!response) {
                return res.status(504).json({
                  error: {
                    message: `\u8BF7\u6C42\u4EE3\u7406\u7F51\u5173\u65F6\u53D1\u751F\u4E86\u4E25\u91CD\u7F51\u7EDC\u9519\u8BEF\u6216\u8D85\u65F6\uFF08${axiosErr.message}\uFF09\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u5C1D\u8BD5\u51CF\u5C11\u6587\u6863\u7684\u4F53\u79EF\u5927\u5C0F\u3002`,
                    status: "GATEWAY_TIMEOUT",
                    code: 504
                  }
                });
              }
              throw axiosErr;
            }
          }
        }
        if (!success && response) {
          console.warn(`[Proxy] Direct REST Call Final Failure - status: ${response.status}`, JSON.stringify(response.data));
          let originalErrorText = response.data?.error?.message || `API Response Error (${response.status})`;
          if (currentModel !== cleanModel) {
            const originalUserSetupModel = body.model || "\u672A\u8BBE\u5B9A";
            const fallbackModelSimple = currentModel.replace(/^models\//, "");
            const combinedFriendlyMessage = `\u3010\u5168\u94FE\u8DEF\u964D\u7EA7\u91CD\u8BD5\u6700\u7EC8\u5931\u8D25\u3011
\u60A8\u5728\u63A7\u5236\u9762\u677F\u9996\u9009\u914D\u7F6E\u7684\u6A21\u578B\u662F \u201C${originalUserSetupModel}\u201D\u3002\u4F46\u5728\u63D0\u4EA4\u5206\u6790\u65F6\u8BE5\u6A21\u578B\u6682\u65F6\u65E0\u6CD5\u8FD4\u56DE\u6709\u6548\u8F93\u51FA\uFF08\u5982 429 \u8D1F\u8F7D\u8FC7\u5927\u6216\u7531\u4E8E\u975E\u6B63\u5F0F\u4E34\u65F6\u6A21\u578B\u4E0D\u53EF\u8FBE\uFF09\u3002\u5E95\u5C42\u7CFB\u7EDF\u667A\u80FD\u5730\u89E6\u53D1\u4E86\u964D\u7EA7\u9000\u907F\u91CD\u8F7D\u673A\u5236\uFF0C\u81EA\u52A8\u8F6E\u8BE2\u5C1D\u8BD5\u4E86\u5907\u7528\u6781\u901F\u6A21\u578B \u201C${fallbackModelSimple}\u201D\uFF0C\u4F46\u6700\u7EC8\u4ECD\u5BA3\u544A\u53D7\u9650\u3002

\u{1F4A1} \u5B8C\u7F8E\u89E3\u51B3\u65B9\u6848\uFF1A
1. \u8BF4\u660E\u9ED8\u8BA4\u5185\u7F6E\u514D\u8D39\u5171\u4EAB\u4E2D\u8F6C\u6B64\u65F6\u8FC7\u4E8E\u7E41\u5FD9\uFF0C\u5EFA\u8BAE\u5728\u9875\u9762\u9876\u90E8\u201CAI\u5F15\u64CE\u914D\u7F6E\u201D\u6807\u7B7E\uFF1B
2. \u8F93\u5165\u60A8\u7684\u4E2A\u4EBA\u72EC\u4EAB API Key \u53CA\u5BF9\u5E94\u7684 Model \u540D\u4EE5\u76F4\u63A5\u83B7\u5F97 100% \u6781\u901F\u8BA1\u7B97\u4FDD\u969C\uFF1B
3. \u6216\u662F\u5C06\u4E0D\u7B26\u5408\u8981\u6C42\u7684\u6A21\u578B\u53D8\u56DE\u9AD8\u517C\u5BB9\u6027\u7684\u5B98\u65B9\u6807\u51C6\u6A21\u578B\uFF08\u5982 \u201Cgemini-2.5-flash\u201D\uFF09\uFF1B

(\u6700\u672B\u91CD\u5EA6\u5C1D\u8BD5\u65F6\u5E95\u5C42\u7684\u62A5\u9519\u7EC6\u8282: ${originalErrorText})`;
            if (response.data && response.data.error) {
              response.data.error.message = combinedFriendlyMessage;
            } else {
              response.data = { error: { message: combinedFriendlyMessage, status: "DEGRADATION_FAILED", code: 429 } };
            }
          } else if (response.status === 429) {
            const friendlyMessage = `\u3010API \u914D\u989D\u8D85\u9650/\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41 (429 Error)\u3011
\u5F53\u524D\u60A8\u5185\u7F6E\u6216\u914D\u7F6E\u7684 AI \u8FD0\u884C\u914D\u989D\u5DF2\u8017\u5C3D\uFF0C\u6216\u8005\u63A5\u53E3\u8BF7\u6C42\u53D7\u9650\u3002

\u{1F4A1} \u5FEB\u901F\u4FEE\u590D\u65B9\u6848\uFF1A
1. \u8BF7\u5728\u9875\u9762\u9876\u90E8\u70B9\u51FB\u5E76\u8FDB\u5165\u201CAI \u5339\u914D\u5F15\u64CE\u914D\u7F6E\u201D\u9762\u677F\uFF1B
2. \u81EA\u884C\u8F93\u5165\u60A8\u7684\u4E2A\u4EBA API Key\uFF0C\u6216\u8005\u66F4\u6362\u914D\u7F6E\u5176\u4ED6\u6E20\u9053\u6216\u66F4\u7A7A\u95F2\u7684\u6A21\u578B\uFF1B
3. \u5982\u679C\u4F7F\u7528\u7684\u662F\u514D\u8D39\u5185\u7F6E\u4E2D\u8F6C\uFF0C\u8BF7\u7B49\u5F85\u7247\u523B\u6216\u660E\u65E5\u518D\u8BD5\u6062\u590D\u914D\u989D\u3002

(\u539F\u59CB\u9519\u8BEF\u539F\u56E0: ${originalErrorText})`;
            if (response.data && response.data.error) {
              response.data.error.message = friendlyMessage;
            } else {
              response.data = { error: { message: friendlyMessage, status: "RESOURCE_EXHAUSTED", code: 429 } };
            }
          }
          const outStatus = response.status === 200 ? 502 : response.status;
          const outData = response.status === 200 ? {
            error: {
              message: "AI \u670D\u52A1\u8FD4\u56DE\u4E86 200 \u72B6\u6001\u7801\uFF0C\u4F46\u5728\u91CD\u8BD5\u540E\u4ECD\u672A\u63A5\u6536\u5230\u4EFB\u4F55\u6709\u6548\u8F7D\u8377\u3002\u53EF\u80FD\u7531\u4E8E\u5F53\u524D\u7684\u6A21\u578B\u4E0D\u53EF\u7528\u3001\u6216\u88AB\u5E73\u53F0\u7684\u5B89\u5168\u7B56\u7565\uFF08SAFETY / RECITATION\uFF09\u76F4\u63A5\u963B\u65AD\u4ECE\u800C\u8FD4\u56DE\u4E86\u7A7A\u8D1F\u8F7D\u3002\u8BF7\u5C1D\u8BD5\u66F4\u6362\u8FD0\u884C\u6A21\u578B\u6216\u8F93\u5165\u4E2A\u4EBA API Key \u8FDB\u884C\u8C03\u7528\u3002",
              status: "BAD_GATEWAY",
              code: 502
            }
          } : response.data || { message: `REST API Error (${response.status})` };
          return res.status(outStatus).json(outData);
        }
        if (!response) {
          return res.status(500).json({ error: "Proxy Error", message: "No response received from remote server." });
        }
        console.log(`[Proxy] Direct REST Call responded successfully through model ${currentModel}`);
        res.status(200).json(response.data);
      } else {
        let cleanedUrl = targetUrl.trim();
        const lowerUrl = cleanedUrl.toLowerCase();
        if (lowerUrl.includes("api.deepseek.com") && !lowerUrl.includes("/v1") && !lowerUrl.includes("/beta")) {
          cleanedUrl = cleanedUrl.replace(/api\.deepseek\.com\/?$/, "api.deepseek.com/v1");
        } else if (lowerUrl.includes("api.moonshot.cn") && !lowerUrl.includes("/v1")) {
          cleanedUrl = cleanedUrl.replace(/api\.moonshot\.cn\/?$/, "api.moonshot.cn/v1");
        } else if (lowerUrl.includes("dashscope.aliyuncs.com") && !lowerUrl.includes("/compatible-mode")) {
          cleanedUrl = cleanedUrl.replace(/dashscope\.aliyuncs\.com\/?$/, "dashscope.aliyuncs.com/compatible-mode/v1");
        } else if (lowerUrl.includes("api.openai.com") && !lowerUrl.includes("/v1")) {
          cleanedUrl = cleanedUrl.replace(/api\.openai\.com\/?$/, "api.openai.com/v1");
        }
        targetUrl = cleanedUrl;
        if (!targetUrl.toLowerCase().includes("chat/completions")) {
          targetUrl = targetUrl.endsWith("/") ? targetUrl + "chat/completions" : targetUrl + "/chat/completions";
        }
        console.log(`[Proxy] Routing request to: ${targetUrl}`);
        const headers = {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "CertMatch-AI-Engine/1.0",
          "Authorization": `Bearer ${apiKey}`
        };
        const response = await import_axios2.default.post(targetUrl, body, {
          headers,
          timeout: 6e5,
          validateStatus: () => true
        });
        console.log(`[Proxy] Target responded with: ${response.status}`);
        const hasValidPayload = response?.data && typeof response.data === "object" && Object.keys(response.data).length > 0;
        if (response.status === 200 && !hasValidPayload) {
          return res.status(502).json({
            error: {
              message: "\u76EE\u6807 OpenAI \u517C\u5BB9\u63A5\u53E3\u8FD4\u56DE\u4E86 200 \u72B6\u6001\u7801\uFF0C\u4F46\u662F\u5728\u54CD\u5E94\u4E2D\u672A\u5305\u542B\u4EFB\u4F55\u6709\u6548\u8F7D\u8377\u3002\u8BF7\u786E\u8BA4\u60A8\u7684 Base URL \u6216\u6A21\u578B\u914D\u7F6E\u3002",
              status: "BAD_GATEWAY",
              code: 502
            }
          });
        }
        let outData = response.data;
        if (typeof outData === "string" && (outData.includes("<!DOCTYPE") || outData.includes("<html"))) {
          outData = {
            error: {
              message: `\u76EE\u6807 OpenAI \u63A5\u53E3\u8FD4\u56DE\u4E86 HTML \u683C\u5F0F\u7684\u7CFB\u7EDF\u6392\u67E5\u9519\u8BEF\u9875 (\u72B6\u6001\u7801: ${response.status})\u3002\u8FD9\u901A\u5E38\u8BF4\u660E\u4E0A\u6E38\u63A5\u53E3\u7EBF\u8DEF\u6545\u969C\u3001\u6216\u8005\u60A8\u7684 Base URL \u4EE3\u7406\u5730\u5740\u914D\u7F6E\u9519\u8BEF\uFF0C\u5BFC\u81F4\u76EE\u6807\u670D\u52A1\u5668\u6216 CDN \u62E6\u622A\u5E76\u4E22\u5F03\u4E86\u8BF7\u6C42\u3002`,
              details: outData.replace(/<[^>]*>/g, " ").substring(0, 300).trim()
            }
          };
        }
        res.status(response.status).json(outData);
      }
    } catch (error) {
      console.warn(`[Proxy] Error: ${error.message}`);
      const status = error.response?.status || 500;
      let data = error.response?.data || {
        message: error.message,
        hint: "Internal Proxy Error: Could not reach the target LLM provider. Please check the Base URL and your network proxy settings."
      };
      if (typeof data === "string" && (data.includes("<!DOCTYPE") || data.includes("<html"))) {
        data = {
          message: `\u76EE\u6807\u63A5\u53E3\u8FD4\u56DE\u4E86 HTML \u683C\u5F0F\u7684\u7CFB\u7EDF\u9519\u8BEF\u6392\u67E5\u9875 (\u72B6\u6001\u7801: ${status})\u3002\u8FD9\u901A\u5E38\u4EE3\u8868\u4E0A\u6E38 API \u4F9B\u5E94\u5546\u7EBF\u8DEF\u6545\u969C\u3001\u6216\u8005\u60A8\u7684\u4EE3\u7406/\u4E2D\u8F6C\u914D\u7F6E\u4E0D\u5F53\u5BFC\u81F4\u8BF7\u6C42\u88AB\u62E6\u622A\u3002`,
          details: data.replace(/<[^>]*>/g, " ").substring(0, 300).trim()
        };
      }
      res.status(status).json(data);
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", dbConnected: !!dbPool });
  });
  app.get("/oauth/wps", (req, res) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>\u6388\u6743\u4E2D...</title></head>
      <body>
        <script>
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          if (window.opener) {
            window.opener.postMessage({
              type: 'WPS_DOCS_OAUTH',
              code: code,
              state: state
            }, '*');
          }
          window.close();
        </script>
        \u60A8\u5DF2\u5B8C\u6210\u6388\u6743\uFF0C\u53EF\u4EE5\u5173\u95ED\u6B64\u7A97\u53E3\u3002
      </body>
      </html>
    `;
    res.send(html);
  });
  if (process.env.NODE_ENV !== "production") {
    Promise.resolve().then(() => (init_auto_version(), auto_version_exports)).then((m) => {
      m.startWatcher();
    }).catch((err) => {
      console.warn("[Auto-Version] Failed to start version watcher:", err.message);
    });
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(currentDir, "../publish");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    console.warn("Express Error:", err.message);
    if (!res.headersSent) {
      if (err.type === "entity.too.large") {
        res.status(413).json({ error: "Payload Too Large", message: "\u8BF7\u6C42\u4F53\u79EF\u8FC7\u5927\uFF0C\u88AB\u670D\u52A1\u5668\u62E6\u622A\u3002" });
      } else {
        res.status(err.status || 500).json({ error: "Server Error", message: err.message });
      }
    }
  });
  const actualPort = 3e3;
  const httpServer = import_http.default.createServer(app);
  const io = new import_socket.Server(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8,
    // 100 MB limit
    pingTimeout: 6e5,
    pingInterval: 12e4
  });
  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    socket.on("ai-proxy", async (data, callback) => {
      try {
        let { baseUrl, apiKey, body, phone } = data;
        if (phone) {
          try {
            const subStatus = await getSubscriptionStatus(phone);
            if (subStatus.used_today >= subStatus.ai_limit_per_day) {
              return callback({
                status: 403,
                data: {
                  error: {
                    message: `\u60A8\u4ECA\u65E5\u7684 AI \u5339\u914D\u989D\u5EA6\u5DF2\u8FBE\u4E0A\u9650\uFF08${subStatus.used_today}/${subStatus.ai_limit_per_day}\u6B21\uFF09\u3002\u4E13\u4E1A\u5546\u7528\u7248\u62E5\u6709\u6BCF\u65E5 100 \u6B21\u989D\u5EA6\uFF0C\u4F01\u4E1A\u4E13\u5C5E\u7248\u62E5\u6709 10,000 \u6B21\u3002\u8BF7\u524D\u5F80\u201C\u4F1A\u5458\u4E2D\u5FC3\u201D\u5347\u7EA7\u60A8\u7684\u65B9\u6848\uFF0C\u6216\u5728\u201CAI \u5F15\u64CE\u914D\u7F6E\u201D\u4E2D\u5F00\u542F\u5E76\u4F7F\u7528\u60A8\u4E2A\u4EBA\u7684 API Key\u3002`
                  }
                }
              });
            }
          } catch (limitErr) {
            console.warn("Subscription checking failed inside socket proxy:", limitErr);
          }
        }
        const isMockKey = !apiKey || apiKey === "AIzaSyDTJJfeWqD5JHpimtHB1eQ-K_Pjo0BmrlM" || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("INSERT_YOUR_KEY");
        if (isMockKey && process.env.GEMINI_API_KEY) {
          apiKey = process.env.GEMINI_API_KEY;
        } else if (!apiKey) {
          apiKey = process.env.GEMINI_API_KEY;
        }
        if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("INSERT_YOUR_KEY")) {
          return callback({ status: 401, data: { error: "API key not valid", message: "\u672A\u68C0\u6D4B\u5230\u6709\u6548\u7684 API Key\u3002" } });
        }
        if (!body) {
          return callback({ status: 400, data: { error: "Missing request body" } });
        }
        let targetUrl = baseUrl || "https://generativelanguage.googleapis.com";
        const isGeminiNative = !!body.contents;
        const isGeminiUrl = targetUrl.includes("generativelanguage.googleapis.com");
        if (isGeminiNative || isGeminiUrl) {
          const cleanBaseUrl = targetUrl.replace(/\/$/, "");
          const model = body.model || "gemini-1.5-flash";
          const cleanModel = model.startsWith("models/") ? model : `models/${model}`;
          const clientConfig = body.generation_config || body.generationConfig || {};
          const config = {};
          if (clientConfig.temperature !== void 0) config.temperature = clientConfig.temperature;
          if (clientConfig.maxOutputTokens !== void 0) config.maxOutputTokens = clientConfig.maxOutputTokens;
          if (clientConfig.max_output_tokens !== void 0) config.maxOutputTokens = clientConfig.max_output_tokens;
          if (clientConfig.topP !== void 0) config.topP = clientConfig.topP;
          if (clientConfig.top_p !== void 0) config.topP = clientConfig.top_p;
          if (clientConfig.topK !== void 0) config.topK = clientConfig.topK;
          if (clientConfig.top_k !== void 0) config.topK = clientConfig.top_k;
          const responseMimeType = clientConfig.response_mime_type || clientConfig.responseMimeType;
          if (responseMimeType) config.responseMimeType = responseMimeType;
          const responseSchema = clientConfig.response_schema || clientConfig.responseSchema;
          if (responseSchema) {
            const uppercaseSchemaTypes = (schema) => {
              if (!schema || typeof schema !== "object") return schema;
              if (Array.isArray(schema)) return schema.map(uppercaseSchemaTypes);
              const result = {};
              for (const key of Object.keys(schema)) {
                if (key === "type" && typeof schema[key] === "string") {
                  result[key] = schema[key].toUpperCase();
                } else {
                  result[key] = uppercaseSchemaTypes(schema[key]);
                }
              }
              return result;
            };
            config.responseSchema = uppercaseSchemaTypes(responseSchema);
          }
          const systemInstruction = body.system_instruction || body.systemInstruction;
          let currentModel = cleanModel;
          let fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
          if (baseUrl && (baseUrl.includes("/v1") || baseUrl.includes("generateContent"))) {
            fetchUrl = baseUrl.includes("?") ? `${baseUrl}&key=${apiKey}` : `${baseUrl}?key=${apiKey}`;
          }
          let response = null;
          let retries = 4;
          let attempt = 0;
          let success = false;
          const modelQueue = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
          while (attempt < retries) {
            attempt++;
            try {
              response = await import_axios2.default.post(fetchUrl, {
                contents: body.contents,
                ...systemInstruction ? { systemInstruction } : {},
                ...body.tools ? { tools: body.tools } : {},
                ...Object.keys(config).length > 0 ? { generationConfig: config } : {}
              }, {
                headers: { "Content-Type": "application/json" },
                timeout: 6e5,
                validateStatus: () => true
              });
              const hasValidPayload = response?.data && typeof response.data === "object" && Object.keys(response.data).length > 0;
              if (response.status === 200 && hasValidPayload) {
                success = true;
                break;
              }
              const isPermanentUserError = response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404;
              if (attempt === 1 && isPermanentUserError) break;
              if (attempt < retries) {
                const nextModel = modelQueue.find((m) => m !== currentModel && !currentModel.endsWith(m));
                if (nextModel) {
                  const containsModelsPath = cleanModel.startsWith("models/");
                  currentModel = containsModelsPath ? nextModel.startsWith("models/") ? nextModel : `models/${nextModel}` : nextModel.replace(/^models\//, "");
                  fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
                }
                const waitMs = 1e3 * attempt + Math.floor(Math.random() * 500);
                await new Promise((resolve) => setTimeout(resolve, waitMs));
              }
            } catch (axiosErr) {
              if (attempt < retries) {
                const nextModel = modelQueue.find((m) => m !== currentModel && !currentModel.endsWith(m));
                if (nextModel) {
                  const containsModelsPath = cleanModel.startsWith("models/");
                  currentModel = containsModelsPath ? nextModel.startsWith("models/") ? nextModel : `models/${nextModel}` : nextModel.replace(/^models\//, "");
                  fetchUrl = `${cleanBaseUrl}/v1beta/${currentModel}:generateContent?key=${apiKey}`;
                }
                const waitMs = 1500 * attempt;
                await new Promise((resolve) => setTimeout(resolve, waitMs));
              } else {
                if (!response) {
                  return callback({ status: 500, data: { error: "Network Error", message: axiosErr.message } });
                }
              }
            }
          }
          if (!success && response) {
            let outData = response.data;
            let outStatus = response.status;
            if (typeof outData === "string" && (outData.includes("<!DOCTYPE") || outData.includes("<html"))) {
              outData = {
                error: {
                  message: `\u76EE\u6807\u63A5\u53E3\u8FD4\u56DE\u4E86 HTML \u683C\u5F0F\u7684\u7CFB\u7EDF\u6392\u67E5\u9519\u8BEF\u9875 (\u72B6\u6001\u7801: ${outStatus})\u3002\u8FD9\u901A\u5E38\u4EE3\u8868\u4E0A\u6E38 API \u4F9B\u5E94\u5546\u7EBF\u8DEF\u6545\u969C\u3001\u6216\u8005\u60A8\u7684\u4EE3\u7406/\u4E2D\u8F6C\u914D\u7F6E\u4E0D\u5F53\u5BFC\u81F4\u8BF7\u6C42\u88AB\u62E6\u622A\u3002`,
                  details: outData.replace(/<[^>]*>/g, " ").substring(0, 300).trim()
                }
              };
            }
            return callback({ status: outStatus, data: outData });
          }
          if (!response) {
            return callback({ status: 500, data: { error: "Proxy Error", message: "No response received from remote server." } });
          }
          let responseData = response.data;
          if (typeof responseData === "string" && (responseData.includes("<!DOCTYPE") || responseData.includes("<html"))) {
            responseData = {
              error: {
                message: "AI \u670D\u52A1\u8FD4\u56DE\u4E86 HTML \u683C\u5F0F\u7684\u54CD\u5E94\u3002\u8FD9\u901A\u5E38\u8BF4\u660E API \u63A5\u53E3\u5730\u5740\u6216\u8DEF\u5F84\u914D\u7F6E\u4E0D\u6B63\u786E\u3002",
                details: responseData.substring(0, 200).replace(/<[^>]*>/g, " ")
              }
            };
            return callback({ status: 502, data: responseData });
          }
          if (phone) {
            await incrementUsage(phone).catch((e) => console.warn("Usage inc error:", e.message));
          }
          callback({ status: 200, data: responseData });
        } else {
          let cleanedUrl = targetUrl.trim();
          const lowerUrl = cleanedUrl.toLowerCase();
          if (lowerUrl.includes("api.deepseek.com") && !lowerUrl.includes("/v1") && !lowerUrl.includes("/beta")) {
            cleanedUrl = cleanedUrl.replace(/api\.deepseek\.com\/?$/, "api.deepseek.com/v1");
          } else if (lowerUrl.includes("api.moonshot.cn") && !lowerUrl.includes("/v1")) {
            cleanedUrl = cleanedUrl.replace(/api\.moonshot\.cn\/?$/, "api.moonshot.cn/v1");
          } else if (lowerUrl.includes("dashscope.aliyuncs.com") && !lowerUrl.includes("/compatible-mode")) {
            cleanedUrl = cleanedUrl.replace(/dashscope\.aliyuncs\.com\/?$/, "dashscope.aliyuncs.com/compatible-mode/v1");
          } else if (lowerUrl.includes("api.openai.com") && !lowerUrl.includes("/v1")) {
            cleanedUrl = cleanedUrl.replace(/api\.openai\.com\/?$/, "api.openai.com/v1");
          }
          targetUrl = cleanedUrl;
          if (!targetUrl.toLowerCase().includes("chat/completions")) {
            targetUrl = targetUrl.endsWith("/") ? targetUrl + "chat/completions" : targetUrl + "/chat/completions";
          }
          const response = await import_axios2.default.post(targetUrl, body, {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "CertMatch-AI-Engine/1.0",
              "Authorization": `Bearer ${apiKey}`
            },
            timeout: 6e5,
            validateStatus: () => true
          });
          let outData = response.data;
          if (typeof outData === "string" && (outData.includes("<!DOCTYPE") || outData.includes("<html"))) {
            outData = {
              error: {
                message: `\u76EE\u6807 OpenAI \u63A5\u53E3\u8FD4\u56DE\u4E86 HTML \u683C\u5F0F\u7684\u7CFB\u7EDF\u6392\u67E5\u9519\u8BEF\u9875 (\u72B6\u6001\u7801: ${response.status})\u3002\u8FD9\u901A\u5E38\u8BF4\u660E\u4E0A\u6E38\u63A5\u53E3\u7EBF\u8DEF\u6545\u969C\u3001\u6216\u8005\u60A8\u7684 Base URL \u4EE3\u7406\u5730\u5740\u914D\u7F6E\u9519\u8BEF\u3002`,
                details: outData.replace(/<[^>]*>/g, " ").substring(0, 300).trim()
              }
            };
          }
          if (phone && response.status === 200) {
            await incrementUsage(phone).catch((e) => console.warn("Usage inc error:", e.message));
          }
          callback({ status: response.status, data: outData });
        }
      } catch (error) {
        const status = error.response?.status || 500;
        let data2 = error.response?.data || { message: error.message };
        callback({ status, data: data2 });
      }
    });
  });
  httpServer.listen(actualPort, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${actualPort}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
