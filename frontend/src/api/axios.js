import axios from 'axios';

const getAPIURL = () => {
  
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    const isDevelopment = process.env.NODE_ENV === 'development';
    const isNginx = process.env.REACT_APP_USE_NGINX === 'true';
    
    if (isNginx) {
      
      return '';
    }
    
    const port = isDevelopment ? '3000' : '3001';
    return `${protocol}//${hostname}:${port}`;
  }

  return process.env.REACT_APP_API_URL || 'http://localhost:3000';
};

const API_URL = getAPIURL();

console.log('📡 API URL:', API_URL);

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  config => {
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  response => {
    console.log('📥 API Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('❌ Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default axiosInstance;
