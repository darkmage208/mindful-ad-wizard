import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { landingPagesAPI } from '@/lib/api'
import { LandingPage } from '@/types'
import { generateLandingPageUrl } from '@/lib/utils'
import AIGenerationForm from '@/components/landing-page/AIGenerationForm'
import PreviewDialog from '@/components/landing-page/PreviewDialog'
import {
  Plus,
  Eye,
  Edit,
  Globe,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Copy,
  Settings,
  Sparkles,
  Image,
  TrendingUp,
  BarChart3,
  MousePointer,
  Users,
  Clock,
  Zap,
  Filter,
  Search,
  Download,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function LandingPages() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [previewPage, setPreviewPage] = useState<LandingPage | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; page: LandingPage | null }>({
    open: false,
    page: null,
  })
  
  const { data: landingPages = [], isLoading } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: () => landingPagesAPI.getAll().then(res => res.data.data.landingPages || []),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => landingPagesAPI.delete(id),
    onSuccess: () => {
      toast.success('Landing page deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
    },
    onError: (error) => {
      console.error('Failed to delete landing page:', error)
      toast.error('Failed to delete landing page')
    },
  })

  const handleDeleteClick = (page: LandingPage) => {
    setDeleteDialog({ open: true, page })
  }

  const handleDelete = () => {
    if (!deleteDialog.page) return
    deleteMutation.mutate(deleteDialog.page.id)
    setDeleteDialog({ open: false, page: null })
  }

  const handlePreview = (page: LandingPage) => {
    setPreviewPage(page)
  }

  const handleLiveView = (page: LandingPage) => {
    const url = generateLandingPageUrl(page.slug || page.id)
    window.open(url, '_blank')
  }

  const handleEdit = (id: string) => {
    navigate(`/landing-pages/${id}/edit`)
  }

  const handleDuplicate = async (page: LandingPage) => {
    try {
      const duplicateData = {
        name: `${page.name} (Copy)`,
        template: page.template,
        colors: page.colors,
        content: page.content,
        contact: page.contact,
      }
      await landingPagesAPI.create(duplicateData)
      toast.success('Landing page duplicated successfully')
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
    } catch (error) {
      console.error('Failed to duplicate landing page:', error)
      toast.error('Failed to duplicate landing page')
    }
  }


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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Landing Pages</h1>
              <p className="text-muted-foreground flex items-center space-x-2 text-sm">
                <span className="truncate">Create and manage high-converting pages</span>
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">Optimized</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 xl:flex-shrink-0">
          {/* Search and filters */}
          <div className="hidden xl:flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search pages..."
              className="bg-transparent border-0 outline-0 flex-1 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Filter className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Filter
          </Button>

          <AIGenerationForm
            trigger={
              <Button className="btn-gradient text-xs sm:text-sm">
                <Sparkles className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Generate with AI
              </Button>
            }
          />

          <Button onClick={() => navigate('/landing-pages/new')} variant="outline" className="text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Create Manually
          </Button>
        </div>
      </div>

      {/* Landing Pages Grid */}
      {landingPages.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">
              No landing pages yet
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
              Create beautiful, conversion-optimized landing pages using AI or build them manually with our drag-and-drop editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <AIGenerationForm
                trigger={
                  <Button size="lg" className="btn-gradient">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate with AI
                  </Button>
                }
              />
              <Button size="lg" variant="outline" onClick={() => navigate('/landing-pages/new')}>
                <Plus className="mr-2 h-5 w-5" />
                Create Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {landingPages.map((page) => (
            <Card key={page.id} className="card-hover group border-0 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                          {page.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {page.template.replace('-', ' ')}
                          </Badge>
                          {page.images && page.images.length > 0 && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              <Image className="w-3 h-3 mr-1" />
                              AI Images
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(page)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(page.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleLiveView(page)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Live
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteClick(page)}
                      >
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
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 h-36 flex items-center justify-center border">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Globe className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {page.template.replace('-', ' ')} Template
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  {page.metrics && (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="w-3 h-3 mr-1 text-blue-600" />
                          <span className="font-semibold text-blue-900">
                            {page.metrics.visits.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Visits</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          <MousePointer className="w-3 h-3 mr-1 text-green-600" />
                          <span className="font-semibold text-green-900">
                            {page.metrics.conversions}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Conv.</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center mb-1">
                          <TrendingUp className="w-3 h-3 mr-1 text-purple-600" />
                          <span className="font-semibold text-purple-900">
                            {page.metrics.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Rate</div>
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {generateLandingPageUrl(page.slug || page.id)}
                    </span>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview(page)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 btn-gradient"
                      onClick={() => handleEdit(page.id)}
                    >
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

      {/* Preview Dialog */}
      {previewPage && (
        <PreviewDialog
          landingPage={previewPage}
          open={!!previewPage}
          onOpenChange={(open) => !open && setPreviewPage(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, page: null })}
        title="Delete Landing Page"
        description={
          deleteDialog.page
            ? `Are you sure you want to delete "${deleteDialog.page.name}"? This action cannot be undone and will permanently remove the landing page and all its content.`
            : ''
        }
        confirmText="Delete Landing Page"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}