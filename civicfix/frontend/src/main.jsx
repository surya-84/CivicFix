import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Global Axios Request Interceptor — attaches JWT Bearer token automatically
axios.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('civicfix_user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      if (user?.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`
      }
    } catch (e) {
      console.error('Failed to parse civicfix_user token', e)
    }
  }
  return config
})

// Global Axios Response Interceptor — handles 401 unauthenticated
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('civicfix_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

