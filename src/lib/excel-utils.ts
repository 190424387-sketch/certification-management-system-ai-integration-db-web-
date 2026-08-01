import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CategoryItem } from '../types';

export function exportToExcel(data: CategoryItem[]) {
  const worksheetData = data.map(item => ({
    '大类': item.majorId,
    '中类': item.mediumId,
    '小类': item.smallId,
    '类别名称': item.name,
    '分类内容说明': item.description,
    '包括内容': item.includes?.join('\n') || '',
    '不包括内容': item.excludes?.join('\n') || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  // Set column widths
  const wscols = [
    { wch: 10 }, // 大类
    { wch: 10 }, // 中类
    { wch: 15 }, // 小类
    { wch: 40 }, // 类别名称
    { wch: 80 }, // 分类内容说明
    { wch: 50 }, // 包括内容
    { wch: 50 }  // 不包括内容
  ];
  worksheet['!cols'] = wscols;

  // Implement cell merging for Major and Medium IDs
  const merges: XLSX.Range[] = [];
  let startMajor = 1;
  let startMedium = 1;

  for (let i = 1; i < data.length; i++) {
    // Major ID merging
    if (data[i].majorId !== data[i - 1].majorId) {
      if (i - startMajor > 1) {
        merges.push({ s: { r: startMajor, c: 0 }, e: { r: i, c: 0 } });
      }
      startMajor = i + 1;
    }

    // Medium ID merging
    if (data[i].mediumId && data[i].mediumId === data[i - 1].mediumId) {
      // Continue
    } else {
      if (i - startMedium > 1 && data[i-1].mediumId) {
        merges.push({ s: { r: startMedium, c: 1 }, e: { r: i, c: 1 } });
      }
      startMedium = i + 1;
    }
  }

  // Handle last groups
  if (data.length - startMajor > 0) {
    merges.push({ s: { r: startMajor, c: 0 }, e: { r: data.length, c: 0 } });
  }
  if (data.length - startMedium > 0 && data[data.length - 1].mediumId) {
    merges.push({ s: { r: startMedium, c: 1 }, e: { r: data.length, c: 1 } });
  }

  worksheet['!merges'] = merges;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '认证业务范围分类');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  
  saveAs(blob, '管理体系认证业务范围分类内容说明.xlsx');
}
