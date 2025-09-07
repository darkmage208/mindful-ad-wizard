import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { landingPagesAPI } from '@/lib/api'
import { LandingPage } from '@/types'
import {
  ArrowLeft,
  Save,
  Eye,
  Palette,
  Type,
  Image,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  Copy,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
} from 'lucide-react'

interface LandingPageEditorProps {
  landingPageId?: string
}

const templates = [
  {
    id: 'psychology-practice',
    name: 'Psychology Practice',
    description: 'Professional layout for therapy and counseling services',
    preview: '/api/templates/psychology-practice/preview.jpg'
  },
  {
    id: 'wellness-center',
    name: 'Wellness Center', 
    description: 'Modern design for holistic health services',
    preview: '/api/templates/wellness-center/preview.jpg'
  },
  {
    id: 'medical-clinic',
    name: 'Medical Clinic',
    description: 'Clean, medical-focused design',
    preview: '/api/templates/medical-clinic/preview.jpg'
  },
  {
    id: 'coaching-practice',
    name: 'Life Coaching',
    description: 'Inspiring layout for personal development',
    preview: '/api/templates/coaching-practice/preview.jpg'
  }
]

const colorPresets = [
  { name: 'Professional Blue', primary: '#2563eb', secondary: '#64748b', accent: '#0ea5e9' },
  { name: 'Calm Green', primary: '#059669', secondary: '#6b7280', accent: '#10b981' },
  { name: 'Warm Orange', primary: '#ea580c', secondary: '#6b7280', accent: '#f97316' },
  { name: 'Elegant Purple', primary: '#7c3aed', secondary: '#6b7280', accent: '#a855f7' },
  { name: 'Trustworthy Navy', primary: '#1e40af', secondary: '#64748b', accent: '#3b82f6' },
]

