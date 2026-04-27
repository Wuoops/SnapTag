export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string;
  usage_count: number;
  aliases: TagAlias[];
  created_at: string;
  updated_at: string;
}

export interface TagAlias {
  id: number;
  alias: string;
  tag: number;
  created_at: string;
}

export interface TagSuggestion {
  id: number;
  name: string;
  color: string;
  usage_count: number;
  match_type: 'exact' | 'prefix' | 'similar' | 'alias' | 'popular';
  matched_alias: string | null;
}

export interface FileItem {
  id: number;
  name: string;
  original_name: string;
  file: string;
  file_url: string | null;
  file_type: string;
  file_size: number;
  mime_type: string;
  description: string;
  tags: Tag[];
  is_favorite: boolean;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Backup {
  id: number;
  name: string;
  file_size: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  includes_files: boolean;
  includes_db: boolean;
  note: string;
  error_message: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  completed_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
