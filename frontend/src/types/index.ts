export interface User {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'SUPER_ADMIN'
  createdAt: Date
  avatar?: string
}

export interface Campaign {
  id: string
  userId: string
  name: string
  platform: 'meta' | 'google' | 'both'
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed'
  budget: number
  targetAudience: string
  objectives: string[]
  createdAt: Date
  updatedAt: Date
  metrics?: CampaignMetrics
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  conversions: number
  cost: number
  ctr: number
  cpc: number
  cpl: number
  leads: number
}

export interface OnboardingData {
  city: string
  targetAudience: string
  averageTicket: number
  serviceType: string
  businessGoals: string[]
  budget: number
  experience: string
}

export interface Creative {
  id: string
  campaignId: string
  type: 'image' | 'video' | 'carousel'
  content: {
    headline: string
    description: string
    cta: string
    imageUrl?: string
    videoUrl?: string
  }
  performance?: {
    impressions: number
    clicks: number
    conversions: number
  }
}

export interface Lead {
  id: string
  campaignId: string
  name: string
  email: string
  phone: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted'
  createdAt: Date
  notes?: string
}

export interface LandingPage {
  id: string
  userId: string
  name: string
  slug: string
  template: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  content: {
    headline: string
    subheadline: string
    description: string
    cta: string
    features?: string[]
    testimonials?: {
      text: string
      author: string
      rating: number
    }[]
  }
  contact: {
    whatsapp: string
    phone: string
    email: string
    address?: string
    hours?: string
  }
  seo?: {
    title: string
    description: string
    keywords: string
  }
  images?: {
    url: string
    alt: string
    type: 'hero' | 'gallery' | 'feature'
  }[]
  visits: number
  conversions: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  metrics?: {
    visits: number
    conversions: number
    conversionRate: number
  }
}

// Re-export admin types
export * from './admin'