import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  Building, Lock, User, Eye, EyeOff, Plus, LogOut, ArrowRight, Home, 
  DollarSign, // Financeiro
  Package, // Inventário
  CheckSquare, // Checklist
  FileText, // Documentos
  BarChart2, // Relatórios
  X,
  ArrowLeft,
  Users, // Funcionários
  UserCheck, 
  UserPlus, 
  Upload, 
  Edit, 
  Trash2, 
  History, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Wrench, 
  Box, 
  ShieldCheck, 
  ClipboardList, 
  Paperclip,
  Download, // Ícone de Download
  File as FileIcon, // Ícone de Ficheiro
  Clock,
  Search,
  Settings,
  ShoppingBag, // <-- NOVO (Marketplace)
  Image        // <-- NOVO (Marketplace)
} from 'lucide-react';

// ... (o resto dos seus imports e o registro do Chart.js continuam aqui)
// --- IMPORTS DO CHART.JS (ATUALIZADO PARA GRÁFICO DE LINHA) ---
import { Line } from 'react-chartjs-2'; // <-- MUDOU DE Bar PARA Line
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement, // <-- ADICIONADO
  LineElement,  // <-- ADICIONADO
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
// BarElement FOI REMOVIDO

// --- REGISTRO DO CHART.JS (ATUALIZADO) ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement, // <-- MUDADO
  LineElement,  // <-- MUDADO
  Title,
  Tooltip,
  Legend
);

// --- Constante da URL Base do Backend ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

// --- Configuração da API ---
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, 
});

// --- INTERCEPTOR ---
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']; 
  } else {
    if (!config.headers['Content-Type']) { 
        config.headers['Content-Type'] = 'application/json';
    }
  }

  return config;
}, error => {
    return Promise.reject(error);
});


// --- Funções Helper ---
function formatCurrency(value) {
  const number = parseFloat(value);
  if (isNaN(number)) { return "R$ 0,00"; }
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const formatCurrencyInput = (value) => {
  if (!value) return '';
  let numStr = value.replace(/[^0-9]/g, '');
  if (numStr === '') return '';
  numStr = numStr.padStart(3, '0');
  const cents = numStr.slice(-2);
  const integer = numStr.slice(0, -2);
  const formattedInteger = parseInt(integer, 10).toLocaleString('pt-BR');
  return `${formattedInteger},${cents}`;
};
const parseCurrency = (value) => {
  if (!value) return 0.0;
  const numStr = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numStr) || 0.0;
};
function formatDateTime(isoString) {
  if (!isoString) return 'N/D';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) { return 'Data inválida'; }
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error("Erro ao formatar data:", isoString, e);
    return 'Erro na data';
  }
}
function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
        // Adiciona 'T00:00:00Z' para garantir que a data seja interpretada como UTC
        const date = new Date(isoString + 'T00:00:00Z'); 
        if (isNaN(date.getTime())) { return 'Data inválida'; }
        // timeZone: 'UTC' garante que a data não mude para o dia anterior
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    } catch (e) {
        console.error("Erro ao formatar data:", isoString, e);
        return 'Erro na data';
    }
}
// Helper para o tamanho do ficheiro
function formatFileSize(sizeInBytes) {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} Bytes`;
    } else if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}


// --- Componente Principal ---
// --- Componente Principal (ATUALIZADO com Modal de Perfil) ---
// --- Componente Principal (ATUALIZADO com Lógica de Forçar Senha) ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // --- NOVO ESTADO ---
  // Controla se o usuário DEVE trocar a senha antes de continuar
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  // ----------------
  
  const [view, setView] = useState('dashboard'); 
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleOpenProfileModal = () => setIsProfileModalOpen(true);
  const handleCloseProfileModal = () => setIsProfileModalOpen(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser); 
        setIsAuthenticated(true);
        // Verifica a flag no carregamento da página
        setRequiresPasswordChange(parsedUser.must_change_password || false);
      } catch (e) {
        handleLogout(); 
      }
    }
    setAuthChecked(true);
  }, []);

  // --- FUNÇÃO DE LOGIN ATUALIZADA ---
  const handleLoginSuccess = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData)); 
    setUser(userData); 
    setIsAuthenticated(true);
    // Define o estado com base na resposta da API
    setRequiresPasswordChange(userData.must_change_password || false);
  };
  // --------------------------------

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setRequiresPasswordChange(false); // Reseta a flag no logout
    delete api.defaults.headers.common['Authorization']; 
    setView('dashboard'); 
    setSelectedObraId(null);
  };
  
  // --- NOVO HANDLER ---
  // Chamado quando a mudança de senha obrigatória é bem-sucedida
  const handlePasswordChangeSuccess = (updatedUser) => {
    // Atualiza o usuário no localStorage e no estado
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    // Libera o usuário para o sistema
    setRequiresPasswordChange(false);
  };
  // --------------------
  
  // (Handlers de navegação permanecem os mesmos)
  const handleGlobalNav = (newView) => {
    setSelectedObraId(null); 
    setView(newView);       
  };
  const navigateToObra = (obraId) => {
    setSelectedObraId(obraId);
    setView('obra_detail'); 
  };
  const navigateToDashboard = () => {
    setSelectedObraId(null);
    setView('dashboard'); 
  };
  
  if (!authChecked) {
    return <div className="flex items-center justify-center w-full h-screen bg-gray-100 text-gray-500">A carregar...</div>;
  }

  // --- LÓGICA DE RENDERIZAÇÃO ATUALIZADA ---
  if (!isAuthenticated) {
    // 1. Se não está autenticado, mostra Login
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }
  
  if (requiresPasswordChange) {
    // 2. Se está autenticado MAS precisa trocar a senha,
    //    mostra o modal de mudança obrigatória em tela cheia.
    return (
        <ForcePasswordChangeModal
            user={user}
            onSuccess={handlePasswordChangeSuccess}
            onLogout={handleLogout} // Permite ao usuário deslogar
        />
    );
  }

  // 3. Se está autenticado E não precisa trocar a senha,
  //    mostra o aplicativo principal.
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
        <div className="flex h-screen">
          <Sidebar 
            user={user}
            onLogoutClick={handleLogout} 
            onNavigate={handleGlobalNav} 
            activeView={view} 
          />
          
          <main className="flex-1 overflow-y-auto bg-gray-100">
            <RenderCurrentView
              view={view}
              user={user}
              onLogout={handleLogout}
              navigateToObra={navigateToObra}
              obraId={selectedObraId}
              onBackToDashboard={navigateToDashboard}
              onOpenProfile={handleOpenProfileModal}
            />
          </main>
          
          {isProfileModalOpen && (
            <AtualizarCredenciaisModal
              user={user}
              onClose={handleCloseProfileModal}
              onSuccess={() => {
                handleCloseProfileModal();
                handleLogout();
                alert("Credenciais atualizadas! Por favor, faça login novamente.");
              }}
            />
          )}
          
        </div>
    </div>
  );
}

// --- Componente de Renderização de View (ATUALIZADO) ---
// --- Componente de Renderização de View (ATUALIZADO) ---
function RenderCurrentView({ view, user, onLogout, navigateToObra, obraId, onBackToDashboard, onOpenProfile }) {
  
  switch (view) {
    case 'dashboard':
      return (
        <DashboardPage 
          user={user} 
          onLogout={onLogout} 
          onVerDetalhes={navigateToObra} 
          onOpenProfile={onOpenProfile} 
        />
      );
    case 'obra_detail':
      return (
        <ObraDetailPage 
          obraId={obraId} 
          onBackToDashboard={onBackToDashboard} 
          user={user} 
          onLogout={onLogout}
          onOpenProfile={onOpenProfile} 
        />
      );
    case 'inventario':
      return <GlobalInventarioPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'financeiro':
      return <GlobalFinanceiroPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'checklist':
      return <GlobalChecklistPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'documentos':
      return <GlobalDocumentosPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'funcionarios':
      return <GlobalFuncionariosPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'relatorios':
      return <GlobalRelatoriosPage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    case 'marketplace': 
      // Adicionei as props onLogout e onOpenProfile aqui também para manter o padrão
      return <GlobalMarketplacePage user={user} onLogout={onLogout} onOpenProfile={onOpenProfile} />;
    default:
      return <DashboardPage user={user} onLogout={onLogout} onVerDetalhes={navigateToObra} onOpenProfile={onOpenProfile} />;
  }
}


// --- Página de Login ---
function LoginPage({ onLoginSuccess }) {
  // ... (código existente, sem alterações) ...
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { 
        username: username,
        password: password,
      });

      if (response.data && response.data.access_token && response.data.user) {
        onLoginSuccess(response.data.user, response.data.access_token);
      } else {
        console.error("Resposta de login inesperada:", response.data);
        setError('Resposta de login inválida do servidor.');
      }

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Não foi possível ligar ao servidor. O backend está no ar?');
      }
      console.error('Erro no login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-100 rounded-full">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-center text-gray-900">
            Gestão de Obras
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}
          <div className="relative">
            <User className="absolute w-5 h-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full h-12 pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome de usuário (ex: admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute w-5 h-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full h-12 pl-10 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Senha (ex: admin123)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute text-gray-500 right-3 top-1/2 -translate-y-1/2 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'A entrar...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Página do Dashboard (ATUALIZADA) ---
// --- Página do Dashboard (ATUALIZADA) ---
function DashboardPage({ user, onLogout, onVerDetalhes, onOpenProfile }) {
  const [obras, setObras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState(null);
  
  // --- NOVOS ESTADOS PARA O MODAL DE AUDITORIA ---
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditObra, setAuditObra] = useState(null);
  // ---------------------------------------------

  const canManage = user?.role === 'Administrador' || user?.role === 'Gestor';

  const fetchObras = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/obras/'); 
      setObras(response.data);
    } catch (err) {
      console.error("Erro ao buscar obras:", err);
      setError("Não foi possível carregar as obras. O backend está no ar?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, []);

  // --- Handlers de Modais (Atualizados) ---
  const handleAddModalClose = () => setIsAddModalOpen(false);
  
  const handleEditModalOpen = (obra) => {
    setSelectedObra(obra);
    setIsEditModalOpen(true);
  };
  const handleEditModalClose = () => {
    setSelectedObra(null);
    setIsEditModalOpen(false);
  };

  const handleDeleteModalOpen = (obra) => {
    setSelectedObra(obra);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteModalClose = () => {
    setSelectedObra(null);
    setIsDeleteModalOpen(false);
  };
  
  // --- NOVOS HANDLERS PARA O MODAL DE AUDITORIA ---
  const handleAuditModalOpen = (obra) => {
    setAuditObra(obra);
    setIsAuditModalOpen(true);
  };
  const handleAuditModalClose = () => {
    setAuditObra(null);
    setIsAuditModalOpen(false);
  };
  // -----------------------------------------------

  const handleActionSuccess = () => {
    fetchObras(); // Recarrega a lista de obras
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedObra(null);
    // Não precisamos fechar o modal de auditoria aqui
  };
  
  return (
    <>
        <Header 
          user={user} 
          onLogoutClick={onLogout} 
          pageTitle="Dashboard de Obras" 
          onOpenProfile={onOpenProfile}
        />

        <div className="p-6 md:p-10"> 
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4"> 
            <h2 className="text-xl font-semibold text-gray-700">Minhas Obras</h2>
            {canManage && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nova Obra
              </button>
            )}
          </div>
          
          {error && (
            <div className="flex items-center justify-between p-4 mb-4 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold text-red-800 hover:text-red-900 ml-4">X</button>
            </div>
          )}

          <ObrasTable 
              obras={obras} 
              isLoading={isLoading} 
              onVerDetalhes={onVerDetalhes} 
              onEdit={handleEditModalOpen}
              onDelete={handleDeleteModalOpen}
              onAudit={handleAuditModalOpen} // <-- PASSANDO O NOVO HANDLER
              canManage={canManage}
          />
        </div>

      {isAddModalOpen && (
        <NovaObraModal
          onClose={handleAddModalClose}
          onObraCreated={handleActionSuccess}
        />
      )}
      
      {isEditModalOpen && selectedObra && (
        <EditarObraModal
            obra={selectedObra}
            onClose={handleEditModalClose}
            onObraUpdated={handleActionSuccess}
        />
      )}
      
      {isDeleteModalOpen && selectedObra && (
        <RemoverObraModal
            obra={selectedObra}
            onClose={handleDeleteModalClose}
            onObraRemoved={handleActionSuccess}
        />
      )}
      
      {/* --- RENDERIZA O NOVO MODAL DE AUDITORIA --- */}
      {isAuditModalOpen && auditObra && (
        <ObraAuditLogModal
            obra={auditObra}
            onClose={handleAuditModalClose}
        />
      )}
      {/* ------------------------------------------ */}
    </>
  );
}

// --- Página de Detalhes da Obra (Atualizada) ---
// --- Página de Detalhes da Obra (Atualizada) ---
function ObraDetailPage({ obraId, onBackToDashboard, user, onLogout, onOpenProfile }) { // <-- 1. PROP ADICIONADA AQUI
  const [obra, setObra] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('funcionarios');

  const [refreshKey, setRefreshKey] = useState(0); 
  const forceRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchObraDetalhes = async () => {
      if (!obraId) return; 
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/obras/${obraId}/`); 
        setObra(response.data);
      } catch (err) {
        console.error(`Erro ao buscar detalhes da obra ${obraId}:`, err);
        setError("Não foi possível carregar os detalhes da obra.");
        setObra(null); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchObraDetalhes();
  }, [obraId, refreshKey]); 
  
  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle={obra ? obra.nome : "A carregar..."} 
        showBackButton={true}
        onBackClick={onBackToDashboard}
        onOpenProfile={onOpenProfile} // <-- 2. PROP PASSADA AQUI
      />
      
      <div className="p-6 md:p-10"> 
        {isLoading && <div className="text-center text-gray-500 py-10">A carregar detalhes da obra...</div>}
        {error && <div className="p-4 text-red-800 bg-red-100 rounded-md mb-6">{error}</div>}
        
        {obra && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{obra.nome}</h2>
              <p className="text-gray-600 mt-1">{obra.endereco || 'Endereço não informado'}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4"> 
                <div>
                  <span className="text-sm text-gray-500 block">Proprietário</span> 
                  <p className="font-semibold text-gray-800">{obra.proprietario || 'N/D'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">Orçamento Atual</span> 
                  <p className="font-semibold text-gray-800">{formatCurrency(obra.orcamento_atual)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">Status</span>
                  <p className={`font-semibold ${
                    obra.status === 'Em Andamento' ? 'text-blue-600' : 
                    obra.status === 'Concluída' ? 'text-green-600' : 'text-gray-600' 
                  }`}>{obra.status}</p>
                </div>
              </div>
            </div>

            {/* Abas de Navegação */}
            <div className="border-b border-gray-200 overflow-x-auto"> 
              <nav className="flex -mb-px px-6 space-x-8 min-w-max"> 
                <TabButton 
                  text="Funcionários" 
                  isActive={activeTab === 'funcionarios'} 
                  onClick={() => setActiveTab('funcionarios')} 
                />
                <TabButton 
                  text="Financeiro" 
                  isActive={activeTab === 'financeiro'} 
                  onClick={() => setActiveTab('financeiro')} 
                />
                <TabButton 
                  text="Inventário" 
                  isActive={activeTab === 'inventario'} 
                  onClick={() => setActiveTab('inventario')} 
                />
                <TabButton 
                  text="Checklist" 
                  isActive={activeTab === 'checklist'} 
                  onClick={() => setActiveTab('checklist')} 
                />
                <TabButton 
                  text="Documentos" 
                  isActive={activeTab === 'documentos'} 
                  onClick={() => setActiveTab('documentos')} 
                />
              </nav>
            </div>

            {/* Conteúdo das Abas */}
            <div className="p-6">
              {activeTab === 'funcionarios' && (
                <FuncionariosTab 
                  obraId={obraId} 
                  onFuncionarioAction={forceRefresh} 
                  refreshKey={refreshKey} 
                  currentUser={user} 
                />
              )}
              {activeTab === 'financeiro' && obra && ( 
                 <FinanceiroTab 
                    obraId={obraId} 
                    orcamentoInicial={obra.orcamento_inicial} 
                    onTransacaoAction={forceRefresh} 
                    refreshKey={refreshKey}
                    currentUser={user} 
                 />
              )}
               {activeTab === 'inventario' && (
                  <InventarioTab
                     obraId={obraId}
                     onInventarioAction={forceRefresh}
                     refreshKey={refreshKey}
                     currentUser={user} 
                  />
               )}
               {activeTab === 'checklist' && (
                 <ChecklistTab
                    obraId={obraId}
                    onChecklistAction={forceRefresh}
                    refreshKey={refreshKey}
                    currentUser={user} 
                 />
               )}
               {activeTab === 'documentos' && (
                 <DocumentosTab
                    obraId={obraId}
                    onDocumentoAction={forceRefresh}
                    refreshKey={refreshKey}
                    currentUser={user} 
                 />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// --- PÁGINAS GLOBAIS (IMPLEMENTAÇÃO E PLACEHOLDERS) ---

// --- PÁGINA GLOBAL DE FUNCIONÁRIOS (ATUALIZADA) ---
function GlobalFuncionariosPage({ user, onLogout, onOpenProfile }) { // <-- 1. ACEITA A PROP
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para os modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Define quem pode gerir (Apenas Admin)
  const isAdmin = user?.role === 'Administrador';

  // Função para recarregar dados
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Busca usuários E cargos (roles)
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get('/users/'),
        api.get('/users/roles/')
      ]);
      setUsers(usersResponse.data.users || []);
      setRoles(rolesResponse.data || []);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Não foi possível carregar os dados. Verifique o backend.");
    } finally {
      setIsLoading(false);
    }
  };

  // Busca dados ao carregar a página
  useEffect(() => {
    // Apenas Admins podem buscar os dados desta página
    if (isAdmin) {
      fetchData();
    } else {
      // Se um não-admin (como Gestor) tentar aceder (pelo sidebar), mostra erro
      setError("Acesso negado: Apenas Administradores podem gerir usuários.");
      setIsLoading(false);
    }
  }, [isAdmin]); // Depende do 'isAdmin' para rodar

  // Handlers dos Modais
  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
  };

  const handleOpenDeleteModal = (user) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setDeletingUser(null);
    setIsDeleteModalOpen(false);
  };

  // Handler de sucesso (recarrega a lista)
  const handleActionSuccess = () => {
    fetchData();
    handleCloseAddModal();
    handleCloseEditModal();
    handleCloseDeleteModal();
  };

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Gestão de Funcionários" 
        onOpenProfile={onOpenProfile} // <-- 2. PASSA A PROP PARA O HEADER
      />
      <div className="p-6 md:p-10">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4"> 
            <h2 className="text-xl font-semibold text-gray-700">Gestão Global de Funcionários</h2>
            {isAdmin && (
              <button 
                onClick={handleOpenAddModal}
                className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Novo Usuário
              </button>
            )}
        </div>
          
        {error && (
          <div className="flex items-center justify-between p-4 mb-4 text-red-800 bg-red-100 rounded-md shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold text-red-800 hover:text-red-900 ml-4">X</button>
          </div>
        )}

        {/* Tabela de Usuários (só mostra se for Admin) */}
        {isAdmin && (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md"> 
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Username</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Cargo (Role)</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">A carregar usuários...</td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10">
                            <img 
                              className="w-10 h-10 rounded-full object-cover" 
                              src={u.foto_path ? `${API_BASE_URL}${u.foto_path}` : `https://placehold.co/40x40/E2E8F0/718096?text=${u.nome ? u.nome[0] : '?'}`} 
                              alt={u.nome} 
                              onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/40x40/E2E8F0/718096?text=${u.nome ? u.nome[0] : '?'}`}} 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{u.nome}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{u.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{u.telefone || 'N/D'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                            u.role === 'Administrador' ? 'text-red-800 bg-red-100' : 
                            u.role === 'Gestor' ? 'text-blue-800 bg-blue-100' : 
                            'text-gray-800 bg-gray-100' 
                          }`}>
                            {u.role || 'N/D'}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-2"> 
                        <button 
                          onClick={() => handleOpenEditModal(u)} 
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="Editar Usuário"
                        >
                          <Edit className="w-4 h-4 mr-1"/> Editar
                        </button>
                        <button 
                          onClick={() => handleOpenDeleteModal(u)} 
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                          title="Remover Usuário"
                        >
                          <Trash2 className="w-4 h-4 mr-1"/> Remover
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {isAddModalOpen && (
        <AdicionarUsuarioModal
            roles={roles}
            onClose={handleCloseAddModal}
            onActionSuccess={handleActionSuccess}
        />
      )}
      
      {isEditModalOpen && editingUser && (
         <EditarUsuarioModal
            user={editingUser}
            roles={roles}
            onClose={handleCloseEditModal}
            onActionSuccess={handleActionSuccess}
         />
      )}
      
      {isDeleteModalOpen && deletingUser && (
         <RemoverUsuarioModal
            user={deletingUser}
            onClose={handleCloseDeleteModal}
            onActionSuccess={handleActionSuccess}
         />
      )}
    </>
  );
}

