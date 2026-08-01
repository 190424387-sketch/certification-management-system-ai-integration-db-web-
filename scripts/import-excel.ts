import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = XLSX.readFile ? XLSX : require('xlsx');

const EXCEL_FILE = 'source.xlsx';
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/categories.ts');

interface CategoryItem {
  majorId: string;
  mediumId: string;
  smallId: string;
  name: string;
  description: string;
  includes: string[];
  excludes: string[];
}

async function run() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`错误: 找不到文件 ${EXCEL_FILE}。请将 Excel 文件放入根目录并重命名为 source.xlsx`);
    process.exit(1);
  }

  console.log(`正在读取 ${EXCEL_FILE}...`);
  const workbook = xlsx.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 使用 header: 1 获取原始数组，方便处理合并单元格
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log(`读取到 ${rows.length} 行数据，正在转换格式...`);

  const categories: CategoryItem[] = [];
  let currentMajorId = '';
  let currentMediumId = '';
  let currentSmallId = '';
  let currentCategory: CategoryItem | null = null;

  // 假设表头在第一行，从第二行开始处理
  // 表头顺序假设为：大类, 中类, 小类, 类别名称, 分类内容说明, 包括内容, 不包括内容
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const majorId = String(row[0] || '').trim();
    const mediumId = String(row[1] || '').trim();
    const smallId = String(row[2] || '').trim();
    const name = String(row[3] || '').trim();
    const description = String(row[4] || '').trim();
    const includes = String(row[5] || '').trim();
    const excludes = String(row[6] || '').trim();

    // 如果有新的 ID，则开启新的类别项
    if (majorId || mediumId || smallId) {
      // 如果有新的 ID 且当前已有类别，则保存
      if (currentCategory) {
        categories.push(currentCategory);
      }

      // 更新当前 ID 状态（处理合并单元格逻辑：如果当前行为空则沿用上一行）
      if (majorId) currentMajorId = majorId;
      if (mediumId) currentMediumId = mediumId;
      if (smallId) currentSmallId = smallId;

      currentCategory = {
        majorId: currentMajorId,
        mediumId: currentMediumId,
        smallId: currentSmallId,
        name: name,
        description: description,
        includes: includes ? [includes] : [],
        excludes: excludes ? [excludes] : []
      };
    } else if (currentCategory) {
      // 如果没有 ID，但是有内容，则认为是上一项的延续（处理被打断的单元格）
      if (name) currentCategory.name += (currentCategory.name ? ' ' : '') + name;
      if (description) currentCategory.description += (currentCategory.description ? ' ' : '') + description;
      if (includes) currentCategory.includes.push(includes);
      if (excludes) currentCategory.excludes.push(excludes);
    }
  }

  // 别忘了最后一个
  if (currentCategory) {
    categories.push(currentCategory);
  }

  // 清理数据：处理 includes/excludes 中的换行符，并去重去空
  const cleanedCategories = categories.map(cat => ({
    ...cat,
    includes: cat.includes.flatMap(s => s.split('\n')).map(s => s.trim()).filter(Boolean),
    excludes: cat.excludes.flatMap(s => s.split('\n')).map(s => s.trim()).filter(Boolean)
  }));

  // 生成 TypeScript 文件内容
  const fileContent = `/**
 * 本文件由脚本自动生成，请勿手动修改。
 * 生成时间: ${new Date().toLocaleString()}
 */

import { CategoryItem } from '../types';

export const categoriesData: CategoryItem[] = ${JSON.stringify(cleanedCategories, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, fileContent);
  console.log(`成功！已将数据写入 ${OUTPUT_FILE}，共 ${cleanedCategories.length} 条数据`);
}

run().catch(err => {
  console.error('执行出错:', err);
});
