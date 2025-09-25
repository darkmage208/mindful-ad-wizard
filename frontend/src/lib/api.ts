import axios from 'axios'
import { User, Campaign, Lead, LandingPage, OnboardingData } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>('/auth/login', { email, password }),
  
  register: (name: string, email: string, password: string) =>
    api.post<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>('/auth/register', { name, email, password }),
  
  me: () => api.get<{ success: boolean; data: { user: User } }>('/auth/me'),
  
  logout: () => api.post('/auth/logout'),
}

export const onboardingAPI = {
  submitOnboarding: (data: {
    city: string
    targetAudience: string
    averageTicket: number
    serviceType: string
    businessGoals: string[]
    budget: number
    experience: string
  }) =>
    api.post<{
      success: boolean
      data: {
        onboarding: OnboardingData
        campaigns: Array<{
          id: string
          name: string
          platform: string
          budget: number
          status: string
        }>
        campaignCount: number
      }
    }>('/onboarding', data),

  getOnboardingData: () =>
    api.get<{ success: boolean; data: { onboarding: OnboardingData; completed: boolean } }>('/onboarding'),

  updateOnboardingData: (data: Partial<OnboardingData>) =>
    api.put<{ success: boolean; data: { onboarding: OnboardingData } }>('/onboarding', data),

  getOnboardingStatus: () =>
    api.get<{ success: boolean; data: { completed: boolean; onboardingId: string | null; completedAt: string | null } }>('/onboarding/status'),

  generateAdditionalCampaigns: () =>
    api.post<{
      success: boolean
      data: {
        campaigns: Campaign[]
        count: number
      }
    }>('/onboarding/generate-campaigns'),
}

export const campaignsAPI = {
  getAll: () => api.get<Campaign[]>('/campaigns'),
  
  getById: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  
  create: (data: Partial<Campaign>) => api.post<Campaign>('/campaigns', data),
  
  update: (id: string, data: Partial<Campaign>) =>
    api.put<Campaign>(`/campaigns/${id}`, data),
  
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  
  generateCreatives: (id: string) =>
    api.post<{ success: boolean }>(`/campaigns/${id}/generate-creatives`),
  
  approve: (id: string) =>
    api.post<{ success: boolean }>(`/campaigns/${id}/approve`),
  
  pause: (id: string) =>
    api.post<{ success: boolean }>(`/campaigns/${id}/pause`),
  
  activate: (id: string) =>
    api.post<{ success: boolean }>(`/campaigns/${id}/activate`),
  
  getMetrics: (id: string) =>
    api.get(`/campaigns/${id}/metrics`),
  
  getLeads: (id: string) =>
    api.get<Lead[]>(`/campaigns/${id}/leads`),
}

export const leadsAPI = {
  getAll: (campaignId?: string) =>
    api.get<Lead[]>('/leads', { params: { campaignId } }),
  
  getById: (id: string) => api.get<Lead>(`/leads/${id}`),
  
  create: (data: Partial<Lead>) => api.post<Lead>('/leads', data),
  
  update: (id: string, data: Partial<Lead>) =>
    api.put<Lead>(`/leads/${id}`, data),
  
  delete: (id: string) => api.delete(`/leads/${id}`),
  
  export: () => api.get('/leads/export', { responseType: 'blob' }),
}

export const landingPagesAPI = {
  getAll: () => api.get<LandingPage[]>('/landing-pages'),

  getById: (id: string) => api.get<LandingPage>(`/landing-pages/${id}`),

  getPublicBySlug: (slug: string) => {
    const publicAPI = axios.create({
      baseURL: API_BASE_URL,
    })
    return publicAPI.get<{ success: boolean; data: { landingPage: LandingPage } }>(`/landing-pages/public/${slug}`)
  },

  create: (data: Partial<LandingPage>) =>
    api.post<LandingPage>('/landing-pages', data),

  generateWithAI: (data: {
    businessType: string
    targetAudience: string
    services: string[]
    businessName: string
    tone?: string
    includeImages?: boolean
    template?: string
    contact?: {
      phone?: string
      email?: string
      address?: string
    }
  }) => api.post<LandingPage>('/landing-pages/generate-ai', data),

  update: (id: string, data: Partial<LandingPage>) =>
    api.put<LandingPage>(`/landing-pages/${id}`, data),

  delete: (id: string) => api.delete(`/landing-pages/${id}`),
}

