import axios from 'axios';

const api = axios.create({
    // Use /api in production (handled by Nginx), and localhost in development
    baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('vps_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
