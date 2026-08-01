import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";
import { saveAs } from "file-saver";
import { ReviewResult, Finding } from "../types-audit";

export async function exportAuditReport(companyName: string, systemName: string, result: ReviewResult, reviewerName?: string) {
  const sections = [];

  sections.push(new Paragraph({
    text: `${companyName} ${systemName} 评审记录`,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 400 }
  }));

  sections.push(new Paragraph({
    text: `评审得分: ${result.score} / 100`,
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 200 }
  }));

  sections.push(new Paragraph({
    text: `评审状态: ${result.status === 'pass' ? '通过' : result.status === 'fail' ? '不通过' : '需要人工审核'}`,
    spacing: { after: 200 }
  }));

  sections.push(new Paragraph({
    text: `评审登记人: ${reviewerName || '系统默认'}`,
    spacing: { after: 100 }
  }));

  sections.push(new Paragraph({
    text: `风控确认时间: ${(() => {
      const d = new Date();
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    })()}`,
    spacing: { after: 300 }
  }));

  sections.push(new Paragraph({
    text: "系统总体评价",
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 200 }
  }));

  if (result.summary) {
    const normalizedSummary = result.summary.replace(/\\n/g, '\n');
    const lines = normalizedSummary.split(/\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let headingLevel = undefined;
      let content = trimmed;
      if (trimmed.startsWith('### ')) {
        headingLevel = HeadingLevel.HEADING_3;
        content = trimmed.substring(4);
      } else if (trimmed.startsWith('## ')) {
        headingLevel = HeadingLevel.HEADING_2;
        content = trimmed.substring(3);
      } else if (trimmed.startsWith('# ')) {
        headingLevel = HeadingLevel.HEADING_1;
        content = trimmed.substring(2);
      }

      const parts = content.split(/(\*\*.*?\*\*)/g);
      const children: TextRun[] = [];
      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          children.push(new TextRun({ text: part.substring(2, part.length - 2), bold: true }));
        } else if (part) {
          children.push(new TextRun({ text: part }));
        }
      });

      sections.push(new Paragraph({
        children,
        heading: headingLevel,
        spacing: { after: 200 }
      }));
    });
  }

  if (result.riskCheckResults) {
    sections.push(new Paragraph({
      text: "全网风险核查结果",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));
     
    const riskLines = result.riskCheckResults.replace(/\\n/g, '\n').split('\n');
    for (const line of riskLines) {
       if (line.trim()) {
           sections.push(new Paragraph({
              text: line.replace(/[\\*\\#]/g, '').trim(),
              spacing: { after: 100 }
           }));
       }
    }
    sections.push(new Paragraph({ spacing: { after: 300 } }));
  }

  if (result.missingDocuments && result.missingDocuments.length > 0) {
    sections.push(new Paragraph({
      text: "缺失文件清单",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));
    
    result.missingDocuments.forEach(doc => {
      sections.push(new Paragraph({
        text: `• ${doc}`,
        spacing: { after: 100 }
      }));
    });
    
    sections.push(new Paragraph({ spacing: { after: 300 } }));
  }

  if (result.findings && result.findings.length > 0) {
    sections.push(new Paragraph({
      text: "发现项详细列表",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));

    result.findings.forEach(finding => {
      let fType = "一般";
      if (finding.type === 'critical') fType = "严重缺陷";
      if (finding.type === 'major') fType = "重大风险";
      if (finding.type === 'minor') fType = "一般提示";
      if (finding.type === 'positive') fType = "正面发现";

      const descLines = finding.description.replace(/\\n/g, '\n').split('\n').filter(l => l.trim());
      
      descLines.forEach((descLine, idx) => {
        const children = [];
        if (idx === 0) {
          children.push(new TextRun({ text: `[${fType}] `, bold: true }));
          children.push(new TextRun({ text: `${finding.category}: ${descLine}` }));
        } else {
          children.push(new TextRun({ text: descLine }));
        }
        sections.push(new Paragraph({
          children,
          spacing: { after: 100 }
        }));
      });

      if (finding.evidence) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `出处/证据: ${finding.evidence}`, italics: true })],
          spacing: { after: 100 }
        }));
      }

      sections.push(new Paragraph({ spacing: { after: 200 } }));
    });
  }

  const doc = new Document({
    creator: "CertiMatch AI",
    title: "评审记录",
    description: "认证材料智能评审记录",
    sections: [{
      properties: {},
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${companyName}-${systemName}-评审记录.docx`);
}

export async function exportRectificationSuggestions(companyName: string, systemName: string, result: ReviewResult, reviewerName?: string) {
  const sections = [];

  sections.push(new Paragraph({
    text: `${companyName} ${systemName} 资料整改意见与补充清单`,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 400 }
  }));

  sections.push(new Paragraph({
    text: `评审登记人: ${reviewerName || '系统默认'}`,
    spacing: { after: 100 }
  }));

  sections.push(new Paragraph({
    text: `风控确认时间: ${(() => {
      const d = new Date();
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    })()}`,
    spacing: { after: 300 }
  }));

  sections.push(new Paragraph({
    children: [new TextRun({ text: "致资料提供方负责人：", bold: true })],
    spacing: { after: 200 }
  }));
  
  sections.push(new Paragraph({
    text: "经初步审核，您提供的认证审核资料还存在以下需要整改或补充的内容，请尽快对照清单进行完善。",
    spacing: { after: 400 }
  }));

  if (result.missingDocuments && result.missingDocuments.length > 0) {
    sections.push(new Paragraph({
      text: "一、 需要补充提交的文件清单（缺少以下文件）",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));
    
    result.missingDocuments.forEach((doc, idx) => {
      sections.push(new Paragraph({
        text: `${idx + 1}. ${doc}`,
        spacing: { after: 100 }
      }));
    });
    
    sections.push(new Paragraph({ spacing: { after: 300 } }));
  }

  const negativeFindings = result.findings?.filter(f => f.type !== 'positive') || [];
  
  if (negativeFindings.length > 0) {
    sections.push(new Paragraph({
      text: "二、 原有文件需要修改或整改的事项",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }));

    negativeFindings.forEach((finding, idx) => {
      let severity = "修改建议";
      if (finding.type === 'critical') severity = "严重问题必须修改";
      if (finding.type === 'major') severity = "重大问题强烈建议修改";
      
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. ${finding.category}（${severity}）`, bold: true })
        ],
        spacing: { after: 100 }
      }));
      
      const descLines = finding.description.replace(/\\n/g, '\n').split('\n').filter(l => l.trim());
      descLines.forEach((descLine, idxLine) => {
        sections.push(new Paragraph({
          text: idxLine === 0 ? `问题描述：${descLine}` : descLine,
          spacing: { after: 100 }
        }));
      });

      if (finding.evidence) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `相关文件或证据：${finding.evidence}`, italics: true })],
          spacing: { after: 100 }
        }));
      }

      sections.push(new Paragraph({
        text: `【整改要求】：请______________________________________________ (请在此输入您的具体修改动作或补充记录)`,
        spacing: { after: 300 }
      }));
    });
  }

  if ((!result.missingDocuments || result.missingDocuments.length === 0) && negativeFindings.length === 0) {
    sections.push(new Paragraph({
       text: "恭喜您，目前的资料非常完整规范，暂无需要强制整改的事项。",
       spacing: { after: 200 }
    }));
  }

  const doc = new Document({
    creator: "CertiMatch AI",
    title: "整改意见书",
    description: "认证材料整改意见清单",
    sections: [{
      properties: {},
      children: sections
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${companyName}-${systemName}-资料整改意见单.docx`);
}
