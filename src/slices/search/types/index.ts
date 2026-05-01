export interface SearchPageHit {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  rowOfDatabaseId?: string;
  updatedAt: number;
}

export interface SearchDatabaseHit {
  id: string;
  name: string;
  icon: string;
  updatedAt: number;
}

export interface SearchResult {
  pages: SearchPageHit[];
  databases: SearchDatabaseHit[];
}
