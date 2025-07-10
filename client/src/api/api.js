// frontend/src/api/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Prefixo para suas rotas da API
});

export default api;