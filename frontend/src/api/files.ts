import client from './client';
import type { FileItem, PaginatedResponse } from '../types';

export interface FileFilters {
  search?: string;
  tags?: number[];
  tag_mode?: 'union' | 'intersect';
  file_type?: string;
  favorite?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const filesAPI = {
  list(filters: FileFilters = {}) {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.tags?.length) params.tags = filters.tags.join(',');
    if (filters.tag_mode) params.tag_mode = filters.tag_mode;
    if (filters.file_type) params.file_type = filters.file_type;
    if (filters.favorite) params.favorite = 'true';
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.page) params.page = String(filters.page);
    if (filters.page_size) params.page_size = String(filters.page_size);
    return client.get<PaginatedResponse<FileItem>>('/files/', { params });
  },

  get(id: number) {
    return client.get<FileItem>(`/files/${id}/`);
  },

  upload(formData: FormData) {
    return client.post<FileItem>('/files/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update(id: number, data: Partial<FileItem>) {
    return client.patch<FileItem>(`/files/${id}/`, data);
  },

  delete(id: number) {
    return client.delete(`/files/${id}/`);
  },

  download(id: number) {
    window.open(`/api/files/${id}/download/`, '_blank');
  },

  addTag(fileId: number, data: { tag_id?: number; tag_name?: string }) {
    return client.post<FileItem>(`/files/${fileId}/add_tag/`, data);
  },

  removeTag(fileId: number, tagId: number) {
    return client.post<FileItem>(`/files/${fileId}/remove_tag/`, { tag_id: tagId });
  },

  toggleFavorite(fileId: number) {
    return client.post<{ is_favorite: boolean }>(`/files/${fileId}/toggle_favorite/`);
  },

  batchTag(fileIds: number[], data: { tag_id?: number; tag_name?: string }) {
    return client.post('/files/batch_tag/', { file_ids: fileIds, ...data });
  },
};
