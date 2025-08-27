import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { campaignsAPI, leadsAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Campaign, Lead, CampaignMetrics } from '@/types'
import {
  Plus,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Eye,
  MousePointer,
  PhoneCall,
} from 'lucide-react'

export default function Dashboard() {
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
  
  const totalMetrics = campaigns.reduce(
    (acc, campaign) => {
      const metrics = campaign.metrics || {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
        ctr: 0,
        cpc: 0,
        cpl: 0,
        leads: 0,
      }
      return {
        impressions: acc.impressions + metrics.impressions,
        clicks: acc.clicks + metrics.clicks,
        conversions: acc.conversions + metrics.conversions,
        cost: acc.cost + metrics.cost,
        leads: acc.leads + metrics.leads,
      }
    },
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, leads: 0 }
  )

  const avgCTR = totalMetrics.impressions > 0 
    ? ((totalMetrics.clicks / totalMetrics.impressions) * 100).toFixed(2)
    : '0.00'

  const avgCPC = totalMetrics.clicks > 0
    ? (totalMetrics.cost / totalMetrics.clicks).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your campaigns.
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.length - activeCampaigns.length} paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Monthly allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMetrics.cost)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{avgCTR}% CTR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.leads}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(avgCPC))} avg CPC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.conversions}</div>
            <p className="text-xs text-muted-foreground">
              {totalMetrics.leads > 0 
                ? ((totalMetrics.conversions / totalMetrics.leads) * 100).toFixed(1)
                : '0'
              }% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>Your latest campaign activity</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first campaign.
                </p>
                <div className="mt-6">
                  <Link to="/campaigns/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Campaign
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.slice(0, 3).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.platform === 'both' ? 'Meta & Google' : 
                         campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'
                        } • {formatCurrency(campaign.budget)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest inquiries from your campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Leads will appear here once your campaigns are active.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leads.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.email} • {formatDate(lead.createdAt)}
                      </p>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'new'
                        ? 'bg-blue-100 text-blue-800'
                        : lead.status === 'contacted'
                        ? 'bg-yellow-100 text-yellow-800'
                        : lead.status === 'qualified'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {lead.status}
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