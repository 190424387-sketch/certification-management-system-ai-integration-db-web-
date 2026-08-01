export function parseGridData(gridData: any) {
    if (!gridData?.data?.rows) return [];
    
    const { rows, startRow = 0, startColumn = 0 } = gridData.data;
    
    // Attempt to extract merges from various possible Tencent API locations
    let merges: any[] = gridData.merges || gridData.mergeCells || gridData.merge_cells || gridData.merged_cells || [];
    if (!merges.length && gridData.rawData) {
        const raw = gridData.rawData;
        merges = raw.merges || raw.mergeCells || raw.merge_cells || raw.merged_cells || 
                 raw.data?.merges || raw.data?.mergeCells || raw.data?.merge_cells || raw.data?.merged_cells || [];
    }
    
    // One more check: sometimes they are inside gridData.data
    if (!merges.length) {
        merges = gridData.data.merges || gridData.data.mergeCells || gridData.data.merge_cells || gridData.data.merged_cells || [];
    }

    // Pre-process merges: copy top-left text to all cells in the merged range
    if (merges && merges.length > 0) {
        merges.forEach((m: any) => {
            let sr = 0, er = 0, sc = 0, ec = 0;
            
            if (typeof m === 'string') {
                // Parse A1 notation, e.g. "C3:D3"
                const match = m.match(/([a-zA-Z]+)(\d+)(?::([a-zA-Z]+)(\d+))?/);
                if (match) {
                    const colToNum = (col: string) => {
                        let num = 0;
                        for (let i = 0; i < col.length; i++) {
                            num = num * 26 + (col.charCodeAt(i) - 64);
                        }
                        return num - 1;
                    };
                    sc = colToNum(match[1].toUpperCase());
                    sr = parseInt(match[2], 10) - 1;
                    ec = match[3] ? colToNum(match[3].toUpperCase()) : sc;
                    er = match[4] ? parseInt(match[4], 10) - 1 : sr;
                } else {
                    return; // Skip invalid string
                }
            } else {
                const mData = m.range || m;
                sr = mData.startRow ?? mData.startRowIndex ?? mData.row ?? 0;
                er = mData.endRow ?? mData.endRowIndex ?? mData.lastRow ?? sr;
                sc = mData.startCol ?? mData.startColumn ?? mData.startColumnIndex ?? mData.col ?? 0;
                ec = mData.endCol ?? mData.endColumn ?? mData.endColumnIndex ?? mData.lastCol ?? sc;
                
                let rowSpan = mData.rowSpan ?? mData.rowspan;
                if (rowSpan !== undefined && rowSpan > 0) {
                   er = sr + rowSpan - 1;
                }
                let colSpan = mData.colSpan ?? mData.colspan;
                if (colSpan !== undefined && colSpan > 0) {
                   ec = sc + colSpan - 1;
                }
            }
            
            const rowSpan = Math.max(1, er - sr + 1);
            const colSpan = Math.max(1, ec - sc + 1);

            const rowIndex = sr - startRow;
            const colIndex = sc - startColumn;
            
            // Only process if the top-left cell is within our loaded rows
            if (rowIndex >= 0 && rowIndex < rows.length && rows[rowIndex]?.values) {
                const sourceCell = rows[rowIndex].values[colIndex];
                let sourceText = sourceCell?.cellValue?.text || sourceCell?.cellValue?.number || sourceCell?.formattedValue || '';
                
                // If the API attaches rowSpan/colSpan directly to the cell instead of merges array
                let cellRowSpan = Math.max(rowSpan, sourceCell?.rowSpan ?? sourceCell?.rowspan ?? 1);
                let cellColSpan = Math.max(colSpan, sourceCell?.colSpan ?? sourceCell?.colspan ?? 1);

                if (String(sourceText).trim() !== '' && (cellRowSpan > 1 || cellColSpan > 1)) {
                    for (let r = sr; r < sr + cellRowSpan; r++) {
                        for (let c = sc; c < sc + cellColSpan; c++) {
                            const rIdx = r - startRow;
                            const cIdx = c - startColumn;
                            if (rIdx >= 0 && rIdx < rows.length) {
                                if (!rows[rIdx].values) rows[rIdx].values = [];
                                if (!rows[rIdx].values[cIdx]) {
                                    rows[rIdx].values[cIdx] = { cellValue: { text: sourceText } };
                                } else {
                                    const currentText = rows[rIdx].values[cIdx]?.cellValue?.text || rows[rIdx].values[cIdx]?.cellValue?.number || rows[rIdx].values[cIdx]?.formattedValue || '';
                                    if (!String(currentText).trim()) {
                                        rows[rIdx].values[cIdx].cellValue = rows[rIdx].values[cIdx].cellValue || {};
                                        rows[rIdx].values[cIdx].cellValue.text = sourceText;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Pass 2: fallback, check inline spans directly on cells if merges array was empty or missed something
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        if (!rows[rIdx]?.values) continue;
        for (let cIdx = 0; cIdx < rows[rIdx].values.length; cIdx++) {
            const cell = rows[rIdx].values[cIdx];
            if (!cell) continue;
            
            const rowSp = cell.rowSpan ?? cell.rowspan ?? 1;
            const colSp = cell.colSpan ?? cell.colspan ?? 1;
            
            if (rowSp > 1 || colSp > 1) {
                const text = cell.cellValue?.text || cell.cellValue?.number || cell.formattedValue || '';
                if (String(text).trim() !== '') {
                    for (let rr = 0; rr < rowSp; rr++) {
                        for (let cc = 0; cc < colSp; cc++) {
                            if (rr === 0 && cc === 0) continue; // skip self
                            const targetRIdx = rIdx + rr;
                            const targetCIdx = cIdx + cc;
                            if (targetRIdx < rows.length) {
                                if (!rows[targetRIdx].values) rows[targetRIdx].values = [];
                                if (!rows[targetRIdx].values[targetCIdx]) {
                                    rows[targetRIdx].values[targetCIdx] = { cellValue: { text } };
                                } else {
                                    const currentTargetText = rows[targetRIdx].values[targetCIdx]?.cellValue?.text || rows[targetRIdx].values[targetCIdx]?.cellValue?.number || rows[targetRIdx].values[targetCIdx]?.formattedValue || '';
                                    if (!String(currentTargetText).trim()) {
                                        rows[targetRIdx].values[targetCIdx].cellValue = rows[targetRIdx].values[targetCIdx].cellValue || {};
                                        rows[targetRIdx].values[targetCIdx].cellValue.text = text;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let amPmRowIdx = -1;
    
    // Find header
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (!row?.values) continue;
        for (const cell of row.values) {
            const text = cell?.cellValue?.text || cell?.cellValue?.number || cell?.formattedValue || '';
            if (String(text).trim() === '上午' || String(text).trim() === 'AM') {
                amPmRowIdx = i;
                break;
            }
        }
        if (amPmRowIdx !== -1) break;
    }
    
    if (amPmRowIdx === -1) {
        amPmRowIdx = 1;
    }

    // Find first AM column
    let firstAmCol = -1;
    const headerRow = rows[amPmRowIdx];
    if (headerRow?.values) {
        for (let c = 0; c < headerRow.values.length; c++) {
            const text = headerRow.values[c]?.cellValue?.text || headerRow.values[c]?.cellValue?.number || headerRow.values[c]?.formattedValue || '';
            if (String(text).trim() === '上午' || String(text).trim() === 'AM') {
                firstAmCol = c;
                break;
            }
        }
    }
    if (firstAmCol === -1) firstAmCol = 2; // Default to Col C

    // Pass 3: In-Memory Merge Calibration
    // Heuristic fix for completely empty cells if merges were unvailable in the raw API data
    for (let r = amPmRowIdx + 1; r < rows.length; r++) {
        if (!rows[r]) rows[r] = { values: [] };
        if (!rows[r].values) rows[r].values = [];

        // 1. Vertical Calibration for Identifiers (e.g., Name column)
        for (let c = 0; c < firstAmCol; c++) {
            let text = String(rows[r].values[c]?.cellValue?.text || rows[r].values[c]?.cellValue?.number || '').trim();
            if (!text && r > amPmRowIdx + 1) {
                let aboveText = String(rows[r-1]?.values?.[c]?.cellValue?.text || rows[r-1]?.values?.[c]?.cellValue?.number || '').trim();
                // If current cell is strictly missing or empty object, and above has text, inherit
                const isCurrentEmpty = !rows[r].values[c] || Object.keys(rows[r].values[c]).length === 0 || (!rows[r].values[c].cellValue && !rows[r].values[c].style);
                if (aboveText && isCurrentEmpty && !String(rows[r].values[0]?.cellValue?.text || '').trim()) {
                    if (!rows[r].values[c]) rows[r].values[c] = { cellValue: { text: aboveText } };
                    else {
                        rows[r].values[c].cellValue = rows[r].values[c].cellValue || {};
                        rows[r].values[c].cellValue.text = aboveText;
                    }
                }
            }
        }
    }
    
    const schedule: any[] = [];
    
    for (let r = amPmRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row?.values) continue;
        
        let name = '';
        // Find name: usually first non-empty cell in first 3 cols
        for (let c = 0; c < 3; c++) {
            const text = row.values[c]?.cellValue?.text || row.values[c]?.cellValue?.number || row.values[c]?.formattedValue || '';
            if (String(text).trim() !== '') {
                name = String(text).trim();
                break;
            }
        }
        
        // Skip obvious header repeat rows
        if (!name || name === '姓名及备注' || name === '姓名') continue;
        
        // Find first AM column
        let firstAmCol = -1;
        const headerRow = rows[amPmRowIdx];
        if (headerRow?.values) {
            for (let c = 0; c < headerRow.values.length; c++) {
                const text = headerRow.values[c]?.cellValue?.text || headerRow.values[c]?.cellValue?.number || headerRow.values[c]?.formattedValue || '';
                if (String(text).trim() === '上午' || String(text).trim() === 'AM') {
                    firstAmCol = c;
                    break;
                }
            }
        }
        
        if (firstAmCol === -1) firstAmCol = 2; // Default to Col C
        
        const days = [];
        // Extract AM/PM pairs
        for (let c = firstAmCol; c < row.values.length; c += 2) {
            const amCell = row.values[c];
            const pmCell = row.values[c+1];
            
            const amText = String(amCell?.cellValue?.text || amCell?.cellValue?.number || amCell?.formattedValue || '').trim();
            const pmText = String(pmCell?.cellValue?.text || pmCell?.cellValue?.number || pmCell?.formattedValue || '').trim();
            
            days.push({
                am: amText,
                pm: pmText
            });
        }
        
        // Fill to at least 32 days
        while(days.length < 32) {
           days.push({ am: '', pm: '' });
        }
        
        schedule.push({
            name,
            days: days.slice(0, 32)
        });
    }
    
    return schedule;
}
