// src/lib/scheduling-algorithm.ts

/**
 * 提取专业代码的辅助函数
 */
export function parseCodes(codeStr: string | undefined): string[] {
   if (!codeStr) return [];
   // Q/E/S/ISMS/ITSMS format, extract what's before parenthesis or match pattern
   const rawCodes = codeStr.split(/[,;，；\s]+/).map(c => {
      let trimmed = c.trim();
      const sysPrefixMatch = trimmed.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
      if (sysPrefixMatch) {
         trimmed = trimmed.substring(sysPrefixMatch[0].length).trim();
      }
      return trimmed;
   }).filter(Boolean);
   
   // Exact parsing logic could be complex. For now, simple extraction of everything looking like a code:
   const matches = codeStr.match(/[0-9]{2}\.[0-9]{2}(\.[0-9]{2})?/g);
   return Array.from(new Set(matches || rawCodes));
}

/**
 * 计算代码匹配分数
 */
export function calculateMatch(teacherCodes: string[], inputCodes: string[]): number {
   let score = 0;
   for (const ic of inputCodes) {
      if (teacherCodes.some(tc => tc.includes(ic) || ic.includes(tc))) {
         score++;
      }
   }
   return score;
}

/**
 * 判断单元格是否为空（未排程）
 */
function isEmpty(cellValue: any): boolean {
   return cellValue === undefined || cellValue === null || String(cellValue).replace(/[\u200B-\u200D\uFEFF]/g, '').trim() === '';
}

/**
 * 获取排程占用的连续列索引
 * @param startCol 开始列（在 0-63 范围，代表第 1 个半天到第 64 个半天）
 * @param days 所需人日数（例如 1.5 = 3 个半天）
 */
export function getOccupiedCells(startCol: number, days: number): number[] {
   const cells: number[] = [];
   let remaining = Math.floor(days * 2); // 1 day = 2 half-days
   if (days % 1 === 0.5) {
      // remaining is already calculated properly if we use days * 2 without floor
   }
   remaining = days * 2;
   
   let col = startCol;
   while (remaining > 0) {
      cells.push(col);
      col++;
      remaining--;
   }
   return cells;
}

export interface TeacherRow {
   name: string;
   codesStr: string;
   days: { am: string; pm: string }[]; // Length 32
}

export interface ScheduleSolution {
   p1Start: number;
   p1End: number;
   p1Cells: number[];
   p2Start: number;
   p2End: number;
   p2Cells: number[];
   matchScore: number;
}

/**
 * 单个教师的方案搜索
 */
export function findSchedulesForTeacher(
   teacher: TeacherRow,
   inputCodes: string[],
   p1Days: number,
   p2Days: number,
   targetMonth: 'current' | 'next' = 'current'
): ScheduleSolution[] {
   const solutions: ScheduleSolution[] = [];
   
   const extractedCodes = parseCodes(teacher.codesStr);
   const matchScore = calculateMatch(extractedCodes, inputCodes);
   
   // 如果必须匹配才显示，则可以启用此行；暂不过滤，为了展示部分匹配或无匹配但可排程
   // if (matchScore === 0) return [];
   
   const maxCols = 124; // 62 days * 2
   const minColIdx = targetMonth === 'next' ? 0 : (new Date().getDate() + 3 - 1) * 2;
   
   // 将62天的 am/pm 转为线性的 124 列数据
   const linearData: string[] = [];
   teacher.days.forEach(d => {
      linearData.push(d.am);
      linearData.push(d.pm);
   });

   // 遍历一阶段可能的开始位置
   for (let p1Start = minColIdx; p1Start < maxCols; p1Start++) {
      const p1Cells = getOccupiedCells(p1Start, p1Days);
      const p1End = p1Cells[p1Cells.length - 1];
      
      if (p1End >= maxCols) break; // 超出范围
      
      // 检查一阶段是否全空
      const p1Available = p1Cells.every(colIdx => isEmpty(linearData[colIdx]));
      if (!p1Available) continue;
      
      // 间隔至少 10 个半天 (PRD: s - e - 1 >= 10)
      const p2Earliest = p1End + 11;
      
      for (let p2Start = p2Earliest; p2Start < maxCols; p2Start++) {
         const p2Cells = getOccupiedCells(p2Start, p2Days);
         const p2End = p2Cells[p2Cells.length - 1];
         
         if (p2End >= maxCols) break;
         
         // 检查二阶段是否全空
         const p2Available = p2Cells.every(colIdx => isEmpty(linearData[colIdx]));
         if (p2Available) {
            solutions.push({
               p1Start,
               p1End,
               p1Cells,
               p2Start,
               p2End,
               p2Cells,
               matchScore
            });
         }
      }
   }
   
   // 排序规则：匹配分(降序)、一阶段开始早(升序)、二阶段开始早(升序)
   solutions.sort((a, b) => {
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      if (a.p1Start !== b.p1Start) return a.p1Start - b.p1Start;
      return a.p2Start - b.p2Start;
   });
   
   // 每人最多 5 个方案
   return solutions.slice(0, 5);
}

/**
 * 将线性索引转换为展示用的日期字符串（假设第一天为 第1天）
 */
export function formatDayRange(startCol: number, endCol: number): string {
   const startDay = Math.floor(startCol / 2) + 1;
   const startAmPm = startCol % 2 === 0 ? '上午' : '下午';
   const endDay = Math.floor(endCol / 2) + 1;
   const endAmPm = endCol % 2 === 0 ? '上午' : '下午';
   
   const formatDay = (d: number) => {
      if (d <= 31) return `当月${d}号`;
      return `次月${d - 31}号`;
   };

   if (startDay === endDay) {
      if (startCol === endCol) return `${formatDay(startDay)}${startAmPm}`;
      return `${formatDay(startDay)}(${startAmPm}-${endAmPm})`;
   }
   return `${formatDay(startDay)}${startAmPm}-${formatDay(endDay)}${endAmPm}`;
}