export const aiAPI = {
  chat: (message: string, context?: unknown) =>
    api.post<{ response: string }>('/ai/chat', { message, context }),
  
  analyzeCampaign: (campaignId: string) =>
    api.post<{ insights: string; recommendations: string[] }>(`/ai/analyze/${campaignId}`),
  
  generateContent: (type: 'headline' | 'description' | 'ad-copy', context: unknown) =>
    api.post<{ content: string }>('/ai/generate-content', { type, context }),
}

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getCampaigns: () => api.get('/analytics/campaigns'),
  getLeads: () => api.get('/analytics/leads'),
  getPerformance: () => api.get('/analytics/performance'),
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getHealth: () => api.get('/admin/health'),
  getUsers: () => api.get('/admin/users'),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: unknown) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getAllCampaigns: () => api.get('/admin/campaigns'),
}

export const usersAPI = {
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) => api.put<User>('/users/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

export const creativesAPI = {
  generateForCampaign: (campaignId: string, options?: {
    includeImages?: boolean
    creativesCount?: number
    imageStyle?: string
    includeVideo?: boolean
  }) => api.post(`/creatives/campaign/${campaignId}/generate`, options),

  getCampaignCreatives: (campaignId: string) =>
    api.get(`/creatives/campaign/${campaignId}`),

  getById: (id: string) => api.get(`/creatives/${id}`),

  update: (id: string, data: {
    headline?: string
    description?: string
    cta?: string
    isActive?: boolean
  }) => api.put(`/creatives/${id}`, data),

  delete: (id: string) => api.delete(`/creatives/${id}`),

  getAnalytics: (id: string) => api.get(`/creatives/${id}/analytics`),

  updateMetrics: (id: string, metrics: {
    impressions?: number
    clicks?: number
    conversions?: number
  }) => api.put(`/creatives/${id}/metrics`, metrics),

  duplicate: (id: string, variations?: number) =>
    api.post(`/creatives/${id}/duplicate`, { variations }),

  toggleStatus: (id: string) => api.post(`/creatives/${id}/toggle-status`),
}

export const approvalsAPI = {
  submitCampaign: (campaignId: string) =>
    api.post(`/approvals/campaigns/${campaignId}/submit`),

  approveCampaign: (campaignId: string, data: {
    notes?: string
    useLeadGen?: boolean
    usePsychologyTargeting?: boolean
    platformSpecificSettings?: any
  }) => api.post(`/approvals/campaigns/${campaignId}/approve`, data),

  rejectCampaign: (campaignId: string, data: {
    feedback: string
    reasons?: string[]
    needsChanges?: boolean
    suggestedChanges?: string[]
  }) => api.post(`/approvals/campaigns/${campaignId}/reject`, data),

  getPending: () => api.get('/approvals/pending'),

  getHistory: (campaignId: string) =>
    api.get(`/approvals/campaigns/${campaignId}/history`),

  bulkApprove: (campaignIds: string[], approvalData?: any) =>
    api.post('/approvals/bulk/approve', { campaignIds, approvalData }),

  getStatistics: () => api.get('/approvals/statistics'),
}

export const aiChatAPI = {
  startSession: (chatType: string, metadata?: any) =>
    api.post('/chat/start', { chat_type: chatType, metadata }),

  sendMessage: (sessionId: string, message: string) =>
    api.post(`/chat/${sessionId}/message`, { message }),

  getSession: (sessionId: string) => api.get(`/chat/${sessionId}`),

  endSession: (sessionId: string, reason?: string) =>
    api.post(`/chat/${sessionId}/end`, { reason }),

  getHistory: () => api.get('/chat/history'),

  getAnalytics: (params?: { period?: string; admin_view?: boolean }) =>
    api.get('/chat/analytics', { params }),

  getTypes: () => api.get('/chat/types'),

  getSuggestions: (chatType: string, context?: string, userInput?: string) =>
    api.post('/chat/suggestions', { chat_type: chatType, context, user_input: userInput }),

  healthCheck: () => api.get('/chat/health'),
}

export const metricsAPI = {
  getDashboard: (params?: {
    timeframe?: string
    include_system?: boolean
    refresh_cache?: boolean
  }) => api.get('/metrics/dashboard', { params }),

  getCategoryMetrics: (category: string, params?: {
    timeframe?: string
    detailed?: boolean
  }) => api.get(`/metrics/category/${category}`, { params }),

  getRealTime: () => api.get('/metrics/realtime'),

  getComparison: (params?: {
    current_period?: string
    comparison_period?: string
    offset_days?: number
  }) => api.get('/metrics/comparison', { params }),

  export: (params?: {
    timeframe?: string
    format?: string
    categories?: string
    include_system?: boolean
  }) => api.get('/metrics/export', { params, responseType: 'blob' }),
}

export const clientDashboardAPI = {
  getDashboard: (params?: { timeframe?: string; refresh?: boolean }) =>
    api.get('/client-dashboard', { params }),

  getCampaignManagement: (params?: {
    status?: string
    platform?: string
    sort_by?: string
    sort_order?: string
    page?: number
    limit?: number
  }) => api.get('/client-dashboard/campaigns', { params }),

  getLeadManagement: (params?: {
    status?: string
    source?: string
    date_range?: string
    page?: number
    limit?: number
  }) => api.get('/client-dashboard/leads', { params }),

  getQuickActions: () => api.get('/client-dashboard/quick-actions'),

  executeQuickAction: (actionId: string, parameters: any) =>
    api.post('/client-dashboard/quick-actions/execute', {
      action_id: actionId,
      parameters
    }),

  getActivity: (params?: {
    page?: number
    limit?: number
    type?: string
  }) => api.get('/client-dashboard/activity', { params }),

  updateWidget: (widgetId: string, config: any) =>
    api.put(`/client-dashboard/widgets/${widgetId}`, { config }),

  updatePreferences: (preferences: {
    theme?: string
    timezone?: string
    default_timeframe?: string
    notifications?: any
    auto_refresh?: boolean
    refresh_interval?: number
  }) => api.put('/client-dashboard/preferences', preferences),
}

export const landingPageCustomizationAPI = {
  getCustomizationOptions: (id: string) =>
    api.get(`/landing-pages/${id}/customize`),

  getThemes: () => api.get('/landing-pages/customize/themes'),

  getLayouts: () => api.get('/landing-pages/customize/layouts'),

  getSections: () => api.get('/landing-pages/customize/sections'),

  applyTheme: (id: string, themeId: string) =>
    api.post(`/landing-pages/${id}/customize/theme`, { theme_id: themeId }),

  createCustomTheme: (id: string, colors: any, themeName?: string) =>
    api.post(`/landing-pages/${id}/customize/custom-theme`, {
      colors,
      theme_name: themeName
    }),

  changeLayout: (id: string, layoutId: string) =>
    api.post(`/landing-pages/${id}/customize/layout`, { layout_id: layoutId }),

  updateContentSection: (id: string, sectionName: string, content: any) =>
    api.put(`/landing-pages/${id}/customize/content/${sectionName}`, content),

  regenerateContentSection: (id: string, sectionName: string, customPrompt?: string) =>
    api.post(`/landing-pages/${id}/customize/content/${sectionName}/regenerate`, {
      custom_prompt: customPrompt
    }),

  previewCustomization: (id: string, changes: {
    theme_id?: string
    layout_id?: string
    content_changes?: any
    custom_colors?: any
  }) => api.post(`/landing-pages/${id}/customize/preview`, changes),

  resetToDefaults: (id: string) =>
    api.post(`/landing-pages/${id}/customize/reset`),

  getAnalytics: (id: string) =>
    api.get(`/landing-pages/${id}/customize/analytics`),
}

export const securityAPI = {
  // OAuth
  initiateOAuth: (provider: string, redirectUrl?: string) =>
    api.get(`/security/oauth/${provider}`, { params: { redirectUrl } }),

  // MFA
  setupMFA: () => api.post('/security/mfa/setup'),

  verifyMFA: (token: string) => api.post('/security/mfa/verify', { token }),

  disableMFA: (password: string) => api.post('/security/mfa/disable', { password }),

  // Session
  verifySession: (sessionToken: string) =>
    api.post('/security/verify-session', { sessionToken }),
}