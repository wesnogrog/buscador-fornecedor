import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { Login } from '@/pages/Login'
import { NovoPedido } from '@/pages/NovoPedido'
import { Resultados } from '@/pages/Resultados'
import { Mensagem } from '@/pages/Mensagem'
import { Envio } from '@/pages/Envio'
import SavedRequests from '@/pages/SavedRequests'
import PedidoDetail from '@/pages/PedidoDetail'

function AppContent() {
  const { user, loading } = useAuth()

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

  return (
    <Router>
      <Routes>
        <Route path="/" element={<NovoPedido />} />
        <Route path="/novo-pedido" element={<NovoPedido />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/mensagem" element={<Mensagem />} />
        <Route path="/envio" element={<Envio />} />
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
