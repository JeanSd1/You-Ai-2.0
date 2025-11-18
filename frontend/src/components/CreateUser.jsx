import { useState } from 'react'
import axios from 'axios'
import '../styles/CreateUser.css'

export default function CreateUser({ onCreated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const token = localStorage.getItem('token')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSuccessMessage('')

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/create-user`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setSuccessMessage('Usuário criado com sucesso!')
      setFormData({ name: '', email: '', password: '' })
      if (onCreated) onCreated(response.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-user-container">
      <h2>Novo Usuário</h2>
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-row">
          <input
            type="text"
            name="name"
            placeholder="Nome *"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email *"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <input
            type="password"
            name="password"
            placeholder="Senha *"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Criando...' : 'Criar Usuário'}
        </button>
      </form>
    </div>
  )
}