// --- MODAL ADICIONAR USUÁRIO ---
function AdicionarUsuarioModal({ roles, onClose, onActionSuccess }) {
    const [username, setUsername] = useState('');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [telefone, setTelefone] = useState('');
    const [cpf, setCpf] = useState('');
    const [rg, setRg] = useState('');
    const [roleId, setRoleId] = useState(roles.find(r => r.name === 'Prestador')?.id || roles[0]?.id || '');
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        if (!username || !password || !email || !nome || !roleId) {
             setError("Username, Senha, Nome, Email e Cargo são obrigatórios.");
             setIsLoading(false);
             return;
        }

        try {
            const roleName = roles.find(r => r.id === parseInt(roleId))?.name || 'Prestador';
            
            const payload = {
                username,
                password,
                nome,
                email,
                telefone,
                cpf,
                rg,
                role: roleName 
            };
            
            await api.post('/users/', payload);
            onActionSuccess();

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível criar o usuário.");
            }
            console.error("Erro ao criar usuário:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" onClick={onClose}>
            <div className="relative w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Criar Novo Usuário</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nome Completo <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                    </div>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Senha <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                    </div>
                    
                    <hr className="my-4" />
                    
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Cargo (Role) <span className="text-red-500">*</span></label>
                            <select
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            >
                                <option value="" disabled>Selecione...</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="text"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                placeholder="(XX) XXXXX-XXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">CPF</label>
                            <input
                                type="text"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                placeholder="000.000.000-00"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">RG</label>
                        <input
                            type="text"
                            value={rg}
                            onChange={(e) => setRg(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                        />
                    </div>
                    
                    <div className="flex justify-end pt-6 space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                            {isLoading ? "A salvar..." : "Salvar Usuário"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MODAL EDITAR USUÁRIO ---
function EditarUsuarioModal({ user, roles, onClose, onActionSuccess }) {
    const [nome, setNome] = useState(user.nome || '');
    const [email, setEmail] = useState(user.email || '');
    const [telefone, setTelefone] = useState(user.telefone || '');
    const [roleId, setRoleId] = useState(roles.find(r => r.name === user.role)?.id || '');
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        if (!email || !nome || !roleId) {
             setError("Nome, Email e Cargo são obrigatórios.");
             setIsLoading(false);
             return;
        }

        try {
            // O backend (users.py -> update_user) só atualiza nome, email, tel.
            const updatePayload = { nome, email, telefone };
            await api.put(`/users/${user.id}`, updatePayload);
            
            // TODO: A atualização de Role precisa de um endpoint novo
            // (ex: PUT /api/users/<id>/role) ou da atualização do endpoint
            // PUT /api/users/<id> para aceitar 'role' ou 'role_id'.
            // Como desabilitámos o select, não há problema por agora.
            
            onActionSuccess();

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível atualizar o usuário.");
            }
            console.error("Erro ao atualizar usuário:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" onClick={onClose}>
            <div className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Editar Usuário</h3>
                <p className="text-sm text-gray-500 mb-6">Username: {user.username} (não pode ser alterado)</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome Completo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Cargo (Role) <span className="text-red-500">*</span></label>
                            <select
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                                required
                                // Desabilitado até o backend (users.py) ser atualizado para salvar
                                disabled={true} 
                            >
                                <option value="" disabled>Selecione...</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="text"
                                value={telefone}
                                onChange={(e) => setTelefone(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                placeholder="(XX) XXXXX-XXXX"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-6 space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                            {isLoading ? "A salvar..." : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MODAL REMOVER USUÁRIO ---
function RemoverUsuarioModal({ user, onClose, onActionSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await api.delete(`/users/${user.id}`);
            onActionSuccess();
        } catch (err) {
             if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível remover o usuário. Pode estar vinculado a obras ou logs.");
            }
            console.error("Erro ao remover usuário:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Remover Usuário</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Tem a certeza que deseja remover <span className="font-bold">{user.nome}</span> ({user.username})? 
                    Esta ação não pode ser desfeita.
                </p>
                {error && (
                    <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                        {error}
                    </div>
                )}
                 <div className="flex justify-end pt-4 space-x-3">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleDelete} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                        {isLoading ? "A remover..." : "Remover Usuário"}
                    </button>
                </div>
            </div>
         </div>
    );
}


// --- PÁGINA GLOBAL DE FINANCEIRO (ATUALIZADA COM FILTROS) ---
function GlobalFinanceiroPage({ user, onLogout, onOpenProfile }) {
  const [chartData, setChartData] = useState(null);
  const [kpis, setKpis] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- NOVO ESTADO PARA O FILTRO ---
  const [periodo, setPeriodo] = useState('mensal'); // 'mensal' ou 'semanal'
  // --------------------------------

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // ATUALIZADO: Busca os dados do gráfico E os KPIs em paralelo
        // E envia o parâmetro 'periodo' para a rota do fluxo de caixa
        const [cashflowResponse, kpiResponse] = await Promise.all([
            api.get('/reports/cashflow/', { params: { periodo } }), // <-- ENVIA O PERÍODO
            api.get('/reports/kpis/')
        ]);

        // Processa dados do Gráfico
        if (cashflowResponse.data && cashflowResponse.data.labels) {
            const updatedDatasets = cashflowResponse.data.datasets.map(dataset => {
                if (dataset.label.includes('Entradas')) {
                    return {
                        ...dataset,
                        backgroundColor: 'rgba(34, 197, 94, 0.2)', 
                        borderColor: 'rgba(34, 197, 94, 1)',     
                        fill: true, 
                        tension: 0.1 
                    };
                }
                if (dataset.label.includes('Saídas')) {
                     return {
                        ...dataset,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                        borderColor: 'rgba(239, 68, 68, 1)',     
                        fill: true,
                        tension: 0.1
                    };
                }
                return dataset;
            });
            
            setChartData({ ...cashflowResponse.data, datasets: updatedDatasets });
            
        } else {
            setChartData({ labels: [], datasets: [] });
        }
        
        // Processa dados dos KPIs
        if (kpiResponse.data) {
            const receitas = parseFloat(kpiResponse.data.total_receitas || 0);
            const custos = parseFloat(kpiResponse.data.total_custos || 0);
            kpiResponse.data.saldo_total = receitas - custos;
            setKpis(kpiResponse.data);
        }

      } catch (err) {
        console.error("Erro ao buscar dados do financeiro global:", err);
        if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error);
        } else {
            setError("Não foi possível carregar os dados financeiros.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [periodo]); // <-- ATUALIZADO: Roda de novo se o 'periodo' mudar

  // Opções do gráfico (Sem alterações)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, 
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Fluxo de Caixa ${periodo === 'mensal' ? 'Mensal' : 'Semanal'}`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) { label += ': '; }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value, index, ticks) {
            return formatCurrency(value);
          }
        }
      }
    }
  };
  
  // Componente de botão de filtro
  const FilterButton = ({ text, value }) => {
      const isActive = periodo === value;
      return (
          <button
              onClick={() => setPeriodo(value)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                  isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border'
              }`}
          >
              {text}
          </button>
      );
  };

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Financeiro Global" 
        onOpenProfile={onOpenProfile}
      />
      <div className="p-6 md:p-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Visão Geral Financeira</h2>
        
        {/* --- SEÇÃO DE KPIs (Sem alterações) --- */}
        {isLoading && !kpis && ( // Mostra o loading inicial dos KPIs
          <div className="text-center text-gray-500 py-10">A carregar indicadores...</div>
        )}
        
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {!isLoading && !error && kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KpiCard
              title="Saldo Total (Receitas - Custos)"
              value={formatCurrency(kpis.saldo_total)}
              icon={kpis.saldo_total >= 0 ? <DollarSign className="w-8 h-8 text-green-600" /> : <DollarSign className="w-8 h-8 text-red-600" />}
              description="Soma de todas as transações ativas."
              color={kpis.saldo_total >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <KpiCard
              title="Total de Receitas (Ativas)"
              value={formatCurrency(kpis.total_receitas)}
              icon={<ArrowUpCircle className="w-8 h-8 text-blue-600" />}
              description="Soma de todas as transações de 'entrada' não canceladas."
              color="text-blue-600"
            />
            <KpiCard
              title="Total de Custos (Ativos)"
              value={formatCurrency(kpis.total_custos)}
              icon={<ArrowDownCircle className="w-8 h-8 text-red-600" />}
              description="Soma de todas as transações de 'saída' não canceladas."
              color="text-red-600"
            />
          </div>
        )}
        
        {/* --- SEÇÃO DO GRÁFICO (ATUALIZADA) --- */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Fluxo de Caixa Consolidado</h3>
            
            {/* --- BOTÕES DE FILTRO (NOVOS) --- */}
            <div className="flex space-x-2">
                <FilterButton text="Semanal" value="semanal" />
                <FilterButton text="Mensal" value="mensal" />
            </div>
            {/* ------------------------------- */}
          </div>
          
          {isLoading && (
            <div className="flex justify-center items-center h-96 text-gray-500">A carregar dados do gráfico...</div>
          )}
          
          {!isLoading && !error && chartData && (
            <div className="relative h-96">
                {chartData.labels.length > 0 ? (
                    <Line options={chartOptions} data={chartData} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhum dado financeiro encontrado para o período selecionado.
                    </div>
                )}
            </div>
          )}
        </div>
        {/* --- FIM DA SEÇÃO DO GRÁFICO --- */}
        
      </div>
    </>
  );



  return (
    <>
      <Header user={user} onLogoutClick={onLogout} pageTitle="Financeiro Global" />
      <div className="p-6 md:p-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Visão Geral Financeira</h2>
        
        {/* --- SEÇÃO DE KPIs (NOVA) --- */}
        {isLoading && (
          <div className="text-center text-gray-500 py-10">A carregar indicadores...</div>
        )}
        
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {!isLoading && !error && kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KpiCard
              title="Saldo Total (Receitas - Custos)"
              value={formatCurrency(kpis.saldo_total)}
              icon={kpis.saldo_total >= 0 ? <DollarSign className="w-8 h-8 text-green-600" /> : <DollarSign className="w-8 h-8 text-red-600" />}
              description="Soma de todas as transações ativas."
              color={kpis.saldo_total >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <KpiCard
              title="Total de Receitas (Ativas)"
              value={formatCurrency(kpis.total_receitas)}
              icon={<ArrowUpCircle className="w-8 h-8 text-blue-600" />}
              description="Soma de todas as transações de 'entrada' não canceladas."
              color="text-blue-600"
            />
            <KpiCard
              title="Total de Custos (Ativos)"
              value={formatCurrency(kpis.total_custos)}
              icon={<ArrowDownCircle className="w-8 h-8 text-red-600" />}
              description="Soma de todas as transações de 'saída' não canceladas."
              color="text-red-600"
            />
          </div>
        )}
        {/* --- FIM DA SEÇÃO DE KPIs --- */}

        
        {/* --- SEÇÃO DO GRÁFICO (ATUALIZADA) --- */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Fluxo de Caixa Consolidado</h3>
          
          {isLoading && (
            <div className="flex justify-center items-center h-96 text-gray-500">A carregar dados do gráfico...</div>
          )}
          
          {/* O erro do gráfico será mostrado na seção principal de erros */}
          
          {!isLoading && !error && chartData && (
            <div className="relative h-96">
                {chartData.labels.length > 0 ? (
                    <Bar options={chartOptions} data={chartData} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhum dado financeiro encontrado para exibir no gráfico.
                    </div>
                )}
            </div>
          )}
        </div>
        {/* --- FIM DA SEÇÃO DO GRÁFICO --- */}
        
      </div>
    </>
  );

  return (
    <>
      <Header user={user} onLogoutClick={onLogout} pageTitle="Financeiro Global" />
      <div className="p-6 md:p-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Fluxo de Caixa Consolidado</h2>
        
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          {isLoading && (
            <div className="flex justify-center items-center h-96 text-gray-500">A carregar dados do gráfico...</div>
          )}
          
          {error && (
              <div className="flex justify-center items-center h-96">
                <div className="p-4 text-red-800 bg-red-100 rounded-md shadow-sm">
                  <span>{error}</span>
                </div>
              </div>
          )}

          {/* 2. Renderiza o gráfico de barras */}
          {!isLoading && !error && chartData && (
            <div className="relative h-96">
                {chartData.labels.length > 0 ? (
                    <Bar options={chartOptions} data={chartData} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Nenhum dado financeiro encontrado para exibir no gráfico.
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </>
  );

}

// --- PÁGINA GLOBAL DE INVENTÁRIO (ATUALIZADA) ---
function GlobalInventarioPage({ user, onLogout, onOpenProfile }) {
  const [stockItems, setStockItems] = useState([]);
  const [obraItems, setObraItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forçar o recarregamento

  // --- Estados para o Modal ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [obraParaAdicionar, setObraParaAdicionar] = useState(null); // ID da obra para o modal
  const [stockObraId, setStockObraId] = useState(null); // Guarda o ID do Estoque Central

  const canManage = user?.role !== 'Prestador';

  // Função para buscar os dados
  const fetchGlobalInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Busca os itens de inventário
      const response = await api.get('/reports/global-inventory/');
      setStockItems(response.data.stock_items || []);
      setObraItems(response.data.obra_items || []);
      
      // 2. Encontra o ID da Obra "Estoque Central" (para o botão 'Adicionar')
      // (Poderíamos buscar em /api/obras/ mas isso é mais eficiente)
      if (response.data.stock_items && response.data.stock_items.length > 0) {
        setStockObraId(response.data.stock_items[0].obra_id);
      } else {
        // Se o estoque está vazio, precisamos encontrar o ID da obra de estoque
        const obrasResponse = await api.get('/obras/');
        const stockObra = obrasResponse.data.find(obra => obra.is_stock_default === true);
        if (stockObra) {
          setStockObraId(stockObra.id);
        } else {
          console.error("Não foi possível encontrar a Obra 'Estoque Central'");
          setError("Erro de configuração: A obra 'Estoque Central' não foi encontrada.");
        }
      }
      
    } catch (err) {
      console.error("Erro ao buscar inventário global:", err);
      if (err.response && err.response.data && err.response.data.error) {
          setError(err.response.data.error);
      } else {
          setError("Não foi possível carregar o inventário consolidado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Busca os dados ao carregar a página ou ao forçar refresh
  useEffect(() => {
    fetchGlobalInventory();
  }, [refreshKey]); 

  // --- Handlers para o Modal ---
  const handleOpenAddStockModal = () => {
      if (stockObraId) {
          setObraParaAdicionar(stockObraId);
          setIsAddModalOpen(true);
      } else {
          setError("Erro: Não foi possível identificar o Estoque Central para adicionar itens.");
      }
  };
  
  const handleModalClose = () => {
      setIsAddModalOpen(false);
      setObraParaAdicionar(null);
  };
  
  const handleActionSuccess = () => {
      handleModalClose();
      setRefreshKey(prev => prev + 1); // Força o recarregamento dos dados
  };
  // -----------------------------

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Inventário Global" 
        onOpenProfile={onOpenProfile}
      />
      <div className="p-6 md:p-10">
        
        {isLoading && (
          <div className="text-center text-gray-500 py-10">A carregar inventário...</div>
        )}
        
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {/* --- SEÇÃO 1: ESTOQUE CENTRAL --- */}
        {!isLoading && !error && (
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold text-gray-700">Estoque Central da Empresa</h2>
                {canManage && (
                  <button
                      onClick={handleOpenAddStockModal}
                      disabled={!stockObraId} // Desabilita se o ID do estoque não foi encontrado
                      className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-400" 
                  >
                      <Plus className="w-5 h-5 mr-2" />
                      Adicionar ao Estoque Central
                  </button>
                )}
            </div>
             <InventarioTable items={stockItems} isLoading={isLoading} canManage={canManage} />
          </div>
        )}
        
        {/* --- SEÇÃO 2: INVENTÁRIO NAS OBRAS --- */}
         {!isLoading && !error && (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Inventário Consolidado nas Obras</h2>
             <InventarioTable items={obraItems} isLoading={isLoading} canManage={canManage} showObraName={true} />
          </div>
        )}

      </div>
      
      {/* --- Modal de Adicionar Item (Reutilizado) --- */}
      {isAddModalOpen && obraParaAdicionar && (
          <NovoItemInventarioModal
              obraId={obraParaAdicionar}
              onClose={handleModalClose}
              onItemAdicionado={handleActionSuccess}
          />
      )}
    </>
  );
}

// --- NOVO: Componente de Tabela de Inventário Reutilizável ---
// (Adicione esta nova função junto com seus outros componentes no App.jsx,
//  por exemplo, depois do ChecklistCard)
function InventarioTable({ items, isLoading, canManage, showObraName = false }) {
    
  // Helper para ícones (copiado da InventarioTab)
  const getItemIcon = (tipo) => {
      switch (tipo?.toLowerCase()) {
          case 'ferramenta': return <Wrench className="w-4 h-4 mr-2 text-orange-600" />; 
          case 'material': return <Box className="w-4 h-4 mr-2 text-blue-600" />;
          case 'epi': return <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />;
          default: return <Package className="w-4 h-4 mr-2 text-gray-500" />;
      }
  };
    
  // Define as colunas com base em showObraName
  const columns = [
      showObraName && { key: 'obra_nome', label: 'Obra' },
      { key: 'nome', label: 'Nome do Item' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'quantidade', label: 'Qtd.', align: 'center' },
      { key: 'status', label: 'Status' },
      { key: 'custo', label: 'Custo Unit.', align: 'right' }
  ].filter(Boolean); // Filtra valores falsos (como o showObraName)

  return (
       <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map(col => (
                           <th key={col.key} className={`px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase ${
                               col.align === 'right' ? 'text-right' : 
                               col.align === 'center' ? 'text-center' : 'text-left'
                           }`}>{col.label}</th> 
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} className="py-10 text-center text-gray-500">A carregar...</td>
                        </tr>
                    ) : items.length > 0 ? (
                        items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                {showObraName && (
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{item.obra_nome}</td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                                    <div className="text-xs text-gray-500">{item.descricao || ''}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className="inline-flex items-center text-sm text-gray-700">
                                         {getItemIcon(item.tipo)} {item.tipo || 'N/D'}
                                     </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-center">{item.quantidade}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                                        item.status_movimentacao === 'Em Estoque' ? 'bg-blue-100 text-blue-800' :
                                        item.status_movimentacao === 'Em Uso' ? 'bg-yellow-100 text-yellow-800' :
                                        item.status_movimentacao === 'Descartado' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {item.status_movimentacao}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-right">{formatCurrency(item.custo_unitario)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="py-10 text-center text-gray-500">
                                Nenhum item encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
  );
}

// --- PÁGINA GLOBAL MARKETPLACE (ATUALIZADA COM HEADER) ---
// --- PÁGINA GLOBAL MARKETPLACE (ATUALIZADA COM EDIÇÃO) ---
function GlobalMarketplacePage({ user }) {
  const [imoveis, setImoveis] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'detail'
  const [selectedImovel, setSelectedImovel] = useState(null);
  
  // Estados dos Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // <-- NOVO
  const [editingImovel, setEditingImovel] = useState(null);      // <-- NOVO
  
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const canManage = user?.role === 'Administrador' || user?.role === 'Gestor';

  useEffect(() => {
    setIsLoading(true);
    api.get('/marketplace/')
       .then(res => setImoveis(res.data))
       .catch(console.error)
       .finally(() => setIsLoading(false));
  }, [refresh]);

  const handleOpenDetail = (imovel) => {
    setSelectedImovel(imovel);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedImovel(null);
    setViewMode('list');
    setRefresh(prev => prev + 1);
  };

  // --- HANDLERS DE EDIÇÃO ---
  const handleEditClick = (imovel, e) => {
      if (e) e.stopPropagation(); // Evita abrir os detalhes ao clicar no editar
      setEditingImovel(imovel);
      setIsEditModalOpen(true);
  };

  const handleEditSuccess = (imovelAtualizado) => {
      setIsEditModalOpen(false);
      setEditingImovel(null);
      
      // Se estivermos vendo os detalhes, atualizamos o imóvel selecionado
      if (selectedImovel && selectedImovel.id === imovelAtualizado.id) {
          // Mantém as fotos antigas no estado local para não piscar, 
          // pois o PUT não retorna as fotos populadas da mesma forma que o GET detail
          setSelectedImovel(prev => ({ ...prev, ...imovelAtualizado }));
      }
      setRefresh(prev => prev + 1);
  };
  // --------------------------

  if (viewMode === 'detail' && selectedImovel) {
    return (
        <ImovelDetailPage 
            imovel={selectedImovel} 
            onBack={handleBackToList} 
            canManage={canManage} 
            onEdit={(imovel) => handleEditClick(imovel)} // Passa a função para a página de detalhes
        />
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Marketplace de Imóveis</h2>
        {canManage && (
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" /> Novo Imóvel
          </button>
        )}
      </div>

      {isLoading ? (
          <div className="text-center text-gray-500 py-10">A carregar imóveis...</div>
      ) : imoveis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imoveis.map(imovel => (
              <div 
                key={imovel.id} 
                onClick={() => handleOpenDetail(imovel)} 
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group border border-gray-100 relative"
              >
                {/* Botão de Editar no Card (Apenas Gestor/Admin) */}
                {canManage && (
                    <button 
                        onClick={(e) => handleEditClick(imovel, e)}
                        className="absolute top-2 left-2 z-10 p-2 bg-white/90 rounded-full text-blue-600 hover:text-blue-800 shadow-sm hover:bg-white transition-all"
                        title="Editar Imóvel"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}

                <div className="h-48 bg-gray-200 relative">
                  {imovel.foto_capa_url ? (
                    <img src={`${API_BASE_URL}${imovel.foto_capa_url}`} alt={imovel.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100">
                        <Image className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded shadow-sm ${
                    imovel.status === 'Vendida' ? 'bg-red-500 text-white' : 
                    imovel.status === 'Em negociação' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'
                  }`}>
                    {imovel.status}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-blue-600 truncate">{imovel.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">{imovel.endereco_completo}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-3">
                    <span className="font-medium text-gray-700">{imovel.metragem || 'N/D'}</span>
                    <span>{imovel.proprietario || 'N/D'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
      ) : (
          <div className="text-center text-gray-500 py-10 bg-white rounded-lg border border-dashed border-gray-300">
              Nenhum imóvel cadastrado no momento.
          </div>
      )}

      {/* Modal de Adicionar */}
      {isAddModalOpen && (
        <NovoImovelModal 
            onClose={() => setIsAddModalOpen(false)} 
            onSuccess={() => { setIsAddModalOpen(false); setRefresh(r => r + 1); }} 
        />
      )}

      {/* Modal de Editar (NOVO) */}
      {isEditModalOpen && editingImovel && (
        <EditarImovelModal 
            imovel={editingImovel}
            onClose={() => setIsEditModalOpen(false)} 
            onSuccess={handleEditSuccess} 
        />
      )}
    </div>
  );
}

// --- DETALHES DO IMÓVEL (ATUALIZADO COM BOTÃO EDITAR) ---
function ImovelDetailPage({ imovel, onBack, canManage, onEdit }) {
  const [galeria, setGaleria] = useState(imovel.fotos || []);
  const [status, setStatus] = useState(imovel.status);
  const [uploading, setUploading] = useState(false);
  
  // Atualiza a galeria se o imóvel mudar (ex: após edição)
  useEffect(() => {
      if (imovel.fotos) setGaleria(imovel.fotos);
      setStatus(imovel.status);
  }, [imovel]);

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('foto', file);
    
    try {
      const res = await api.post(`/marketplace/${imovel.id}/fotos/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGaleria([...galeria, res.data]);
    } catch (err) { 
        alert("Erro ao enviar foto.");
        console.error(err);
    } finally {
        setUploading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
      try {
          await api.put(`/marketplace/${imovel.id}/`, { status: newStatus });
          setStatus(newStatus);
      } catch (e) { 
          alert("Erro ao atualizar status"); 
      }
  };
  
  const handleRemoveImovel = async () => {
      if(!window.confirm("Tem certeza que deseja remover este imóvel? Esta ação não pode ser desfeita.")) return;
      try {
          await api.delete(`/marketplace/${imovel.id}/`);
          onBack();
      } catch (e) {
          alert("Erro ao remover imóvel.");
      }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 font-medium">
            <ArrowLeft className="w-5 h-5 mr-1" /> Voltar para a lista
          </button>
          {canManage && (
              <div className="flex space-x-2">
                  {/* Botão Editar na Página de Detalhes */}
                  <button onClick={() => onEdit(imovel)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50">
                      <Edit className="w-4 h-4 mr-1"/> Editar Dados
                  </button>
                  <button onClick={handleRemoveImovel} className="text-red-600 hover:text-red-800 text-sm flex items-center px-3 py-1 border border-red-200 rounded-md hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-1"/> Remover Imóvel
                  </button>
              </div>
          )}
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="relative h-64 md:h-96 bg-gray-200 group">
           {imovel.foto_capa_url ? (
                <img src={`${API_BASE_URL}${imovel.foto_capa_url}`} className="w-full h-full object-cover" alt="Capa" />
           ) : <div className="flex items-center justify-center h-full text-gray-400">Sem capa</div>}
           
           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-24">
               <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{imovel.titulo}</h1>
               <p className="text-white/90 text-lg flex items-center"><Building className="w-5 h-5 mr-2"/> {imovel.endereco_completo}</p>
           </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">Galeria de Fotos</h3>
                        {canManage && (
                            <label className={`cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Upload className="w-4 h-4 mr-2"/> 
                                {uploading ? 'Enviando...' : 'Adicionar Foto'}
                                <input type="file" className="hidden" onChange={handleUploadFoto} accept="image/*" disabled={uploading}/>
                            </label>
                        )}
                    </div>
                    
                    {galeria.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {galeria.map(foto => (
                                <div key={foto.id} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(`${API_BASE_URL}${foto.url}`, '_blank')}>
                                    <img src={`${API_BASE_URL}${foto.url}`} className="w-full h-full object-cover" alt="Galeria" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                            Nenhuma foto adicional na galeria.
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Observações</h3>
                    <div className="bg-gray-50 p-5 rounded-lg border text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {imovel.observacoes || "Sem observações registradas para este imóvel."}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-5 rounded-lg border shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg border-b pb-2">Detalhes do Imóvel</h4>
                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="block text-gray-500 mb-1">Status Atual</span>
                            {canManage ? (
                                <select 
                                    value={status} 
                                    onChange={(e) => handleUpdateStatus(e.target.value)} 
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2"
                                >
                                    <option>À venda</option>
                                    <option>Em negociação</option>
                                    <option>Vendida</option>
                                </select>
                            ) : (
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                                    status === 'Vendida' ? 'bg-red-100 text-red-800' : 
                                    status === 'Em negociação' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                }`}>{status}</span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-gray-500 mb-1">Metragem</span>
                                <span className="font-semibold text-gray-900">{imovel.metragem || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500 mb-1">CEP</span>
                                <span className="font-semibold text-gray-900">{imovel.cep || '-'}</span>
                            </div>
                        </div>
                        
                        <div>
                            <span className="block text-gray-500 mb-1">Proprietário</span>
                            <span className="font-semibold text-gray-900">{imovel.proprietario || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}



// --- MODAL EDITAR IMÓVEL (NOVO) ---
function EditarImovelModal({ imovel, onClose, onSuccess }) {
    const [titulo, setTitulo] = useState(imovel.titulo || '');
    const [endereco, setEndereco] = useState(imovel.endereco || '');
    const [bairro, setBairro] = useState(imovel.bairro || '');
    const [numero, setNumero] = useState(imovel.numero || '');
    const [cep, setCep] = useState(imovel.cep || '');
    const [metragem, setMetragem] = useState(imovel.metragem || '');
    const [proprietario, setProprietario] = useState(imovel.proprietario || '');
    const [observacoes, setObservacoes] = useState(imovel.observacoes || '');
    const [status, setStatus] = useState(imovel.status || 'À venda');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!titulo || !endereco) return alert("Preencha os campos obrigatórios.");
        
        setIsLoading(true);
        
        // Para edição, enviamos JSON, pois não estamos alterando a foto de capa aqui
        const payload = {
            titulo, endereco, bairro, numero, cep, metragem, proprietario, observacoes, status
        };

        try {
            const res = await api.put(`/marketplace/${imovel.id}/`, payload);
            onSuccess(res.data); // Passa o imóvel atualizado de volta
        } catch (err) {
            alert("Erro ao atualizar imóvel.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Editar Imóvel</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:text-gray-700" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título do Anúncio *</label>
                        <input required type="text" className="w-full border rounded-md p-2" value={titulo} onChange={e => setTitulo(e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua) *</label>
                            <input required type="text" className="w-full border rounded-md p-2" value={endereco} onChange={e => setEndereco(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <input type="text" className="w-full border rounded-md p-2" value={bairro} onChange={e => setBairro(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                            <input type="text" className="w-full border rounded-md p-2" value={numero} onChange={e => setNumero(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                            <input type="text" className="w-full border rounded-md p-2" value={cep} onChange={e => setCep(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metragem</label>
                            <input type="text" className="w-full border rounded-md p-2" value={metragem} onChange={e => setMetragem(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário</label>
                            <input type="text" className="w-full border rounded-md p-2" value={proprietario} onChange={e => setProprietario(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select className="w-full border rounded-md p-2" value={status} onChange={e => setStatus(e.target.value)}>
                                <option>À venda</option>
                                <option>Em negociação</option>
                                <option>Vendida</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea rows="3" className="w-full border rounded-md p-2" value={observacoes} onChange={e => setObservacoes(e.target.value)}></textarea>
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MODAL NOVO IMÓVEL ---
function NovoImovelModal({ onClose, onSuccess }) {
    const [titulo, setTitulo] = useState('');
    const [endereco, setEndereco] = useState('');
    const [bairro, setBairro] = useState('');
    const [numero, setNumero] = useState('');
    const [cep, setCep] = useState('');
    const [metragem, setMetragem] = useState('');
    const [proprietario, setProprietario] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [fotoCapa, setFotoCapa] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!titulo || !endereco) return alert("Preencha os campos obrigatórios.");
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('endereco', endereco);
        formData.append('bairro', bairro);
        formData.append('numero', numero);
        formData.append('cep', cep);
        formData.append('metragem', metragem);
        formData.append('proprietario', proprietario);
        formData.append('observacoes', observacoes);
        if (fotoCapa) formData.append('foto_capa', fotoCapa);

        try {
            await api.post('/marketplace/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            onSuccess();
        } catch (err) {
            alert("Erro ao cadastrar imóvel.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Cadastrar Novo Imóvel</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:text-gray-700" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título do Anúncio *</label>
                        <input required type="text" className="w-full border rounded-md p-2" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Casa moderna no centro" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua) *</label>
                            <input required type="text" className="w-full border rounded-md p-2" value={endereco} onChange={e => setEndereco(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <input type="text" className="w-full border rounded-md p-2" value={bairro} onChange={e => setBairro(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                            <input type="text" className="w-full border rounded-md p-2" value={numero} onChange={e => setNumero(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                            <input type="text" className="w-full border rounded-md p-2" value={cep} onChange={e => setCep(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metragem</label>
                            <input type="text" className="w-full border rounded-md p-2" value={metragem} onChange={e => setMetragem(e.target.value)} placeholder="Ex: 120m²" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário</label>
                        <input type="text" className="w-full border rounded-md p-2" value={proprietario} onChange={e => setProprietario(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea rows="3" className="w-full border rounded-md p-2" value={observacoes} onChange={e => setObservacoes(e.target.value)}></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Capa</label>
                        <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setFotoCapa(e.target.files[0])} />
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? 'Salvando...' : 'Cadastrar Imóvel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// --- PÁGINA GLOBAL DE CHECKLIST (ATUALIZADA) ---
function GlobalChecklistPage({ user, onLogout, onOpenProfile }) { // <-- 1. ACEITA A PROP
  const [myTasks, setMyTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGlobalChecklist = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Chama a nova rota do backend
        const response = await api.get('/reports/global-checklist/');
        setMyTasks(response.data.my_tasks || []);
        setOverdueTasks(response.data.overdue_tasks || []);
      } catch (err) {
        console.error("Erro ao buscar checklist global:", err);
        if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error);
        } else {
            setError("Não foi possível carregar as tarefas.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalChecklist();
  }, []); // Roda apenas uma vez

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Tarefas Globais" 
        onOpenProfile={onOpenProfile} // <-- 2. PASSA A PROP PARA O HEADER
      />
      <div className="p-6 md:p-10">
        
        {isLoading && (
          <div className="text-center text-gray-500 py-10">A carregar tarefas...</div>
        )}
        
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {/* 2. Renderiza as duas seções */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Seção Minhas Tarefas */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Minhas Tarefas Pendentes
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {myTasks.length > 0 ? (
                        myTasks.map(task => (
                            <ChecklistCard key={`my-${task.id}`} task={task} showObra={true} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Você não tem nenhuma tarefa pendente atribuída.</p>
                    )}
                </div>
            </div>

            {/* Seção Tarefas Atrasadas (Visão de Gestor) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-red-600" />
                    Todas as Tarefas Atrasadas
                </h3>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {overdueTasks.length > 0 ? (
                        overdueTasks.map(task => (
                            <ChecklistCard key={`overdue-${task.id}`} task={task} showObra={true} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa atrasada encontrada no sistema.</p>
                    )}
                </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

// --- NOVO: Componente ChecklistCard ---
function ChecklistCard({ task, showObra = false }) {
    const getStatusColor = (statusDisplay) => {
        switch (statusDisplay) {
            case 'Concluído': return 'text-green-600';
            case 'Atrasado': return 'text-red-600';
            case 'Em dia': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="p-3 border rounded-md hover:bg-gray-50">
            {/* Linha 1: Título e Obra (se showObra) */}
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-900 truncate" title={task.titulo}>
                    {task.titulo}
                </p>
                {showObra && (
                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                        {task.obra_nome}
                    </span>
                )}
            </div>
            
            {/* Linha 2: Descrição (se houver) */}
            {task.descricao && (
                <p className="text-xs text-gray-500 mt-0.5 truncate" title={task.descricao}>
                    {task.descricao}
                </p>
            )}
            
            {/* Linha 3: Status, Prazo e Responsável */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
                <span className={`font-semibold ${getStatusColor(task.status_display)}`}>
                    {task.status_display}
                </span>
                
                {task.prazo && (
                    <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Prazo: {formatDate(task.prazo)}
                    </span>
                )}
                
                {task.responsavel_nome && (
                    <span className="flex items-center" title={`Responsável: ${task.responsavel_nome}`}>
                        <User className="w-3 h-3 mr-1"/>
                        {task.responsavel_nome}
                    </span>
                )}
            </div>
        </div>
    );
}

// --- PÁGINA GLOBAL DE DOCUMENTOS (ATUALIZADA) ---
function GlobalDocumentosPage({ user, onLogout, onOpenProfile }) { // <-- 1. ACEITA A PROP
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Permissão para baixar/remover (reutilizada de DocumentosTab)
  const canManage = user?.role !== 'Prestador';

  // Função para buscar os dados
  const fetchGlobalDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/reports/global-documents/');
      setDocuments(response.data);
    } catch (err) {
      console.error("Erro ao buscar documentos globais:", err);
      if (err.response && err.response.data && err.response.data.error) {
          setError(err.response.data.error);
      } else {
          setError("Não foi possível carregar os documentos.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Busca os dados ao carregar a página
  useEffect(() => {
    fetchGlobalDocuments();
  }, []);

  // Lógica da Barra de Pesquisa (roda a cada tecla digitada)
  const filteredDocuments = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (term === '') {
      return documents; // Retorna tudo se a busca estiver vazia
    }
    return documents.filter(doc => 
      doc.filename.toLowerCase().includes(term) ||
      doc.obra_nome.toLowerCase().includes(term) ||
      doc.tipo.toLowerCase().includes(term) ||
      doc.uploaded_by_nome.toLowerCase().includes(term)
    );
  }, [searchTerm, documents]);

  // --- Handlers para Ações (copiados de DocumentosTab) ---
  const handleRemoveClick = async (docId) => {
    if (!window.confirm("Tem a certeza que deseja remover este documento? Esta ação não pode ser desfeita.")) {
        return;
    }
    setError(null);
    try {
        await api.delete(`/documentos/${docId}/`);
        fetchGlobalDocuments(); // Recarrega os dados após remover
    } catch (err) {
        console.error("Erro ao remover documento:", err);
        setError("Não foi possível remover o documento.");
    }
  };
  
  const handleDownloadClick = (filepathUrl) => {
      if (!filepathUrl) {
          setError("Este documento não tem um ficheiro associado.");
          return;
      }
      const fullUrl = `${API_BASE_URL}${filepathUrl}`;
      window.open(fullUrl, '_blank');
  };
  // ----------------------------------------------------

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Documentos Globais" 
        onOpenProfile={onOpenProfile} // <-- 2. PASSA A PROP PARA O HEADER
      />
      <div className="p-6 md:p-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Repositório Central de Documentos</h2>

        {/* --- BARRA DE PESQUISA (NOVA) --- */}
        <div className="mb-6 relative">
            <input
                type="text"
                placeholder="Pesquisar por nome do ficheiro, obra, tipo ou quem enviou..."
                className="w-full h-12 pl-10 pr-4 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute w-5 h-5 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
        </div>
        {/* ------------------------------- */}
        
        {isLoading && (
          <div className="text-center text-gray-500 py-10">A carregar documentos...</div>
        )}
        
        {error && (
            <div className="p-4 mb-6 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {/* --- Tabela de Documentos (ATUALIZADA) --- */}
        {!isLoading && !error && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Obra</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome do Ficheiro</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Enviado por</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDocuments.length > 0 ? (
                            filteredDocuments.map((doc) => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">{doc.obra_nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                           <FileIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                                           <div className="min-w-0">
                                               <div className="text-sm font-medium text-gray-900 truncate" title={doc.filename}>{doc.filename}</div>
                                               <div className="text-xs text-gray-500">{doc.tipo || 'Geral'}</div>
                                           </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{doc.uploaded_by_nome || 'N/D'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(doc.uploaded_at)}</td>
                                    
                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-2">
                                        <button
                                          onClick={() => handleDownloadClick(doc.filepath_url)}
                                          disabled={!canManage} // Prestador não pode baixar
                                          className="text-blue-600 hover:text-blue-900 inline-flex items-center disabled:text-gray-400 disabled:cursor-not-allowed"
                                          title={canManage ? "Baixar Documento" : "Download desativado para Prestadores"}
                                        >
                                          <Download className="w-4 h-4 mr-1"/> Baixar
                                        </button>
                                        {canManage && (
                                          <button
                                            onClick={() => handleRemoveClick(doc.id)}
                                            className="text-red-600 hover:text-red-900 inline-flex items-center"
                                            title="Remover Documento"
                                          >
                                            <Trash2 className="w-4 h-4 mr-1"/> Remover
                                          </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="py-10 text-center text-gray-500">
                                    {searchTerm ? 'Nenhum documento encontrado.' : 'Nenhum documento enviado para nenhuma obra.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </>
  );
}

// --- PÁGINA GLOBAL DE RELATÓRIOS (ATUALIZADA) ---
function GlobalRelatoriosPage({ user, onLogout, onOpenProfile }) { // <-- 1. ACEITA A PROP
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKpis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Chama a nova rota do backend
        const response = await api.get('/reports/kpis/');
        setKpis(response.data);
      } catch (err) {
        console.error("Erro ao buscar KPIs:", err);
        if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error);
        } else {
            setError("Não foi possível carregar os relatórios.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchKpis();
  }, []); // Roda apenas uma vez ao carregar a página

  return (
    <>
      <Header 
        user={user} 
        onLogoutClick={onLogout} 
        pageTitle="Relatórios e KPIs" 
        onOpenProfile={onOpenProfile} // <-- 2. PASSA A PROP PARA O HEADER
      />
      <div className="p-6 md:p-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">KPIs Globais</h2>
        
        {isLoading && (
          <div className="text-center text-gray-500 py-10">A calcular relatórios...</div>
        )}
        
        {error && (
            <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md shadow-sm">
              <span>{error}</span>
            </div>
        )}

        {/* 2. Renderiza os cartões de KPI */}
        {kpis && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Saldo Atual (Orçamento) */}
            <KpiCard
              title="Saldo Atual (Todas as Obras)"
              value={formatCurrency(kpis.total_orcamento_atual)}
              icon={<DollarSign className="w-8 h-8 text-green-600" />}
              description="Soma do 'Orçamento Atual' de todas as obras."
              color="text-green-600"
            />
            
            {/* Card 2: Custos Totais */}
            <KpiCard
              title="Custos Totais (Ativos)"
              value={formatCurrency(kpis.total_custos)}
              icon={<ArrowDownCircle className="w-8 h-8 text-red-600" />}
              description="Soma de todas as transações de 'saída' não canceladas."
              color="text-red-600"
            />
            
            {/* Card 3: Receitas Totais */}
             <KpiCard
              title="Receitas Totais (Ativas)"
              value={formatCurrency(kpis.total_receitas)}
              icon={<ArrowUpCircle className="w-8 h-8 text-blue-600" />}
              description="Soma de todas as transações de 'entrada' não canceladas."
              color="text-blue-600"
            />

            {/* Card 4: Obras Ativas */}
            <KpiCard
              title="Obras em Andamento"
              value={`${kpis.obras_ativas} / ${kpis.total_obras}`}
              icon={<Wrench className="w-8 h-8 text-yellow-600" />}
              description="Total de obras com status 'Em Andamento'."
              color="text-gray-900"
            />
            
            {/* Card 5: Obras Concluídas */}
            <KpiCard
              title="Obras Concluídas"
              value={kpis.obras_concluidas}
              icon={<CheckSquare className="w-8 h-8 text-gray-600" />}
              description="Total de obras com status 'Concluída'."
              color="text-gray-900"
            />
            
          </div>
        )}
      </div>
    </>
  );
}

// --- NOVO: Componente KpiCard ---
// (Adicione esta nova função junto com seus outros componentes no App.jsx)
function KpiCard({ title, value, icon, description, color }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 p-3 bg-gray-100 rounded-full">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
        </div>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-4">{description}</p>
      )}
    </div>
  );
}

// --- FIM DAS PÁGINAS GLOBAIS ---


// --- Tabela de Funcionários ---
function FuncionariosTab({ obraId, onFuncionarioAction, refreshKey, currentUser }) { 
  // ... (código existente, sem alterações) ...
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVinculo, setEditingVinculo] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [auditVinculo, setAuditVinculo] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'Administrador';
  // ATUALIZADO (Permissões)
  const canManage = currentUser?.role !== 'Prestador';

  useEffect(() => {
    const fetchFuncionarios = async () => {
      if (!obraId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/obras/${obraId}/funcionarios/`);
        setFuncionarios(response.data);
      } catch (err) {
        console.error("Erro ao buscar funcionários:", err);
        setError("Não foi possível carregar os funcionários.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFuncionarios();
  }, [obraId, refreshKey]); 

  const handleAddModalClose = () => setIsAddModalOpen(false);
  const handleEditModalClose = () => {
      setIsEditModalOpen(false);
      setEditingVinculo(null); 
  };
  const handleAuditModalClose = () => {
    setIsAuditModalOpen(false);
    setAuditVinculo(null);
  }

  const handleActionComplete = () => { 
    setIsAddModalOpen(false); 
    setIsEditModalOpen(false); 
    setEditingVinculo(null);
    onFuncionarioAction(); 
  };
  
  const handleEditClick = (vinculo) => {
    setEditingVinculo(vinculo); 
    setIsEditModalOpen(true);   
  };
  
  const handleAuditClick = (vinculo) => {
    setAuditVinculo(vinculo);
    setIsAuditModalOpen(true);
  }
  
  const handleRemoveClick = async (vinculoId) => {
    if (!window.confirm("Tem a certeza que deseja remover este funcionário da obra? Esta ação não pode ser desfeita.")) {
      return; 
    }
    setError(null); 
    try {
        await api.delete(`/obras/${obraId}/funcionarios/${vinculoId}/`);
        handleActionComplete(); 
    } catch (err) {
        console.error("Erro ao remover funcionário:", err);
        setError("Não foi possível remover o funcionário.");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3"> 
        <h3 className="text-lg font-semibold">Gestão de Funcionários</h3>
        {/* ATUALIZADO (Permissões) */}
        {canManage && (
          <button
            onClick={() => setIsAddModalOpen(true)} 
            className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Funcionário
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md flex justify-between items-center">
          <span>{error}</span> 
          <button onClick={() => setError(null)} className="font-bold ml-4">X</button>
        </div>
      )}

      {/* Tabela de Funcionários */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg"> 
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Cargo</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Salário</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status Pag.</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Prazo</th>
              {/* ATUALIZADO (Permissões) */}
              {canManage && (
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                {/* ATUALIZADO (Permissões) */}
                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">A carregar funcionários...</td>
              </tr>
            ) : funcionarios.length > 0 ? (
              funcionarios.map((vinculo) => (
                <tr key={vinculo.id_vinculo} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10">
                        <img 
                          className="w-10 h-10 rounded-full object-cover" 
                          src={vinculo.user.foto_path ? `${API_BASE_URL}${vinculo.user.foto_path}` : `https://placehold.co/40x40/E2E8F0/718096?text=${vinculo.user.nome ? vinculo.user.nome[0] : '?'}`} 
                          alt={vinculo.user.nome || 'Funcionário'} 
                          onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/40x40/E2E8F0/718096?text=${vinculo.user.nome ? vinculo.user.nome[0] : '?'}`}} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{vinculo.user.nome || 'Nome não informado'}</div>
                        <div className="text-sm text-gray-500">{vinculo.user.email || (vinculo.user.cpf ? `CPF: ${vinculo.user.cpf}` : 'Não cadastrado')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{vinculo.cargo || 'N/D'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatCurrency(vinculo.salario)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                      vinculo.status_pagamento === 'Pendente' ? 'text-yellow-800 bg-yellow-100' : 
                      vinculo.status_pagamento === 'Pago' ? 'text-green-800 bg-green-100' : 
                      vinculo.status_pagamento === 'Atrasado' ? 'text-red-800 bg-red-100' : 
                      vinculo.status_pagamento === 'Em dia' ? 'text-blue-800 bg-blue-100' : 
                      'text-gray-800 bg-gray-100' 
                    }`}>
                      {vinculo.status_pagamento}
                    </span>
                  </td>
                   <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                     {vinculo.prazo_limite ? formatDate(vinculo.prazo_limite) : 'N/D'}
                   </td>
                   {/* ATUALIZADO (Permissões) */}
                   {canManage && (
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-2"> 
                      <button 
                        onClick={() => handleEditClick(vinculo)} 
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        title="Editar Vínculo"
                      >
                        <Edit className="w-4 h-4 mr-1"/> Editar
                      </button>
                      <button 
                        onClick={() => handleRemoveClick(vinculo.id_vinculo)} 
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Remover Vínculo"
                      >
                        <Trash2 className="w-4 h-4 mr-1"/> Remover
                      </button>
                      {isAdmin && (
                          <button 
                              onClick={() => handleAuditClick(vinculo)} 
                              className="ml-2 text-gray-600 hover:text-gray-900 inline-flex items-center"
                              title="Ver Histórico de Atividades"
                          >
                              <History className="w-4 h-4 mr-1"/> Atividade
                          </button>
                      )}
                    </td>
                   )}
                </tr>
              ))
            ) : (
              <tr>
                {/* ATUALIZADO (Permissões) */}
                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">
                  Nenhum funcionário vinculado a esta obra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isAddModalOpen && (
        <AdicionarFuncionarioModal
          obraId={obraId}
          onClose={handleAddModalClose}
          onFuncionarioAdicionado={handleActionComplete} 
        />
      )}
      
      {isEditModalOpen && editingVinculo && (
        <EditarFuncionarioModal
            obraId={obraId}
            vinculo={editingVinculo} 
            onClose={handleEditModalClose}
            onFuncionarioAtualizado={handleActionComplete} 
        />
      )}

       {isAuditModalOpen && auditVinculo && (
            <FuncionarioAuditLogModal
                vinculo={auditVinculo}
                onClose={handleAuditModalClose}
            />
        )}
    </div>
  );
}

// --- Aba Financeiro ---
// --- Aba Financeiro (ATUALIZADA COM LÓGICA DE CANCELAMENTO) ---
function FinanceiroTab({ obraId, orcamentoInicial, onTransacaoAction, refreshKey, currentUser }) {
  const [transacoes, setTransacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- ESTADOS DOS MODAIS ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // <-- NOVO
  const [selectedTransacao, setSelectedTransacao] = useState(null); // <-- NOVO
  // -------------------------

  const canManage = currentUser?.role !== 'Prestador';

  useEffect(() => {
    const fetchTransacoes = async () => {
      if (!obraId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/obras/${obraId}/financeiro/`);
        // O backend agora ordena por status (ativos primeiro) e data
        setTransacoes(response.data);
      } catch (err) {
        console.error("Erro ao buscar transações financeiras:", err);
        setError("Não foi possível carregar as transações.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransacoes();
  }, [obraId, refreshKey]); 

  // ATUALIZADO: O saldo agora SÓ SOMA transações 'ativas'
  const saldoAtual = useMemo(() => {
      const orcamentoInicialNum = parseFloat(orcamentoInicial || 0);
      
      const totalTransacoesAtivas = transacoes
        .filter(t => t.status === 'ativo') // <-- SÓ CONSIDERA TRANSAÇÕES ATIVAS
        .reduce((sum, t) => {
            const valor = parseFloat(t.valor || 0);
            return !isNaN(valor) ? (t.tipo === 'entrada' ? sum + valor : sum - valor) : sum;
        }, 0);
        
      return isNaN(orcamentoInicialNum + totalTransacoesAtivas) ? 0.00 : orcamentoInicialNum + totalTransacoesAtivas;
  }, [orcamentoInicial, transacoes]); 

  // --- NOVOS HANDLERS ---
  const handleAddModalClose = () => setIsAddModalOpen(false);
  
  const handleCancelModalOpen = (transacao) => {
    setSelectedTransacao(transacao);
    setIsCancelModalOpen(true);
  };
  
  const handleCancelModalClose = () => {
    setSelectedTransacao(null);
    setIsCancelModalOpen(false);
  };

  const handleActionSuccess = () => { 
    setIsAddModalOpen(false); 
    setIsCancelModalOpen(false);
    setSelectedTransacao(null);
    onTransacaoAction(); // Recarrega a lista
  };
  // --------------------

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold">Controle Financeiro</h3>
         <div className="text-right">
             <span className="text-sm text-gray-500 block">Saldo Atual (Baseado em transações ativas)</span>
             <span className={`text-xl font-bold ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                 {formatCurrency(saldoAtual)}
             </span>
         </div>
         {canManage && (
          <button
            onClick={() => setIsAddModalOpen(true)} // <-- Atualizado
            className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700" 
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Transação
          </button>
         )}
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-4">X</button>
        </div>
      )}

      {/* Tabela de Transações (Atualizada) */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Descrição</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Valor</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Registado Por</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
              {canManage && (
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">A carregar transações...</td>
              </tr>
            ) : transacoes.length > 0 ? (
              transacoes.map((t) => (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.status === 'cancelado' ? 'bg-gray-100 opacity-60' : ''}`}>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(t.criado_em)}</td>
                  
                  <td className="px-6 py-4 text-sm text-gray-800">
                    <span className={t.status === 'cancelado' ? 'line-through' : ''}>
                      {t.descricao || '-'}
                    </span>
                    {/* Mostra o motivo se estiver cancelado */}
                    {t.status === 'cancelado' && (
                        <span className="block text-xs text-red-700 italic" title={t.motivo_cancelamento}>
                          Cancelado: {t.motivo_cancelamento}
                        </span>
                    )}
                  </td>
                  
                  <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap text-right ${
                     t.status === 'cancelado' ? 'text-gray-500 line-through' : (t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600')
                  }`}>
                    {t.tipo === 'entrada' ? '+' : '-'} {formatCurrency(t.valor)}
                  </td>
                  
                   <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{t.criado_por_nome || 'N/D'}</td>
                   
                   <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === 'ativo' ? (t.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800') : 
                        'bg-red-100 text-red-800'
                    }`}>
                      {t.status === 'ativo' ? (t.tipo === 'entrada' ? <ArrowUpCircle className="w-3 h-3 mr-1"/> : <ArrowDownCircle className="w-3 h-3 mr-1"/>) : 
                       <X className="w-3 h-3 mr-1"/>}
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  
                  {canManage && (
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleCancelModalOpen(t)}
                        disabled={t.status === 'cancelado'} // <-- Desabilita se já foi cancelado
                        className="text-red-600 hover:text-red-900 inline-flex items-center disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={t.status === 'cancelado' ? 'Transação já cancelada' : 'Cancelar Transação'}
                      >
                        <X className="w-4 h-4 mr-1"/> Cancelar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">
                  Nenhuma transação financeira registada para esta obra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <NovaTransacaoModal
          obraId={obraId}
          onClose={handleAddModalClose}
          onTransacaoAdicionada={handleActionSuccess} // <-- Atualizado
        />
      )}
      
      {/* --- NOVO MODAL DE CANCELAMENTO --- */}
      {isCancelModalOpen && selectedTransacao && (
        <CancelarTransacaoModal
            transacao={selectedTransacao}
            onClose={handleCancelModalClose}
            onTransacaoCancelada={handleActionSuccess}
        />
      )}
      
    </div>
  );
}


// --- NOVO: Modal Cancelar Transação ---
function CancelarTransacaoModal({ transacao, onClose, onTransacaoCancelada }) {
    const [motivo, setMotivo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        if (!motivo) {
            setError("O motivo do cancelamento é obrigatório.");
            setIsLoading(false);
            return;
        }

        try {
            // Chama a nova rota PUT de cancelamento
            await api.put(`/financeiro/${transacao.id}/cancelar/`, {
                motivo: motivo
            });
            onTransacaoCancelada();
        } catch (err) {
             if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível cancelar a transação.");
            }
            console.error("Erro ao cancelar transação:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Cancelar Transação</h3>
                <p className="text-sm text-gray-600 mb-2">
                    Transação: <span className="font-medium text-gray-900">{transacao.descricao}</span>
                </p>
                <p className="text-sm text-gray-600 mb-6">
                    Valor a ser revertido: 
                    <span className={`font-medium ${transacao.tipo === 'entrada' ? 'text-red-600' : 'text-green-600'}`}>
                        {transacao.tipo === 'entrada' ? ' (remover ' : ' (devolver '} {formatCurrency(transacao.valor)})
                    </span>
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="motivo_cancelamento" className="block text-sm font-medium text-gray-700">
                          Motivo do Cancelamento <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="motivo_cancelamento"
                          rows="3"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                          required
                          placeholder="Ex: Lançamento duplicado, valor incorreto, etc."
                        ></textarea>
                    </div>
                
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}
                    
                     <div className="flex justify-end pt-4 space-x-3">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-50">
                            Voltar
                        </button>
                        <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                            {isLoading ? "A cancelar..." : "Confirmar Cancelamento"}
                        </button>
                    </div>
                </form>
            </div>
         </div>
    );
}

// --- Aba Inventário (ATUALIZADA) ---
function InventarioTab({ obraId, onInventarioAction, refreshKey, currentUser }) {
    const [itens, setItens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- NOVO: Estados para os novos modais ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    // ------------------------------------------

    const canManage = currentUser?.role !== 'Prestador';

    useEffect(() => {
        const fetchItens = async () => {
            if (!obraId) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.get(`/obras/${obraId}/inventario/`);
                setItens(response.data);
            } catch (err) {
                console.error("Erro ao buscar itens de inventário:", err);
                setError("Não foi possível carregar o inventário.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchItens();
    }, [obraId, refreshKey]);

    // --- NOVOS: Handlers para os modais ---
    const handleAddModalClose = () => setIsAddModalOpen(false);
    
    const handleEditModalOpen = (item) => {
        setSelectedItem(item);
        setIsEditModalOpen(true);
    };
    const handleEditModalClose = () => {
        setSelectedItem(null);
        setIsEditModalOpen(false);
    };
    
    const handleDeleteModalOpen = (item) => {
        setSelectedItem(item);
        setIsDeleteModalOpen(true);
    };
    const handleDeleteModalClose = () => {
        setSelectedItem(null);
        setIsDeleteModalOpen(false);
    };

    const handleActionSuccess = () => {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedItem(null);
        onInventarioAction(); // Recarrega a lista
    };
    // --------------------------------------

    const getItemIcon = (tipo) => {
        switch (tipo?.toLowerCase()) {
            case 'ferramenta': return <Wrench className="w-4 h-4 mr-2 text-orange-600" />; 
            case 'material': return <Box className="w-4 h-4 mr-2 text-blue-600" />;
            case 'epi': return <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />;
            default: return <Package className="w-4 h-4 mr-2 text-gray-500" />;
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold">Gestão de Inventário</h3>
                {canManage && (
                  <button
                      onClick={() => setIsAddModalOpen(true)} // <-- ATUALIZADO
                      className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700" 
                  >
                      <Plus className="w-5 h-5 mr-2" />
                      Novo Item
                  </button>
                )}
            </div>

            {error && (
                <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold ml-4">X</button>
                </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Qtd.</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Custo Unit.</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                            {canManage && (
                              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">A carregar inventário...</td>
                            </tr>
                        ) : itens.length > 0 ? (
                            itens.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                                        <div className="text-xs text-gray-500">{item.descricao || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                         <span className="inline-flex items-center text-sm text-gray-700">
                                             {getItemIcon(item.tipo)} {item.tipo || 'N/D'}
                                         </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-center">{item.quantidade}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap text-right">{formatCurrency(item.custo_unitario)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                                            item.status_movimentacao === 'Em Estoque' ? 'bg-blue-100 text-blue-800' :
                                            item.status_movimentacao === 'Em Uso' ? 'bg-yellow-100 text-yellow-800' :
                                            item.status_movimentacao === 'Descartado' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {item.status_movimentacao}
                                        </span>
                                    </td>
                                    {canManage && (
                                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-2">
                                          {/* --- BOTÕES ATUALIZADOS --- */}
                                          <button 
                                              onClick={() => handleEditModalOpen(item)}
                                              className="text-blue-600 hover:text-blue-900 inline-flex items-center" 
                                              title="Editar Item"
                                          >
                                              <Edit className="w-4 h-4 mr-1"/> Editar
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteModalOpen(item)}
                                              className="text-red-600 hover:text-red-900 inline-flex items-center" 
                                              title="Remover Item"
                                          >
                                              <Trash2 className="w-4 h-4 mr-1"/> Remover
                                          </button>
                                          {/* ------------------------- */}
                                      </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={canManage ? 6 : 5} className="py-10 text-center text-gray-500">
                                    Nenhum item registado no inventário desta obra.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

             {/* --- MODAIS ATUALIZADOS --- */}
             {isAddModalOpen && (
                <NovoItemInventarioModal
                    obraId={obraId}
                    onClose={handleAddModalClose}
                    onItemAdicionado={handleActionSuccess} // <-- Atualizado
                />
            )}
            
            {isEditModalOpen && selectedItem && (
                <EditarItemInventarioModal
                    item={selectedItem}
                    onClose={handleEditModalClose}
                    onItemAtualizado={handleActionSuccess} // <-- Atualizado
                />
            )}
            
            {isDeleteModalOpen && selectedItem && (
                <RemoverItemInventarioModal
                    item={selectedItem}
                    onClose={handleDeleteModalClose}
                    onItemRemovido={handleActionSuccess} // <-- Atualizado
                />
            )}
            {/* ------------------------- */}
        </div>
    );
}

// --- NOVO: Modal Editar Item Inventário ---
function EditarItemInventarioModal({ item, onClose, onItemAtualizado }) {
    // Inicializa os estados com os valores do item selecionado
    const [tipo, setTipo] = useState(item.tipo || 'Material'); 
    const [nome, setNome] = useState(item.nome || '');
    const [descricao, setDescricao] = useState(item.descricao || '');
    const [quantidade, setQuantidade] = useState(String(item.quantidade || '1'));
    // Usa a string formatada para o estado
    const [custoUnitario, setCustoUnitario] = useState(formatCurrencyInput(item.custo_unitario) || ''); 
    const [statusMovimentacao, setStatusMovimentacao] = useState(item.status_movimentacao || 'Em Estoque'); 

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleCustoChange = (e) => {
        const formattedValue = formatCurrencyInput(e.target.value);
        setCustoUnitario(formattedValue);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const qtdInt = parseInt(quantidade, 10);

        if (!nome || !tipo) {
            setError("Nome e Tipo são obrigatórios.");
            setIsLoading(false);
            return;
        }
         if (isNaN(qtdInt) || qtdInt < 0) { // Permite 0
            setError("Quantidade deve ser um número positivo ou zero.");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                tipo: tipo,
                nome: nome,
                descricao: descricao,
                quantidade: qtdInt,
                custo_unitario: custoUnitario, // Envia a string formatada
                status_movimentacao: statusMovimentacao,
            };
            
            // Chama a nova rota PUT
            await api.put(`/inventario/${item.id}/`, payload);
            onItemAtualizado(); 

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível atualizar o item.");
            }
            console.error("Erro ao atualizar item de inventário:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4"
            onClick={onClose} 
        >
            <div 
                className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Editar Item do Inventário</h3>
                
                {/* O formulário é idêntico ao de "Novo Item", mas com os valores preenchidos */}
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit_item_nome" className="block text-sm font-medium text-gray-700">
                                Nome do Item <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="edit_item_nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="edit_item_tipo" className="block text-sm font-medium text-gray-700">
                                Tipo <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="edit_item_tipo"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                            >
                                <option value="Material">Material</option>
                                <option value="Ferramenta">Ferramenta</option>
                                <option value="EPI">EPI (Equip. Proteção Ind.)</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="edit_item_descricao" className="block text-sm font-medium text-gray-700">
                            Descrição (Opcional)
                        </label>
                        <textarea
                            id="edit_item_descricao"
                            rows="2"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                        ></textarea>
                     </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="edit_item_quantidade" className="block text-sm font-medium text-gray-700">
                                Quantidade <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="edit_item_quantidade"
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                required
                                min="0" // Pode editar para 0
                            />
                        </div>
                        <div>
                            <label htmlFor="edit_item_custo" className="block text-sm font-medium text-gray-700">
                                Custo Unitário (R$, Opcional)
                            </label>
                            <input
                                type="text" 
                                id="edit_item_custo"
                                value={custoUnitario} 
                                onChange={handleCustoChange} 
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="edit_item_status" className="block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            id="edit_item_status"
                            value={statusMovimentacao}
                            onChange={(e) => setStatusMovimentacao(e.target.value)}
                            className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md"
                        >
                            <option value="Em Estoque">Em Estoque</option>
                            <option value="Em Uso">Em Uso</option>
                            <option value="Descartado">Descartado</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300" 
                        >
                            {isLoading ? "A salvar..." : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- NOVO: Modal Remover Item Inventário ---
function RemoverItemInventarioModal({ item, onClose, onItemRemovido }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Chama a nova rota DELETE
            await api.delete(`/inventario/${item.id}/`);
            onItemRemovido();
        } catch (err) {
             if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível remover o item.");
            }
            console.error("Erro ao remover item:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Remover Item do Inventário</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Tem a certeza que deseja remover <span className="font-bold">{item.nome}</span>? 
                    Esta ação não pode ser desfeita.
                </p>
                {error && (
                    <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                        {error}
                    </div>
                )}
                 <div className="flex justify-end pt-4 space-x-3">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleDelete} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                        {isLoading ? "A remover..." : "Remover Item"}
                    </button>
                </div>
            </div>
         </div>
    );
}

// --- Aba Checklist ---
function ChecklistTab({ obraId, onChecklistAction, refreshKey, currentUser }) {
    // ... (código existente, sem alterações) ...
    const [itens, setItens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [usersList, setUsersList] = useState([]); 
    
    const [isAnexoModalOpen, setIsAnexoModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); 

    // ATUALIZADO (Permissões)
    const canManage = currentUser?.role !== 'Prestador';
    // (FASE 2: Implementar Lógica de "apenas itens vinculados" para Prestador)
    const isPrestador = currentUser?.role === 'Prestador';

    useEffect(() => {
        const fetchData = async () => {
            if (!obraId) return;
            setIsLoading(true);
            setError(null);
            try {
                // (FASE 2: O backend /obras/<id>/checklist/ precisa ser atualizado
                // para filtrar os itens se o usuário for 'Prestador')
                const checklistResponse = await api.get(`/obras/${obraId}/checklist/`);
                setItens(checklistResponse.data);
                
                // Só busca a lista de usuários se puder gerir (para o modal)
                if (canManage) {
                  const usersResponse = await api.get('/users/');
                  setUsersList(usersResponse.data.users || []);
                }
            } catch (err) {
                console.error("Erro ao buscar dados do checklist ou usuários:", err);
                setError("Não foi possível carregar os dados do checklist.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [obraId, refreshKey, canManage]); // Adiciona canManage

    const handleModalClose = () => setIsModalOpen(false);
    const handleAnexoModalClose = () => {
        setIsAnexoModalOpen(false);
        setSelectedItem(null); 
    };

    const handleItemSalvo = () => {
        setIsModalOpen(false);
        onChecklistAction(); 
    };
    
    const handleAnexoAction = () => {
        setIsAnexoModalOpen(false);
        setSelectedItem(null);
        onChecklistAction();
    }

    const handleToggleStatus = async (item) => {
        // (FASE 2: Idealmente, Prestador só pode marcar/desmarcar
        // tarefas atribuídas a ele. Por enquanto, permitimos.)
        const novoStatus = item.status === 'pendente' ? 'feito' : 'pendente';
        
        setItens(prevItens => 
            prevItens.map(i => i.id === item.id ? { ...i, status: novoStatus } : i)
        );

        try {
            await api.put(`/checklist/${item.id}/`, { status: novoStatus });
            onChecklistAction(); 
        } catch (err) {
            console.error("Erro ao atualizar status do item:", err);
            setError("Não foi possível atualizar o item. A reverter...");
            setItens(prevItens => 
                prevItens.map(i => i.id === item.id ? { ...i, status: item.status } : i) 
            );
        }
    };
    
    const handleRemoveItem = async (itemId) => {
         if (!window.confirm("Tem a certeza que deseja remover esta tarefa do checklist? Todos os anexos também serão removidos.")) {
            return;
        }
        try {
            await api.delete(`/checklist/${itemId}/`);
            onChecklistAction(); 
        } catch (err) {
             console.error("Erro ao remover item do checklist:", err);
             setError("Não foi possível remover o item.");
        }
    };
    
    const handleOpenAnexoModal = (item) => {
        setSelectedItem(item);
        setIsAnexoModalOpen(true);
    };
    
    const getStatusColor = (statusDisplay) => {
        switch (statusDisplay) {
            case 'Concluído': return 'text-green-600 bg-green-100 border-green-300';
            case 'Atrasado': return 'text-red-600 bg-red-100 border-red-300';
            case 'Em dia': return 'text-blue-600 bg-blue-100 border-blue-300';
            default: return 'text-gray-600 bg-gray-100 border-gray-300';
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold">Checklist da Obra</h3>
                {/* ATUALIZADO (Permissões) */}
                {canManage && (
                  <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700" 
                  >
                      <Plus className="w-5 h-5 mr-2" />
                      Nova Tarefa
                  </button>
                )}
            </div>

            {error && (
                <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold ml-4">X</button>
                </div>
            )}

            <div className="space-y-3">
                 {isLoading ? (
                    <p className="text-center text-gray-500 py-10">A carregar checklist...</p>
                 ) : itens.length > 0 ? (
                    itens.map((item) => (
                        <div 
                            key={item.id} 
                            className={`flex items-start sm:items-center p-4 bg-white rounded-lg shadow-sm border ${
                                item.status === 'feito' ? 'bg-green-50' : 'bg-white'
                            }`}
                        >
                            <input 
                                type="checkbox"
                                checked={item.status === 'feito'}
                                onChange={() => handleToggleStatus(item)}
                                // Prestador pode alterar status (conforme Regra 3)
                                // disabled={!canManage} 
                                className={`mt-1 sm:mt-0 flex-shrink-0 w-5 h-5 rounded ${
                                    item.status === 'feito' ? 'text-green-600' : 'text-blue-600'
                                } border-gray-300 focus:ring-blue-500`}
                                id={`item-${item.id}`}
                            />
                            <label htmlFor={`item-${item.id}`} className="ml-4 flex-1 cursor-pointer min-w-0"> 
                                <p className={`text-sm font-medium truncate ${
                                    item.status === 'feito' ? 'text-gray-500 line-through' : 'text-gray-900'
                                }`} title={item.titulo}>
                                    {item.titulo}
                                </p>
                                {item.descricao && <p className="text-xs text-gray-500 truncate" title={item.descricao}>{item.descricao}</p>}
                            </label>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 ml-4 text-xs sm:text-sm text-gray-500 flex-shrink-0">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(item.status_display)}`}>
                                    {item.status_display}
                                </span>
                                
                                {item.prazo && (
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        Prazo: {formatDate(item.prazo)}
                                    </span>
                                )}
                                
                                {item.responsavel_nome ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800" title={`Responsável: ${item.responsavel_nome}`}>
                                        <User className="w-3 h-3 mr-1.5"/>
                                        {item.responsavel_nome}
                                    </span>
                                ) : (
                                    <span className="text-xs italic hidden sm:inline">Sem responsável</span>
                                )}
                            </div>
                            
                            {/* Prestador pode ver anexos (Regra 3), mas não pode adicionar/remover */}
                            <div className="flex items-center ml-4 space-x-1 sm:space-x-2 flex-shrink-0">
                                <button
                                    onClick={() => handleOpenAnexoModal(item)}
                                    className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-100 rounded-full"
                                    title="Ver Anexos"
                                >
                                    <Paperclip className="w-4 h-4"/>
                                    {item.anexos && item.anexos.length > 0 && (
                                        <span className="ml-1 text-xs font-bold">({item.anexos.length})</span>
                                    )}
                                </button>
                                {/* ATUALIZADO (Permissões) */}
                                {canManage && (
                                  <button
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-full"
                                      title="Remover Tarefa"
                                  >
                                      <Trash2 className="w-4 h-4"/>
                                  </button>
                                )}
                            </div>
                        </div>
                    ))
                 ) : (
                    <p className="text-gray-500 text-center py-6">Nenhuma tarefa no checklist desta obra.</p>
                 )}
            </div>

            {isModalOpen && (
                <NovoChecklistItemModal
                    obraId={obraId}
                    usersList={usersList} 
                    onClose={handleModalClose}
                    onItemAdicionado={handleItemSalvo}
                />
            )}
            
            {isAnexoModalOpen && selectedItem && (
                 <AnexoChecklistModal
                    item={selectedItem}
                    onClose={handleAnexoModalClose}
                    onAnexoAction={handleItemSalvo}
                    canManage={canManage} // <-- Passa permissão para o modal
                 />
            )}
        </div>
    );
}

// --- Aba Documentos ---
function DocumentosTab({ obraId, onDocumentoAction, refreshKey, currentUser }) {
  // ... (código existente, sem alterações) ...
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ATUALIZADO (Permissões)
  const canManage = currentUser?.role !== 'Prestador';

  useEffect(() => {
    const fetchDocumentos = async () => {
      if (!obraId) return;
      setIsLoading(true);
      setError(null);
      try {
        // (FASE 2: Backend /obras/<id>/documentos/ precisa ser atualizado
        // para filtrar por visibilidade se for 'Prestador')
        const response = await api.get(`/obras/${obraId}/documentos/`);
        setDocumentos(response.data);
      } catch (err) {
        console.error("Erro ao buscar documentos:", err);
        setError("Não foi possível carregar os documentos.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentos();
  }, [obraId, refreshKey]);

  const handleModalClose = () => setIsModalOpen(false);

  const handleDocumentoSalvo = () => {
    setIsModalOpen(false);
    onDocumentoAction(); 
  };
  
  const handleRemoveClick = async (docId) => {
    if (!window.confirm("Tem a certeza que deseja remover este documento? Esta ação não pode ser desfeita.")) {
        return;
    }
    setError(null);
    try {
        await api.delete(`/documentos/${docId}/`);
        onDocumentoAction(); 
    } catch (err) {
        console.error("Erro ao remover documento:", err);
        setError("Não foi possível remover o documento.");
    }
  };
  
  const handleDownloadClick = (filepathUrl) => {
      // Regra 3: Prestador não pode baixar
      if (!canManage) {
          setError("Prestadores não têm permissão para baixar documentos.");
          return;
      }
      if (!filepathUrl) {
          setError("Este documento não tem um ficheiro associado.");
          return;
      }
      const fullUrl = `${API_BASE_URL}${filepathUrl}`;
      window.open(fullUrl, '_blank');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold">Gestão de Documentos</h3>
        {/* ATUALIZADO (Permissões) */}
        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center w-full sm:w-auto justify-center px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700" 
          >
            <Upload className="w-5 h-5 mr-2" />
            Enviar Documento
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-800 bg-red-100 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-4">X</button>
        </div>
      )}

      {/* Tabela de Documentos */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome do Ficheiro</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Enviado por</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="4" className="py-10 text-center text-gray-500">A carregar documentos...</td>
              </tr>
            ) : documentos.length > 0 ? (
              documentos.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                       <FileIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                       <div className="min-w-0">
                           <div className="text-sm font-medium text-gray-900 truncate" title={doc.filename}>{doc.filename}</div>
                           <div className="text-xs text-gray-500">{doc.tipo || 'Geral'}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{doc.uploaded_by_nome || 'N/D'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(doc.uploaded_at)}</td>
                  
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleDownloadClick(doc.filepath_url)}
                      // ATUALIZADO (Permissões)
                      disabled={!canManage}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={canManage ? "Baixar Documento" : "Download desativado para Prestadores"}
                    >
                      <Download className="w-4 h-4 mr-1"/> Baixar
                    </button>
                    {/* ATUALIZADO (Permissões) */}
                    {canManage && (
                      <button
                        onClick={() => handleRemoveClick(doc.id)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Remover Documento"
                      >
                        <Trash2 className="w-4 h-4 mr-1"/> Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-10 text-center text-gray-500">
                  Nenhum documento enviado para esta obra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <NovoDocumentoModal
          obraId={obraId}
          onClose={handleModalClose}
          onDocumentoAdicionado={handleDocumentoSalvo}
        />
      )}
    </div>
  );
}


// --- Modal Novo Item Inventário ---
function NovoItemInventarioModal({ obraId, onClose, onItemAdicionado }) {
    // ... (código existente, sem alterações) ...
    const [tipo, setTipo] = useState('Material'); 
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [quantidade, setQuantidade] = useState('1');
    const [custoUnitario, setCustoUnitario] = useState(''); 
    const [statusMovimentacao, setStatusMovimentacao] = useState('Em Estoque'); 

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleCustoChange = (e) => {
        const formattedValue = formatCurrencyInput(e.target.value);
        setCustoUnitario(formattedValue);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const custoNumerico = parseCurrency(custoUnitario);
        const qtdInt = parseInt(quantidade, 10);

        if (!nome || !tipo) {
            setError("Nome e Tipo são obrigatórios.");
            setIsLoading(false);
            return;
        }
         if (isNaN(qtdInt) || qtdInt <= 0) {
            setError("Quantidade deve ser um número positivo.");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                tipo: tipo,
                nome: nome,
                descricao: descricao,
                quantidade: qtdInt,
                custo_unitario: custoUnitario, 
                status_movimentacao: statusMovimentacao,
            };
            await api.post(`/obras/${obraId}/inventario/`, payload);
            onItemAdicionado(); 

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível registar o item. O backend está no ar?");
            }
            console.error("Erro ao criar item de inventário:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4"
            onClick={onClose} 
        >
            <div 
                className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Adicionar Item ao Inventário</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="item_nome" className="block text-sm font-medium text-gray-700">
                                Nome do Item <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="item_nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                placeholder="Ex: Martelo, Saco de Cimento"
                            />
                        </div>
                         <div>
                            <label htmlFor="item_tipo" className="block text-sm font-medium text-gray-700">
                                Tipo <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="item_tipo"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="Material">Material</option>
                                <option value="Ferramenta">Ferramenta</option>
                                <option value="EPI">EPI (Equip. Proteção Ind.)</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <label htmlFor="item_descricao" className="block text-sm font-medium text-gray-700">
                            Descrição (Opcional)
                        </label>
                        <textarea
                            id="item_descricao"
                            rows="2"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Marca, modelo, especificações"
                        ></textarea>
                     </div>
                     
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="item_quantidade" className="block text-sm font-medium text-gray-700">
                                Quantidade <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="item_quantidade"
                                value={quantidade}
                                onChange={(e) => setQuantidade(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                min="1"
                            />
                        </div>
                        <div>
                            <label htmlFor="item_custo" className="block text-sm font-medium text-gray-700">
                                Custo Unitário (R$, Opcional)
                            </label>
                            <input
                                type="text" 
                                id="item_custo"
                                value={custoUnitario} 
                                onChange={handleCustoChange} 
                                placeholder="ex: 50,00"
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                     
                    <div>
                        <label htmlFor="item_status" className="block text-sm font-medium text-gray-700">
                            Status Inicial
                        </label>
                        <select
                            id="item_status"
                            value={statusMovimentacao}
                            onChange={(e) => setStatusMovimentacao(e.target.value)}
                            className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Em Estoque">Em Estoque</option>
                            <option value="Em Uso">Em Uso</option>
                            <option value="Descartado">Descartado</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-300" 
                        >
                            {isLoading ? "A salvar..." : "Salvar Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



// --- Modal Novo Item Checklist ---
function NovoChecklistItemModal({ obraId, usersList, onClose, onItemAdicionado }) {
    // ... (código existente, sem alterações) ...
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [responsavelUserId, setResponsavelUserId] = useState(''); 
    const [prazo, setPrazo] = useState(''); 

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!titulo) {
            setError("O Título é obrigatório.");
            setIsLoading(false);
            return;
        }

        try {
            const payload = {
                titulo: titulo,
                descricao: descricao,
                responsavel_user_id: responsavelUserId ? parseInt(responsavelUserId, 10) : null,
                prazo: prazo || null, 
            };
            await api.post(`/obras/${obraId}/checklist/`, payload);
            onItemAdicionado(); 

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível registar a tarefa. O backend está no ar?");
            }
            console.error("Erro ao criar item de checklist:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose} 
        >
            <div 
                className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Nova Tarefa do Checklist</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="item_titulo" className="block text-sm font-medium text-gray-700">
                            Título da Tarefa <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="item_titulo"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            placeholder="Ex: Verificar fundações"
                        />
                    </div>

                    <div>
                        <label htmlFor="item_descricao_checklist" className="block text-sm font-medium text-gray-700">
                            Descrição (Opcional)
                        </label>
                        <textarea
                            id="item_descricao_checklist"
                            rows="2"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Detalhes específicos da tarefa"
                        ></textarea>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="item_responsavel" className="block text-sm font-medium text-gray-700">
                                Responsável (Opcional)
                            </label>
                            <select
                                id="item_responsavel"
                                value={responsavelUserId}
                                onChange={(e) => setResponsavelUserId(e.target.value)}
                                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Ninguém (tarefa geral)</option>
                                {usersList.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.nome} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="item_prazo" className="block text-sm font-medium text-gray-700">
                                Prazo (Opcional)
                            </label>
                            <input
                                type="date"
                                id="item_prazo"
                                value={prazo}
                                onChange={(e) => setPrazo(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-teal-300" 
                        >
                            {isLoading ? "A salvar..." : "Salvar Tarefa"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Modal de Anexos do Checklist ---
function AnexoChecklistModal({ item, onClose, onAnexoAction, canManage }) {
    // ... (código existente, sem alterações) ...
    const [fotoFile, setFotoFile] = useState(null);
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const anexos = item.anexos || [];
    const podeAdicionar = anexos.length < 4 && canManage; // <-- ATUALIZADO (Permissões)

    const handleFotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
             if (e.target.files[0].size > 5 * 1024 * 1024) { 
                setError('O ficheiro da foto é demasiado grande (máx 5MB).');
                setFotoFile(null);
                e.target.value = null; 
                return;
            }
            const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
            if (!allowedTypes.includes(e.target.files[0].type)) {
                setError('Tipo de ficheiro inválido. Use PNG, JPG ou GIF.');
                setFotoFile(null);
                e.target.value = null; 
                return;
            }
            setFotoFile(e.target.files[0]);
            setError(null);
        } else {
            setFotoFile(null);
        }
    };

    const handleUpload = async () => {
        if (!fotoFile || !canManage) return; // <-- Proteção extra
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('photo', fotoFile);

        try {
            await api.post(`/checklist/${item.id}/anexo/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFotoFile(null); 
            if (fileInputRef.current) fileInputRef.current.value = null; 
            onAnexoAction(); 
        } catch (err) {
            console.error("Erro ao enviar anexo:", err);
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível enviar o anexo.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemoveAnexo = async (anexoId) => {
         if (!canManage || !window.confirm("Tem a certeza que deseja remover este anexo?")) {
            return;
        }
        setIsLoading(true); 
        setError(null);
         try {
            await api.delete(`/checklist/anexo/${anexoId}/`);
            onAnexoAction(); 
        } catch (err) {
             console.error("Erro ao remover anexo:", err);
             setError("Não foi possível remover o anexo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Anexos da Tarefa</h3>
                <p className="text-sm text-gray-600 mb-6 truncate" title={item.titulo}>{item.titulo}</p>

                {error && (
                    <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                        {error}
                    </div>
                )}
                
                <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Imagens Anexadas ({anexos.length} / 4)</h4>
                    {anexos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {anexos.map(anexo => {
                                const imageUrl = `${API_BASE_URL}${anexo.url}`; 
                                return (
                                    <div key={anexo.id} className="relative group border rounded-md overflow-hidden">
                                        {/* Prestador pode clicar para ver, mas não pode baixar (conforme Regra 3) */}
                                        <a href={canManage ? imageUrl : '#'} 
                                           target={canManage ? "_blank" : "_self"} 
                                           rel="noopener noreferrer" 
                                           title={canManage ? `Ver anexo ${anexo.id}` : "Visualização de download desativada para Prestadores"}
                                           onClick={(e) => !canManage && e.preventDefault()}
                                           className={!canManage ? 'cursor-not-allowed' : ''}
                                        >
                                            <img 
                                                src={imageUrl} 
                                                alt={`Anexo ${anexo.id}`} 
                                                className="h-28 w-full object-cover"
                                                onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/150x100/E2E8F0/718096?text=Erro`}}
                                            />
                                        </a>
                                        {/* ATUALIZADO (Permissões) */}
                                        {canManage && (
                                          <button
                                              onClick={() => handleRemoveAnexo(anexo.id)}
                                              disabled={isLoading}
                                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                                              title="Remover Anexo"
                                          >
                                              <Trash2 className="w-3 h-3"/>
                                          </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <p className="text-sm text-gray-500 text-center py-4 border rounded-md">Nenhum anexo adicionado a esta tarefa.</p>
                    )}
                </div>

                {/* ATUALIZADO (Permissões) */}
                {podeAdicionar && (
                    <div className="pt-6 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Adicionar Nova Imagem (máx 5MB)</h4>
                        <div className="flex items-center space-x-3">
                             <input 
                              type="file" 
                              accept="image/png, image/jpeg, image/gif" 
                              ref={fileInputRef} 
                              onChange={handleFotoChange} 
                              className="hidden" 
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()} 
                              className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Upload className="w-4 h-4 inline-block mr-1"/> Escolher Ficheiro
                            </button>
                            {fotoFile && (
                                <span className="text-sm text-gray-700 truncate">{fotoFile.name}</span>
                            )}
                        </div>
                        {fotoFile && (
                             <button
                                type="button"
                                onClick={handleUpload}
                                disabled={isLoading}
                                className="mt-4 w-full flex justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                            >
                                {isLoading ? "A enviar..." : "Enviar Foto"}
                            </button>
                        )}
                    </div>
                )}
                
                {/* Se for Prestador e não puder adicionar */}
                {!canManage && anexos.length < 4 && (
                     <p className="text-xs text-gray-500 text-center pt-4 border-t">Apenas Gestores e Administradores podem adicionar anexos.</p>
                )}

                <div className="flex justify-end pt-6 mt-6 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Modal de Novo Documento ---
// --- Modal de Novo Documento (CORRIGIDO) ---
function NovoDocumentoModal({ obraId, onClose, onDocumentoAdicionado }) {
    const [documentoFile, setDocumentoFile] = useState(null);
    const [tipo, setTipo] = useState('Planta'); 
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { 
                setError('O ficheiro é demasiado grande (máx 10MB).');
                setDocumentoFile(null);
                e.target.value = null;
                return;
            }
            const allowedTypes = [
                'image/png', 'image/jpeg', 'image/gif',
                'application/pdf', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'application/msword', // .doc
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'image/vnd.dwg', 'image/vnd.dxf', 'application/acad', 'application/x-autocad',
                'application/dxf', 'application/x-dwg', 'application/dwg'
            ];
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'dwg', 'dxf'];

            if (!allowedExtensions.includes(fileExtension) && !allowedTypes.includes(file.type)) {
                setError('Tipo de ficheiro inválido. (Use PDF, DOCX, XLSX, DWG, PNG, JPG).');
                setDocumentoFile(null);
                e.target.value = null;
                return;
            }
            setDocumentoFile(file);
            setError(null);
        } else {
            setDocumentoFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!documentoFile) {
            setError("Por favor, selecione um ficheiro para enviar.");
            return;
        }
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        
        // --- AQUI ESTÁ A CORREÇÃO ---
        // Alterado de 'documento' para 'file' para bater com o backend
        formData.append('file', documentoFile); 
        // -------------------------
        
        formData.append('tipo', tipo);
        // O backend não espera 'visibilidade' neste endpoint, então removemos por agora.

        try {
            // A rota de upload é /obras/<id>/documentos/
            await api.post(`/obras/${obraId}/documentos/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onDocumentoAdicionado(); 
        } catch (err) {
            console.error("Erro ao enviar documento:", err);
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível enviar o documento.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Enviar Novo Documento</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="doc_tipo" className="block text-sm font-medium text-gray-700">
                            Tipo de Documento
                        </label>
                        <select
                            id="doc_tipo"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Planta">Planta</option>
                            <option value="Contrato">Contrato</option>
                            <option value="Nota Fiscal">Nota Fiscal</option>
                            <option value="Alvará">Alvará</option>
                            <option value="Foto">Foto</option>
                            <option value="Relatório">Relatório</option>
                            <option value="Geral">Geral</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Ficheiro (máx 10MB)
                        </label>
                        <input
                            type="file"
                            id="doc_file_input"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="w-full mt-1 text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer
                                       file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0
                                       file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700
                                       hover:file:bg-gray-200"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.dwg,.dxf"
                        />
                        {documentoFile && (
                            <p className="text-xs text-gray-500 mt-1">{documentoFile.name} ({formatFileSize(documentoFile.size)})</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !documentoFile}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                        >
                            {isLoading ? "A enviar..." : "Enviar Documento"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Modal Adicionar Funcionário ---
function AdicionarFuncionarioModal({ obraId, onClose, onFuncionarioAdicionado }) {
  // ... (código existente, sem alterações) ...
  const [cargo, setCargo] = useState('');
  const [salario, setSalario] = useState('');
  const [prazoLimite, setPrazoLimite] = useState(''); 
  const [statusPagamento, setStatusPagamento] = useState('À combinar'); 

  const [isCadastrado, setIsCadastrado] = useState(false); 
  
  const [userId, setUserId] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false); 
  
  const [nomeNaoCadastrado, setNomeNaoCadastrado] = useState('');
  const [cpfNaoCadastrado, setCpfNaoCadastrado] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const fileInputRef = useRef(null); 
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setError(null); 
      try {
        const response = await api.get('/users/'); 
        setUsersList(response.data.users || []); 
      } catch (err) {
        console.error("Erro ao buscar lista de usuários:", err);
        setError("Não foi possível carregar a lista de usuários do sistema.");
        setUsersList([]); 
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    if (isCadastrado) {
      fetchUsers();
    } else {
      setUsersList([]); 
      setUserId(''); 
      setNomeNaoCadastrado('');
      setCpfNaoCadastrado('');
      setFotoFile(null);
    }
  }, [isCadastrado]); 

  const handleSalarioChange = (e) => {
    const formattedValue = formatCurrencyInput(e.target.value);
    setSalario(formattedValue);
  };

  const handleFotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 5 * 1024 * 1024) {
          setError('O ficheiro da foto é demasiado grande (máx 5MB).');
          setFotoFile(null);
          e.target.value = null; 
          return;
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
      if (!allowedTypes.includes(e.target.files[0].type)) {
          setError('Tipo de ficheiro inválido. Use PNG, JPG ou GIF.');
          setFotoFile(null);
          e.target.value = null; 
          return;
      }
      setFotoFile(e.target.files[0]);
      setError(null); 
    } else {
      setFotoFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    const salarioNumerico = parseCurrency(salario);
    
    formData.append('is_cadastrado', String(isCadastrado)); 
    formData.append('cargo', cargo);
    formData.append('salario', String(salarioNumerico)); 
    if (prazoLimite) {
        formData.append('prazo_limite', prazoLimite);
    }
    formData.append('status_pagamento', statusPagamento);

    if (isCadastrado) {
      if (!userId) {
        setError("Por favor, selecione um usuário cadastrado.");
        setIsLoading(false);
        return;
      }
      formData.append('user_id', userId);
    } else { 
      if (!nomeNaoCadastrado) {
        setError("Por favor, insira o nome do funcionário.");
        setIsLoading(false);
        return;
      }
      formData.append('nome_nao_cadastrado', nomeNaoCadastrado);
      if (cpfNaoCadastrado) { 
          formData.append('cpf_nao_cadastrado', cpfNaoCadastrado);
      }
      if (fotoFile) {
        formData.append('photo', fotoFile);
      }
    }

    try {
      const response = await api.post(`/obras/${obraId}/funcionarios/`, formData);
      onFuncionarioAdicionado(); 
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Não foi possível adicionar o funcionário. Verifique os dados ou se o servidor está no ar.");
      }
      console.error("Erro ao adicionar funcionário:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Adicionar Funcionário à Obra</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}
          <div className="flex items-center p-3 bg-gray-50 rounded-md border">
             <input
                type="checkbox"
                id="isCadastrado"
                checked={isCadastrado}
                onChange={(e) => setIsCadastrado(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="isCadastrado" className="ml-3 block text-sm font-medium text-gray-900">
                Funcionário já cadastrado no sistema?
              </label>
              {isCadastrado ? <UserCheck className="w-5 h-5 ml-2 text-blue-600" /> : <UserPlus className="w-5 h-5 ml-2 text-gray-500" />}
          </div>
          {isCadastrado ? (
            <div>
              <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                Selecionar Usuário <span className="text-red-500">*</span>
              </label>
              <select
                id="user_id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoadingUsers}
              >
                <option value="" disabled>{isLoadingUsers ? "A carregar usuários..." : "Selecione um usuário"}</option>
                {usersList.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4 p-4 border border-gray-200 rounded-md">
              <div>
                <label htmlFor="nome_nao_cadastrado" className="block text-sm font-medium text-gray-700">
                  Nome do Funcionário <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nome_nao_cadastrado"
                  value={nomeNaoCadastrado}
                  onChange={(e) => setNomeNaoCadastrado(e.target.value)}
                  className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="cpf_nao_cadastrado" className="block text-sm font-medium text-gray-700">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  id="cpf_nao_cadastrado"
                  value={cpfNaoCadastrado}
                  onChange={(e) => setCpfNaoCadastrado(e.target.value)}
                  className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: 000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Foto (Opcional, máx 5MB)
                </label>
                <div className="mt-1 flex items-center space-x-3">
                    <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100 border">
                      {fotoFile ? (
                        <img 
                            src={URL.createObjectURL(fotoFile)} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                        />
                      ) : (
                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/gif" 
                      ref={fileInputRef} 
                      onChange={handleFotoChange} 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()} 
                      className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Upload className="w-4 h-4 inline-block mr-1"/> Escolher Foto
                    </button>
                    {fotoFile && (
                        <button type="button" onClick={() => {setFotoFile(null); fileInputRef.current.value=null;}} className="text-sm text-red-600 hover:text-red-800">Remover</button>
                    )}
                </div>
                {fotoFile && <span className="text-xs text-gray-500 mt-1 block">{fotoFile.name} ({ (fotoFile.size / 1024 / 1024).toFixed(2) } MB)</span>}
              </div>
            </div>
          )}
          <hr className="my-4" />
          <div>
            <label htmlFor="cargo" className="block text-sm font-medium text-gray-700">
              Cargo na Obra
            </label>
            <input
              type="text"
              id="cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Pedreiro, Eletricista"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
            <div>
              <label htmlFor="salario" className="block text-sm font-medium text-gray-700">
                Salário (R$)
              </label>
              <input
                type="text" 
                id="salario"
                value={salario} 
                onChange={handleSalarioChange} 
                placeholder="ex: 2.500,00"
                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="prazo_limite" className="block text-sm font-medium text-gray-700">
                Prazo Limite Pag. (Opcional)
              </label>
              <input
                type="date"
                id="prazo_limite"
                value={prazoLimite}
                onChange={(e) => setPrazoLimite(e.target.value)}
                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
              <label htmlFor="status_pagamento" className="block text-sm font-medium text-gray-700">
                Status Pagamento Inicial
              </label>
              <select
                id="status_pagamento"
                value={statusPagamento}
                onChange={(e) => setStatusPagamento(e.target.value)}
                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="À combinar">À combinar</option>
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
          </div>
          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingUsers}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? "A salvar..." : "Salvar Vínculo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Modal de Editar Funcionário ---
function EditarFuncionarioModal({ obraId, vinculo, onClose, onFuncionarioAtualizado }) {
  // ... (código existente, sem alterações) ...
  const prazoInicial = vinculo?.prazo_limite ? vinculo.prazo_limite.split('T')[0] : '';
  const [cargo, setCargo] = useState(vinculo?.cargo || '');
  const [salario, setSalario] = useState(vinculo ? formatCurrencyInput(String(vinculo.salario)) : '');
  const [prazoLimite, setPrazoLimite] = useState(prazoInicial); 
  const [statusPagamento, setStatusPagamento] = useState(vinculo?.status_pagamento === 'Atrasado' ? 'Pendente' : (vinculo?.status_pagamento || 'À combinar')); 
  
  const [nomeNaoCadastrado, setNomeNaoCadastrado] = useState(vinculo?.user?.nome || ''); 
  const [cpfNaoCadastrado, setCpfNaoCadastrado] = useState(vinculo?.user?.cpf || '');
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCadastrado = vinculo?.user?.id_user !== null;

  const handleSalarioChange = (e) => {
    const formattedValue = formatCurrencyInput(e.target.value);
    setSalario(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const salarioNumerico = parseCurrency(salario);
    
    const payload = {
      cargo: cargo,
      salario: salarioNumerico,
      prazo_limite: prazoLimite || null, 
      status_pagamento: statusPagamento,
    };

    if (!isCadastrado) {
        if (!nomeNaoCadastrado) {
            setError("O nome do funcionário é obrigatório.");
            setIsLoading(false);
            return;
        }
        payload.nome_nao_cadastrado = nomeNaoCadastrado;
        payload.cpf_nao_cadastrado = cpfNaoCadastrado;
    }
    
    try {
      const response = await api.put(`/obras/${obraId}/funcionarios/${vinculo.id_vinculo}/`, payload);
      onFuncionarioAtualizado(); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Não foi possível atualizar o funcionário. Verifique os dados ou se o servidor está no ar.");
      }
      console.error("Erro ao atualizar funcionário:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatISODateTimeForDisplay = (isoString) => formatDateTime(isoString); 

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Editar Vínculo do Funcionário</h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-md border">
            <p className="text-sm font-medium text-gray-900">
                Funcionário: <span className="font-bold">{vinculo.user.nome}</span> 
                {isCadastrado ? ` (${vinculo.user.email})` : (vinculo.user.cpf ? ` (CPF: ${vinculo.user.cpf})` : '')}
            </p>
            <p className="text-xs text-gray-500 mt-1">ID do Vínculo: {vinculo.id_vinculo}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}

          {!isCadastrado && (
            <div className="space-y-4 p-4 border border-gray-200 rounded-md">
              <div>
                <label htmlFor="edit_nome_nao_cadastrado" className="block text-sm font-medium text-gray-700">
                  Nome do Funcionário <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit_nome_nao_cadastrado"
                  value={nomeNaoCadastrado}
                  onChange={(e) => setNomeNaoCadastrado(e.target.value)}
                  className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit_cpf_nao_cadastrado" className="block text-sm font-medium text-gray-700">
                  CPF (Opcional)
                </label>
                <input
                  type="text"
                  id="edit_cpf_nao_cadastrado"
                  value={cpfNaoCadastrado}
                  onChange={(e) => setCpfNaoCadastrado(e.target.value)}
                  className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: 000.000.000-00"
                />
              </div>
            </div>
          )}

          <hr className="my-4" />

           <div>
            <label htmlFor="edit_cargo" className="block text-sm font-medium text-gray-700">
              Cargo na Obra
            </label>
            <input
              type="text"
              id="edit_cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ex: Pedreiro, Eletricista"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
            <div>
              <label htmlFor="edit_salario" className="block text-sm font-medium text-gray-700">
                Salário (R$)
              </label>
              <input
                type="text" 
                id="edit_salario"
                value={salario} 
                onChange={handleSalarioChange} 
                placeholder="ex: 2.500,00"
                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="edit_prazo_limite" className="block text-sm font-medium text-gray-700">
                Prazo Limite Pag. (Opcional)
              </label>
              <input
                type="date"
                id="edit_prazo_limite"
                value={prazoLimite} 
                onChange={(e) => setPrazoLimite(e.target.value)}
                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
              <label htmlFor="edit_status_pagamento" className="block text-sm font-medium text-gray-700">
                Status Pagamento
              </label>
              <select
                id="edit_status_pagamento"
                value={statusPagamento}
                onChange={(e) => setStatusPagamento(e.target.value)}
                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="À combinar">À combinar</option>
                <option value="Em dia">Em dia</option>
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
          </div>
          
          <div className="mt-6 pt-4 border-t text-sm text-gray-500 space-y-1">
              <p>Data de Cadastro: {formatISODateTimeForDisplay(vinculo.data_cadastro)}</p>
              <p>Última Atualização: {formatISODateTimeForDisplay(vinculo.ultima_atualizacao)}</p>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? "A salvar..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Modal de Auditoria ---
function FuncionarioAuditLogModal({ vinculo, onClose }) {
    // ... (código existente, sem alterações) ...
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!vinculo) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.get(`/obras/${vinculo.obra_id}/funcionarios/${vinculo.id_vinculo}/audit_logs/`);
                setLogs(response.data);
            } catch (err) {
                console.error("Erro ao buscar logs de auditoria:", err);
                setError("Não foi possível carregar o histórico.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, [vinculo]); 

    const formatLogDetails = (action, details) => {
        if (!details) return '-';
        
        try {
            let description = '';
            if (action === 'create') {
                description = 'Vínculo criado: ';
                description += Object.entries(details).map(([key, value]) => `• ${key}: ${value}`).join('; ');
            } else if (action === 'update') {
                description = 'Alterações: ';
                const changes = [];
                if (details.depois) {
                     Object.entries(details.depois).forEach(([key, value]) => {
                         const antesValue = details.antes && key in details.antes ? details.antes[key] : '(não registado)';
                         changes.push(`• "${key}" de "${antesValue}" para "${value}"`);
                     });
                }
                description += changes.join('; ');
                if (changes.length === 0) description += '(Nenhuma alteração registada nos detalhes)';
            } else if (action === 'delete') {
                description = 'Vínculo removido. Dados anteriores: ';
                if (details.removido && typeof details.removido === 'object') {
                     const filteredDetails = Object.entries(details.removido)
                        .filter(([key]) => !['user', 'id_vinculo', 'obra_id'].includes(key)); 
                     
                     if (filteredDetails.length > 0) {
                         description += filteredDetails.map(([key, value]) => `• ${key}: ${JSON.stringify(value)}`).join('; ');
                     } else {
                         description += '(Detalhes não disponíveis)';
                     }
                } else {
                    description += '(Detalhes não disponíveis)';
                }
            } else {
                 description = `Detalhes: ${JSON.stringify(details)}`; 
            }
            return description;
        } catch (e) {
            console.error("Erro ao formatar detalhes do log:", details, e);
            return "Erro ao formatar detalhes.";
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Histórico de Atividades - {vinculo.user.nome}
                </h3>

                {isLoading && <p className="text-gray-500 text-center py-4">A carregar histórico...</p>}
                {error && <p className="text-red-600 text-center py-4">{error}</p>}

                {!isLoading && !error && (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 border rounded-md"> 
                        {logs.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {logs.map(log => (
                                    <li key={log.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="font-semibold text-gray-800">
                                                {log.action_type === 'create' ? 'Criação' : 
                                                 log.action_type === 'update' ? 'Atualização' : 
                                                 log.action_type === 'delete' ? 'Remoção' : log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatDateTime(log.timestamp)} por {log.user_nome}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap break-words"> 
                                            {formatLogDetails(log.action_type, log.details)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-6">Nenhuma atividade registada para este funcionário.</p>
                        )}
                    </div>
                )}

                 <div className="flex justify-end pt-6 mt-6 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Modal Nova Transação (Financeiro) ---
function NovaTransacaoModal({ obraId, onClose, onTransacaoAdicionada }) {
  // ... (código existente, sem alterações) ...
  const [tipo, setTipo] = useState('saida');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(''); 
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleValorChange = (e) => {
    const formattedValue = formatCurrencyInput(e.target.value);
    setValor(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const valorNumerico = parseCurrency(valor);
    if (valorNumerico <= 0) {
      setError("O valor deve ser positivo.");
      setIsLoading(false);
      return;
    }
    if (!descricao) {
      setError("A descrição é obrigatória.");
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        tipo: tipo,
        descricao: descricao,
        valor: valorNumerico,
      };
      await api.post(`/obras/${obraId}/financeiro/`, payload);
      onTransacaoAdicionada(); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Não foi possível registar a transação. O backend está no ar?");
      }
      console.error("Erro ao criar transação:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} 
    >
      <div 
        className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" 
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Nova Transação Financeira</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}
          
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Transação
              </label>
              <div className="flex space-x-4">
                  <label className={`flex-1 p-3 border rounded-md cursor-pointer text-center ${tipo === 'saida' ? 'bg-red-50 border-red-300 text-red-900' : 'bg-white border-gray-300 text-gray-700'}`}>
                      <input 
                          type="radio" 
                          name="tipo" 
                          value="saida"
                          checked={tipo === 'saida'}
                          onChange={() => setTipo('saida')}
                          className="sr-only"
                      />
                      <ArrowDownCircle className="w-5 h-5 mb-1 inline-block" />
                      <span className="block text-sm font-semibold">Saída / Despesa</span>
                  </label>
                   <label className={`flex-1 p-3 border rounded-md cursor-pointer text-center ${tipo === 'entrada' ? 'bg-green-50 border-green-300 text-green-900' : 'bg-white border-gray-300 text-gray-700'}`}>
                      <input 
                          type="radio" 
                          name="tipo" 
                          value="entrada"
                          checked={tipo === 'entrada'}
                          onChange={() => setTipo('entrada')}
                          className="sr-only"
                      />
                      <ArrowUpCircle className="w-5 h-5 mb-1 inline-block" />
                      <span className="block text-sm font-semibold">Entrada / Receita</span>
                  </label>
              </div>
          </div>

          <div>
            <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="text" 
              id="valor"
              value={valor} 
              onChange={handleValorChange} 
              placeholder="ex: 1.500,00"
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
           <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descricao"
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Ex: Compra de cimento, Pagamento de mão de obra"
            ></textarea>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              {isLoading ? "A salvar..." : "Salvar Transação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Componente de Aba ---
function TabButton({ text, isActive, onClick }) {
  // ... (código existente, sem alterações) ...
  return (
    <button
      onClick={onClick}
      className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
        ${isActive 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      {text}
    </button>
  );
}


// --- COMPONENTES REUTILIZADOS ---

// --- Sidebar (ATUALIZADO com PERMISSÕES) ---
function Sidebar({ user, onLogoutClick, onNavigate, activeView }) { 

  const navItems = [
    { icon: <Home className="w-5 h-5" />, text: "Dashboard", id: 'dashboard' },
    { icon: <Package className="w-5 h-5" />, text: "Inventário", id: 'inventario' },
    { icon: <DollarSign className="w-5 h-5" />, text: "Financeiro", id: 'financeiro' },
    { icon: <CheckSquare className="w-5 h-5" />, text: "Checklist", id: "checklist" },
    { icon: <FileText className="w-5 h-5" />, text: "Documentos", id: "documentos" },
    { icon: <Users className="w-5 h-5" />, text: "Funcionários", id: "funcionarios" }, 
    { icon: <BarChart2 className="w-5 h-5" />, text: "Relatórios", id: "relatorios" },
    { icon: <ShoppingBag className="w-5 h-5" />, text: "Marketplace", id: "marketplace" }, // <-- ADICIONE ESTA LINHA
  ];

  // Regras de Permissão do Sidebar
  const visibleNavItems = navItems.filter(item => {
    const role = user?.role;
    
    if (role === 'Prestador') {
      // Regra 3: Prestador só vê Dashboard e Checklist
      return ['dashboard', 'checklist'].includes(item.id);
    }
    
    if (role === 'Gestor') {
      // Regra 2: Gestor vê tudo, menos "Funcionários" (gestão global)
      return item.id !== 'funcionarios';
    }
    
    // Regra 1: Admin vê tudo
    return true; 
  });

  return (
    <nav className="hidden md:block w-64 bg-white shadow-lg"> 
      <div className="flex items-center justify-center h-20 border-b">
        <Building className="w-8 h-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-800">G. Obras</span>
      </div>
      <ul className="py-4">
        {/* Mapeia apenas os itens visíveis */}
        {visibleNavItems.map((item) => (
           <NavItem 
             key={item.id}
             icon={item.icon} 
             text={item.text} 
             active={item.id === activeView} 
             onClick={() => onNavigate(item.id)} 
           />
        ))}
      </ul>
      
      <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={onLogoutClick}
            className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" /> 
            Sair
          </button>
      </div>
    </nav>
  );
}

// --- Header ---
// --- Header (ATUALIZADO com botão de Perfil) ---
function Header({ user, onLogoutClick, pageTitle, showBackButton = false, onBackClick, onOpenProfile }) {
  return (
    <header className="flex items-center justify-between h-20 px-6 md:px-10 bg-white border-b"> 
      <div className="flex items-center space-x-2 md:space-x-4">
        {showBackButton && (
          <button 
            onClick={onBackClick}
            className="p-2 text-gray-600 rounded-full hover:bg-gray-100"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate">{pageTitle}</h1> 
      </div>
      <div className="flex items-center space-x-3 md:space-x-4">
        
        {/* --- NOVO BOTÃO DE PERFIL --- */}
        <button
          onClick={onOpenProfile}
          className="p-2 text-gray-600 rounded-full hover:bg-gray-100"
          title="Alterar minhas credenciais"
        >
          <Settings className="w-5 h-5" />
        </button>
        {/* ------------------------- */}

        <span className="hidden sm:inline text-gray-600"> 
          Olá, <span className="font-semibold">{user?.nome || 'Usuário'}</span>
        </span>
         <button
          onClick={onLogoutClick}
          className="flex items-center md:hidden px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
          title="Sair"
        >
          <LogOut className="w-4 h-4" /> 
        </button>
      </div>
    </header>
  );
}



// --- ObrasTable ---
// --- ObrasTable (ATUALIZADA) ---
// --- ObrasTable (ATUALIZADA com botão de Atividades) ---
function ObrasTable({ obras, isLoading, onVerDetalhes, onEdit, onDelete, canManage, onAudit }) { // <-- 1. Adiciona onAudit
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md"> 
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Nome da Obra</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Proprietário</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Orçamento Atual</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan="5" className="py-10 text-center text-gray-500">A carregar obras...</td>
            </tr>
          ) : obras.length > 0 ? (
            obras.map((obra) => (
              <tr key={obra.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{obra.nome}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                    obra.status === 'Em Andamento' ? 'text-blue-800 bg-blue-100' : 
                    obra.status === 'Concluída' ? 'text-green-800 bg-green-100' : 'text-gray-800 bg-gray-100'
                  }`}>
                    {obra.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{obra.proprietario || 'N/D'}</td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                  {formatCurrency(obra.orcamento_atual)}
                </td>
                
                {/* --- COLUNA DE AÇÕES ATUALIZADA --- */}
                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap space-x-3">
                  <button 
                    onClick={() => onVerDetalhes(obra.id)}
                    className="flex items-center text-blue-600 hover:text-blue-900 inline-flex"
                    title="Ver Detalhes"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" /> Detalhes
                  </button>
                  
                  {canManage && (
                    <>
                      <button 
                        onClick={() => onEdit(obra)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        title="Editar Obra"
                      >
                        <Edit className="w-4 h-4"/>
                      </button>
                      
                      <button 
                        onClick={() => onDelete(obra)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                        title="Remover Obra"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>

                      {/* --- 2. NOVO BOTÃO DE ATIVIDADES --- */}
                      <button 
                        onClick={() => onAudit(obra)} 
                        className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                        title="Ver Histórico de Atividades"
                      >
                        <History className="w-4 h-4"/>
                      </button>
                      {/* ---------------------------------- */}
                    </>
                  )}
                </td>
                {/* ------------------------------- */}
                
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="py-10 text-center text-gray-500">
                Nenhuma obra encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- NOVO: Modal de Mudança de Senha Obrigatória ---
function ForcePasswordChangeModal({ user, onSuccess, onLogout }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validação do Frontend
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Todos os campos são obrigatórios.");
            setIsLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("A nova senha e a confirmação não são iguais.");
            setIsLoading(false);
            return;
        }
        if (newPassword.length < 6) {
             setError("A nova senha deve ter pelo menos 6 caracteres.");
             setIsLoading(false);
             return;
        }

        try {
            // Chama a nova rota do backend
            const response = await api.put('/auth/first-password-change', {
                current_password: currentPassword,
                new_password: newPassword
            });
            
            // Se der certo, o backend retorna o usuário atualizado
            onSuccess(response.data); 

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível atualizar a senha.");
            }
            console.error("Erro ao forçar mudança de senha:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                
                <div className="flex flex-col items-center">
                    <ShieldCheck className="w-10 h-10 text-blue-600" />
                    <h2 className="mt-4 text-2xl font-bold text-center text-gray-900">
                        Alteração de Senha Obrigatória
                    </h2>
                    <p className="mt-2 text-sm text-center text-gray-600">
                        Olá, <span className="font-semibold">{user.nome}</span>. Por segurança, você precisa definir uma nova senha para acessar o sistema.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha Atual (Temporária) <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nova Senha <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            placeholder="(Mínimo 6 caracteres)"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                         <button
                            type="button"
                            onClick={onLogout}
                            className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            Sair (Logout)
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {isLoading ? "A salvar..." : "Definir Nova Senha"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- NOVO: Modal de Atualizar Credenciais ---
function AtualizarCredenciaisModal({ user, onClose, onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newUsername, setNewUsername] = useState(user.username || ''); // Começa com o username atual
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // 1. Validação do Frontend
        if (!currentPassword) {
            setError("A senha atual é obrigatória.");
            setIsLoading(false);
            return;
        }
        
        const payload = { current_password: currentPassword };
        
        // 2. Adiciona username se ele mudou
        if (newUsername && newUsername !== user.username) {
            payload.new_username = newUsername;
        }
        
        // 3. Adiciona senha se ela foi preenchida
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError("A nova senha e a confirmação não são iguais.");
                setIsLoading(false);
                return;
            }
            if (newPassword.length < 6) {
                 setError("A nova senha deve ter pelo menos 6 caracteres.");
                 setIsLoading(false);
                 return;
            }
            payload.new_password = newPassword;
        }
        
        // 4. Verifica se há algo para mudar
        if (!payload.new_username && !payload.new_password) {
            setError("Nenhuma alteração foi fornecida (novo username ou nova senha).");
            setIsLoading(false);
            return;
        }

        try {
            // 5. Envia para o Backend
            await api.put('/auth/update-credentials', payload);
            onSuccess(); // Chama a função de sucesso (que vai fazer logout)

        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível atualizar as credenciais.");
            }
            console.error("Erro ao atualizar credenciais:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4"
            onClick={onClose} 
        >
            <div 
                className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-semibold text-gray-900 mb-6">Alterar Minhas Credenciais</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                            {error}
                        </div>
                    )}
                    
                    <p className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                        Por segurança, você deve fornecer sua <b>senha atual</b> para fazer qualquer alteração.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Senha Atual <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                    
                    <hr className="my-4" />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Novo Username</label>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                                placeholder="(Mínimo 6 caracteres)"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {isLoading ? "A salvar..." : "Salvar Alterações"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- NOVO: Modal de Auditoria da Obra ---
function ObraAuditLogModal({ obra, onClose }) {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!obra) return;
            setIsLoading(true);
            setError(null);
            try {
                // Chama a nova rota de log de auditoria da obra
                const response = await api.get(`/obras/${obra.id}/audit_logs/`);
                setLogs(response.data);
            } catch (err) {
                console.error("Erro ao buscar logs de auditoria:", err);
                setError("Não foi possível carregar o histórico.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, [obra]); // Roda sempre que a 'obra' mudar

    // Helper para formatar o JSON de 'details' de forma legível
    const formatLogDetails = (action, details) => {
        if (!details) return '-';
        
        try {
            let description = '';
            if (action === 'create') {
                description = 'Obra criada. ';
                description += `Nome: ${details.nome}`;
            } else if (action === 'update') {
                description = 'Alterações: \n';
                const changes = [];
                if (details.depois) {
                     Object.entries(details.depois).forEach(([key, value]) => {
                         const antesValue = details.antes && key in details.antes ? details.antes[key] : '(não registado)';
                         
                         if(key === 'motivo_alteracao') {
                            changes.push(`• Motivo: "${value}"`);
                         } else {
                            changes.push(`• "${key}" de "${antesValue}" para "${value}"`);
                         }
                     });
                }
                description += changes.join('\n');
                if (changes.length === 0) description = '(Nenhuma alteração registada nos detalhes)';
            } else if (action === 'delete') {
                description = 'Obra removida.';
            } else {
                 description = `Detalhes: ${JSON.stringify(details)}`; 
            }
            return description;
        } catch (e) {
            console.error("Erro ao formatar detalhes do log:", details, e);
            return "Erro ao formatar detalhes.";
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4" 
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl my-8" 
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                    Histórico de Atividades - {obra.nome}
                </h3>

                {isLoading && <p className="text-gray-500 text-center py-4">A carregar histórico...</p>}
                {error && <p className="text-red-600 text-center py-4">{error}</p>}

                {!isLoading && !error && (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 border rounded-md"> 
                        {logs.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {logs.map(log => (
                                    <li key={log.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <span className="font-semibold text-gray-800">
                                                {log.action_type === 'create' ? 'Criação' : 
                                                 log.action_type === 'update' ? 'Atualização' : 
                                                 log.action_type === 'delete' ? 'Remoção' : log.action_type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatDateTime(log.timestamp)} por {log.user_nome}
                                            </span>
                                        </div>
                                        {/* 'whitespace-pre-wrap' é importante para o '\n' funcionar */}
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap break-words"> 
                                            {formatLogDetails(log.action_type, log.details)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-6">Nenhuma atividade registada para esta obra.</p>
                        )}
                    </div>
                )}

                 <div className="flex justify-end pt-6 mt-6 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- NOVO: Modal Editar Obra ---
// --- ATUALIZADO: Modal Editar Obra (com Motivo) ---
function EditarObraModal({ obra, onClose, onObraUpdated }) {
  const [nome, setNome] = useState(obra.nome || '');
  const [endereco, setEndereco] = useState(obra.endereco || '');
  const [proprietario, setProprietario] = useState(obra.proprietario || '');
  const [status, setStatus] = useState(obra.status || 'Em Andamento');
  
  // --- NOVOS ESTADOS PARA O MOTIVO ---
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [statusMudou, setStatusMudou] = useState(false);
  // ------------------------------------
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Valores de orçamento (apenas para exibição)
  const orcamentoInicial = formatCurrency(obra.orcamento_inicial);
  const orcamentoAtual = formatCurrency(obra.orcamento_atual);

  // --- NOVO: Monitora a mudança de status ---
  useEffect(() => {
    // Verifica se o status atual é diferente do status original da obra
    if (status !== obra.status) {
      setStatusMudou(true);
    } else {
      setStatusMudou(false);
      setMotivoAlteracao(''); // Limpa o motivo se voltar ao status original
    }
  }, [status, obra.status]);
  // ----------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!nome) {
      setError("O nome da obra é obrigatório.");
      setIsLoading(false);
      return;
    }
    
    // --- NOVO: Validação do Motivo ---
    if (statusMudou && !motivoAlteracao) {
      setError("O 'Motivo da Alteração' é obrigatório ao mudar o status.");
      setIsLoading(false);
      return;
    }
    // ---------------------------------

    try {
      const payload = { 
        nome: nome,
        endereco: endereco,
        proprietario: proprietario,
        status: status, 
        motivo_alteracao: motivoAlteracao // Envia o motivo (mesmo se vazio, se o status não mudou)
      };
      
      await api.put(`/obras/${obra.id}/`, payload);
      onObraUpdated(); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Não foi possível atualizar a obra.");
      }
      console.error("Erro ao atualizar obra:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4"
      onClick={onClose} 
    >
      <div 
        className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl my-8"
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Editar Obra</h3>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit_nome" className="block text-sm font-medium text-gray-700">
              Nome da Obra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="edit_nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="edit_endereco" className="block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              type="text"
              id="edit_endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="edit_proprietario" className="block text-sm font-medium text-gray-700">
              Proprietário
            </label>
            <input
              type="text"
              id="edit_proprietario"
              value={proprietario}
              onChange={(e) => setProprietario(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label htmlFor="edit_status" className="block text-sm font-medium text-gray-700">
              Status da Obra
            </label>
            <select
                id="edit_status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 mt-1 pl-3 pr-10 py-2 text-gray-900 border border-gray-300 rounded-md"
            >
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluída">Concluída</option>
                <option value="Pausada">Pausada</option>
                <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          
          {/* --- NOVO: Campo de Motivo Condicional --- */}
          {statusMudou && (
             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <label htmlFor="motivo_alteracao" className="block text-sm font-medium text-yellow-800">
                  Motivo da Alteração de Status <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="motivo_alteracao"
                  rows="2"
                  value={motivoAlteracao}
                  onChange={(e) => setMotivoAlteracao(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md"
                  placeholder="Ex: Chuvas paralisaram a obra, cliente solicitou pausa, etc."
                ></textarea>
            </div>
          )}
          {/* -------------------------------------- */}
          
          <hr />

          <div className="p-3 bg-gray-100 border rounded-md text-sm">
            <h4 className="font-semibold text-gray-800 mb-2">Informações Financeiras (Bloqueadas)</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Orçamento Inicial
                    </label>
                     <input
                      type="text"
                      value={orcamentoInicial}
                      disabled
                      className="w-full h-10 mt-1 px-3 py-2 text-gray-500 bg-gray-200 border border-gray-300 rounded-md cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Orçamento Atual
                    </label>
                     <input
                      type="text"
                      value={orcamentoAtual}
                      disabled
                      className="w-full h-10 mt-1 px-3 py-2 text-gray-500 bg-gray-200 border border-gray-300 rounded-md cursor-not-allowed"
                    />
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">O orçamento só pode ser alterado através da aba "Financeiro".</p>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? "A salvar..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- NOVO: Modal Remover Obra ---
function RemoverObraModal({ obra, onClose, onObraRemoved }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await api.delete(`/obras/${obra.id}/`);
            onObraRemoved();
        } catch (err) {
             if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Não foi possível remover a obra.");
            }
            console.error("Erro ao remover obra:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Remover Obra</h3>
                <p className="text-sm text-gray-600 mb-2">
                    Tem a certeza que deseja remover <span className="font-bold">{obra.nome}</span>?
                </p>
                <p className="text-sm text-red-600 bg-red-50 p-3 border border-red-200 rounded-md mb-6">
                    <span className="font-bold">Atenção:</span> Esta ação é permanente e irá apagar 
                    <span className="font-bold"> TODOS</span> os dados associados a esta obra (finanças, inventário, funcionários, etc.).
                </p>
                {error && (
                    <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                        {error}
                    </div>
                )}
                 <div className="flex justify-end pt-4 space-x-3">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={handleDelete} disabled={isLoading} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                        {isLoading ? "A remover..." : "Remover Obra"}
                    </button>
                </div>
            </div>
         </div>
    );
}

// --- NavItem ---
function NavItem({ icon, text, active = false, onClick }) {
  // ... (código existente, sem alterações) ...
  return (
    <li className="px-6">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center w-full py-3 px-4 rounded-lg text-left text-gray-700 hover:bg-gray-100 ${
          active ? 'bg-gray-100 font-semibold' : ''
        }`}
      >
        {React.cloneElement(icon, { className: `w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}` })}
        <span className="ml-4">{text}</span>
      </button>
    </li>
  );
}

// --- MODAL DE NOVA OBRA ---
function NovaObraModal({ onClose, onObraCreated }) {
  // ... (código existente, sem alterações) ...
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [proprietario, setProprietario] = useState('');
  const [orcamento, setOrcamento] = useState(''); 
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOrcamentoChange = (e) => {
    const formattedValue = formatCurrencyInput(e.target.value);
    setOrcamento(formattedValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!nome) {
      setError("O nome da obra é obrigatório.");
      setIsLoading(false);
      return;
    }

    try {
      const orcamentoNumerico = parseCurrency(orcamento);
      
      const response = await api.post('/obras/', { 
        nome: nome,
        endereco: endereco,
        proprietario: proprietario,
        orcamento_inicial: orcamentoNumerico, 
      });

      onObraCreated(response.data); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Não foi possível criar a obra. O backend está no ar?");
      }
      console.error("Erro ao criar obra:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} 
    >
      <div 
        className="relative w-full max-w-lg p-8 bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Criar Nova Obra</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
              Nome da Obra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              type="text"
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="proprietario" className="block text-sm font-medium text-gray-700">
              Proprietário
            </label>
            <input
              type="text"
              id="proprietario"
              value={proprietario}
              onChange={(e) => setProprietario(e.target.value)}
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="orcamento" className="block text-sm font-medium text-gray-700">
              Orçamento Inicial (R$)
            </label>
            <input
              type="text" 
              id="orcamento"
              value={orcamento} 
              onChange={handleOrcamentoChange} 
              placeholder="ex: 150.000,00"
              className="w-full h-11 mt-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? "A salvar..." : "Salvar Obra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

