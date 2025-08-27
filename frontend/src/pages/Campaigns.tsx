import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { campaignsAPI } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Campaign } from '@/types'
import {
  Plus,
  Eye,
  Edit,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  Target,
  DollarSign,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
}

const platformIcons = {
  meta: '📘',
  google: '🔍',
  both: '🚀',
}

export default function Campaigns() {
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.getAll().then(res => res.data.data.campaigns || []),
  })

  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all')

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true
    return campaign.status?.toLowerCase() === filter
  })

  const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      await campaignsAPI.update(campaignId, { status: newStatus.toUpperCase() as Campaign['status'] })
      refetch()
    } catch (error) {
      console.error('Failed to update campaign status:', error)
    }
  }

  const handleDelete = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      try {
        await campaignsAPI.delete(campaignId)
        refetch()
      } catch (error) {
        console.error('Failed to delete campaign:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Campaigns</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your advertising campaigns across Meta and Google platforms.
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 text-xs">
                ({campaigns.filter(c => c.status?.toLowerCase() === status).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
            </h3>
            <p className="text-gray-500 text-center max-w-sm mb-6">
              {filter === 'all' 
                ? 'Create your first AI-powered advertising campaign to start generating leads.'
                : `You don't have any ${filter} campaigns at the moment.`
              }
            </p>
            <Link to="/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {platformIcons[campaign.platform]}
                    </span>
                    <div>
                      <CardTitle className="text-lg leading-tight">
                        {campaign.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {campaign.platform === 'both' ? 'Meta & Google Ads' : 
                         campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/campaigns/${campaign.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/campaigns/${campaign.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {campaign.status?.toLowerCase() === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(campaign.id, 'paused')}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(campaign.id, 'active')}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={statusColors[campaign.status?.toLowerCase() || 'draft']}
                    >
                      {campaign.status?.toLowerCase() || 'draft'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(campaign.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Audience:</span>
                      <span className="font-medium truncate">
                        {campaign.targetAudience.split(' ').slice(0, 2).join(' ')}...
                      </span>
                    </div>
                  </div>

                  {campaign.metrics && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                      <div className="text-center">
                        <div className="font-medium">
                          {campaign.metrics.impressions.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Impressions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {campaign.metrics.clicks.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {campaign.metrics.leads}
                        </div>
                        <div className="text-muted-foreground">Leads</div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/campaigns/${campaign.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1">
                      <Link to={`/campaigns/${campaign.id}/edit`}>
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}