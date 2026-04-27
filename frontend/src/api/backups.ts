import client from './client';
import type { Backup, PaginatedResponse } from '../types';

export const backupsAPI = {
  list() {
    return client.get<PaginatedResponse<Backup>>('/backups/');
  },

  create(data: { includes_files?: boolean; includes_db?: boolean; note?: string }) {
    return client.post<Backup>('/backups/create_backup/', data);
  },

  download(id: number) {
    window.open(`/api/backups/${id}/download/`, '_blank');
  },

  restore(id: number) {
    return client.post(`/backups/${id}/restore/`);
  },

  uploadRestore(file: File) {
    const form = new FormData();
    form.append('file', file);
    return client.post('/backups/upload_restore/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
  },

  delete(id: number) {
    return client.delete(`/backups/${id}/`);
  },
};
