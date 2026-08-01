#!/bin/bash
sed -i "s/import { ocrPages } from '.\/ocr_data';/import * as fs2 from 'fs';\nimport * as path2 from 'path';/g" /app/applet/scripts/test-and-calibrate.ts

sed -i '/const lines: string\[\] = \[\];/c\
const files = ["tmp_ocr_1.txt", "tmp_ocr_2.txt", "tmp_ocr_3.txt", "tmp_ocr_4.txt", "tmp_ocr_5.txt"];\
const lines: string[] = [];\
for (const file of files) {\
  const filePath = path2.join(process.cwd(), file);\
  if (fs2.existsSync(filePath)) {\
    const content = fs2.readFileSync(filePath, "utf-8");\
    lines.push(...content.split("\\n"));\
  }\
}' /app/applet/scripts/test-and-calibrate.ts

sed -i '/for (const page of ocrPages) {/,/}/d' /app/applet/scripts/test-and-calibrate.ts