export default function LandingPageEditor({ landingPageId }: LandingPageEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!landingPageId
  
  const [activeTab, setActiveTab] = useState('content')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [formData, setFormData] = useState({
    name: '',
    template: 'psychology-practice',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#0ea5e9',
    },
    content: {
      headline: 'Professional Psychology Services',
      subheadline: 'Compassionate care for your mental health journey',
      description: 'Get the support you need from a licensed mental health professional. Schedule your consultation today.',
      cta: 'Schedule Consultation',
      features: [
        'Individual Therapy',
        'Couples Counseling', 
        'Family Therapy',
        'Group Sessions'
      ],
      testimonials: [
        {
          text: 'Dr. Smith helped me through a difficult time with compassion and expertise.',
          author: 'Sarah M.',
          rating: 5
        }
      ]
    },
    contact: {
      whatsapp: '',
      phone: '',
      email: '',
      address: '',
      hours: 'Mon-Fri 9AM-6PM'
    },
    seo: {
      title: '',
      description: '',
      keywords: ''
    }
  })

  const { data: existingPage, isLoading } = useQuery({
    queryKey: ['landing-page', landingPageId],
    queryFn: () => landingPagesAPI.getById(landingPageId!).then(res => res.data.data.landingPage),
    enabled: isEditing,
  })

  const saveMutation = useMutation({
    mutationFn: (data: Partial<LandingPage>) => {
      if (isEditing) {
        return landingPagesAPI.update(landingPageId!, data)
      }
      return landingPagesAPI.create(data)
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Landing page updated!' : 'Landing page created!')
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
      if (!isEditing) {
        navigate('/landing-pages')
      }
    },
    onError: (error) => {
      console.error('Failed to save landing page:', error)
      toast.error('Failed to save landing page')
    },
  })

  useEffect(() => {
    if (existingPage && !isLoading) {
      setFormData({
        name: existingPage.name,
        template: existingPage.template,
        colors: existingPage.colors,
        content: existingPage.content,
        contact: existingPage.contact,
        seo: existingPage.seo || { title: '', description: '', keywords: '' }
      })
    }
  }, [existingPage, isLoading])

  const handleSave = () => {
    saveMutation.mutate(formData)
  }

  const handlePreview = () => {
    // Generate preview URL or open preview modal
    toast.info('Preview functionality coming soon!')
  }

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const updateContent = (field: string, value: any) => {
    updateFormData('content', field, value)
  }

  const updateContact = (field: string, value: string) => {
    updateFormData('contact', field, value)
  }

  const updateColors = (colorSet: typeof colorPresets[0]) => {
    setFormData(prev => ({
      ...prev,
      colors: colorSet
    }))
  }

  const addFeature = () => {
    const newFeature = `New Feature ${formData.content.features.length + 1}`
    updateContent('features', [...formData.content.features, newFeature])
  }

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.content.features]
    newFeatures[index] = value
    updateContent('features', newFeatures)
  }

  const removeFeature = (index: number) => {
    const newFeatures = formData.content.features.filter((_, i) => i !== index)
    updateContent('features', newFeatures)
  }

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/landing-pages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit Landing Page' : 'Create Landing Page'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update your landing page design and content' : 'Design a high-converting landing page for your campaigns'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Landing Page Settings</CardTitle>
                <Badge variant="outline">{formData.template}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="template">Template</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Page Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Psychology Practice Landing Page"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headline">Main Headline</Label>
                    <Input
                      id="headline"
                      value={formData.content.headline}
                      onChange={(e) => updateContent('headline', e.target.value)}
                      placeholder="Your compelling headline"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subheadline">Subheadline</Label>
                    <Input
                      id="subheadline"
                      value={formData.content.subheadline}
                      onChange={(e) => updateContent('subheadline', e.target.value)}
                      placeholder="Supporting text for your headline"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.content.description}
                      onChange={(e) => updateContent('description', e.target.value)}
                      placeholder="Detailed description of your services"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta">Call-to-Action Button Text</Label>
                    <Input
                      id="cta"
                      value={formData.content.cta}
                      onChange={(e) => updateContent('cta', e.target.value)}
                      placeholder="e.g., Schedule Consultation"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Features/Services</Label>
                      <Button type="button" size="sm" onClick={addFeature}>
                        Add Feature
                      </Button>
                    </div>
                    {formData.content.features.map((feature, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          placeholder="Feature description"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => removeFeature(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Design Tab */}
                <TabsContent value="design" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Color Scheme</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {colorPresets.map((preset, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => updateColors(preset)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-1">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: preset.primary }}
                                />
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: preset.secondary }}
                                />
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: preset.accent }}
                                />
                              </div>
                              <span className="text-sm font-medium">{preset.name}</span>
                            </div>
                            {JSON.stringify(formData.colors) === JSON.stringify(preset) && (
                              <Badge>Selected</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <Input
                          type="color"
                          value={formData.colors.primary}
                          onChange={(e) => updateFormData('colors', 'primary', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Color</Label>
                        <Input
                          type="color"
                          value={formData.colors.secondary}
                          onChange={(e) => updateFormData('colors', 'secondary', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Accent Color</Label>
                        <Input
                          type="color"
                          value={formData.colors.accent}
                          onChange={(e) => updateFormData('colors', 'accent', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.contact.phone}
                        onChange={(e) => updateContact('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.contact.email}
                        onChange={(e) => updateContact('email', e.target.value)}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      value={formData.contact.whatsapp}
                      onChange={(e) => updateContact('whatsapp', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.contact.address}
                      onChange={(e) => updateContact('address', e.target.value)}
                      placeholder="123 Main St, City, State 12345"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hours">Business Hours</Label>
                    <Input
                      id="hours"
                      value={formData.contact.hours}
                      onChange={(e) => updateContact('hours', e.target.value)}
                      placeholder="Mon-Fri 9AM-6PM"
                    />
                  </div>
                </TabsContent>

                {/* SEO Tab */}
                <TabsContent value="seo" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo-title">Page Title</Label>
                    <Input
                      id="seo-title"
                      value={formData.seo.title}
                      onChange={(e) => updateFormData('seo', 'title', e.target.value)}
                      placeholder="Professional Psychology Services | Dr. Smith"
                    />
                    <p className="text-xs text-muted-foreground">
                      Appears in search results and browser tabs
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-description">Meta Description</Label>
                    <Textarea
                      id="seo-description"
                      value={formData.seo.description}
                      onChange={(e) => updateFormData('seo', 'description', e.target.value)}
                      placeholder="Get professional mental health support from licensed therapists..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Appears in search results (150-160 characters recommended)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-keywords">Keywords</Label>
                    <Input
                      id="seo-keywords"
                      value={formData.seo.keywords}
                      onChange={(e) => updateFormData('seo', 'keywords', e.target.value)}
                      placeholder="therapy, counseling, mental health, psychology"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated keywords for SEO
                    </p>
                  </div>
                </TabsContent>

                {/* Template Tab */}
                <TabsContent value="template" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.template === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          {formData.template === template.id && (
                            <Badge>Selected</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Preview</CardTitle>
                <div className="flex space-x-1">
                  <Button
                    variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('desktop')}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('tablet')}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice('mobile')}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-lg overflow-hidden ${
                  previewDevice === 'desktop' ? 'w-full h-96' :
                  previewDevice === 'tablet' ? 'w-80 h-96 mx-auto' :
                  'w-64 h-96 mx-auto'
                }`}
                style={{ backgroundColor: '#f8fafc' }}
              >
                <div 
                  className="h-full p-4 text-center flex flex-col justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${formData.colors.primary}20, ${formData.colors.accent}20)` 
                  }}
                >
                  <h2 
                    className="text-lg font-bold mb-2"
                    style={{ color: formData.colors.primary }}
                  >
                    {formData.content.headline}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {formData.content.subheadline}
                  </p>
                  <div 
                    className="inline-block px-4 py-2 rounded text-white text-sm font-medium"
                    style={{ backgroundColor: formData.colors.primary }}
                  >
                    {formData.content.cta}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}