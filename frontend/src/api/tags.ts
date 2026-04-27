import client from './client';
import type { Tag, TagSuggestion, PaginatedResponse } from '../types';

export const tagsAPI = {
  list() {
    return client.get<PaginatedResponse<Tag>>('/tags/', { params: { page_size: 200 } });
  },

  get(id: number) {
    return client.get<Tag>(`/tags/${id}/`);
  },

  create(data: { name: string; color?: string; description?: string; alias_list?: string[] }) {
    return client.post<Tag>('/tags/', data);
  },

  update(id: number, data: Partial<Tag> & { alias_list?: string[] }) {
    return client.patch<Tag>(`/tags/${id}/`, data);
  },

  delete(id: number) {
    return client.delete(`/tags/${id}/`);
  },

  suggest(query: string) {
    return client.get<TagSuggestion[]>('/tags/suggest/', { params: { q: query } });
  },

  popular(limit = 20) {
    return client.get<Tag[]>('/tags/popular/', { params: { limit } });
  },

  resolve(name: string) {
    return client.post<Tag>('/tags/resolve/', { name });
  },

  addAlias(tagId: number, alias: string) {
    return client.post(`/tags/${tagId}/add_alias/`, { alias });
  },

  removeAlias(tagId: number, aliasId: number) {
    return client.delete(`/tags/${tagId}/remove-alias/${aliasId}/`);
  },
};
