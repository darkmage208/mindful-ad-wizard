import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Key,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const { user } = useAuth()
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: '',
    bio: '',
  })

  const [notifications, setNotifications] = useState({
    emailReports: true,
    campaignAlerts: true,
    leadNotifications: true,
    weeklyDigest: false,
    marketingTips: true,
  })

  const [apiKeys, setApiKeys] = useState({
    metaAccessToken: '',
    googleAdsCustomerId: '',
    openaiApiKey: '',
  })

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      // API call to update profile
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsLoading(true)
    try {
      // API call to update notification preferences
      toast.success('Notification preferences updated!')
    } catch (error) {
      toast.error('Failed to update notification preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveApiKeys = async () => {
    setIsLoading(true)
    try {
      // API call to update API keys
      toast.success('API keys updated successfully!')
    } catch (error) {
      toast.error('Failed to update API keys')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and platform configurations.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-1">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center space-x-1">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-1">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Practice/Company</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your practice and specialties..."
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you want to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-reports">Email Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive detailed campaign performance reports via email
                    </p>
                  </div>
                  <Switch
                    id="email-reports"
                    checked={notifications.emailReports}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, emailReports: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="campaign-alerts">Campaign Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when campaigns need attention or optimization
                    </p>
                  </div>
                  <Switch
                    id="campaign-alerts"
                    checked={notifications.campaignAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, campaignAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="lead-notifications">Lead Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Instant notifications for new leads from your campaigns
                    </p>
                  </div>
                  <Switch
                    id="lead-notifications"
                    checked={notifications.leadNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, leadNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weekly-digest">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of your campaign performance and insights
                    </p>
                  </div>
                  <Switch
                    id="weekly-digest"
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, weeklyDigest: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketing-tips">Marketing Tips</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive helpful marketing tips and best practices
                    </p>
                  </div>
                  <Switch
                    id="marketing-tips"
                    checked={notifications.marketingTips}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, marketingTips: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Integrations</CardTitle>
              <CardDescription>
                Connect your advertising accounts and AI services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-token">Meta Access Token</Label>
                  <div className="relative">
                    <Input
                      id="meta-token"
                      type={showApiKeys ? 'text' : 'password'}
                      placeholder="Enter your Meta (Facebook) access token"
                      value={apiKeys.metaAccessToken}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKeys(!showApiKeys)}
                    >
                      {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required for creating and managing Meta (Facebook & Instagram) ad campaigns
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-customer-id">Google Ads Customer ID</Label>
                  <Input
                    id="google-customer-id"
                    placeholder="123-456-7890"
                    value={apiKeys.googleAdsCustomerId}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, googleAdsCustomerId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Google Ads account customer ID for campaign management
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type={showApiKeys ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKeys.openaiApiKey}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for AI-powered content generation and optimization
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveApiKeys} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save API Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Billing Management</h3>
                <p className="text-muted-foreground mb-6">
                  Subscription and billing features will be available here.
                </p>
                <Button variant="outline">Contact Support</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and privacy settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Security Features</h3>
                <p className="text-muted-foreground mb-6">
                  Advanced security settings including 2FA, session management, and privacy controls will be available here.
                </p>
                <Button variant="outline">Learn More</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}