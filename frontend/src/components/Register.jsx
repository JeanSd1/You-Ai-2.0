import { useState } from 'react'
import axios from 'axios'
import '../styles/Login.css'

export default function Register({ onRegisterSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const resp = await axios.post(`${API_URL}/api/auth/register`, formData)
      // Salva token e usuário
      localStorage.setItem('token', resp.data.token)
      localStorage.setItem('user', JSON.stringify(resp.data.user))
      if (onRegisterSuccess) onRegisterSuccess(resp.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Registrar</h1>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Nome" value={formData.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Senha" value={formData.password} onChange={handleChange} required minLength="6" />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Criar Conta'}</button>
        </form>
      </div>
    </div>
  )
}
