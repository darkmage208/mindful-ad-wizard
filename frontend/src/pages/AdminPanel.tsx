import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteUserConfirmDialog, UpdateCampaignConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import { adminAPI } from '@/lib/api'
import { AdminUser, SystemStats, SystemConfig } from '@/types/admin'
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  Activity,
  Eye,
  Edit,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react'

export default function AdminPanel() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isViewUserModalOpen, setIsViewUserModalOpen] = useState(false)
  const [isEditCampaignModalOpen, setIsEditCampaignModalOpen] = useState(false)
  const [isViewCampaignModalOpen, setIsViewCampaignModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false)
  const [isUpdateCampaignConfirmOpen, setIsUpdateCampaignConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [campaignToUpdate, setCampaignToUpdate] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch system stats
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminAPI.getStats().then(res => res.data.data),
  })

  // Fetch users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminAPI.getUsers().then(res => res.data.data),
  })

  // Fetch system config
  const { data: systemConfig, isLoading: configLoading } = useQuery<SystemConfig>({
    queryKey: ['admin-config'],
    queryFn: () => adminAPI.getConfig().then(res => res.data.data),
  })

  // Fetch campaigns
  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => adminAPI.getAllCampaigns().then(res => res.data.data),
  })

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminAPI.getAnalytics().then(res => res.data.data),
  })

  const users = usersData?.data || []
  const campaigns = campaignsData?.data || []

  // User management mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setIsEditModalOpen(false)
      setEditingUser(null)
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const updateConfigMutation = useMutation({
    mutationFn: (data: any) => adminAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] })
      setIsConfigModalOpen(false)
    },
  })

  const addUserMutation = useMutation({
    mutationFn: (data: any) => adminAPI.addUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setIsAddUserModalOpen(false)
    },
  })

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminAPI.updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      setIsEditCampaignModalOpen(false)
      setSelectedCampaign(null)
    },
  })

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user)
    setIsEditModalOpen(true)
  }

  const handleDeleteUser = (user: AdminUser) => {
    setUserToDelete(user)
    setIsDeleteUserConfirmOpen(true)
  }

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id)
      setIsDeleteUserConfirmOpen(false)
      setUserToDelete(null)
    }
  }

  const handleUpdateUser = (formData: any) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: formData })
    }
  }

  const handleUpdateConfig = (formData: any) => {
    updateConfigMutation.mutate(formData)
  }

  const handleViewUser = (user: AdminUser) => {
    setEditingUser(user)
    setIsViewUserModalOpen(true)
  }

  const handleAddUser = () => {
    setIsAddUserModalOpen(true)
  }

  const handleViewCampaign = (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsViewCampaignModalOpen(true)
  }

  const handleEditCampaign = (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsEditCampaignModalOpen(true)
  }

  const handleAddUserSubmit = (formData: any) => {
    addUserMutation.mutate(formData)
  }

  const handleUpdateCampaign = (formData: any) => {
    if (selectedCampaign) {
      setCampaignToUpdate({ ...selectedCampaign, ...formData })
      setIsUpdateCampaignConfirmOpen(true)
    }
  }

  const confirmUpdateCampaign = () => {
    if (campaignToUpdate) {
      updateCampaignMutation.mutate({ id: campaignToUpdate.id, data: campaignToUpdate })
      setIsUpdateCampaignConfirmOpen(false)
      setCampaignToUpdate(null)
    }
  }

  if (statsLoading || usersLoading || configLoading || campaignsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, campaigns, and system settings.
          </p>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.activeUsers || 0} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.activeCampaigns || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {systemStats?.totalCampaigns || 0} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(systemStats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{systemStats?.monthlyGrowth || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly growth
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts and permissions
                  </CardDescription>
                </div>
                <Button onClick={handleAddUser} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usersError && (
                  <div className="text-center py-4 text-red-500">
                    Error loading users: {usersError.message}
                  </div>
                )}
                {users.length === 0 && !usersLoading && !usersError && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Users Found</h3>
                    <p className="text-muted-foreground">
                      No users have been created yet.
                    </p>
                  </div>
                )}
                {users.map((user: AdminUser) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={user.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {user.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {user.campaignsCount} campaigns • {formatCurrency(user.totalSpend)} spent
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Oversight</CardTitle>
              <CardDescription>
                Monitor and manage all user campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaignsError && (
                  <div className="text-center py-4 text-red-500">
                    Error loading campaigns: {campaignsError.message}
                  </div>
                )}
                {campaigns.length === 0 && !campaignsLoading && !campaignsError ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Campaigns Found</h3>
                    <p className="text-muted-foreground">
                      No campaigns have been created yet.
                    </p>
                  </div>
                ) : (
                  campaigns.map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            by {campaign.user?.name || 'Unknown User'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {campaign.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {campaign.platform} • {formatCurrency(campaign.budget)} budget
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatCurrency(campaign.cost || 0)} spent
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {campaign._count?.campaignLeads || 0} leads
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewCampaign(campaign)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditCampaign(campaign)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className='flex flex-col'>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AI Generation Limit</span>
                    <span className="text-sm font-medium">{systemConfig?.aiGenerationLimit || 0}/day per user</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Max Campaigns per User</span>
                    <span className="text-sm font-medium">{systemConfig?.maxCampaignsPerUser || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Rate Limit</span>
                    <span className="text-sm font-medium">{systemConfig?.apiRateLimit || 0}/minute</span>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setIsConfigModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Update Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${systemConfig?.sslCertificateValid ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">SSL Certificate Valid</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${systemConfig?.databaseEncrypted ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">Database Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${(systemConfig?.failedLoginAttempts || 0) > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-sm">{systemConfig?.failedLoginAttempts || 0} Failed Login Attempts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${systemConfig?.apiKeysSecured ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">API Keys Secured</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Shield className="mr-2 h-4 w-4" />
                  Security Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Performance</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Impressions</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.platformPerformance?.totalImpressions?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Clicks</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.platformPerformance?.totalClicks?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Conversions</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.platformPerformance?.totalConversions?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average CTR</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.platformPerformance?.averageCTR?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Growth</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Users</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.userGrowth?.newUsers || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.userGrowth?.activeUsers || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Churned Users</span>
                    <span className="text-sm font-medium">
                      {analyticsData?.userGrowth?.churnedUsers || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Growth Rate</span>
                    <span className="text-sm font-medium">
                      +{analyticsData?.userGrowth?.growthRate || '0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Metrics</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(analyticsData?.revenueMetrics?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(analyticsData?.revenueMetrics?.monthlyRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Revenue/User</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(analyticsData?.revenueMetrics?.averageRevenuePerUser || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Revenue Growth</span>
                    <span className="text-sm font-medium">
                      +{analyticsData?.revenueMetrics?.revenueGrowth || '0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                System-wide performance and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Comprehensive platform analytics and insights are displayed above.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleUpdateUser({
                role: formData.get('role'),
                isActive: formData.get('isActive') === 'true',
                isVerified: formData.get('isVerified') === 'true',
              })
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={editingUser.name} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={editingUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <Select name="isActive" defaultValue={editingUser.status === 'active' ? 'true' : 'false'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isVerified">Verification</Label>
                <Select name="isVerified" defaultValue={editingUser.isVerified ? 'true' : 'false'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* System Configuration Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>System Configuration</DialogTitle>
            <DialogDescription>
              Update system settings and limits
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleUpdateConfig({
              aiGenerationLimit: parseInt(formData.get('aiGenerationLimit') as string),
              maxCampaignsPerUser: parseInt(formData.get('maxCampaignsPerUser') as string),
              apiRateLimit: parseInt(formData.get('apiRateLimit') as string),
            })
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiGenerationLimit">AI Generation Limit (per day)</Label>
              <Input 
                id="aiGenerationLimit" 
                name="aiGenerationLimit"
                type="number"
                defaultValue={systemConfig?.aiGenerationLimit || 50}
                min="1"
                max="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCampaignsPerUser">Max Campaigns per User</Label>
              <Input 
                id="maxCampaignsPerUser" 
                name="maxCampaignsPerUser"
                type="number"
                defaultValue={systemConfig?.maxCampaignsPerUser || 10}
                min="1"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiRateLimit">API Rate Limit (per minute)</Label>
              <Input 
                id="apiRateLimit" 
                name="apiRateLimit"
                type="number"
                defaultValue={systemConfig?.apiRateLimit || 100}
                min="10"
                max="10000"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending ? 'Updating...' : 'Update Configuration'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleAddUserSubmit({
              name: formData.get('name'),
              email: formData.get('email'),
              password: formData.get('password'),
              role: formData.get('role'),
              company: formData.get('company'),
            })
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="CLIENT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <Input id="company" name="company" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addUserMutation.isPending}>
                {addUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Modal */}
      <Dialog open={isViewUserModalOpen} onOpenChange={setIsViewUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View user information and activity
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{editingUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <p className="text-sm text-muted-foreground">{editingUser.role}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={editingUser.status === 'active' ? 'default' : 'secondary'}>
                    {editingUser.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Company</Label>
                  <p className="text-sm text-muted-foreground">{editingUser.company || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Verified</Label>
                  <Badge variant={editingUser.isVerified ? 'default' : 'secondary'}>
                    {editingUser.isVerified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Campaigns</Label>
                  <p className="text-sm text-muted-foreground">{editingUser.campaignsCount}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Spend</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(editingUser.totalSpend)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(editingUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Login</Label>
                  <p className="text-sm text-muted-foreground">
                    {editingUser.lastLogin ? new Date(editingUser.lastLogin).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsViewUserModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Campaign Modal */}
      <Dialog open={isViewCampaignModalOpen} onOpenChange={setIsViewCampaignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>
              View campaign information and performance
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Owner</Label>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.user?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Platform</Label>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.platform}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedCampaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {selectedCampaign.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Budget</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedCampaign.budget)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cost</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedCampaign.cost || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Leads</Label>
                  <p className="text-sm text-muted-foreground">{selectedCampaign._count?.campaignLeads || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Creatives</Label>
                  <p className="text-sm text-muted-foreground">{selectedCampaign._count?.creatives || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCampaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCampaign.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setIsViewCampaignModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Modal */}
      <Dialog open={isEditCampaignModalOpen} onOpenChange={setIsEditCampaignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update campaign settings and status
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleUpdateCampaign({
                name: formData.get('name'),
                status: formData.get('status'),
                budget: parseFloat(formData.get('budget') as string),
              })
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input id="name" name="name" defaultValue={selectedCampaign.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={selectedCampaign.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input 
                  id="budget" 
                  name="budget" 
                  type="number" 
                  step="0.01"
                  defaultValue={selectedCampaign.budget}
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditCampaignModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCampaignMutation.isPending}>
                  {updateCampaignMutation.isPending ? 'Updating...' : 'Update Campaign'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Professional Confirmation Dialogs */}
      <DeleteUserConfirmDialog
        open={isDeleteUserConfirmOpen}
        onOpenChange={setIsDeleteUserConfirmOpen}
        onConfirm={confirmDeleteUser}
        userName={userToDelete?.name || ''}
        isLoading={deleteUserMutation.isPending}
      />

      <UpdateCampaignConfirmDialog
        open={isUpdateCampaignConfirmOpen}
        onOpenChange={setIsUpdateCampaignConfirmOpen}
        onConfirm={confirmUpdateCampaign}
        campaignName={campaignToUpdate?.name || ''}
        isLoading={updateCampaignMutation.isPending}
      />
    </div>
  )
}