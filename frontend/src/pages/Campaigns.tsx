import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: Campaign | null }>({
    open: false,
    campaign: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteClick = (campaign: Campaign) => {
    setDeleteDialog({ open: true, campaign })
  }

  const handleDelete = async () => {
    if (!deleteDialog.campaign) return

    setIsDeleting(true)
    try {
      await campaignsAPI.delete(deleteDialog.campaign.id)
      refetch()
      setDeleteDialog({ open: false, campaign: null })
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Campaigns</h1>
        </div>
        <div className="grid gap-6 grid-cols-1">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Campaigns</h1>
              <p className="text-muted-foreground">
                Manage your advertising campaigns across Meta and Google platforms
              </p>
            </div>
          </div>
        </div>
        <Link to="/campaigns/new">
          <Button className="btn-gradient mobile-friendly">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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
        <div className="grid gap-6 grid-cols-1">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 flex-shrink-0">
                      <span className="text-2xl">
                        {platformIcons[campaign.platform]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl font-bold leading-tight text-gray-900 mb-1 truncate">
                        {campaign.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <CardDescription className="text-sm text-gray-600">
                          {campaign.platform === 'both' ? 'Meta & Google Ads' :
                           campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                        </CardDescription>
                        <Badge
                          variant="outline"
                          className={`${statusColors[campaign.status?.toLowerCase() || 'draft']} text-xs`}
                        >
                          {campaign.status?.toLowerCase() || 'draft'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
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
                        onClick={() => handleDeleteClick(campaign)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Key metrics row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-900 font-medium">Budget</span>
                      </div>
                      <span className="font-bold text-blue-900">{formatCurrency(campaign.budget)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-900 font-medium">Audience</span>
                      </div>
                      <span className="font-bold text-purple-900 truncate max-w-[120px]">
                        {campaign.targetAudience.split(' ').slice(0, 2).join(' ')}...
                      </span>
                    </div>
                  </div>

                  {/* Performance metrics */}
                  {campaign.metrics && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Performance Overview
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {campaign.metrics.impressions.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Impressions</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {campaign.metrics.clicks.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Clicks</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {campaign.metrics.leads}
                          </div>
                          <div className="text-xs text-gray-600">Leads</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campaign details */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>Created {formatDate(campaign.createdAt)}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Last updated 2h ago</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
                      <Link to={`/campaigns/${campaign.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View Details
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 text-xs btn-gradient">
                      <Link to={`/campaigns/${campaign.id}/edit`}>
                        <Edit className="mr-1 h-3 w-3" />
                        Edit Campaign
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, campaign: null })}
        title="Delete Campaign"
        description={
          deleteDialog.campaign
            ? `Are you sure you want to delete "${deleteDialog.campaign.name}"? This action cannot be undone and will permanently remove all campaign data, including metrics and performance history.`
            : ''
        }
        confirmText="Delete Campaign"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}