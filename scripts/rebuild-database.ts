import * as fs from 'fs';
import * as path from 'path';

async function rebuild() {
  console.log('Starting rebuilding database files with Category 23 standard...');
  
  // 1. Build catMap from category_XX.ts files
  const allCats: any[] = [];
  for (let i = 1; i <= 39; i++) {
    const pad = String(i).padStart(2, '0');
    const filePath = './src/data/category_' + pad + '.ts';
    if (fs.existsSync(filePath)) {
      const mod = await import('../' + filePath); // relative to tsx or cwd
      const arrayName = 'category_' + pad;
      if (mod[arrayName]) {
        allCats.push(...mod[arrayName]);
      }
    }
  }

  const catMap: Record<string, string> = {};
  for (const cat of allCats) {
    const code = cat.code || cat.smallId || cat.mediumId || cat.majorId;
    if (code) {
      catMap[code] = cat.name.trim();
    }
  }

  // 2. Parse qes.txt
  const qesLines = fs.readFileSync('qes.txt', 'utf8').split('\n').filter(Boolean);
  const codeReg = /(\d{2}\.\d{2}(?:\.\d{2})?(?:\/\d+)?)\s+([一二三])\s*(.*?)(?=\s+\d{2}\.\d{2}|$)/g;

  // Group slashed lines
  const group: Record<string, Array<{ subIdx: string, cols: Array<{ code: string, risk: string, name: string }> }>> = {};
  
  for (const line of qesLines) {
    if (line.includes('/')) {
      const matches = [...line.matchAll(codeReg)];
      if (matches.length === 3) {
        let key = '';
        let subIdx = '';
        matches.forEach(m => {
          if (m[1].includes('/')) {
            const parts = m[1].split('/');
            key = parts[0];
            subIdx = parts[1];
          }
        });
        if (key && subIdx) {
          if (!group[key]) group[key] = [];
          group[key].push({
            subIdx,
            cols: matches.map(m => ({ code: m[1], risk: m[2], name: m[3].trim() }))
          });
        }
      }
    }
  }

  // 3. Construct sub-details
  const qesSubDetails: Record<string, { Q: any[], E: any[], S: any[] }> = {};
  const qesRisks: Record<string, { Q: string, E: string, S: string }> = JSON.parse(
    fs.readFileSync('src/data/qes-risks.json', 'utf8')
  );

  for (const [key, subRows] of Object.entries(group)) {
    const parentName = catMap[key] || 'UNKNOWN_PARENT';
    if (parentName === 'UNKNOWN_PARENT') {
      console.warn(`Warning: Parent name not found for key ${key}`);
    }

    const Q: any[] = [];
    const E: any[] = [];
    const S: any[] = [];

    // Sort subRows by numeric index
    subRows.sort((a, b) => {
      return parseInt(a.subIdx, 10) - parseInt(b.subIdx, 10);
    });

    for (const row of subRows) {
      const subCode = `${key}/${row.subIdx}`;

      // Determine the specific short subcategory name
      let shortSubName = '';
      const colSlashed = row.cols.find(c => c.code.includes('/'));
      if (colSlashed && colSlashed.name) {
        shortSubName = colSlashed.name;
      } else {
        // Fallback to non-empty name
        const colWithName = row.cols.find(c => c.name);
        shortSubName = colWithName ? colWithName.name : '';
      }

      // If short name contains the parent name in parentheses or is equal to parent, clean it
      if (shortSubName === parentName) {
        shortSubName = '';
      }

      // Construct optimized name under Category 23 standard: ParentName（ShortSubName）
      const optimizedName = shortSubName ? `${parentName}（${shortSubName}）` : parentName;

      // Quality Q
      const colQ = row.cols[0];
      Q.push({
        code: subCode,
        name: optimizedName,
        risk: colQ.risk || '二'
      });

      // Environment E
      const colE = row.cols[1];
      E.push({
        code: subCode,
        name: optimizedName,
        risk: colE.risk || '二'
      });

      // Safety S
      const colS = row.cols[2];
      S.push({
        code: subCode,
        name: optimizedName,
        risk: colS.risk || '二'
      });

      // Synchronize back to risks
      qesRisks[subCode] = {
        Q: colQ.risk || '二',
        E: colE.risk || '二',
        S: colS.risk || '二'
      };
    }

    qesSubDetails[key] = { Q, E, S };
  }

  // Write files
  fs.writeFileSync('src/data/qes-sub-details.json', JSON.stringify(qesSubDetails, null, 2), 'utf8');
  fs.writeFileSync('src/data/qes-risks.json', JSON.stringify(qesRisks, null, 2), 'utf8');

  console.log('Successfully completed rebuilding database files!');
  console.log(`Rebuild count of slashed keys: ${Object.keys(qesSubDetails).length}`);
}

rebuild().catch(err => {
  console.error('Error during rebuilding database:', err);
});
