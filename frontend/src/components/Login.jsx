import { useState } from 'react'
import axios from 'axios'
import '../styles/Login.css'

export default function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email: formData.email, password: formData.password })

      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      onLoginSuccess(response.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao processar requisição')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>YouAi</h1>
        <p className="subtitle">Gerador de QR Code com WhatsApp</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>

        <div className="toggle-form">
          <p>Contato com administrador para criar conta.</p>
        </div>
      </div>
    </div>
  )
}
