import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'publish', 'index.html');
if (!fs.existsSync(filePath)) {
    console.error('Error: publish/index.html not found.');
    process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');

// 1. Bulletproof Error UI - Pre-loaded at the very top
const preInit = `
<div id="offline-error-display" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999999; font-family:sans-serif; align-items:center; justify-content:center; flex-direction:column; padding:2rem; text-align:center;">
    <div style="background:#fff1f0; border:1px solid #ffa39e; padding:2rem; border-radius:1rem; max-width:600px; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
        <h3 style="color:#cf1322; margin-top:0;">程序初始化失败</h3>
        <p style="color:#595959; font-size:14px; margin-bottom:1rem;">当前运行环境限制了脚本执行，请尝试使用 Chrome 浏览器打开。</p>
        <p style="color:#888; font-size:12px; margin-bottom:2rem;">运行记录已保存至: <br/><code style="background:#eee; padding:2px 4px; border-radius:4px;">%AppData%/react-example/logs/runtime-debug.log</code></p>
        <div id="error-log" style="background:#fff; border:1px solid #d9d9d9; padding:1rem; border-radius:0.5rem; text-align:left; font-family:monospace; font-size:12px; max-height:200px; overflow:auto; white-space:pre-wrap; word-break:break-all;">未捕捉到具体错误</div>
        <button onclick="location.reload()" style="margin-top:2rem; background:#1677ff; color:white; border:none; padding:10px 24px; border-radius:6px; cursor:pointer;">刷新重试</button>
    </div>
</div>
<script>
    (function() {
        var log = document.getElementById('error-log');
        var ui = document.getElementById('offline-error-display');
        function showError(msg, detail) {
            ui.style.display = 'flex';
            log.innerText = (msg || "未知错误") + "\\n\\n" + (detail || "");
        }
        window.onerror = function(m, u, l, c, e) {
            showError("运行代码报错: " + m, e?.stack || ("Line: "+l + " Col: "+c));
            return false;
        };
        window.addEventListener('unhandledrejection', function(event) {
            showError("异步任务报错: " + event.reason, event.reason?.stack);
        });

        // Watchdog: If the app hasn't mounted in 15 seconds, show error
        var mountCheck = setTimeout(function() {
            if (!window.__APP_MOUNTED__) {
                if (!window.__JS_EXECUTING__) {
                    showError("核心引擎启动失败", "浏览器已下载代码，但 JavaScript 虚拟机未能成功启动。\\n这通常是因为浏览器禁用了本地脚本执行，或代码在解析 2MB 数据包时崩溃。");
                } else {
                    showError("应用渲染超时", "JavaScript 引擎已启动，但主界面（或登录页）未能成功渲染。\\n\\n可能原因：\\n1. 您的电脑处理 1.5MB 数据包的速度较慢；\\n2. 初始化逻辑发生死循环。\\n\\n建议：右键使用 Chrome 浏览器打开以获得最佳性能。");
                }
            }
        }, 15000); // 增加到 15 秒，确保大数据包有足够时间解析
        
        // Polyfill Environment
        window.global = window;
        window.process = { env: { NODE_ENV: 'production' } };
        
        // Polyfill LocalStorage
        try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); } catch(e) {
            var s = {};
            window.localStorage = {
                getItem: function(k){ return s[k] || null; },
                setItem: function(k,v){ s[k] = String(v); },
                removeItem: function(k){ delete s[k]; },
                clear: function(){ s = {}; }
            };
        }
    })();
</script>
`;

// Insert UI at the start of body
html = html.replace('<body>', '<body>' + preInit);

// 2. CLEANUP VITE ARTIFACTS
// NOTE: We keep type="module" because it is required for ES modules (code splitting)
// but we still remove crossorigin and integrity checks which fail on file://
html = html.replace(/\scrossorigin\b/g, ' ');
html = html.replace(/\sintegrity="[^"]*"/g, ' ');

// Ensure all script/link paths are strictly relative to support file:// correctly
html = html.replace(/(src|href)="\/([^"]*)"/g, '$1="./$2"');

fs.writeFileSync(filePath, html);
console.log('Post-build: Successfully optimized index.html for ES Module execution.');
