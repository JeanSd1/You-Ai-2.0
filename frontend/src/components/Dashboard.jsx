import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/Dashboard.css'
import CreateClient from './CreateClient'
import CreateUser from './CreateUser'
import QRCodeGenerator from './QRCodeGenerator'

export default function Dashboard({ user, onLogout }) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [qrCodes, setQrCodes] = useState([])
  const [activeTab, setActiveTab] = useState('clients')
  const [loading, setLoading] = useState(false)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const token = localStorage.getItem('token')

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients()
    } else if (activeTab === 'qrcodes') {
      fetchQRCodes()
    }
  }, [activeTab])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/clients`, { headers })
      setClients(response.data.clients)
      // If logged user is not admin, and has a client, set it as selected and default to profile
      const isAdmin = !!user?.isAdmin
      if (!isAdmin) {
        const myClient = response.data.clients && response.data.clients.length ? response.data.clients[0] : null
        setSelectedClient(myClient)
        setActiveTab('profile')
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      alert('Erro ao buscar clientes')
    } finally {
      setLoading(false)
    }
  }

  const fetchQRCodes = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/qrcode`, { headers })
      setQrCodes(response.data.qrCodes)
    } catch (error) {
      console.error('Erro ao buscar QR Codes:', error)
      alert('Erro ao buscar QR Codes')
    } finally {
      setLoading(false)
    }
  }

  const deleteClient = async (id) => {
    if (confirm('Tem certeza que deseja deletar este cliente?')) {
      try {
        await axios.delete(`${API_URL}/api/clients/${id}`, { headers })
        setClients(clients.filter(c => c._id !== id))
        alert('Cliente deletado com sucesso')
      } catch (error) {
        alert('Erro ao deletar cliente')
      }
    }
  }

  const regenerateAllForClient = async (id) => {
    if (!confirm('Gerar novamente todos os QR deste cliente como WhatsApp?')) return;
    try {
      const response = await axios.post(`${API_URL}/api/clients/${id}/regenerate-qrs`, {}, { headers });
      const { updated, skipped, total } = response.data;
      alert(`Regeneração concluída. Atualizados: ${updated}, Ignorados: ${skipped}, Total: ${total}`);
      // Refresh prompts list if currently viewing QRs
      if (activeTab === 'qrcodes') fetchQRCodes();
    } catch (error) {
      console.error('Erro ao regenerar QRs em lote:', error);
      alert(error.response?.data?.message || 'Erro ao regenerar QRs');
    }
  }

  const deleteQRCode = async (id) => {
    if (confirm('Tem certeza que deseja deletar este QR Code?')) {
      try {
        await axios.delete(`${API_URL}/api/qrcode/${id}`, { headers })
        setQrCodes(qrCodes.filter(q => q._id !== id))
        alert('QR Code deletado com sucesso')
      } catch (error) {
        alert('Erro ao deletar QR Code')
      }
    }
  }

  const regenerateQRCodeAsWhatsApp = async (id) => {
    if (!confirm('Gerar novamente o QR como WhatsApp?')) return;
    try {
      const response = await axios.post(`${API_URL}/api/qrcode/${id}/regenerate`, {}, { headers });
      const updated = response.data.qrCode;
      setQrCodes(qrCodes.map(q => (q._id === updated._id ? updated : q)));
      alert('QR regenerado como WhatsApp com sucesso');
    } catch (error) {
      console.error('Erro ao regenerar QR:', error);
      alert(error.response?.data?.message || 'Erro ao regenerar QR');
    }
  }

  const handleClientCreated = (newClient) => {
    setClients([newClient, ...clients])
    setActiveTab('clients')
  }

  const openEdit = (client) => {
    setSelectedClient(client)
    setActiveTab('edit')
  }

  const handleClientUpdated = (updatedClient) => {
    setClients(clients.map(c => (c._id === updatedClient._id ? updatedClient : c)))
    setSelectedClient(null)
    setActiveTab('clients')
  }

  const handleQRCodeGenerated = (newQRCode) => {
    setQrCodes([newQRCode, ...qrCodes])
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>YouAi</h1>
        </div>
        <div className="navbar-user">
          <span>Bem-vindo, {user?.name}!</span>
          <button onClick={onLogout} className="logout-btn">Sair</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="tabs">
          {user?.isAdmin ? (
            <>
              <button
                className={`tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
                onClick={() => setActiveTab('clients')}
              >
                👥 Clientes
              </button>
              <button
                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                ➕ Novo Cliente
              </button>

              <button
                className={`tab-btn ${activeTab === 'create-user' ? 'active' : ''}`}
                onClick={() => setActiveTab('create-user')}
              >
                👤 Novo Usuário
              </button>
              <button
                className={`tab-btn ${activeTab === 'qrcode' ? 'active' : ''}`}
                onClick={() => setActiveTab('qrcode')}
              >
                📱 Gerar QR Code
              </button>
              <button
                className={`tab-btn ${activeTab === 'qrcodes' ? 'active' : ''}`}
                onClick={() => setActiveTab('qrcodes')}
              >
                📊 Meus QR Codes
              </button>
            </>
          ) : (
            <>
              <button
                className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                🧑‍💻 Meu Perfil
              </button>
              <button
                className={`tab-btn ${activeTab === 'qrcode' ? 'active' : ''}`}
                onClick={() => setActiveTab('qrcode')}
              >
                📱 Gerar QR Code
              </button>
            </>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'clients' && (
            <div className="clients-section">
              <h2>Meus Clientes</h2>
              {loading ? (
                <p>Carregando...</p>
              ) : clients.length === 0 ? (
                <p className="empty-message">Você ainda não tem clientes. <a href="#" onClick={() => setActiveTab('create')}>Criar novo</a></p>
              ) : (
                <div className="clients-grid">
                  {clients.map((client, idx) => (
                    <div key={client._id ?? `client-${idx}`} className="client-card">
                      <h3>{client.name}</h3>
                      <p><strong>Telefone:</strong> {client.phone}</p>
                      {client.email && <p><strong>Email:</strong> {client.email}</p>}
                      {client.company && <p><strong>Empresa:</strong> {client.company}</p>}
                      {client.whatsappNumber && <p><strong>WhatsApp:</strong> {client.whatsappNumber}</p>}
                      <div className="client-actions">
                        <button
                          onClick={() => openEdit(client)}
                          className="edit-btn"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => regenerateAllForClient(client._id)}
                          className="regen-btn"
                        >
                          🔁 Regerar QRs (WhatsApp)
                        </button>
                        <button
                          onClick={() => deleteClient(client._id)}
                          className="delete-btn"
                        >
                          🗑️ Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {user?.isAdmin && activeTab === 'create' && (
            <CreateClient onSuccess={handleClientCreated} />
          )}

          {user?.isAdmin && activeTab === 'edit' && selectedClient && (
            <CreateClient client={selectedClient} onSuccess={handleClientUpdated} onCancel={() => { setSelectedClient(null); setActiveTab('clients') }} isOwner={true} />
          )}

          {/* Profile view for client-account users (edit own chatbot/profile) */}
          {activeTab === 'profile' && selectedClient && (
            <CreateClient client={selectedClient} onSuccess={handleClientUpdated} isOwner={false} onCancel={() => { setSelectedClient(null); setActiveTab('profile') }} />
          )}

            {activeTab === 'create-user' && user?.role === 'admin' && (
              <CreateUser onCreated={(u) => alert(`Usuário ${u.email} criado com sucesso!`)} />
            )}

          {activeTab === 'qrcode' && (
            <QRCodeGenerator clients={clients} onSuccess={handleQRCodeGenerated} />
          )}

          {activeTab === 'qrcodes' && (
            <div className="qrcodes-section">
              <h2>Meus QR Codes</h2>
              {loading ? (
                <p>Carregando...</p>
              ) : qrCodes.length === 0 ? (
                <p className="empty-message">Você ainda não gerou QR Codes. <a href="#" onClick={() => setActiveTab('qrcode')}>Gerar novo</a></p>
              ) : (
                <div className="qrcodes-grid">
                  {qrCodes.map((qr, idx) => (
                    <div key={qr._id ?? `qrcode-${idx}`} className="qrcode-card">
                      <h3>{qr.title}</h3>
                      <p className="qr-client">Cliente: {qr.clientId?.name}</p>
                      <img src={qr.qrCodeData} alt="QR Code" className="qrcode-image" />
                      <p className="qr-date">{new Date(qr.createdAt).toLocaleDateString('pt-BR')}</p>
                      <div className="qrcode-actions">
                        {qr.qrCodeUrl ? (
                          <>
                            <button
                              onClick={() => window.open(qr.qrCodeUrl, '_blank')}
                              className="open-link-btn"
                            >
                              🔗 Abrir link
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(qr.qrCodeUrl).then(()=>alert('Link copiado para a área de transferência'))}
                              className="copy-link-btn"
                            >
                              📋 Copiar link
                            </button>
                            <button onClick={() => regenerateQRCodeAsWhatsApp(qr._id)} className="regen-btn">🔁 Regerar WhatsApp</button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = qr.qrCodeData
                              link.download = `${qr.title}.png`
                              link.click()
                            }}
                            className="download-btn"
                          >
                            ⬇️ Baixar
                          </button>
                        )}
                        <button
                          onClick={() => deleteQRCode(qr._id)}
                          className="delete-btn"
                        >
                          🗑️ Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
