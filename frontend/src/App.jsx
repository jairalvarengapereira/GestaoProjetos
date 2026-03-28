import { useState, useEffect } from 'react'
import { Plus, LogOut, Database, Globe, BookOpen, Edit, Trash2, Search, User, Users, Mail } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [empresa, setEmpresa] = useState(() => {
    const stored = localStorage.getItem('empresa')
    return stored ? JSON.parse(stored) : null
  })
  const [sistemas, setSistemas] = useState([])
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nome: '',
    ambiente: 'Desenvolvimento',
    url_aplicacao: '',
    api_base_url: '',
    api_doc_url: '',
    db_host: '',
    db_port: '',
    db_name: '',
    db_user: '',
    db_password: '',
    string_conexao: '',
    tecnologia: '',
    observacoes: '',
    status: 'Ativo'
  })

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [registerForm, setRegisterForm] = useState({ nome: '', email: '', password: '', empresa_id: '' })
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false)
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', slug: '' })
  const [showPerfil, setShowPerfil] = useState(false)
  const [perfilForm, setPerfilForm] = useState({ nome: '', email: '', password: '' })
  const [perfilError, setPerfilError] = useState('')
  const [perfilSuccess, setPerfilSuccess] = useState('')
  const [userId, setUserId] = useState(null)
  const [showConvites, setShowConvites] = useState(false)
  const [convites, setConvites] = useState([])
  const [novoConvite, setNovoConvite] = useState({ email: '' })
  const [conviteError, setConviteError] = useState('')
  const [conviteSuccess, setConviteSuccess] = useState('')
  const [conviteInfo, setConviteInfo] = useState(null)
  const [conviteToken, setConviteToken] = useState('')
  const [conviteErro, setConviteErro] = useState('')

  useEffect(() => {
    if (token) {
      fetchSistemas()
    }
    if (showRegister) {
      fetchEmpresas()
    }
    
    const urlParams = new URLSearchParams(window.location.search)
    const tokenParam = urlParams.get('token')
    if (tokenParam && !token) {
      setShowRegister(true)
      setConviteToken(tokenParam)
      validarConvite(tokenParam)
    }
  }, [token, busca, empresa, showRegister])

  const fetchEmpresas = async () => {
    try {
      const res = await fetch(`${API_URL}/empresas`)
      const data = await res.json()
      setEmpresas(data)
    } catch (err) {
      console.error(err)
    }
  }

  const criarEmpresa = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaEmpresa)
      })
      const data = await res.json()
      if (res.ok) {
        setRegisterForm({ ...registerForm, empresa_id: data.id })
        fetchEmpresas()
        setShowNovaEmpresa(false)
        setNovaEmpresa({ nome: '', slug: '' })
      } else {
        alert(data.error)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSistemas = async () => {
    try {
      const res = await fetch(`${API_URL}/sistemas?busca=${busca}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401 || res.status === 403) {
        logout()
        return
      }
      const data = await res.json()
      setSistemas(data)
    } catch (err) {
      console.error(err)
    }
  }

  const login = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('empresa', JSON.stringify(data.empresa))
        localStorage.setItem('nome', data.nome)
        const decoded = JSON.parse(atob(data.token.split('.')[1]))
        localStorage.setItem('userId', decoded.id)
        setUserId(decoded.id)
        setToken(data.token)
        setEmpresa(data.empresa)
        setLoginError('')
      } else {
        setLoginError(data.error)
      }
    } catch (err) {
      setLoginError('Erro ao conectar')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('empresa')
    localStorage.removeItem('nome')
    localStorage.removeItem('userId')
    setToken(null)
    setEmpresa(null)
    setLoginForm({ email: '', password: '' })
    setLoginError('')
    setRegisterForm({ nome: '', email: '', password: '', empresa_id: '' })
    setRegisterError('')
    setRegisterSuccess('')
    setShowPerfil(false)
    setShowConvites(false)
    setConviteToken('')
    setConviteInfo(null)
    setConviteErro('')
  }

  const fetchPerfil = async () => {
    try {
      const res = await fetch(`${API_URL}/usuarios/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPerfilForm({ nome: data.nome, email: data.email, password: '' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openPerfil = async () => {
    if (!userId) {
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        setUserId(parseInt(storedUserId))
      }
    }
    setShowPerfil(true)
    setPerfilError('')
    setPerfilSuccess('')
    await fetchPerfil()
  }

  const savePerfil = async (e) => {
    e.preventDefault()
    setPerfilError('')
    setPerfilSuccess('')
    try {
      const res = await fetch(`${API_URL}/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(perfilForm)
      })
      const data = await res.json()
      if (res.ok) {
        setPerfilSuccess(data.message)
        localStorage.setItem('nome', perfilForm.nome)
        if (perfilForm.password) {
          setPerfilForm({ ...perfilForm, password: '' })
        }
      } else {
        setPerfilError(data.error)
      }
    } catch (err) {
      setPerfilError('Erro ao atualizar perfil')
    }
  }

  const register = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterSuccess('')
    try {
      const resConvite = await fetch(`${API_URL}/convites/usar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: conviteToken })
      })
      const dataConvite = await resConvite.json()
      
      if (!resConvite.ok) {
        setRegisterError(dataConvite.error)
        return
      }
      
      const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: registerForm.nome,
          email: registerForm.email,
          password: registerForm.password,
          empresa_id: dataConvite.empresa_id
        })
      })
      const data = await res.json()
      if (res.ok) {
        setRegisterSuccess('Usuário criado com sucesso! Faça login.')
        setRegisterForm({ nome: '', email: '', password: '', empresa_id: '' })
        setConviteToken('')
        setConviteInfo(null)
        setTimeout(() => {
          setShowRegister(false)
          setRegisterSuccess('')
        }, 2000)
      } else {
        setRegisterError(data.error)
      }
    } catch (err) {
      setRegisterError('Erro ao conectar')
    }
  }

  const validarConvite = async (token) => {
    setConviteErro('')
    if (!token || token.length < 10) {
      setConviteInfo(null)
      return
    }
    try {
      const res = await fetch(`${API_URL}/convites/${token}`)
      const data = await res.json()
      if (res.ok) {
        setConviteInfo(data)
        setConviteErro('')
        setRegisterForm({ ...registerForm, email: data.email, empresa_id: data.empresa_id })
      } else {
        setConviteInfo(null)
        setConviteErro(data.error || 'Convite inválido')
      }
    } catch (err) {
      setConviteInfo(null)
      setConviteErro('Erro ao validar convite')
    }
  }

  const fetchConvites = async () => {
    try {
      const res = await fetch(`${API_URL}/convites`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setConvites(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const criarConvite = async (e) => {
    e.preventDefault()
    setConviteError('')
    setConviteSuccess('')
    try {
      const res = await fetch(`${API_URL}/convites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(novoConvite)
      })
      const data = await res.json()
      if (res.ok) {
        setConviteSuccess(`Convite criado! Token: ${data.token}`)
        setNovoConvite({ email: '' })
        setTimeout(() => fetchConvites(), 200)
      } else {
        setConviteError(data.error)
      }
    } catch (err) {
      setConviteError('Erro ao criar convite')
    }
  }

  const copyConviteLink = (token) => {
    navigator.clipboard.writeText(token)
    alert('Token copiado!')
  }

  const openModal = (sistema = null) => {
    if (sistema) {
      setEditando(sistema.id)
      setForm(sistema)
    } else {
      setEditando(null)
      setForm({
        nome: '',
        ambiente: 'Desenvolvimento',
        url_aplicacao: '',
        api_base_url: '',
        api_doc_url: '',
        db_host: '',
        db_port: '',
        db_name: '',
        db_user: '',
        db_password: '',
        string_conexao: '',
        tecnologia: '',
        observacoes: '',
        status: 'Ativo'
      })
    }
    setShowModal(true)
  }

  const saveSistema = async (e) => {
    e.preventDefault()
    setShowModal(false)
    try {
      const method = editando ? 'PUT' : 'POST'
      const url = editando ? `${API_URL}/sistemas/${editando}` : `${API_URL}/sistemas`

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      fetchSistemas()
    } catch (err) {
      console.error(err)
    }
  }

  const deleteSistema = async (id) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      try {
        await fetch(`${API_URL}/sistemas/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        fetchSistemas()
      } catch (err) {
        console.error(err)
        alert('Erro ao excluir sistema')
      }
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copiado para a área de transferência!')
  }

  const getStatusColor = (status, ambiente) => {
    if (status === 'Inativo') return 'bg-red-50 text-red-600 border-red-200'
    if (status === 'Manutenção') return 'bg-orange-50 text-orange-600 border-orange-200'
    if (status === 'Ativo') return 'bg-green-50 text-green-600 border-green-200'
    if (ambiente === 'Produção') return 'bg-red-50 text-red-600 border-red-200'
    if (ambiente === 'Homologação') return 'bg-blue-50 text-blue-600 border-blue-200'
    return 'bg-green-50 text-green-600 border-green-200'
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/FluxoPro.png" alt="Fluxo Pro" className="w-24 h-24 mx-auto mb-2 object-contain" />
            <h1 className="text-2xl font-bold text-dark">Fluxo Pro</h1>
            <p className="text-gray-500">Catálogo de Infraestrutura</p>
          </div>

          {showRegister ? (
            <form onSubmit={register} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Convite</label>
                <input
                  type="text"
                  placeholder="Cole o código de convite aqui"
                  required
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={conviteToken}
                  onChange={(e) => { setConviteToken(e.target.value); validarConvite(e.target.value); }}
                />
                {conviteInfo && (
                  <p className="text-green-600 text-sm mt-1">Convite válido para: <strong>{conviteInfo.empresa_nome}</strong></p>
                )}
                {conviteErro && (
                  <p className="text-red-500 text-sm mt-1">{conviteErro}</p>
                )}
              </div>
              <input
                type="text"
                placeholder="Nome"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={registerForm.nome}
                onChange={(e) => setRegisterForm({ ...registerForm, nome: e.target.value })}
                disabled={!conviteInfo}
              />
              <input
                type="email"
                placeholder="E-mail"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                disabled={!conviteInfo}
              />
              <input
                type="password"
                placeholder="Senha"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                disabled={!conviteInfo}
              />
              
              {registerError && <p className="text-red-500 text-sm">{registerError}</p>}
              {registerSuccess && <p className="text-green-500 text-sm">{registerSuccess}</p>}
              <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition">
                Cadastrar
              </button>
              <button
                type="button"
                onClick={() => { setShowRegister(false); setRegisterError(''); setRegisterSuccess(''); setShowNovaEmpresa(false); }}
                className="w-full text-gray-600 py-2 hover:text-dark"
              >
                Voltar para login
              </button>
            </form>
          ) : (
            <form onSubmit={login} className="space-y-4">
              <input
                type="email"
                placeholder="E-mail"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Senha"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition">
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setShowRegister(true); setRegisterForm({ nome: '', email: '', password: '', empresa_id: '' }); setRegisterError(''); setRegisterSuccess(''); setConviteToken(''); setConviteInfo(null); setConviteErro(''); }}
                className="w-full text-primary-600 py-2 hover:text-primary-800 text-sm"
              >
                Cadastrar (necessário convite)
              </button>
            </form>
          )}
          <p className="text-center text-gray-400 text-sm mt-4">© 2026 Jair Alvarenga Pereira. Todos os direitos reservados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/FluxoPro.png" alt="Fluxo Pro" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-dark">Fluxo Pro</h1>
              {empresa && <p className="text-xs text-gray-500">{empresa.nome}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowConvites(true); setConviteError(''); setConviteSuccess(''); fetchConvites(); }} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
              <Users className="w-5 h-5" />
              <span>Convites</span>
            </button>
            <button onClick={openPerfil} className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
              <User className="w-5 h-5" />
              <span>Perfil</span>
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-gray-600 hover:text-red-600">
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou tecnologia..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sistemas.map((sistema) => (
            <div key={sistema.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-dark">{sistema.nome}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(sistema.status, sistema.ambiente)}`}>
                    {sistema.ambiente} • {sistema.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(sistema)} className="p-2 text-gray-400 hover:text-primary-600" title="Editar">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteSistema(sistema.id)} className="p-2 text-gray-400 hover:text-red-600" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {sistema.tecnologia && (
                <p className="text-sm text-gray-500 mb-3">{sistema.tecnologia}</p>
              )}

              <div className="space-y-2 text-sm">
                {sistema.url_aplicacao && (
                  <a href={sistema.url_aplicacao} target="_blank" className="flex items-center gap-2 text-primary-600 hover:underline">
                    <Globe className="w-4 h-4" />
                    Aplicação
                  </a>
                )}
                {sistema.api_base_url && (
                  <a href={sistema.api_doc_url} target="_blank" className="flex items-center gap-2 text-primary-600 hover:underline">
                    <BookOpen className="w-4 h-4" />
                    API Docs
                  </a>
                )}
                {sistema.db_host && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Database className="w-4 h-4" />
                    {sistema.db_host}:{sistema.db_port}/{sistema.db_name}
                  </div>
                )}
              </div>

              {sistema.string_conexao && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={sistema.string_conexao}
                      readOnly
                      className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1 text-gray-600"
                    />
                    <button
                      onClick={() => copyToClipboard(sistema.string_conexao)}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-xs font-medium text-gray-700"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {sistemas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <img src="/FluxoPro.png" alt="Fluxo Pro" className="w-24 h-24 mx-auto mb-4 opacity-50 object-contain" />
            <p>Nenhum projeto encontrado</p>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editando ? 'Editar' : 'Novo'} Projeto</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={saveSistema} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tecnologia</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.tecnologia}
                    onChange={(e) => setForm({ ...form, tecnologia: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.ambiente}
                    onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
                  >
                    <option>Desenvolvimento</option>
                    <option>Homologação</option>
                    <option>Produção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                    <option>Manutenção</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-dark mb-3">Aplicação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Aplicação</label>
                    <input
                      type="url"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.url_aplicacao}
                      onChange={(e) => setForm({ ...form, url_aplicacao: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Base API</label>
                    <input
                      type="url"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.api_base_url}
                      onChange={(e) => setForm({ ...form, api_base_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Documentação (Swagger)</label>
                    <input
                      type="url"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.api_doc_url}
                      onChange={(e) => setForm({ ...form, api_doc_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-dark mb-3">Banco de Dados</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.db_host}
                      onChange={(e) => setForm({ ...form, db_host: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                    <input
                      type="number"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.db_port}
                      onChange={(e) => setForm({ ...form, db_port: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome BD</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.db_name}
                      onChange={(e) => setForm({ ...form, db_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.db_user}
                      onChange={(e) => setForm({ ...form, db_user: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.db_password}
                      onChange={(e) => setForm({ ...form, db_password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">String Conexão</label>
                    <input
                      type="password"
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.string_conexao}
                      onChange={(e) => setForm({ ...form, string_conexao: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPerfil && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPerfil(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Editar Perfil</h2>
              <button onClick={() => setShowPerfil(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={savePerfil} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={perfilForm.nome}
                  onChange={(e) => setPerfilForm({ ...perfilForm, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={perfilForm.email}
                  onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (opcional)</label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2"
                  value={perfilForm.password}
                  onChange={(e) => setPerfilForm({ ...perfilForm, password: e.target.value })}
                  placeholder="Deixe em branco para manter a senha atual"
                />
              </div>
              {perfilError && <p className="text-red-500 text-sm">{perfilError}</p>}
              {perfilSuccess && <p className="text-green-500 text-sm">{perfilSuccess}</p>}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPerfil(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConvites && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowConvites(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Gerenciar Convites</h2>
              <button onClick={() => setShowConvites(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <form onSubmit={criarConvite} className="flex gap-2">
                <input
                  type="email"
                  placeholder="E-mail do novo usuário"
                  required
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={novoConvite.email}
                  onChange={(e) => setNovoConvite({ ...novoConvite, email: e.target.value })}
                />
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Criar Convite
                </button>
              </form>
              {conviteError && <p className="text-red-500 text-sm">{conviteError}</p>}
              {conviteSuccess && <p className="text-green-500 text-sm">{conviteSuccess}</p>}
              
              <div className="border-t pt-4">
                <h3 className="font-medium text-dark mb-3">Convites Enviados</h3>
                {convites.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum convite enviado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {convites.map((convite) => (
                      <div key={convite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{convite.email}</p>
                          <p className="text-xs text-gray-500">{convite.empresa_nome}</p>
                          <p className="text-xs text-gray-400">
                            {convite.usado ? (
                              <span className="text-green-600">Usado</span>
                            ) : (
                              <span>Pendente (7 dias)</span>
                            )}
                          </p>
                        </div>
                        {!convite.usado && (
                          <button
                            onClick={() => copyConviteLink(convite.token)}
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm"
                          >
                            <Mail className="w-4 h-4" />
                            Copiar Token
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
