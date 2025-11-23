import axios, { AxiosHeaders } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
const WITH_CREDENTIALS = (import.meta.env.VITE_API_WITH_CREDENTIALS || "false") === "true"


console.info("Using API base URL:", API_BASE_URL)

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: WITH_CREDENTIALS,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    const headers = new AxiosHeaders(config.headers)
    headers.set("Authorization", `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

export default client
