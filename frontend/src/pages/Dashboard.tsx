import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { campaignsAPI, leadsAPI, clientDashboardAPI } from '@/lib/api'
import MetricsOverview from '@/components/dashboard/MetricsOverview'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Campaign, Lead, CampaignMetrics } from '@/types'
import {
  Plus,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Zap,
  BarChart2,
  Calendar,
  Download,
} from 'lucide-react'

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState('30days')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.getAll().then(res => res.data.data.campaigns || []),
  })

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsAPI.getAll().then(res => res.data.data.leads || []),
  })

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
  const newLeads = leads.filter(lead => lead.status === 'new').length

  const totalSpend = campaigns.reduce((sum, campaign) => {
    const metrics = campaign.metrics || { cost: 0 }
    return sum + metrics.cost
  }, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Dashboard</h1>
              <p className="text-muted-foreground flex items-center space-x-2 text-sm">
                <span className="truncate">Welcome back! Here's your campaign overview</span>
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs bg-muted px-2 py-1 rounded-full flex-shrink-0">Live</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 xl:flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="1year">Last year</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 sm:px-3 py-2 text-xs sm:text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="all">All status</option>
              <option value="active">Active only</option>
              <option value="paused">Paused only</option>
              <option value="completed">Completed only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Export
            </Button>
            <Link to="/campaigns/new" className="flex-1 sm:flex-none">
              <Button className="btn-gradient w-full text-xs sm:text-sm">
                <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="card-hover border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">Active Campaigns</CardTitle>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
              <Target className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{activeCampaigns.length}</div>
            <p className="text-sm text-blue-700 flex items-center mt-2">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              {campaigns.length - activeCampaigns.length} paused
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-900">Total Budget</CardTitle>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{formatCurrency(totalBudget)}</div>
            <p className="text-sm text-green-700 flex items-center mt-2">
              <Calendar className="w-4 h-4 mr-1" />
              Monthly allocation
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-900">New Leads</CardTitle>
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-md">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{newLeads}</div>
            <p className="text-sm text-purple-700 flex items-center mt-2">
              <Zap className="w-4 h-4 mr-1" />
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-900">Total Spend</CardTitle>
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{formatCurrency(totalSpend)}</div>
            <p className="text-sm text-orange-700 flex items-center mt-2">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Metrics Overview */}
      <MetricsOverview className="mb-6" />

      {/* Recent Campaigns */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="card-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                  <CardDescription>Your latest campaign activity</CardDescription>
                </div>
              </div>
              <Link to="/campaigns">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowUpRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Get started by creating your first campaign to reach your audience.
                </p>
                <Link to="/campaigns/new">
                  <Button className="btn-gradient">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.slice(0, 3).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        campaign.status === 'active' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <Target className={`w-5 h-5 ${
                          campaign.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <span className="inline-flex items-center">
                            {campaign.platform === 'both' && <span className="mr-1">🔗</span>}
                            {campaign.platform === 'meta' && <span className="mr-1">📘</span>}
                            {campaign.platform === 'google' && <span className="mr-1">🔍</span>}
                            {campaign.platform === 'both' ? 'Meta & Google' :
                             campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'
                            }
                          </span>
                          <span className="mx-1">•</span>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(campaign.budget)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        campaign.status === 'active'
                          ? 'status-success'
                          : campaign.status === 'paused'
                          ? 'status-warning'
                          : 'status-info'
                      }`}>
                        {campaign.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Leads</CardTitle>
                  <CardDescription>Latest inquiries from your campaigns</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Leads will appear here once your campaigns start generating interest.
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Waiting for campaign activity</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {leads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <span>{lead.email}</span>
                          <span className="mx-1">•</span>
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{formatDate(lead.createdAt)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        lead.status === 'new'
                          ? 'status-info'
                          : lead.status === 'contacted'
                          ? 'status-warning'
                          : lead.status === 'qualified'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'status-success'
                      }`}>
                        {lead.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}