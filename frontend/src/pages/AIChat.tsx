import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { aiAPI, campaignsAPI } from '@/lib/api'
import { Campaign } from '@/types'
import {
  Send,
  Bot,
  User,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Target,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface Suggestion {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  prompt: string
}

const suggestions: Suggestion[] = [
  {
    id: 'campaign-analysis',
    title: 'Analyze Campaign Performance',
    description: 'Get insights and recommendations for your campaigns',
    icon: <TrendingUp className="h-4 w-4" />,
    prompt: 'Analyze the performance of my current campaigns and provide recommendations for improvement.',
  },
  {
    id: 'audience-targeting',
    title: 'Improve Audience Targeting',
    description: 'Get suggestions for better audience segmentation',
    icon: <Target className="h-4 w-4" />,
    prompt: 'Help me improve my audience targeting strategy for better campaign results.',
  },
  {
    id: 'ad-copy',
    title: 'Generate Ad Copy',
    description: 'Create compelling headlines and descriptions',
    icon: <MessageCircle className="h-4 w-4" />,
    prompt: 'Generate new ad copy variations for my psychology practice campaigns.',
  },
  {
    id: 'optimization',
    title: 'Optimization Tips',
    description: 'Learn how to optimize your campaigns',
    icon: <Lightbulb className="h-4 w-4" />,
    prompt: 'What are the best practices for optimizing psychology practice ad campaigns?',
  },
]

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI marketing assistant. I can help you analyze campaigns, generate ad copy, optimize targeting, and provide marketing insights for your psychology practice. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsAPI.getAll().then(res => res.data.data.campaigns || []),
  })

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const context = {
        campaigns: campaigns.map(c => ({
          name: c.name,
          status: c.status,
          platform: c.platform,
          budget: c.budget,
          metrics: c.metrics,
        })),
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      }

      const response = await aiAPI.chat(messageContent, context)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.data.data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      toast.error('Failed to get AI response')
      console.error('AI Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    sendMessage(suggestion.prompt)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <span>AI Marketing Assistant</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Get intelligent insights and recommendations for your advertising campaigns
        </p>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          {suggestions.map((suggestion) => (
            <Card 
              key={suggestion.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {suggestion.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <Card className="h-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-2 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`p-2 rounded-full ${
                    message.type === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' 
                        ? 'text-blue-100' 
                        : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex space-x-2">
                  <div className="p-2 rounded-full bg-gray-200">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your campaigns, targeting, or marketing strategy..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}