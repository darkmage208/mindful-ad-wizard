import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { landingPagesAPI } from '@/lib/api'
import {
  Sparkles,
  Wand2,
  Plus,
  X,
  Loader2,
  Image,
  Type,
  Target,
  Building2,
} from 'lucide-react'

const aiGenerationSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.string().min(2, 'Business type is required'),
  targetAudience: z.string().min(10, 'Please describe your target audience'),
  services: z.array(z.string()).min(1, 'At least one service is required'),
  tone: z.enum(['professional', 'friendly', 'casual', 'authoritative']).default('professional'),
  includeImages: z.boolean().default(true),
  template: z.string().default('psychology-practice'),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
  }).optional(),
})

type AIGenerationFormData = z.infer<typeof aiGenerationSchema>

const businessTypes = [
  'Psychology Practice',
  'Medical Clinic',
  'Wellness Center', 
  'Life Coaching',
  'Physical Therapy',
  'Dental Practice',
  'Nutrition Counseling',
  'Mental Health Services',
  'Massage Therapy',
  'Alternative Medicine',
]

const toneOptions = [
  { value: 'professional', label: 'Professional', description: 'Formal and trustworthy' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert and confident' },
]

const templates = [
  { value: 'psychology-practice', label: 'Psychology Practice', color: '#2563eb' },
  { value: 'wellness-center', label: 'Wellness Center', color: '#059669' },
  { value: 'medical-clinic', label: 'Medical Clinic', color: '#1e40af' },
  { value: 'coaching-practice', label: 'Life Coaching', color: '#7c3aed' },
]

interface AIGenerationFormProps {
  trigger?: React.ReactNode
}

export default function AIGenerationForm({ trigger }: AIGenerationFormProps) {
  const [open, setOpen] = useState(false)
  const [currentServices, setCurrentServices] = useState<string[]>([])
  const [newService, setNewService] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<AIGenerationFormData>({
    resolver: zodResolver(aiGenerationSchema),
    defaultValues: {
      tone: 'professional',
      includeImages: true,
      template: 'psychology-practice',
      services: [],
    },
  })

  const generateMutation = useMutation({
    mutationFn: (data: AIGenerationFormData) => landingPagesAPI.generateWithAI(data),
    onSuccess: (response) => {
      const { data, warnings, imageGenerationStatus } = response.data;

      // Show success message
      toast.success('AI-powered landing page generated successfully!', {
        description: 'Your landing page has been created with professional content.',
      });

      // Show warnings if any
      if (warnings && warnings.length > 0) {
        warnings.forEach((warning: string) => {
          // Show positive messages as info, warnings as warnings
          if (warning.includes('successfully') || warning.includes('optimal performance')) {
            toast.info('Image System', {
              description: warning,
              duration: 4000,
            });
          } else {
            toast.warning('Image Generation Warning', {
              description: warning,
              duration: 6000,
            });
          }
        });
      }

      // Show image generation status if applicable
      if (imageGenerationStatus) {
        const { requested, generated } = imageGenerationStatus;
        if (requested && generated === 0) {
          toast.error('Image Generation Failed', {
            description: 'Landing page created without images. You can add images manually later.',
            duration: 8000,
          });
        } else if (requested && generated < 2) {
          toast.warning('Partial Image Generation', {
            description: `Only ${generated} of 2 images were generated successfully.`,
            duration: 6000,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setOpen(false);
      reset();

      // Navigate to edit the generated page
      const pageId = data.landingPage.id;
      navigate(`/landing-pages/${pageId}/edit`);
    },
    onError: (error) => {
      console.error('Failed to generate landing page:', error)
      toast.error('Failed to generate landing page', {
        description: 'Please try again or contact support if the issue persists.',
      })
    },
  })

  const addService = () => {
    if (newService.trim() && !currentServices.includes(newService.trim())) {
      const updatedServices = [...currentServices, newService.trim()]
      setCurrentServices(updatedServices)
      setValue('services', updatedServices)
      setNewService('')
    }
  }

  const removeService = (service: string) => {
    const updatedServices = currentServices.filter(s => s !== service)
    setCurrentServices(updatedServices)
    setValue('services', updatedServices)
  }

  const onSubmit = (data: AIGenerationFormData) => {
    generateMutation.mutate({
      ...data,
      services: currentServices,
    })
  }

  const watchedTemplate = watch('template')
  const watchedTone = watch('tone')
  const watchedIncludeImages = watch('includeImages')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mobile-scroll">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center space-x-3 text-lg sm:text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <span>Generate Landing Page with AI</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Let AI create a professional landing page with custom content and images tailored to your business.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 touch-spacing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-2 border-b">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">Business Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  {...register('businessName')}
                  placeholder="e.g., Dr. Smith Psychology Practice"
                />
                {errors.businessName && (
                  <p className="text-sm text-red-500">{errors.businessName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select onValueChange={(value) => setValue('businessType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.businessType && (
                  <p className="text-sm text-red-500">{errors.businessType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  {...register('targetAudience')}
                  placeholder="Describe who your ideal clients are, their demographics, needs, and pain points..."
                  rows={4}
                />
                {errors.targetAudience && (
                  <p className="text-sm text-red-500">{errors.targetAudience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contact Information (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    {...register('contact.email')}
                    placeholder="Email address"
                    type="email"
                  />
                  <Input
                    {...register('contact.phone')}
                    placeholder="Phone number"
                  />
                  <Input
                    {...register('contact.address')}
                    placeholder="Business address"
                  />
                </div>
              </div>
            </div>

            {/* Services and Customization */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 pb-2 border-b">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Services & Customization</h3>
              </div>

              <div className="space-y-2">
                <Label>Services You Offer</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="e.g., Individual Therapy"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                  />
                  <Button type="button" onClick={addService} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {currentServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentServices.map((service, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{service}</span>
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {errors.services && (
                  <p className="text-sm text-red-500">{errors.services.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content Tone</Label>
                <Select value={watchedTone} onValueChange={(value) => setValue('tone', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <div
                      key={template.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        watchedTemplate === template.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setValue('template', template.value)}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: template.color }}
                        />
                        <span className="text-sm font-medium">{template.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={watchedIncludeImages}
                  onCheckedChange={(checked) => setValue('includeImages', !!checked)}
                />
                <Label htmlFor="includeImages" className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <span>Generate AI images</span>
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                AI will create professional images that match your business type and style.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={generateMutation.isPending}
              className="mobile-friendly order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending || currentServices.length === 0}
              className="mobile-friendly btn-gradient order-1 sm:order-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Landing Page
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}