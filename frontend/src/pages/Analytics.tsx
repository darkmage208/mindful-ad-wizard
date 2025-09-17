import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { campaignsAPI, leadsAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  Eye,
  MousePointer,
  Users,
  DollarSign,
  Calendar,
  Download,
  Filter,
} from 'lucide-react'

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30')
  const [selectedCampaign, setSelectedCampaign] = useState('all')

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.getAll().then(res => res.data.data.campaigns || []),
  })

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsAPI.getAll().then(res => res.data.data.leads || []),
  })

  const filteredCampaigns = selectedCampaign === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.id === selectedCampaign)

  const totalMetrics = filteredCampaigns.reduce(
    (acc, campaign) => {
      const metrics = campaign.metrics || {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
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

  const avgCPL = totalMetrics.leads > 0
    ? (totalMetrics.cost / totalMetrics.leads).toFixed(2)
    : '0.00'

  const conversionRate = totalMetrics.clicks > 0
    ? ((totalMetrics.conversions / totalMetrics.clicks) * 100).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track performance and get insights from your advertising campaigns.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto text-sm">
          <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMetrics.cost)}</div>
            <p className="text-xs text-muted-foreground">
              Across {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {avgCTR}% average CTR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(avgCPC))} avg CPC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.leads}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(avgCPL))} cost per lead
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Click-through Rate (CTR)</span>
              <span className="text-sm">{avgCTR}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(parseFloat(avgCTR) * 10, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Conversion Rate</span>
              <span className="text-sm">{conversionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${Math.min(parseFloat(conversionRate) * 5, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per Click</span>
              <span className="text-sm">{formatCurrency(parseFloat(avgCPC))}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cost per Lead</span>
              <span className="text-sm">{formatCurrency(parseFloat(avgCPL))}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Top performing campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-6">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No campaigns to display
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCampaigns
                  .sort((a, b) => (b.metrics?.leads || 0) - (a.metrics?.leads || 0))
                  .slice(0, 5)
                  .map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.platform === 'both' ? 'Meta & Google' : 
                           campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {campaign.metrics?.leads || 0} leads
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(campaign.metrics?.cost || 0)} spent
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Campaign performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Charts Coming Soon</h3>
              <p className="text-muted-foreground">
                Interactive performance charts and trend analysis will be available here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}