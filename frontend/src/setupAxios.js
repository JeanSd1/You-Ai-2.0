import axios from 'axios'

// Configure global axios defaults
const API_URL = import.meta.env.VITE_API_URL || 'https://youai-backend.onrender.com/api'
axios.defaults.baseURL = API_URL

// Request interceptor to attach token if present
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // ignore
  }
  return config
}, (error) => Promise.reject(error))

// Response interceptor to handle 401 globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      if (error?.response?.status === 401) {
        // Clear token and redirect to login page
        localStorage.removeItem('token')
        // Optionally clear user info
        localStorage.removeItem('user')
        // Redirect to login (uses client-side routing or full reload)
        // If your app uses a router, consider using it instead of location
        window.location.href = '/login'
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(error)
  }
)

export default axios
