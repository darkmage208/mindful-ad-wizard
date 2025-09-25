import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Sparkles,
  Target,
  Image,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Eye,
  Zap
} from 'lucide-react'
import { campaignsAPI } from '@/lib/api'

interface AICampaignGeneratorProps {
  campaignId: string
  campaignName: string
  onGenerationComplete: () => void
}

interface GenerationResult {
  campaignId: string
  segments: any
  strategy: any
  creatives: any[]
  success: boolean
  messages: string[]
}

export default function AICampaignGenerator({
  campaignId,
  campaignName,
  onGenerationComplete
}: AICampaignGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [generationOptions, setGenerationOptions] = useState({
    includeImages: true,
    creativesCount: 3,
    imageStyle: 'professional medical photography',
    autoSegment: true,
    generateStrategy: true
  })

  const imageStyles = [
    { value: 'professional medical photography', label: 'Professional Medical' },
    { value: 'modern wellness lifestyle', label: 'Modern Wellness' },
    { value: 'friendly healthcare environment', label: 'Friendly Healthcare' },
    { value: 'clean minimalist design', label: 'Minimalist Design' },
    { value: 'warm therapeutic setting', label: 'Therapeutic Warm' }
  ]

  const generateAICampaign = async () => {
    setIsGenerating(true)
    setProgress(0)
    setCurrentStep('Initializing AI generation...')

    try {
      // Simulate progress steps
      const steps = [
        'Analyzing onboarding data...',
        'Generating audience segments...',
        'Creating campaign strategy...',
        'Generating AI text content...',
        'Creating images with DALL-E...',
        'Finalizing creatives...'
      ]

      for (let i = 0; i < steps.length - 1; i++) {
        setCurrentStep(steps[i])
        setProgress((i / (steps.length - 1)) * 80)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setCurrentStep('Finalizing creatives...')
      setProgress(90)

      const response = await campaignsAPI.generateAI(campaignId, generationOptions)

      if (response.data.success) {
        setResult(response.data.data)
        setProgress(100)
        setCurrentStep('AI generation complete!')

        toast.success('AI Campaign Generated!', {
          description: `Generated ${response.data.data.creatives.length} creatives with ${response.data.data.segments?.segments?.length || 0} audience segments`
        })

        onGenerationComplete()
      } else {
        throw new Error('Generation failed')
      }
    } catch (error: any) {
      console.error('AI generation failed:', error)
      toast.error('AI Generation Failed', {
        description: error.response?.data?.message || 'Failed to generate AI campaign content'
      })
      setCurrentStep('Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const renderSegments = () => {
    if (!result?.segments?.segments) return null

    return (
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          Audience Segments ({result.segments.segments.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.segments.segments.map((segment: any, index: number) => (
            <Card key={index} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">{segment.name}</h5>
                  <Badge variant="outline">{segment.budgetAllocation}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{segment.messagingAngle}</p>
                <div className="text-xs space-y-1">
                  <div><strong>Demographics:</strong> {segment.demographics.age}, {segment.demographics.income}</div>
                  <div><strong>Platforms:</strong> {segment.platforms.join(', ')}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderCreatives = () => {
    if (!result?.creatives?.length) return null

    return (
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Image className="h-4 w-4" />
          Generated Creatives ({result.creatives.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.creatives.map((creative: any, index: number) => (
            <Card key={creative.id || index} className="overflow-hidden">
              {creative.imageUrl && (
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                  <img
                    src={creative.imageUrl}
                    alt="Generated creative"
                    className="max-w-full max-h-full object-cover rounded"
                  />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <h5 className="font-medium text-sm">{creative.headline}</h5>
                <p className="text-xs text-muted-foreground">{creative.description}</p>
                <Badge variant="secondary" className="text-xs">{creative.cta}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderStrategy = () => {
    if (!result?.strategy) return null

    return (
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Campaign Strategy
        </h4>
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-2">Bidding Strategy</h5>
              <p className="text-sm text-muted-foreground">{result.strategy.biddingStrategy}</p>
            </div>
            <div>
              <h5 className="font-medium mb-2">Schedule</h5>
              <p className="text-sm text-muted-foreground">
                {result.strategy.schedule?.days?.join(', ')} - {result.strategy.schedule?.hours}
              </p>
            </div>
            <div>
              <h5 className="font-medium mb-2">Primary Metrics</h5>
              <div className="flex flex-wrap gap-1">
                {result.strategy.metrics?.primary?.map((metric: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{metric}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h5 className="font-medium mb-2">A/B Tests</h5>
              <div className="text-sm text-muted-foreground">
                {result.strategy.abTests?.length || 0} tests suggested
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            AI Generation Complete
          </CardTitle>
          <CardDescription>
            Successfully generated AI-powered campaign content for "{campaignName}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {result.messages.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Generation Summary</h4>
                <ul className="space-y-1">
                  {result.messages.map((message, index) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Tabs defaultValue="segments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="segments">Segments</TabsTrigger>
                <TabsTrigger value="creatives">Creatives</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
              </TabsList>
              <TabsContent value="segments">
                {renderSegments()}
              </TabsContent>
              <TabsContent value="creatives">
                {renderCreatives()}
              </TabsContent>
              <TabsContent value="strategy">
                {renderStrategy()}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={() => setResult(null)} variant="outline">
                Generate Again
              </Button>
              <Button onClick={onGenerationComplete}>
                <Eye className="h-4 w-4 mr-2" />
                View Campaign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Campaign Generator
        </CardTitle>
        <CardDescription>
          Generate comprehensive AI-powered content for "{campaignName}" including audience segments, creatives with images, and campaign strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isGenerating ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm font-medium">{currentStep}</p>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-center text-muted-foreground">
              This may take up to 2 minutes to generate all content...
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h4 className="font-semibold">Generation Options</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoSegment"
                      checked={generationOptions.autoSegment}
                      onCheckedChange={(checked) =>
                        setGenerationOptions(prev => ({ ...prev, autoSegment: !!checked }))
                      }
                    />
                    <Label htmlFor="autoSegment" className="text-sm">
                      Generate audience segments
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateStrategy"
                      checked={generationOptions.generateStrategy}
                      onCheckedChange={(checked) =>
                        setGenerationOptions(prev => ({ ...prev, generateStrategy: !!checked }))
                      }
                    />
                    <Label htmlFor="generateStrategy" className="text-sm">
                      Generate campaign strategy
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeImages"
                      checked={generationOptions.includeImages}
                      onCheckedChange={(checked) =>
                        setGenerationOptions(prev => ({ ...prev, includeImages: !!checked }))
                      }
                    />
                    <Label htmlFor="includeImages" className="text-sm">
                      Generate images with DALL-E
                    </Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="creativesCount" className="text-sm">
                      Number of creatives (1-5)
                    </Label>
                    <Select
                      value={generationOptions.creativesCount.toString()}
                      onValueChange={(value) =>
                        setGenerationOptions(prev => ({ ...prev, creativesCount: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {generationOptions.includeImages && (
                    <div>
                      <Label htmlFor="imageStyle" className="text-sm">
                        Image style
                      </Label>
                      <Select
                        value={generationOptions.imageStyle}
                        onValueChange={(value) =>
                          setGenerationOptions(prev => ({ ...prev, imageStyle: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {imageStyles.map(style => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <strong>AI Generation includes:</strong> Audience segmentation based on your onboarding data,
                compelling headlines and descriptions, call-to-action buttons, professional images,
                and comprehensive campaign strategy with A/B testing recommendations.
              </div>
            </div>

            <Button
              onClick={generateAICampaign}
              className="w-full"
              size="lg"
              disabled={isGenerating}
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate AI Campaign Content
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}