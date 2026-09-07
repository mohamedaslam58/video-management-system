import { api } from './client';

export interface Camera {
  id: string;
  name: string;
  location?: string;
  status: 'online' | 'offline' | 'unknown';
  enabled: boolean;
  recordingMode: string;
  mediaPath: string;
  group?: { id: string; name: string };
}

export interface VmsEvent {
  id: string;
  cameraId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  occurredAt: string;
  acknowledged: boolean;
  payload?: Record<string, any>;
}

export const CamerasApi = {
  list: () => api.get<Camera[]>('/cameras').then((r) => r.data),
  get: (id: string) => api.get<Camera>(`/cameras/${id}`).then((r) => r.data),
  groups: () => api.get('/cameras/groups').then((r) => r.data),
  create: (payload: any) => api.post('/cameras', payload).then((r) => r.data),
  update: (id: string, payload: any) =>
    api.patch(`/cameras/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/cameras/${id}`).then((r) => r.data),
};

export const StreamingApi = {
  live: (cameraId: string) =>
    api.get(`/streaming/${cameraId}/live`).then((r) => r.data),
};

export const RecordingsApi = {
  playback: (cameraId: string, from: string, to: string) =>
    api
      .get(`/recordings/${cameraId}/playback`, { params: { from, to } })
      .then((r) => r.data),
};

export const EventsApi = {
  list: (cameraId?: string) =>
    api.get<VmsEvent[]>('/events', { params: { cameraId } }).then((r) => r.data),
  acknowledge: (id: string) =>
    api.patch(`/events/${id}/acknowledge`).then((r) => r.data),
};

export const SearchApi = {
  search: (params: Record<string, any>) =>
    api.get('/search', { params }).then((r) => r.data),
};
