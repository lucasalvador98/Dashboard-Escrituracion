import axios from 'axios';

const API_CONFIG = {
  BASE_URL_BACKEND: process.env.REACT_APP_API_URL || "http://localhost:5000",
};

const client = axios.create({
  baseURL: API_CONFIG.BASE_URL_BACKEND,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de respuesta para manejo de errores
client.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default client;
