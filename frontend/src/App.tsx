import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import OnboardingForm from '@/components/onboarding/OnboardingForm'
import Dashboard from '@/pages/Dashboard'
import Campaigns from '@/pages/Campaigns'
import CampaignDetail from '@/pages/CampaignDetail'
import NewCampaign from '@/pages/NewCampaign'
import Analytics from '@/pages/Analytics'
import LandingPages from '@/pages/LandingPages'
import NewLandingPage from '@/pages/NewLandingPage'
import LiveLandingPage from '@/pages/LiveLandingPage'
import AIChat from '@/pages/AIChat'
import Settings from '@/pages/Settings'
import AdminPanel from '@/pages/AdminPanel'
import { Loader2 } from 'lucide-react'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/lp/:slug" element={<LiveLandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/lp/:slug" element={<LiveLandingPage />} />
      <Route path="/*" element={
        <Layout>
          <Routes>
            <Route path="/onboarding" element={<OnboardingForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/new" element={<NewCampaign />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/edit" element={<NewCampaign />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/landing-pages" element={<LandingPages />} />
            <Route path="/landing-pages/new" element={<NewLandingPage />} />
            <Route path="/landing-pages/:id/edit" element={<NewLandingPage />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/settings" element={<Settings />} />
            {user.role === 'admin' && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App