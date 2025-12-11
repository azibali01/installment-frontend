import axios from "axios";

// Use explicit VITE_API_BASE_URL when provided; otherwise fall back to a
// relative `/api` path so deployed builds call the same origin by default.
// If your backend is hosted on a different origin, set `VITE_API_BASE_URL`
// in your hosting environment to the backend URL (e.g. https://api.example.com/api).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

console.info("Using API base URL:", API_BASE_URL);

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    const status = error.response?.status;
    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              original.headers["Authorization"] = `Bearer ${token}`;
              resolve(client(original));
            } else {
              reject(error);
            }
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          client.defaults.headers["Authorization"] = `Bearer ${newToken}`;
        } else {
          localStorage.removeItem("token");
        }
        isRefreshing = false;
        onRefreshed(newToken || null);

        if (newToken) {
          original.headers["Authorization"] = `Bearer ${newToken}`;
          return client(original);
        }

        window.location.href = "/login";
        return Promise.reject(error);
      } catch (refreshErr) {
        isRefreshing = false;
        onRefreshed(null);
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
