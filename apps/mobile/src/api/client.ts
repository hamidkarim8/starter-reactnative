import axios from 'axios';

// Replace with YOUR local IP address
const API_BASE_URL = 'http://192.168.0.11:8080/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default client;
