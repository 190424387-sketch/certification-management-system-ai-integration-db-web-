export interface CategoryItem {
  id?: string;
  code?: string;
  majorId: string;
  mediumId: string;
  smallId?: string;
  name: string;
  description: string;
  includes?: string[];
  excludes?: string[];
  [key: string]: any;
}

export interface MajorCategory {
  id: string;
  name: string;
  description: string;
  items: CategoryItem[];
}

export interface CategoryNode extends CategoryItem {
  children: CategoryNode[];
}

export interface SearchIndexItem {
  id: string;
  majorId?: string;
  mediumId?: string;
  smallId?: string;
  name?: string;
  text_unit?: string;
}
