import axios, { AxiosHeaders } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://installment-expense-management-backend.vercel.app/api";

console.info("Using API base URL:", API_BASE_URL);

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    const headers = new AxiosHeaders(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export default client;
