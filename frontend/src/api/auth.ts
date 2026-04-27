import client from './client';
import type { User } from '../types';

export const authAPI = {
  login(username: string, password: string) {
    return client.post<User>('/accounts/login/', { username, password });
  },

  register(data: { username: string; email: string; password: string; password_confirm: string }) {
    return client.post<User>('/accounts/register/', data);
  },

  logout() {
    return client.post('/accounts/logout/');
  },

  checkAuth() {
    return client.get<User>('/accounts/check/');
  },

  getProfile() {
    return client.get<User>('/accounts/profile/');
  },

  updateProfile(data: Partial<User>) {
    return client.patch<User>('/accounts/profile/', data);
  },

  changePassword(data: { old_password: string; new_password: string }) {
    return client.post('/accounts/change-password/', data);
  },

  requestPasswordReset(email: string) {
    return client.post('/accounts/password-reset/', { email });
  },

  confirmPasswordReset(data: { uid: string; token: string; new_password: string }) {
    return client.post('/accounts/password-reset-confirm/', data);
  },
};
