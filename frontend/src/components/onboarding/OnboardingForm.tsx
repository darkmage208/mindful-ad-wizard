import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingAPI } from '@/lib/api'
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'

const onboardingSchema = z.object({
  city: z.string().min(2, 'City is required'),
  targetAudience: z.string().min(10, 'Please describe your target audience'),
  averageTicket: z.number().min(1, 'Average ticket value is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  businessGoals: z.array(z.string()).min(1, 'Select at least one business goal'),
  budget: z.number().min(100, 'Minimum budget is $100'),
  experience: z.string().min(1, 'Experience level is required'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

const businessGoalOptions = [
  'Increase brand awareness',
  'Generate more leads',
  'Increase online bookings',
  'Expand to new markets',
  'Build email list',
  'Improve client retention',
  'Launch new service',
  'Increase average order value',
]

const serviceTypeOptions = [
  'Individual Therapy',
  'Couples Therapy',
  'Family Therapy',
  'Group Therapy',
  'Online Therapy',
  'Specialized Treatment',
  'Coaching',
  'Workshops/Seminars',
]

const experienceOptions = [
  'New to digital marketing',
  'Some experience with online ads',
  'Experienced with Meta/Google Ads',
  'Professional marketer',
]

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessGoals: [],
    },
  })

  const watchedValues = watch()

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const getFieldsForStep = (step: number): (keyof OnboardingFormData)[] => {
    switch (step) {
      case 1: return ['city', 'serviceType']
      case 2: return ['targetAudience', 'averageTicket']
      case 3: return ['businessGoals', 'budget']
      case 4: return ['experience']
      default: return []
    }
  }

  const handleGoalToggle = (goal: string) => {
    const currentGoals = watchedValues.businessGoals || []
    const updatedGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal]
    
    setValue('businessGoals', updatedGoals)
  }

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)
    setError('')

    try {
      await onboardingAPI.submit(data)
      navigate('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Something went wrong'
        : 'Something went wrong'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Let's get started</h2>
              <p className="text-muted-foreground">Tell us about your practice</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="city">City/Location</Label>
                <Input
                  id="city"
                  placeholder="e.g., New York, NY"
                  {...register('city')}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Type of Service</Label>
                <Select onValueChange={(value) => setValue('serviceType', value)}>
                  <SelectTrigger className={errors.serviceType ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your main service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
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
              <h2 className="text-2xl font-bold">Your Target Market</h2>
              <p className="text-muted-foreground">Help us understand who you serve</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Describe your ideal clients (age, demographics, concerns, etc.)"
                  className={errors.targetAudience ? 'border-red-500' : ''}
                  {...register('targetAudience')}
                />
                {errors.targetAudience && (
                  <p className="text-sm text-red-500">{errors.targetAudience.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageTicket">Average Session Cost ($)</Label>
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
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Business Goals</h2>
              <p className="text-muted-foreground">What do you want to achieve?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select your main business goals (choose all that apply):</Label>
                <div className="grid grid-cols-2 gap-3">
                  {businessGoalOptions.map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        checked={watchedValues.businessGoals?.includes(goal)}
                        onCheckedChange={() => handleGoalToggle(goal)}
                      />
                      <Label className="text-sm">{goal}</Label>
                    </div>
                  ))}
                </div>
                {errors.businessGoals && (
                  <p className="text-sm text-red-500">{errors.businessGoals.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Advertising Budget ($)</Label>
                <Select onValueChange={(value) => setValue('budget', parseInt(value))}>
                  <SelectTrigger className={errors.budget ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your monthly ad budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">$500 - $1,000</SelectItem>
                    <SelectItem value="1000">$1,000 - $2,500</SelectItem>
                    <SelectItem value="2500">$2,500 - $5,000</SelectItem>
                    <SelectItem value="5000">$5,000 - $10,000</SelectItem>
                    <SelectItem value="10000">$10,000+</SelectItem>
                  </SelectContent>
                </Select>
                {errors.budget && (
                  <p className="text-sm text-red-500">{errors.budget.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Experience Level</h2>
              <p className="text-muted-foreground">Help us customize your experience</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Digital Marketing Experience</Label>
                <Select onValueChange={(value) => setValue('experience', value)}>
                  <SelectTrigger className={errors.experience ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceOptions.map((exp) => (
                      <SelectItem key={exp} value={exp}>
                        {exp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.experience && (
                  <p className="text-sm text-red-500">{errors.experience.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 4
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up your account...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}