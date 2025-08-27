import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { campaignsAPI, aiAPI } from '@/lib/api'
import { Campaign } from '@/types'
import { 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  Target, 
  DollarSign, 
  Globe, 
  MessageSquare,
  Eye,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

const campaignSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  platform: z.enum(['meta', 'google', 'both']),
  budget: z.number().min(100, 'Minimum budget is $100'),
  targetAudience: z.string().min(10, 'Please describe your target audience'),
  objectives: z.array(z.string()).min(1, 'Select at least one objective'),
})

type CampaignFormData = z.infer<typeof campaignSchema>

const objectiveOptions = [
  { id: 'awareness', label: 'Brand Awareness', description: 'Increase visibility of your practice' },
  { id: 'traffic', label: 'Website Traffic', description: 'Drive more visitors to your website' },
  { id: 'leads', label: 'Lead Generation', description: 'Generate new client inquiries' },
  { id: 'conversions', label: 'Conversions', description: 'Get more bookings and appointments' },
  { id: 'engagement', label: 'Engagement', description: 'Increase social media engagement' },
  { id: 'video-views', label: 'Video Views', description: 'Promote video content' },
]

export default function NewCampaign() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [currentStep, setCurrentStep] = useState(1)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<{
    headlines: string[]
    descriptions: string[]
    keywords: string[]
  }>()

  const { data: existingCampaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsAPI.getById(id!).then(res => (res.data as any).data?.campaign),
    enabled: isEditing,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) => campaignsAPI.create(data),
    onSuccess: () => {
      toast.success('Campaign created successfully!')
      navigate('/campaigns')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create campaign'
        : 'Failed to create campaign'
      toast.error(errorMessage)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) => campaignsAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Campaign updated successfully!')
      navigate('/campaigns')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update campaign'
        : 'Failed to update campaign'
      toast.error(errorMessage)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    trigger,
    reset,
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      objectives: [],
    },
  })

  const watchedValues = watch()
  const currentObjectives = watch('objectives')

  useEffect(() => {
    if (existingCampaign && !loadingCampaign) {
      reset({
        name: existingCampaign.name,
        platform: existingCampaign.platform,
        budget: existingCampaign.budget,
        targetAudience: existingCampaign.targetAudience,
        objectives: existingCampaign.objectives,
      })
    }
  }, [existingCampaign, loadingCampaign, reset])

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid && currentStep === 2) {
      await generateAIContent()
    }
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const getFieldsForStep = (step: number): (keyof CampaignFormData)[] => {
    switch (step) {
      case 1: return ['name', 'platform', 'budget']
      case 2: return ['targetAudience', 'objectives']
      case 3: return []
      default: return []
    }
  }

  const handleObjectiveToggle = useCallback((objective: string) => {
    const current = getValues('objectives') || []
    const updatedObjectives = current.includes(objective)
      ? current.filter(o => o !== objective)
      : [...current, objective]
    
    setValue('objectives', updatedObjectives)
  }, [getValues, setValue])

  const generateAIContent = async () => {
    setIsGeneratingContent(true)
    try {
      const context = {
        targetAudience: watchedValues.targetAudience,
        objectives: currentObjectives,
        platform: watchedValues.platform,
        budget: watchedValues.budget,
      }

      const [headlines, descriptions, keywords] = await Promise.all([
        aiAPI.generateContent('headline', context),
        aiAPI.generateContent('description', context),
        aiAPI.generateContent('ad-copy', context),
      ])

      setGeneratedContent({
        headlines: (headlines.data as any).data.content.split('\n').filter((h: string) => h.trim()),
        descriptions: (descriptions.data as any).data.content.split('\n').filter((d: string) => d.trim()),
        keywords: (keywords.data as any).data.content.split('\n').filter((k: string) => k.trim()),
      })
    } catch (error) {
      console.error('AI Content Generation Error:', error)
      toast.error(`Failed to generate AI content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingContent(false)
    }
  }

  const onSubmit = async (data: CampaignFormData) => {
    // Only send fields that the backend validation expects
    const campaignData = {
      name: data.name,
      platform: data.platform.toUpperCase() as any, // Convert to uppercase for backend
      budget: data.budget,
      targetAudience: data.targetAudience,
      objectives: data.objectives,
    }

    if (isEditing) {
      updateMutation.mutate(campaignData)
    } else {
      createMutation.mutate(campaignData)
    }
  }

  const onSaveDraft = () => {
    handleSubmit((data) => {
      // Only send fields that the backend validation expects
      const campaignData = {
        name: data.name,
        platform: data.platform.toUpperCase() as any, // Convert to uppercase for backend
        budget: data.budget,
        targetAudience: data.targetAudience,
        objectives: data.objectives,
      }
      
      if (isEditing) {
        updateMutation.mutate(campaignData)
      } else {
        createMutation.mutate(campaignData)
      }
    })()
  }

  if (isEditing && loadingCampaign) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Campaign Basics</h2>
              <p className="text-muted-foreground">Set up the foundation of your campaign</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Therapy Services - Lead Generation"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Select onValueChange={(value: 'meta' | 'google' | 'both') => setValue('platform', value)}>
                  <SelectTrigger className={errors.platform ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Choose advertising platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">
                      <div className="flex items-center space-x-2">
                        <span>📘</span>
                        <div>
                          <div>Meta Ads (Facebook & Instagram)</div>
                          <div className="text-xs text-muted-foreground">Great for visual content and targeting</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="google">
                      <div className="flex items-center space-x-2">
                        <span>🔍</span>
                        <div>
                          <div>Google Ads</div>
                          <div className="text-xs text-muted-foreground">Perfect for search intent and keywords</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center space-x-2">
                        <span>🚀</span>
                        <div>
                          <div>Both Platforms</div>
                          <div className="text-xs text-muted-foreground">Maximum reach and coverage</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.platform && (
                  <p className="text-sm text-red-500">{errors.platform.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="1000"
                  {...register('budget', { valueAsNumber: true })}
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="text-sm text-red-500">{errors.budget.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended minimum: $500/month for effective results
                </p>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Target Audience & Objectives</h2>
              <p className="text-muted-foreground">Define who you want to reach and what you want to achieve</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience Description</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Describe your ideal clients: demographics, interests, pain points, location, etc."
                  className={errors.targetAudience ? 'border-red-500' : ''}
                  {...register('targetAudience')}
                  rows={4}
                />
                {errors.targetAudience && (
                  <p className="text-sm text-red-500">{errors.targetAudience.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Campaign Objectives (select all that apply):</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {objectiveOptions.map((objective) => (
                    <div
                      key={objective.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        currentObjectives?.includes(objective.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`objective-${objective.id}`}
                          checked={currentObjectives?.includes(objective.id)}
                          className="mt-1"
                          onCheckedChange={() => handleObjectiveToggle(objective.id)}
                        />
                        <label 
                          htmlFor={`objective-${objective.id}`}
                          className="cursor-pointer flex-1"
                        >
                          <div className="font-medium">{objective.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {objective.description}
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.objectives && (
                  <p className="text-sm text-red-500">{errors.objectives.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold flex items-center justify-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <span>AI-Generated Content</span>
              </h2>
              <p className="text-muted-foreground">
                Review the AI-generated content for your campaign
              </p>
            </div>

            {isGeneratingContent ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h3 className="mt-4 text-lg font-medium">Generating content with AI...</h3>
                <p className="text-muted-foreground">
                  Creating personalized headlines, descriptions, and keywords
                </p>
              </div>
            ) : generatedContent ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Headlines</CardTitle>
                      <CardDescription>AI-generated headlines for your ads</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {generatedContent.headlines.map((headline, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-md">
                            <p className="font-medium">{headline}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Descriptions</CardTitle>
                      <CardDescription>Compelling ad descriptions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {generatedContent.descriptions.map((description, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm">{description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recommended Keywords</CardTitle>
                    <CardDescription>Target keywords for better reach</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update your campaign settings' : 'Launch your AI-powered advertising campaign'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-8 h-0.5 ${
                      step < currentStep ? 'bg-primary' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 3
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Form Content */}
      <Card>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>

                {currentStep < 3 ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={isGeneratingContent}
                  >
                    {currentStep === 2 && !generatedContent ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Content
                      </>
                    ) : (
                      'Next Step'
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        {isEditing ? 'Update Campaign' : 'Launch Campaign'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}