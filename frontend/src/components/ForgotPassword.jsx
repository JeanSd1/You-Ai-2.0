import { useState } from 'react'
import axios from 'axios'
import '../styles/Login.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const resp = await axios.post(`${API_URL}/api/auth/forgot-password`, { email })
      setMessage(resp.data.message || 'Se existir, enviamos instruções para o email')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erro ao solicitar reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Esqueci minha senha</h1>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {message && <div className="info-message">{message}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar instruções'}</button>
        </form>
      </div>
    </div>
  )
}
