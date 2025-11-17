import { useState } from 'react'
import axios from 'axios'
import '../styles/QRCodeGenerator.css'

export default function QRCodeGenerator({ clients, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    content: '',
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const token = localStorage.getItem('token')

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
      const response = await axios.post(
        `${API_URL}/api/qrcode/generate`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      alert('QR Code gerado com sucesso!')
      setFormData({
        clientId: '',
        title: '',
        content: '',
      })
      onSuccess(response.data.qrCode)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao gerar QR Code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qrcode-generator-container">
      <h2>Gerar QR Code</h2>
      
      {clients.length === 0 ? (
        <p className="empty-message">Você precisa criar clientes primeiro para gerar QR Codes.</p>
      ) : (
        <form onSubmit={handleSubmit} className="qrcode-form">
          <div className="form-group">
            <label>Cliente *</label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um cliente</option>
              {clients.map(client => (
                <option key={client._id} value={client._id}>
                  {client.name} ({client.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              name="title"
              placeholder="Ex: Desconto para novo cliente"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Conteúdo / Mensagem *</label>
            <textarea
              name="content"
              placeholder="Digite o conteúdo que será codificado no QR Code"
              value={formData.content}
              onChange={handleChange}
              required
              rows="5"
            ></textarea>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Gerando...' : '📱 Gerar QR Code'}
          </button>
        </form>
      )}
    </div>
  )
}
