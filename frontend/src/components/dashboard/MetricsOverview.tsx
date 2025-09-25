import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { metricsAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Users,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Loader2
} from 'lucide-react'

interface MetricsOverviewProps {
  className?: string
}

interface MetricCard {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  description?: string
}

export default function MetricsOverview({ className }: MetricsOverviewProps) {
  const [timeframe, setTimeframe] = useState('30d')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['metrics-dashboard', timeframe],
    queryFn: () => metricsAPI.getDashboard({ timeframe, refresh_cache: false }).then(res => res.data.data)
  })

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['metrics-category', selectedCategory, timeframe],
    queryFn: () => selectedCategory
      ? metricsAPI.getCategoryMetrics(selectedCategory, { timeframe, detailed: true }).then(res => res.data.data)
      : null,
    enabled: !!selectedCategory
  })

  const { data: realtimeData } = useQuery({
    queryKey: ['metrics-realtime'],
    queryFn: () => metricsAPI.getRealTime().then(res => res.data.data),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const handleExport = async (format: 'json' | 'csv' = 'csv') => {
    try {
      const response = await metricsAPI.export({
        timeframe,
        format,
        categories: 'all'
      })

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `metrics-${timeframe}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const getMetricCards = (data: any): MetricCard[] => {
    if (!data) return []

    return [
      {
        title: 'Total Impressions',
        value: data.totalImpressions?.toLocaleString() || '0',
        change: data.impressionsChange || '0%',
        trend: data.impressionsChange?.startsWith('+') ? 'up' : 'down',
        icon: Eye,
        description: 'Total ad impressions across all campaigns'
      },
      {
        title: 'Total Clicks',
        value: data.totalClicks?.toLocaleString() || '0',
        change: data.clicksChange || '0%',
        trend: data.clicksChange?.startsWith('+') ? 'up' : 'down',
        icon: MousePointer,
        description: 'Total clicks on your ads'
      },
      {
        title: 'Total Leads',
        value: data.totalLeads?.toLocaleString() || '0',
        change: data.leadsChange || '0%',
        trend: data.leadsChange?.startsWith('+') ? 'up' : 'down',
        icon: Users,
        description: 'New leads generated'
      },
      {
        title: 'Total Spend',
        value: formatCurrency(data.totalSpend || 0),
        change: data.spendChange || '0%',
        trend: data.spendChange?.startsWith('+') ? 'up' : 'down',
        icon: DollarSign,
        description: 'Total advertising spend'
      },
      {
        title: 'Average CTR',
        value: `${data.averageCTR || 0}%`,
        change: data.ctrChange || '0%',
        trend: data.ctrChange?.startsWith('+') ? 'up' : 'down',
        icon: TrendingUp,
        description: 'Click-through rate across campaigns'
      },
      {
        title: 'Conversion Rate',
        value: `${data.conversionRate || 0}%`,
        change: data.conversionChange || '0%',
        trend: data.conversionChange?.startsWith('+') ? 'up' : 'down',
        icon: CheckCircle,
        description: 'Lead conversion rate'
      }
    ]
  }

  const renderMetricCard = (metric: MetricCard, index: number) => {
    const IconComponent = metric.icon
    const isPositive = metric.trend === 'up'
    const TrendIcon = isPositive ? TrendingUp : TrendingDown

    return (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metric.value}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            <TrendIcon
              className={`mr-1 h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`}
            />
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {metric.change}
            </span>
            <span className="ml-1">from last period</span>
          </div>
          {metric.description && (
            <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading && !dashboardData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const metricCards = getMetricCards(dashboardData)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Metrics Overview</h2>
          <p className="text-muted-foreground">
            Track your campaign performance and key metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric, index) => renderMetricCard(metric, index))}
      </div>

      {/* Real-time Activity */}
      {realtimeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Real-time Activity
            </CardTitle>
            <CardDescription>Recent activity in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="text-2xl font-bold">{realtimeData.recentLeads || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Active Chats</p>
                <p className="text-2xl font-bold">{realtimeData.activeChats || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Campaign Updates</p>
                <p className="text-2xl font-bold">{realtimeData.campaignActivity || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{realtimeData.pendingApprovals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Deep Dive */}
      <Tabs value={selectedCategory || 'overview'} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" onClick={() => setSelectedCategory(null)}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="landing_pages">Landing Pages</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.performanceTrends ? (
                  <div className="space-y-4">
                    {Object.entries(dashboardData.performanceTrends).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge variant="outline">{String(value)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No trend data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Top Performing Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.topCampaigns ? (
                  <div className="space-y-3">
                    {dashboardData.topCampaigns.slice(0, 5).map((campaign: any, index: number) => (
                      <div key={campaign.id || index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.leads} leads • {campaign.ctr}% CTR
                          </p>
                        </div>
                        <Badge>{campaign.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No campaign data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Category-specific tabs */}
        {['campaigns', 'leads', 'landing_pages', 'chat', 'creatives', 'approvals'].map(category => (
          <TabsContent key={category} value={category} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{category.replace('_', ' ')} Metrics</CardTitle>
                <CardDescription>
                  Detailed analytics for {category.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : categoryData ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {Object.entries(categoryData).slice(0, 6).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <p className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </p>
                          <p className="text-xl font-semibold">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Category-specific insights */}
                    {categoryData.insights && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Key Insights</h4>
                        <div className="space-y-2">
                          {categoryData.insights.map((insight: string, index: number) => (
                            <div key={index} className="flex items-start gap-2">
                              <TrendingUp className="h-4 w-4 mt-0.5 text-green-500" />
                              <p className="text-sm text-muted-foreground">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No detailed metrics available for this category
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}