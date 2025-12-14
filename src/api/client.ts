import axios from "axios";

// Automatically detect environment:
// - In development (npm run dev): use localhost backend via proxy (/api)
// - In production: use VITE_API_BASE_URL if set, otherwise use /api (same origin)
// - If VITE_API_BASE_URL is explicitly set, use it (for production deployments)
const getApiBaseUrl = () => {
  // If explicitly set, use it (for production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // In development mode, use /api which will be proxied to localhost:5000
  if (import.meta.env.DEV) {
    return "/api";
  }
  
  // In production without explicit URL, use /api (same origin)
  return "/api";
};

const API_BASE_URL = getApiBaseUrl();

// Debug: Always log API URL to help debug connection issues
console.info("API Configuration:", {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  resolvedBaseURL: API_BASE_URL,
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE
});

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
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
    
    // Handle rate limiting (429) gracefully - don't retry, just show error
    if (status === 429) {
      // Return a user-friendly error that won't crash the app
      const errorMessage = error.response?.data?.error || "Too many requests. Please wait a moment and try again.";
      const rateLimitError = new Error(errorMessage);
      (rateLimitError as any).response = error.response;
      (rateLimitError as any).isAxiosError = true;
      return Promise.reject(rateLimitError);
    }
    
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
