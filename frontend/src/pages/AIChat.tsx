import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
      <Card className="flex flex-col h-[600px] md:h-[700px]">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-4">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-3 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                    message.type === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={`flex flex-col ${
                    message.type === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`px-4 py-3 rounded-2xl max-w-full break-words ${
                      message.type === 'user'
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}>
                      {message.type === 'user' ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed prose prose-sm prose-gray max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 pl-4 list-disc">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              code: ({ children, className }) => 
                                className?.includes('language-') ? (
                                  <code className="block bg-gray-800 text-white p-3 rounded text-xs font-mono overflow-x-auto">
                                    {children}
                                  </code>
                                ) : (
                                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                                    {children}
                                  </code>
                                ),
                              pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
                              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-md font-bold mb-1">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-gray-300 pl-3 italic">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ href, children }) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <div className={`text-xs mt-1 px-2 ${
                      message.type === 'user' 
                        ? 'text-gray-500' 
                        : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex space-x-3 max-w-[85%] sm:max-w-[80%] md:max-w-[75%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-600">AI is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="flex-shrink-0 border-t pt-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your campaigns, targeting, or marketing strategy..."
                disabled={isLoading}
                className="flex-1 min-w-0"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}