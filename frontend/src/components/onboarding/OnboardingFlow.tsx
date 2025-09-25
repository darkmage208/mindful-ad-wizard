import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Loader2, ArrowRight, ArrowLeft, Target, MapPin, DollarSign, Briefcase, TrendingUp, Zap } from 'lucide-react'
import { onboardingAPI } from '@/lib/api'

const onboardingSchema = z.object({
  city: z.string().min(2, 'City is required'),
  targetAudience: z.string().min(10, 'Please describe your target audience in detail'),
  averageTicket: z.number().min(1, 'Average ticket value must be greater than 0'),
  serviceType: z.string().min(2, 'Service type is required'),
  businessGoals: z.array(z.string()).min(1, 'Please select at least one business goal'),
  budget: z.number().min(100, 'Budget must be at least $100'),
  experience: z.string().min(1, 'Please select your experience level'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

const BUSINESS_GOALS = [
  'Increase brand awareness',
  'Generate more leads',
  'Boost sales and conversions',
  'Expand to new markets',
  'Improve customer retention',
  'Launch a new product/service',
  'Build online presence',
  'Compete with competitors'
]

const SERVICE_TYPES = [
  'Healthcare & Medical',
  'Fitness & Wellness',
  'Professional Services',
  'Real Estate',
  'E-commerce',
  'Restaurants & Food',
  'Beauty & Cosmetics',
  'Education & Training',
  'Home Services',
  'Technology & Software',
  'Legal Services',
  'Financial Services',
  'Other'
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner - New to digital marketing' },
  { value: 'intermediate', label: 'Intermediate - Some experience with ads' },
  { value: 'advanced', label: 'Advanced - Experienced marketer' },
  { value: 'expert', label: 'Expert - Marketing professional' }
]

export default function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessGoals: [],
    }
  })

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const handleGoalToggle = (goal: string) => {
    const newGoals = selectedGoals.includes(goal)
      ? selectedGoals.filter(g => g !== goal)
      : [...selectedGoals, goal]
    setSelectedGoals(newGoals)
    setValue('businessGoals', newGoals)
  }

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)

    try {
      const response = await onboardingAPI.submitOnboarding({
        city: data.city,
        targetAudience: data.targetAudience,
        averageTicket: data.averageTicket,
        serviceType: data.serviceType,
        businessGoals: data.businessGoals,
        budget: data.budget,
        experience: data.experience,
      })

      toast.success('Onboarding completed successfully!', {
        description: `Generated ${response.data.data.campaignCount} initial campaigns for you.`
      })

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Onboarding failed'
        : 'Onboarding failed'
      toast.error('Onboarding failed', {
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tell us about your business</h3>
              <p className="text-muted-foreground">We'll create targeted campaigns for your location and industry</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City/Location</Label>
                <Input
                  id="city"
                  placeholder="e.g., New York, Los Angeles, Miami"
                  {...register('city')}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select onValueChange={(value) => setValue('serviceType', value)}>
                  <SelectTrigger className={errors.serviceType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serviceType && (
                  <p className="text-sm text-red-500">{errors.serviceType.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Define your target audience</h3>
              <p className="text-muted-foreground">Help us understand who your ideal customers are</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Describe your ideal customers (age, gender, interests, income level, etc.)"
                  rows={4}
                  {...register('targetAudience')}
                  className={errors.targetAudience ? 'border-red-500' : ''}
                />
                {errors.targetAudience && (
                  <p className="text-sm text-red-500">{errors.targetAudience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageTicket">Average Transaction Value ($)</Label>
                <Input
                  id="averageTicket"
                  type="number"
                  placeholder="e.g., 150"
                  {...register('averageTicket', { valueAsNumber: true })}
                  className={errors.averageTicket ? 'border-red-500' : ''}
                />
                {errors.averageTicket && (
                  <p className="text-sm text-red-500">{errors.averageTicket.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  What's the average value of a single transaction or sale?
                </p>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">What are your business goals?</h3>
              <p className="text-muted-foreground">Select all that apply to help us optimize your campaigns</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUSINESS_GOALS.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={selectedGoals.includes(goal)}
                    onCheckedChange={() => handleGoalToggle(goal)}
                  />
                  <Label
                    htmlFor={goal}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
            {errors.businessGoals && (
              <p className="text-sm text-red-500">{errors.businessGoals.message}</p>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Budget and Experience</h3>
              <p className="text-muted-foreground">Final details to create your perfect campaign strategy</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 1000"
                  {...register('budget', { valueAsNumber: true })}
                  className={errors.budget ? 'border-red-500' : ''}
                />
                {errors.budget && (
                  <p className="text-sm text-red-500">{errors.budget.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  How much do you want to spend on advertising per month?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience Level</Label>
                <Select onValueChange={(value) => setValue('experience', value)}>
                  <SelectTrigger className={errors.experience ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.experience && (
                  <p className="text-sm text-red-500">{errors.experience.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Welcome to Mindful Ad Wizard</h1>
          <p className="text-muted-foreground">Let's set up your AI-powered advertising campaigns</p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Step {step} of {totalSteps}</CardTitle>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStep()}

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                {step === totalSteps ? (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Setting up campaigns...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Complete Setup
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? <a href="/support" className="text-primary hover:underline">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  )
}