import axios from 'axios';

/** Same-origin API client — the session cookie travels automatically. */
export const api = axios.create({ baseURL: '/api', withCredentials: true });

let socketId = null;
export const setSocketId = (id) => (socketId = id);

api.interceptors.request.use((config) => {
  if (socketId) config.headers['x-socket-id'] = socketId;
  return config;
});

export const errMsg = (e, fallback = 'Something went wrong.') => e?.response?.data?.message || e?.message || fallback;

/** Minimal GraphQL helper. */
export async function gql(query, variables = {}) {
  const { data } = await axios.post('/graphql', { query, variables }, { withCredentials: true });
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}

export async function uploadImage(file, onProgress) {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await api.post('/upload/image', fd, {
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / (e.total || 1)) * 100)),
  });
  return data;
}
