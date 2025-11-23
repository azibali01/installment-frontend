import client from "./client"

export const authAPI = {
  login: (email: string, password: string) => client.post("/auth/login", { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    client.post("/auth/register", { name, email, password, role }),
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  },
}
