export type BookListItem = {
  id: string | number;
  title: string;
  cover?: string;
  snippet?: string;
  content?: string;
  score?: number;
};

export type BookDetail = {
  id: string | number;
  title: string;
  cover?: string;
  content: string;
  recommendations?: Array<{ id: string | number; title: string; score?: number }>;
};
