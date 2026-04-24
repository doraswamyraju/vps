import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Will be dynamic in prod
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('vps_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
