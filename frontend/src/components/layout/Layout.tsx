import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  Target,
  BarChart3,
  Globe,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Bell,
  Search,
  HelpCircle,
  Shield,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, description: 'Overview & metrics' },
  { name: 'Campaigns', href: '/campaigns', icon: Target, description: 'Manage ad campaigns' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Performance insights' },
  { name: 'Landing Pages', href: '/landing-pages', icon: Globe, description: 'Page builder' },
  { name: 'AI Assistant', href: '/ai-chat', icon: MessageCircle, description: 'Smart recommendations' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Account preferences' },
]

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: ShieldCheck, description: 'System administration' },
]

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile menu */}
      <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary to-primary/90">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-white">AdWizard</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="mt-6 px-3">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`sidebar-item mb-1 ${
                    isActive(item.href)
                      ? 'sidebar-item-active'
                      : 'sidebar-item-inactive'
                  }`}
                >
                  <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </Link>
              )
            })}
            
            {/* Admin Navigation - Mobile */}
            {user.role === 'ADMIN' && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                  Administration
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`sidebar-item mb-1 ${
                        isActive(item.href)
                          ? 'sidebar-item-active'
                          : 'sidebar-item-inactive'
                      }`}
                    >
                      <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Mobile menu footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/50">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secure & Professional</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white shadow-xl border-r">
          {/* Sidebar Header */}
          <div className="flex items-center p-6 border-b bg-gradient-to-r from-primary to-primary/90">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AdWizard</h1>
                <p className="text-xs text-primary-foreground/80">Professional Marketing</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item mb-1 ${
                    isActive(item.href)
                      ? 'sidebar-item-active'
                      : 'sidebar-item-inactive'
                  }`}
                >
                  <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </Link>
              )
            })}
            
            {/* Admin Navigation */}
            {user.role === 'ADMIN' && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                  Administration
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`sidebar-item mb-1 ${
                        isActive(item.href)
                          ? 'sidebar-item-active'
                          : 'sidebar-item-inactive'
                      }`}
                    >
                      <Icon className="mr-3 w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Enterprise Grade</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              © 2024 AdWizard Pro
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Quick Search */}
              <div className="hidden md:flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2 min-w-[300px]">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search campaigns, pages, analytics..."
                  className="bg-transparent border-0 outline-0 flex-1 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      3
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">You have 3 unread notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <DropdownMenuItem>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Campaign Performance Alert</p>
                        <p className="text-xs text-muted-foreground">Psychology Practice Campaign CTR dropped by 15%</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">New Lead Generated</p>
                        <p className="text-xs text-muted-foreground">John Doe submitted contact form</p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Budget Threshold Reached</p>
                        <p className="text-xs text-muted-foreground">Campaign has spent 80% of monthly budget</p>
                        <p className="text-xs text-muted-foreground">1 day ago</p>
                      </div>
                    </DropdownMenuItem>
                  </div>
                  <div className="px-3 py-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>


              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 pl-3 pr-4 py-2">
                    <Avatar className="w-8 h-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {user?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="px-3 py-3 border-b">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {user?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <div>
                          <p className="text-sm">Settings</p>
                          <p className="text-xs text-muted-foreground">Account preferences</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <div>
                        <p className="text-sm">Help & Support</p>
                        <p className="text-xs text-muted-foreground">Get assistance</p>
                      </div>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />

                  <div className="py-1">
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <div>
                        <p className="text-sm">Sign out</p>
                        <p className="text-xs text-red-500/70">End your session</p>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}