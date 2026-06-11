import { useState } from 'react';
import api from '../api/client';
import AuthContext from './auth-context';

function readStoredUser() {
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');

  return token && email ? { token, email } : null;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    setUser({ token: data.token, email: data.email });
  };

  const register = async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    setUser({ token: data.token, email: data.email });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
