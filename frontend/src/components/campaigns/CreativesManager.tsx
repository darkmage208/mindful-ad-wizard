import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { creativesAPI } from '@/lib/api'
import { toast } from 'sonner'
import {
  Plus,
  Edit,
  Copy,
  Trash2,
  Eye,
  MousePointer,
  TrendingUp,
  Image,
  Video,
  Palette,
  Loader2,
  Play,
  Pause
} from 'lucide-react'

interface Creative {
  id: string
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'TEXT'
  headline: string
  description: string
  cta: string
  imageUrl?: string
  videoUrl?: string
  impressions: number
  clicks: number
  conversions: number
  isActive: boolean
  createdAt: string
}

interface CreativesManagerProps {
  campaignId: string
}

export default function CreativesManager({ campaignId }: CreativesManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null)
  const [generateOptions, setGenerateOptions] = useState({
    includeImages: true,
    creativesCount: 3,
    imageStyle: 'professional',
    includeVideo: false
  })

  const queryClient = useQueryClient()

  const { data: creatives = [], isLoading } = useQuery({
    queryKey: ['creatives', campaignId],
    queryFn: () => creativesAPI.getCampaignCreatives(campaignId).then(res => res.data.data?.creatives || [])
  })

  const generateMutation = useMutation({
    mutationFn: () => creativesAPI.generateForCampaign(campaignId, generateOptions),
    onSuccess: () => {
      toast.success('Creatives generated successfully')
      queryClient.invalidateQueries({ queryKey: ['creatives', campaignId] })
      setIsGenerating(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate creatives')
      setIsGenerating(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => creativesAPI.update(id, data),
    onSuccess: () => {
      toast.success('Creative updated successfully')
      queryClient.invalidateQueries({ queryKey: ['creatives', campaignId] })
      setEditingCreative(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update creative')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creativesAPI.delete(id),
    onSuccess: () => {
      toast.success('Creative deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['creatives', campaignId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete creative')
    }
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => creativesAPI.duplicate(id),
    onSuccess: () => {
      toast.success('Creative duplicated successfully')
      queryClient.invalidateQueries({ queryKey: ['creatives', campaignId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate creative')
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => creativesAPI.toggleStatus(id),
    onSuccess: () => {
      toast.success('Creative status updated')
      queryClient.invalidateQueries({ queryKey: ['creatives', campaignId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update creative status')
    }
  })

  const handleGenerate = () => {
    setIsGenerating(true)
    generateMutation.mutate()
  }

  const handleUpdate = (data: any) => {
    if (editingCreative) {
      updateMutation.mutate({ id: editingCreative.id, data })
    }
  }

  const getCreativeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return <Image className="h-4 w-4" />
      case 'VIDEO': return <Video className="h-4 w-4" />
      case 'CAROUSEL': return <Palette className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return 0
    return ((clicks / impressions) * 100).toFixed(2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Ad Creatives</h3>
          <p className="text-sm text-muted-foreground">
            Manage and optimize your campaign creatives
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Creatives
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Creatives</DialogTitle>
              <DialogDescription>
                Configure AI generation settings for new ad creatives
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-images">Include Images</Label>
                <Switch
                  id="include-images"
                  checked={generateOptions.includeImages}
                  onCheckedChange={(checked) =>
                    setGenerateOptions(prev => ({ ...prev, includeImages: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="include-video">Include Video</Label>
                <Switch
                  id="include-video"
                  checked={generateOptions.includeVideo}
                  onCheckedChange={(checked) =>
                    setGenerateOptions(prev => ({ ...prev, includeVideo: checked }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatives-count">Number of Creatives</Label>
                <Input
                  id="creatives-count"
                  type="number"
                  min="1"
                  max="5"
                  value={generateOptions.creativesCount}
                  onChange={(e) =>
                    setGenerateOptions(prev => ({ ...prev, creativesCount: parseInt(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-style">Image Style</Label>
                <select
                  id="image-style"
                  className="w-full p-2 border rounded-md"
                  value={generateOptions.imageStyle}
                  onChange={(e) =>
                    setGenerateOptions(prev => ({ ...prev, imageStyle: e.target.value }))
                  }
                >
                  <option value="professional">Professional</option>
                  <option value="modern">Modern</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="warm">Warm & Approachable</option>
                </select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Creatives'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {creatives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No creatives yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Generate AI-powered creatives to start running your campaign
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate First Creatives
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {creatives.map((creative: Creative) => (
            <Card key={creative.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCreativeIcon(creative.type)}
                    <CardTitle className="text-base">{creative.headline}</CardTitle>
                    <Badge variant={creative.isActive ? 'default' : 'secondary'}>
                      {creative.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCreative(creative)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateMutation.mutate(creative.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatusMutation.mutate(creative.id)}
                    >
                      {creative.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(creative.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{creative.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{creative.impressions.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="h-4 w-4" />
                      <span>{creative.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{calculateCTR(creative.clicks, creative.impressions)}% CTR</span>
                    </div>
                  </div>
                  {creative.imageUrl && (
                    <img
                      src={creative.imageUrl}
                      alt={creative.headline}
                      className="w-full max-w-sm rounded-md object-cover"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Creative Dialog */}
      {editingCreative && (
        <Dialog open={!!editingCreative} onOpenChange={() => setEditingCreative(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Creative</DialogTitle>
              <DialogDescription>
                Update the creative content and settings
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                handleUpdate({
                  headline: formData.get('headline'),
                  description: formData.get('description'),
                  cta: formData.get('cta')
                })
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  name="headline"
                  defaultValue={editingCreative.headline}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingCreative.description}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  name="cta"
                  defaultValue={editingCreative.cta}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingCreative(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Creative'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}