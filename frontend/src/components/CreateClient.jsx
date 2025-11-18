import { useState } from 'react'
import axios from 'axios'
import '../styles/CreateClient.css'

export default function CreateClient({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    aiProvider: 'chatgpt',
    aiApiKey: '',
    aiProviderEndpoint: '',
    aiProviderHeader: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
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
        `${API_URL}/api/clients`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      alert('Cliente criado com sucesso!')
      setFormData({
        name: '',
        email: '',
        phone: '',
        whatsappNumber: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: '',
      })
      onSuccess(response.data.client)
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-client-container">
      <h2>Novo Cliente</h2>
      <form onSubmit={handleSubmit} className="client-form">
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
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <input
            type="tel"
            name="phone"
            placeholder="Telefone *"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="whatsappNumber"
            placeholder="WhatsApp"
            value={formData.whatsappNumber}
            onChange={handleChange}
          />
        </div>

          <div className="form-row">
            <select name="aiProvider" value={formData.aiProvider} onChange={handleChange}>
              <option value="chatgpt">ChatGPT</option>
              <option value="gemini">Gemini</option>
              <option value="perplexity">Perplexity</option>
              <option value="publicai">PublicAI</option>
              <option value="other">Outro</option>
            </select>

            <input
              type="password"
              name="aiApiKey"
              placeholder="AI API Key (opcional)"
              value={formData.aiApiKey}
              onChange={handleChange}
            />
          </div>

          {formData.aiProvider === 'other' && (
            <div className="form-row">
              <input
                type="text"
                name="aiProviderEndpoint"
                placeholder="Provider endpoint (ex: https://api.example.com/generate)"
                value={formData.aiProviderEndpoint}
                onChange={handleChange}
              />

              <input
                type="text"
                name="aiProviderHeader"
                placeholder="Header name for API key (ex: x-api-key)"
                value={formData.aiProviderHeader}
                onChange={handleChange}
              />
            </div>
          )}

        <div className="form-row">
          <input
            type="text"
            name="company"
            placeholder="Empresa"
            value={formData.company}
            onChange={handleChange}
          />
          <input
            type="text"
            name="address"
            placeholder="Endereço"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            name="city"
            placeholder="Cidade"
            value={formData.city}
            onChange={handleChange}
          />
          <input
            type="text"
            name="state"
            placeholder="Estado"
            value={formData.state}
            onChange={handleChange}
          />
          <input
            type="text"
            name="zipCode"
            placeholder="CEP"
            value={formData.zipCode}
            onChange={handleChange}
          />
        </div>

        <textarea
          name="notes"
          placeholder="Observações"
          value={formData.notes}
          onChange={handleChange}
          rows="4"
        ></textarea>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Criando...' : 'Criar Cliente'}
        </button>
      </form>
    </div>
  )
}
