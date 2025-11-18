import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/Login.css'

export default function ResetPassword({ onResetSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [token, setToken] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('resetToken')
    if (t) setToken(t)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return setMessage('Token ausente')
    setLoading(true)
    try {
      const resp = await axios.post(`${API_URL}/api/auth/reset-password`, { token, password })
      setMessage(resp.data.message || 'Senha alterada com sucesso')
      if (onResetSuccess) onResetSuccess()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erro ao resetar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Redefinir senha</h1>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {message && <div className="info-message">{message}</div>}
          <button type="submit" disabled={loading}>{loading ? 'Processando...' : 'Redefinir senha'}</button>
        </form>
      </div>
    </div>
  )
}
