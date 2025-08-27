import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { landingPagesAPI } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { LandingPage } from '@/types'
import {
  Plus,
  Eye,
  Edit,
  Globe,
  Smartphone,
  Monitor,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Copy,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function LandingPages() {
  const { data: landingPages = [], isLoading } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () => landingPagesAPI.getAll().then(res => res.data.data.landingPages || []),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Landing Pages</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded" />
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
          <h1 className="text-3xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground">
            Create and manage high-converting landing pages for your campaigns.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Landing Page
        </Button>
      </div>

      {/* Landing Pages Grid */}
      {landingPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No landing pages yet
            </h3>
            <p className="text-gray-500 text-center max-w-sm mb-6">
              Create beautiful, conversion-optimized landing pages that work perfectly with your ad campaigns.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Landing Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {landingPages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg leading-tight">
                      {page.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {page.template} template
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Live
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="bg-gray-100 rounded-lg p-4 h-32 flex items-center justify-center">
                    <div className="text-center">
                      <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Page Preview</p>
                    </div>
                  </div>

                  {/* Stats */}
                  {page.metrics && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">
                          {page.metrics.visits.toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Visits</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {page.metrics.conversionRate.toFixed(1)}%
                        </div>
                        <div className="text-muted-foreground">Conv. Rate</div>
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  <div className="text-xs text-muted-foreground truncate">
                    {page.url}
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="mr-1 h-3 w-3" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
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