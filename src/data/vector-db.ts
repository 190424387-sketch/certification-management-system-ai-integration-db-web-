import vectorData from './vector-db.json';

export interface VectorEntry {
  id: string;
  code: string;
  majorId: string;
  mediumId: string;
  smallId: string;
  name: string;
  description: string;
  includes: string[];
  excludes: string[];
  text_unit: string;
  metadata: {
    source: string;
    line_number: number;
  };
}

export const vectorDb: VectorEntry[] = vectorData as VectorEntry[];
