import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { Login } from '@/pages/Login'
import { NovoPedido } from '@/pages/NovoPedido'
import SavedRequests from '@/pages/SavedRequests'
import PedidoDetail from '@/pages/PedidoDetail'

function AppContent() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Carregando...</h1>
          <p className="text-gray-600">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}`

  return (
    <Router>
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-4">
        <span className="font-semibold text-gray-900">Buscador de Fornecedor</span>
        <NavLink to="/" end className={linkClass}>Novo pedido</NavLink>
        <NavLink to="/pedidos" className={linkClass}>Pedidos</NavLink>
        <button onClick={logout} className="ml-auto text-sm text-gray-600 hover:text-gray-900">Sair</button>
      </nav>
      <Routes>
        <Route path="/" element={<NovoPedido />} />
        <Route path="/pedidos" element={<SavedRequests />} />
        <Route path="/pedido/:pedidoId" element={<PedidoDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
