# Gemini 修改指令与实质改动记录 (Gemini Modifications & Changelog)

本文件记录了在 Gemini 交互中针对“云路由增量发布分发系统”做出的实质性代码改动和版本对账优化逻辑。

---

## 1. 自动版本管理与编译防双重自增
*   **涉及文件**：`scripts/auto-version.ts` & `scripts/publish.ts`
*   **改动详情**：
    *   在 `publish.ts` 执行 `build:exe` 或发布打包时，注入环境变量 `SKIP_AUTO_VERSION_BUMP = 'true'`。
    *   在 `auto-version.ts` 的版本自增入口检测该环境变量，若存在则直接跳过，防止在发布、打包原生 EXE 时发生二次意外提代。
    *   修正了升级配置文件中的版本对碰逻辑：自增脚本中不再去覆盖 `currentVersion`，而是仅更新 `latestVersion`，确保本地部署版本与云端可更新版本的语义清晰分离。

## 2. 升级配置文件同步与对碰
*   **涉及文件**：`upgrade-config.json`
*   **改动详情**：
    *   更正了配置字段冲突，将 `currentVersion` 设为 `v1.0.12`，而将最新的构建云端索引版本（`latestVersion`）升级至 `v1.0.31`，完美解决客户端本地“已是最新版本”与云端版本的对账倒置问题。
    *   更新了发布日志（`releaseNotes`），固化大并发安全通道对账、双冗余熔断防御、多语境独立环境等核心语义描述。

## 3. 管理后台 (AdminPanel) 版本发布计算与触发器
*   **涉及文件**：`src/components/AdminPanel.tsx`
*   **改动详情**：
    *   **预填版本计算函数**：重构 `getNextVersion(current, cloud)`。当本地主版本号高于云端版本（如开发分支跃升）时，以本地版本为基准计算下一次发布号，而非盲目在落后的云端版本上自增。
    *   **发布表单状态联动**：将 `useEffect` 触发器依赖项拓展为 `[currentVersion, cloudVersion]` 双向监听，任何一方变化均会实时计算并重新装填预发布 CDN 更新包路径（如对应的 `manifest.json` 路径）。

## 4. 远程数据库自动播种对齐 (Auto-Seeding)
*   **涉及文件**：`server.ts`
*   **改动详情**：
    *   在后台服务建立 MySQL 连接池并校验 `app_versions` 实体表结构时，新增了**最新版本主动播种 (Database Seeding)** 机制。
    *   系统会自动读取当前项目 `package.json` 中的实际打包版本号，采用 `INSERT INTO ... ON DUPLICATE KEY UPDATE` 写入云数据库，防止发布记录在干净数据库上缺失，实现远程版本 and 本地源码库的无缝同步。

## 5. 全局版本号统合与本地编译对齐 (Global Version Convergence)
*   **涉及文件**：`package.json` & `upgrade-config.json`
*   **改动详情**：
    *   **源码版本直接对齐**：将 `package.json` 的主版本号从 `1.0.36` 全面校准至最新云端版本 `1.0.38`。
    *   **本地固件初始状态对账**：将 `upgrade-config.json` 中的本地当前运行固件版本（`currentVersion`）和检测的发行版本（`latestVersion`）统一同步提升至 `v1.0.38`。
    *   **解决本地编译非最新版程序问题**：解决了在本地拉取代码后编译生成的 NSIS 引导包（如 `.exe`）依然停留在老版本（例如 `1.0.12.exe`）的倒置对账问题，使本地一键打包、本地热调试和云推送保持百分之百的一致性。

## 6. 范围检索功能与 AI 智能匹配引擎战略校准（下阶段工作标记）
*   **当前标记**：建立关于“范围检索与AI智能匹配决策引擎”多组检验和校准的工程红线。
*   **改动原则**：后续对匹配引擎、距离推荐等算法进行多维度校对与压力校准测试时，必须保证环境沙盒化。严禁改动或污染 `src/components/AIPanel.tsx` 等受保护的核心分类微调规则和各独立业务功能。


