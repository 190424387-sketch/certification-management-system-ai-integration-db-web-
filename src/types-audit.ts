export interface CertificationSystem {
  id: string; // 'QMS' | 'EMS' | 'OHSMS' | 'QMS+EMS' | 'QMS+EMS+OHSMS'
  name: string;
  description: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string; // Base64 or text
  isFromSystemFolder?: boolean;
  needsDeepRead?: boolean;
  reviewChannel?: 'fast' | 'deep'; // 'fast' for text-only, 'deep' for multimodal
}

export interface Finding {
  id: string;
  type: 'critical' | 'major' | 'minor' | 'positive';
  category: string;
  description: string;
  reference: string;
  evidence?: string;
  deduction?: number;
}

export interface PDFReviewItem {
  index: string; // e.g. "1.1", "1.2", "2", "3", "4.1" etc.
  sectionName: string; // The "序号及评审内容" column description
  reviewContent: string; // The verification item name
  requirement: string; // The detailed check rule from the "评审要求" row
  resultStatus: 'compliant' | 'warning' | 'non_compliant' | 'not_applicable';
  details: string; // The extracted finding details/conclusions
  evidence?: string; // Relevant text extracts or page/file references
}

export interface ReviewResult {
  chainOfThought?: string;
  score: number;
  status: 'pass' | 'fail' | 'needs_manual_review';
  summary: string;
  findings: Finding[];
  missingDocuments?: string[];
  integrityCheck?: string; // 完整性检查结果
  riskCheckResults?: string; // Information fetched regarding company risks
  appliedSystems?: string[]; // The actual systems applied for by the company (e.g. ['QMS', 'EMS'])
  structuredItems?: PDFReviewItem[]; // Structured checking items corresponding to PDF columns
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Project {
  id: string;
  companyName: string;
  systemId: string;
  status: 'draft' | 'analyzing' | 'completed';
  updatedAt: string;
  files: UploadedFile[];
  reviewResults?: ReviewResult;
}
