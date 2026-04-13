// src/lib/api.ts
import axios from 'axios';

// Create a custom axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000', // Your FastAPI backend URL
});

// Intercept requests to attach the JWT token if the user is logged in
api.interceptors.request.use((config) => {
  // We store the token in localStorage for the MVP
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;