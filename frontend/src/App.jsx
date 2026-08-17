import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard/*" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 10_000 }}
      />
    </AuthProvider>
  )
}

export default App
