import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { campaignsAPI, leadsAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  Play, 
  Pause, 
  Eye, 
  MousePointer, 
  Users, 
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Globe,
  Loader2,
} from 'lucide-react'

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsAPI.getById(id!).then(res => res.data.data?.campaign),
    enabled: !!id,
  })

  const { data: campaignLeads = [] } = useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsAPI.getAll(id).then(res => res.data.data?.leads || []),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Campaign not found</h2>
        <p className="mt-2 text-gray-600">The campaign you're looking for doesn't exist.</p>
        <Link to="/campaigns" className="mt-4 inline-block">
          <Button>Back to Campaigns</Button>
        </Link>
      </div>
    )
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge className={statusColors[campaign.status]}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {campaign.platform === 'both' ? 'Meta & Google Ads' : 
               campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'} • 
              Created {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            {campaign.status === 'active' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Link to={`/campaigns/${campaign.id}/edit`}>
            <Button size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Campaign
            </Button>
          </Link>
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
            <div className="text-2xl font-bold">{formatCurrency(metrics.cost)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatCurrency(campaign.budget)} budget
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((metrics.cost / campaign.budget) * 100, 100)}%` 
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : '0'}% CTR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.leads}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.cost > 0 ? formatCurrency(metrics.cost / metrics.leads || 0) : '$0'} cost per lead
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="leads">Leads ({campaignLeads.length})</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">
                    {campaign.platform === 'both' ? 'Meta & Google' : 
                     campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{formatCurrency(campaign.budget)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={statusColors[campaign.status]}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{formatDate(campaign.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{formatDate(campaign.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {campaign.targetAudience}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {campaign.objectives.map((objective, index) => (
                    <Badge key={index} variant="outline">
                      {objective}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Click-through Rate (CTR):</span>
                  <span className="font-medium">
                    {metrics.impressions > 0 ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) : '0'}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost per Click (CPC):</span>
                  <span className="font-medium">
                    {formatCurrency(metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cost per Lead (CPL):</span>
                  <span className="font-medium">
                    {formatCurrency(metrics.leads > 0 ? metrics.cost / metrics.leads : 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Conversion Rate:</span>
                  <span className="font-medium">
                    {metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : '0'}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Performance Charts Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and performance charts will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Leads</CardTitle>
              <CardDescription>All leads generated from this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No leads yet</h3>
                  <p className="text-muted-foreground">
                    Leads will appear here once your campaign starts generating inquiries.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{lead.name}</h4>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {lead.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(lead.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader>
              <CardTitle>Ad Creatives</CardTitle>
              <CardDescription>Images, videos, and ad copy for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Creatives Coming Soon</h3>
                <p className="text-muted-foreground">
                  AI-generated creatives and ad variations will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}