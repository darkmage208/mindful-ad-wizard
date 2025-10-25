export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'active' | 'inactive'
  createdAt: Date
  campaignsCount: number
  totalSpend: number
  lastLogin?: Date
  company?: string
  isVerified: boolean
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalCampaigns: number
  activeCampaigns: number
  totalRevenue: number
  monthlyGrowth: number
}

export interface AdminCampaign {
  id: string
  name: string
  platform: 'META' | 'GOOGLE' | 'BOTH'
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  budget: number
  cost: number
  impressions: number
  clicks: number
  conversions: number
  leads: number
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

export interface SystemConfig {
  aiGenerationLimit: number
  maxCampaignsPerUser: number
  apiRateLimit: number
  sslCertificateValid: boolean
  databaseEncrypted: boolean
  failedLoginAttempts: number
  apiKeysSecured: boolean
}

export interface SecurityStatus {
  sslCertificateValid: boolean
  databaseEncrypted: boolean
  failedLoginAttempts: number
  apiKeysSecured: boolean
}

export interface AdminAnalytics {
  platformPerformance: {
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    totalCost: number
    averageCTR: number
    averageCPC: number
    averageCPL: number
  }
  userGrowth: {
    newUsers: number
    activeUsers: number
    churnedUsers: number
    growthRate: number
  }
  revenueMetrics: {
    totalRevenue: number
    monthlyRevenue: number
    averageRevenuePerUser: number
    revenueGrowth: number
  }
}

export interface AdminAPIResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
