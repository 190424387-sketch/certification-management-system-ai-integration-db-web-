import { useState, useEffect } from 'react';

export function useGlobalPaste() {
  const [scheduleData, setScheduleData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('certMatch_schedule_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [pastedTargetMonth, setPastedTargetMonth] = useState<'current' | 'next' | null>(() => {
    try {
      const saved = localStorage.getItem('certMatch_schedule_target_month');
      if (saved) return saved as 'current' | 'next' | null;
    } catch (e) {}
    return null;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('certMatch_schedule_data', JSON.stringify(scheduleData));
    } catch (e) {}
  }, [scheduleData]);

  useEffect(() => {
    try {
      if (pastedTargetMonth) {
        localStorage.setItem('certMatch_schedule_target_month', pastedTargetMonth);
      } else {
        localStorage.removeItem('certMatch_schedule_target_month');
      }
    } catch (e) {}
  }, [pastedTargetMonth]);

  const parseAndImportData = (htmlToParse: string, textToParse: string) => {
     let dataGrid: {text: string, bgColor: string}[][] = [];
     let detectedMonth: number | null = null;

     if (htmlToParse) {
        try {
            // Try to extract month from <title> or data-sheet-name attributes (Excel/WPS often sets <title>SheetName</title>)
            const titleMatch = htmlToParse.match(/<title>\s*(?:.*?[-\s])?(\d{1,2})月份?\s*<\/title>/i) || htmlToParse.match(/<title>(\d{1,2})月<\/title>/i);
            if (titleMatch) {
                detectedMonth = parseInt(titleMatch[1], 10);
            } else {
                const sheetMatch = htmlToParse.match(/data-(?:sheet-)?name="(\d{1,2})月(?:份)?"/i);
                if (sheetMatch) {
                    detectedMonth = parseInt(sheetMatch[1], 10);
                }
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlToParse, 'text/html');
            const tables = Array.from(doc.querySelectorAll('table'));
            if (tables.length > 0) {
                // Find the table with the most rows in case there are wrapper tables
                const targetTable = tables.reduce((prev, current) => 
                   (current.rows && prev.rows && current.rows.length > prev.rows.length) ? current : prev
                , tables[0]);

                const rows = Array.from(targetTable.rows || Array.from(targetTable.querySelectorAll('tr')).filter(tr => tr.closest('table') === targetTable));
                
                rows.forEach((tr, rIndex) => {
                    if (!dataGrid[rIndex]) dataGrid[rIndex] = [];
                    // Only direct children to avoid nested tables
                    const cells = Array.from(tr.children).filter(el => el.tagName === 'TD' || el.tagName === 'TH') as HTMLTableCellElement[];
                    
                    let cIndex = 0;
                    cells.forEach(cell => {
                        // MS Excel sometimes outputs the cells covered by a spanning cell, but applies display:none.
                        // We must skip them to prevent grid shifting.
                        if (cell.style && cell.style.display === 'none') {
                            return;
                        }

                        // Skip cells that were already populated by rowSpan/colSpan of previous cells
                        while (dataGrid[rIndex][cIndex] !== undefined) {
                            cIndex++;
                        }
                        
                        const text = cell.innerText || cell.textContent || '';
                        const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                        const rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                        const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
                        
                        let bgColor = cell.style.backgroundColor || cell.getAttribute('bgcolor') || '';
                        
                        // WPS/Excel sometimes put background on a child span or font
                        if (!bgColor && cell.children.length > 0) {
                            const childWithBg = Array.from(cell.querySelectorAll('*')).find((el: any) => el.style && el.style.backgroundColor) as HTMLElement;
                            if (childWithBg) bgColor = childWithBg.style.backgroundColor;
                        }

                        for (let r = 0; r < rowSpan; r++) {
                            for (let c = 0; c < colSpan; c++) {
                                if (!dataGrid[rIndex + r]) dataGrid[rIndex + r] = [];
                                dataGrid[rIndex + r][cIndex + c] = { text: cleanText, bgColor };
                            }
                        }
                    });
                });
            }
        } catch(e) { console.error('HTML parse error', e); }
     }
     
     if (!dataGrid || dataGrid.length === 0) {
        if (!textToParse.trim()) {
           alert('没有解析到任何内容，请确保剪贴板中有表格数据');
           return false;
        }
        dataGrid = textToParse.trim().split('\n').filter(Boolean).map(line => line.split('\t').map(text => ({ text, bgColor: '' })));
     }
     
     if (dataGrid.length === 0) {
        alert('内容解析失败，未找到有效表格。');
        return false;
     }

     // Analyze dataGrid to find startDataCol and maxCols
     let startDataCol = 2; // Default fallback
     let foundStartCol = false;
     let maxCols = 0;
     for (let r = 0; r < dataGrid.length; r++) {
         const row = dataGrid[r] || [];
         let rowDataLen = row.length;
         while (rowDataLen > 0 && !(row[rowDataLen - 1]?.text || '').trim()) {
             rowDataLen--;
         }
         if (rowDataLen > maxCols) maxCols = rowDataLen;
         if (!foundStartCol && r < 10) {
             for (let c = 0; c < Math.min(10, row.length); c++) {
                 const val = (row[c]?.text || '').trim();
                 // Look for indicator of days starting: "1" followed by "2", or "上午" etc.
                 if (val === '上午' || val === '1' || val === '01' || val === '第一天') {
                     // confirm it's a day column by checking next column or row
                     if (c >= 1) {
                         startDataCol = c;
                         foundStartCol = true;
                         break;
                     }
                 }
             }
         }
     }
     
     let lastValidName = '未知审核员';
     
     const actualPastedDays = Math.max(1, Math.ceil((maxCols - startDataCol) / 2));
     const totalDaysToRender = Math.min(62, actualPastedDays);
     
     const newScheduleData = dataGrid.map((cols, rowIndex) => {
        let nameColIndex = 0;
        let name = String(cols[0]?.text || '').trim();
        
        // If A is empty or number, try B
        if (!name || /^\d+$/.test(name) || name === '序号') {
           nameColIndex = 1;
           name = String(cols[1]?.text || '').trim();
           if (!name || /^\d+$/.test(name)) {
               nameColIndex = 2;
               name = String(cols[2]?.text || '').trim();
           }
        }
        
        if (!name) {
             name = lastValidName;
        } else {
             lastValidName = name;
        }

        const days = Array(totalDaysToRender).fill(null).map(() => ({ am: '', amBg: '', pm: '', pmBg: '' }));
        
        let dayIdx = 0;
        for (let c = startDataCol; c < cols.length && dayIdx < totalDaysToRender; c += 2) {
           days[dayIdx] = { 
              am: cols[c]?.text || '', 
              amBg: cols[c]?.bgColor || '',
              pm: cols[c+1]?.text || '',
              pmBg: cols[c+1]?.bgColor || ''
           };
           dayIdx++;
        }
        return { name, days, _raw: cols, rowIndex, totalRenderDays: totalDaysToRender };
     }).filter(row => {
         // Filter out header rows or invalid rows
         if (!row.name || row.name.includes('第一天') || row.name.includes('第1天') || row.name.includes('上午') || row.name.includes('姓名及备注')) return false;
         // check if they are pure header rows
         if (row._raw.every((c: any) => !c?.text || /^\d+$/.test((c?.text || '').trim()) || ['上午', '下午'].includes((c?.text || '').trim()))) return false;
         return true;
     });

     if (newScheduleData.length === 0) {
         alert('未能在复制的内容中识别出有效的排程数据行，请确保已包含老师姓名以及项目内容等。');
         return false;
     }

     let deducedTarget: 'current' | 'next' | null = null;
     let monthText = '';
     if (detectedMonth !== null) {
         const currentMonth = new Date().getMonth() + 1;
         monthText = `，检测到表标签为${detectedMonth}月份`;
         if (detectedMonth === currentMonth) {
             deducedTarget = 'current';
         } else if (detectedMonth > currentMonth || (currentMonth >= 11 && detectedMonth <= 2)) {
             deducedTarget = 'next';
         } else {
             deducedTarget = 'current';
         }
     }
     setPastedTargetMonth(deducedTarget);

     setScheduleData(newScheduleData);
     alert(`成功智能读取 ${newScheduleData.length} 条数据${monthText}，可正常使用"生成排程"`);
     return true;
  };

  useEffect(() => {
     const handleGlobalPaste = (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
           if (target.id !== 'clipboard-paste-area') {
              return;
           }
        }
        
        const html = e.clipboardData?.getData('text/html') || '';
        const text = e.clipboardData?.getData('text/plain') || '';
        
        if (html || text) {
           e.preventDefault();
           parseAndImportData(html, text);
        }
     };
     
     window.addEventListener('paste', handleGlobalPaste);
     return () => {
        window.removeEventListener('paste', handleGlobalPaste);
     };
  }, []);

  const handleReadClipboard = async () => {
     try {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
           let html = '';
           let text = '';
           if (item.types.includes('text/html')) {
              const blob = await item.getType('text/html');
              html = await blob.text();
           }
           if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              text = await blob.text();
           }
           if (html || text) {
              parseAndImportData(html, text);
              found = true;
              break;
           }
        }
        if (!found) {
            alert('剪贴板中没有找到表格内容。');
        }
     } catch (err) {
        console.error(err);
        alert('读取剪贴板失败，请确保浏览器授予了剪贴板读取权限。您也可以直接在当前页面按 Ctrl+V（或 Cmd+V）。');
     }
  };

  return { scheduleData, setScheduleData, handleReadClipboard, pastedTargetMonth };
}
