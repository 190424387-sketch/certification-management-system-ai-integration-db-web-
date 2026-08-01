import fs from 'fs';
import path from 'path';
import Fuse from "fuse.js";
import { searchIndex, categoriesTree } from "../src/data/categories";

// ==========================================
// 1. 结构化类别树和建立映射表
// ==========================================
const categoriesTreeNodesMap = new Map<string, any>();
const buildCategoriesTreeNodesMap = (nodes: any[]) => {
  nodes.forEach(node => {
    const code = node.smallId || node.mediumId || node.majorId || "";
    if (code) {
      categoriesTreeNodesMap.set(code, node);
    }
  });
};
buildCategoriesTreeNodesMap(searchIndex);

// ==========================================
// 2. 帮助函数
// ==========================================
function formatFullCode(code: string): string {
  if (!code) return "";
  const parts = code.split(".");
  if (parts.length === 3) return code;
  if (parts.length === 2) return `${code}.00`;
  return `${code}.00.00`;
}

function preprocessSearchQuery(query: string) {
  let cleaned = query.replace(/[的及和与等]/g, " ");
  const stopWords = ["销售", "制造", "生产", "研发", "设计", "开发", "加工", "服务", "咨询", "工程", "系统", "管理", "集成"];
  stopWords.forEach((word) => {
    cleaned = cleaned.replace(new RegExp(word, "g"), " ");
  });
  return cleaned.replace(/\s+/g, " ").trim();
}

// ==========================================
// 3. 模糊搜索初始化
// ==========================================
const fuse = new Fuse(searchIndex, {
  keys: [
    { name: "name", weight: 3 },
    { name: "text_unit", weight: 1 },
  ],
  threshold: 0.5,
  ignoreLocation: true,
});

// ==========================================
// 4. 解析原始 OCR 文本
// ==========================================
function parseOcrText(text: string) {
    const lines = text.split('\n');
    const results = [];
    
    for (let line of lines) {
      line = line.trim();
      // 支持常见的体系前缀，如 QMS, EMS, OHSMS 等
      const match = line.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS)\s+(.+?)\s+'([0-9.;*]+)$/);
      if (match) {
          results.push({
              desc: match[1].trim(),
              codes: match[2].split(/[;；]/).filter(c => c.trim().length > 0).map(c => c.replace(/\*/g, '').trim())
          });
      }
    }
    return results;
}

// ==========================================
// 5. 本地匹配逻辑 (与 AIPanel 中保持一致)
// ==========================================
function getTopLocalMatches(query: string, customMappings: Record<string, string[]>) {
  const items = Array.from(categoriesTreeNodesMap.values());
  const cleanQuery = query.trim();
  
  const matches: any[] = [];
  const seenCodes = new Set<string>();

  const addMatch = (item: any, score: number, reason: string, isExpert?: boolean) => {
    const rawCode = item.smallId || item.mediumId || item.majorId || "";
    const code = formatFullCode(rawCode);
    if (!code) return;
    if (seenCodes.has(code)) {
       const existing = matches.find(m => formatFullCode(m.item.smallId || m.item.mediumId || m.item.majorId) === code);
       if (existing && existing.score < score) {
         existing.score = score;
         existing.reason = reason;
       }
       return;
    }
    seenCodes.add(code);
    matches.push({ item, score, reason, isExpert });
  };

  const suffixMatch = cleanQuery.match(/(的?(?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发)(?:[及和与、](?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发))*)$/);
  const coreQuery = suffixMatch ? cleanQuery.replace(suffixMatch[0], "").trim() : cleanQuery;

  const preprocessedQuery = cleanQuery.replace(/[的及和与等]/g, " ");

  Object.keys(customMappings).forEach((keyword) => {
    if (cleanQuery.includes(keyword) || preprocessedQuery.includes(keyword)) {
      customMappings[keyword].forEach((code) => {
        const matchedItem = items.find((i) => i.smallId === code || i.mediumId === code || i.majorId === code);
        if (matchedItem) {
          const isVeryClose = cleanQuery === keyword || 
            cleanQuery.replace(/的|厂|公司|加工|服务|处理|活动/g, "") === keyword.replace(/的|厂|公司|加工|服务|处理|活动/g, "");
          const score = isVeryClose ? 98 : 92 + (keyword.length * 0.1); // Add slight weight for longer keywords
          addMatch(matchedItem, score, `专家语义映射：检测到"${keyword}"`, true);
        }
      });
    }
  });

  const phraseResults = fuse.search(coreQuery.length > 1 ? coreQuery : cleanQuery).slice(0, 15);
  phraseResults.forEach((res) => {
      let score = Math.max(0, 85 - (res.score || 0) * 100);
      const node = categoriesTreeNodesMap.get(res.item.smallId || res.item.mediumId || res.item.majorId || "");
      if (node) {
          addMatch(node, score, "模糊匹配");
      }
  });

  return matches.sort((a, b) => b.score - a.score).map(m => m.item.smallId || m.item.mediumId || m.item.majorId).slice(0, 10);
}

