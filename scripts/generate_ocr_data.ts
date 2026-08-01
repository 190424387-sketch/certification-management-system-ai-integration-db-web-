import * as fs from 'fs';
import * as path from 'path';

const files = [
  'tmp_ocr_1.txt',
  'tmp_ocr_2.txt',
  'tmp_ocr_3.txt',
  'tmp_ocr_4.txt',
  'tmp_ocr_5.txt',
];

const allLines: string[] = [];
for (const file of files) {
  const filePath = path.join('/app/applet', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    allLines.push(...content.split('\n'));
  }
}

const parsedCases = allLines
  .map(line => line.trim())
  .filter(line => line && (line.startsWith('QMS') || line.startsWith('EMS') || line.startsWith('OHSMS')))
  .map(line => {
    const match = line.match(/^(QMS|EMS|OHSMS)\s+(.+?)\s+'([0-9\.\;；* ]+)$/);
    if (match) {
      return {
        standard: match[1],
        scope: match[2].trim(),
        expectedCodes: match[3].split(/；|;/).map(c => c.trim()).filter(Boolean)
      };
    }
    return null;
  })
  .filter(Boolean);

const tsContent = `export const parsedCases = ${JSON.stringify(parsedCases, null, 2)};\n`;
fs.writeFileSync('/app/applet/scripts/ocr_data.ts', tsContent);
console.log(`Successfully parsed ${parsedCases.length} cases.`);
