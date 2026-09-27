import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("kost_token") || "");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("kost_role") || "");

  useEffect(() => {
    if (token) {
      localStorage.setItem("kost_token", token);
      localStorage.setItem("kost_role", userRole);
    } else {
      localStorage.removeItem("kost_token");
      localStorage.removeItem("kost_role");
    }
  }, [token, userRole]);

  const login = useCallback(async (pin) => {
    const res = await axios.post(`${API}/auth/login`, { pin });
    setToken(res.data.token);
    setUserRole(res.data.role);
    return res.data.role;
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUserRole("");
  }, []);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AuthContext.Provider value={{ token, userRole, login, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
