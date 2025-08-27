import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  AlertCircle,
  Activity,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react'

// Mock data - in real app this would come from API
const mockUsers = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@email.com',
    role: 'client',
    status: 'active',
    createdAt: new Date('2024-01-15'),
    campaignsCount: 3,
    totalSpend: 2500,
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    email: 'michael.chen@email.com',
    role: 'client',
    status: 'active',
    createdAt: new Date('2024-02-01'),
    campaignsCount: 1,
    totalSpend: 800,
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@email.com',
    role: 'client',
    status: 'inactive',
    createdAt: new Date('2024-01-10'),
    campaignsCount: 2,
    totalSpend: 1200,
  },
]

const mockSystemStats = {
  totalUsers: 156,
  activeUsers: 134,
  totalCampaigns: 289,
  activeCampaigns: 67,
  totalRevenue: 45600,
  monthlyGrowth: 12.5,
}

export default function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSystemStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {mockSystemStats.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSystemStats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              of {mockSystemStats.totalCampaigns} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockSystemStats.totalRevenue)}</div>
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
            <div className="text-2xl font-bold">+{mockSystemStats.monthlyGrowth}%</div>
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
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUsers.map((user) => (
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
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
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
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Campaign Management</h3>
                <p className="text-muted-foreground">
                  Advanced campaign management tools will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AI Generation Limit</span>
                    <span className="text-sm font-medium">50/day per user</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Max Campaigns per User</span>
                    <span className="text-sm font-medium">10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Rate Limit</span>
                    <span className="text-sm font-medium">100/minute</span>
                  </div>
                </div>
                <Button className="w-full">
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
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">SSL Certificate Valid</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">Database Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm">2 Failed Login Attempts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
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
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                System-wide performance and usage analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Comprehensive platform analytics and insights will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}