// ==========================================
// 6. 主执行流程
// ==========================================
function runCalibration(inputFile: string) {
    const customMappingsPath = path.resolve(process.cwd(), 'src/data/custom_mappings.json');
    let customMappings: Record<string, string[]> = {};
    if (fs.existsSync(customMappingsPath)) {
        customMappings = JSON.parse(fs.readFileSync(customMappingsPath, 'utf8'));
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file ${inputFile} not found.`);
        process.exit(1);
    }
    
    let isJson = inputFile.endsWith('.json');
    let tests = [];
    
    if (isJson) {
        tests = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    } else {
        const rawText = fs.readFileSync(inputFile, 'utf8');
        tests = parseOcrText(rawText);
    }
    
    console.log(`Loaded ${tests.length} test cases from ${inputFile}`);
    
    let successLocal = 0;
    let addedCount = 0;
    
    for (let i = 0; i < tests.length; i++) {
        const t = tests[i];
        let localMatches = getTopLocalMatches(t.desc, customMappings);
        
        let matched = false;
        for (const c of t.codes) {
           if (localMatches.some(m => m && formatFullCode(m).startsWith(formatFullCode(c)))) {
               matched = true;
               break;
           }
        }
        
        if (!matched) {
            console.log(`[FAIL] ${t.desc} (Expected: ${t.codes.join(", ")})`);
            
            // 策略调整: 提取核心关键词并自动写入映射
            const coreMatch = t.desc.match(/(.+?)(的?(?:设计|研发|开发|制造|生产|加工|销售|服务|咨询|管理|维修|安装|集成))/);
            let keyword = coreMatch ? coreMatch[1].replace(/[（\(].*?[）\)]/g, '').trim() : t.desc.substring(0, 4);
            
            // 如果关键词太短或包含不必要的标点，进一步清理
            keyword = keyword.replace(/^[、，。；！？：]+|[、，。；！？：]+$/g, '');
            
            if (keyword && keyword.length >= 1) {
                if (!customMappings[keyword]) customMappings[keyword] = [];
                customMappings[keyword].push(...t.codes);
                customMappings[keyword] = [...new Set(customMappings[keyword])];
                
                // 实时保存
                fs.writeFileSync(customMappingsPath, JSON.stringify(customMappings, null, 2));
                
                // 重新验证
                localMatches = getTopLocalMatches(t.desc, customMappings);
                matched = localMatches.some(m => t.codes.some((c: string) => formatFullCode(m).startsWith(formatFullCode(c))));
                
                if (matched) {
                     console.log(`  -> [FIXED] Auto-added mapping for "${keyword}"`);
                     addedCount++;
                     successLocal++;
                } else {
                     console.log(`  -> [STILL FAILING] Even after adding "${keyword}"`);
                }
            }
        } else {
            successLocal++;
            // 可以选择关闭这一行的输出，以减少干扰
            // console.log(`[PASS] ${t.desc}`);
        }
    }
    
    console.log(`\n==========================================`);
    console.log(`Calibration Completed!`);
    console.log(`Total Cases: ${tests.length}`);
    console.log(`Successful:  ${successLocal}`);
    console.log(`New Mappings Added: ${addedCount}`);
    console.log(`Strategy file updated: src/data/custom_mappings.json`);
    console.log(`==========================================\n`);
}

const inputFile = process.argv[2];
if (!inputFile) {
    console.log("Usage: npx tsx scripts/calibrate.ts <input_file.txt_or_json>");
    process.exit(1);
}

runCalibration(inputFile);
