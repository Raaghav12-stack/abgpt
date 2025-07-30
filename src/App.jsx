import { useState, useRef, useEffect } from 'react'
import {
  Home,
  MessageCircle,
  Clock,
  Settings,
  FileText,
  Trash2,
  Search,
  UserPlus,
  Plus,
  Paperclip,
  Send
} from 'lucide-react'
import { Button } from './components/ui/button.jsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef(null)

  const sidebarIcons = [
    { icon: Home, active: true },
    { icon: MessageCircle, active: false },
    { icon: Clock, active: false },
    { icon: Settings, active: false },
    { icon: FileText, active: false },
    { icon: Trash2, active: false }
  ]

  const examplePrompts = [
    "Can you compare how Aditya Birla Capital performed against Bajaj Finance in Q4 2025 ?",
    "Please help me summarise the q4 for bajaj finance .. give me some key takeways !",
    "Can you provide me the PAT details for both ABC and bajaj finance ?",
    "Can you come up with consolidated revenue and PAT details for Aditya Birla Capital ?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage = message.trim()
    setMessage('')
    setShowWelcome(false)

    const newUserMessage = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      const res = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(userMessage)}`)
      const data = await res.json()

      const aiResponse = {
        id: Date.now() + 1,
        text: data.response,
        sender: 'ai',
        timestamp: new Date(),
        sources: data.sources
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error("Error fetching AI response:", error)
      const fallback = {
        id: Date.now() + 1,
        text: "⚠️ Unable to get a response from the AI.",
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallback])
    }

    setIsLoading(false)
  }

  const handleExampleClick = (prompt) => {
    setMessage(prompt)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-screen chat-container overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 secondary-bg border-r border-gray-200 flex flex-col items-center py-4 space-y-4 flex-shrink-0">
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>

        <div className="flex flex-col space-y-3">
          {sidebarIcons.map((item, index) => (
            <button
              key={index}
              className={`p-2 rounded-lg transition-colors ${
                item.active
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-end space-y-3">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="secondary-bg border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white">
              <option>ChatGPT 4o</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <Search size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <UserPlus size={20} />
            </button>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white px-3 sm:px-4 py-2 rounded-lg text-sm">
              <Plus size={16} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Thread</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {showWelcome ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 welcome-screen overflow-y-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-6 sm:mb-8">
                <div className="w-full h-full rounded-full purple-avatar"></div>
              </div>
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">
                  Hello, Jason
                </h1>
                <p className="text-lg sm:text-xl text-gray-600">
                  What's on <span style={{ color: 'var(--primary-color)' }}>your mind?</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8 chat-messages">
              <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} message-fade-in`}
                  >
                   <div
                      className={`max-w-full sm:max-w-2xl px-3 sm:px-4 py-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white ml-auto shadow-lg'
                          : 'bg-white text-gray-800 shadow-md'
                      }`}
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      
                    {msg.sender === 'ai' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold my-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold my-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold my-1">{children}</h3>,
                            p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-sm">{children}</ul>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-gray-100 text-red-600 px-1 rounded">{children}</code>,
                            table: ({ children }) => (
                              <div className="overflow-auto">
                                <table className="table-auto border-collapse border border-gray-300 text-sm my-2">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-gray-100 border border-gray-300">{children}</thead>
                            ),
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
                            td: ({ children }) => (
                              <td className="border border-gray-300 px-2 py-1">{children}</td>
                            ),
                            th: ({ children }) => (
                              <th className="border border-gray-300 px-2 py-1 font-semibold text-left">{children}</th>
                            )
                          }}
                        >
                          {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  )}
                      <p className={`text-xs mt-2 ${
                        msg.sender === 'user' ? 'text-red-100' : 'text-gray-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Source images for AI */}
                      {msg.sender === 'ai' && msg.sources?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500">Sources:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.sources.map((src, i) => (
                              <div key={i} className="text-xs text-gray-700">
                                <p className="mb-1">Page {src.page} — {src.company}</p>
                                {/* <img
                                  src={`http://localhost:8000${src.image_path}`}
                                  alt={`Page ${src.page}`}
                                  className="rounded shadow-md border"
                                /> */}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="ai-response-block text-gray-800 max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 secondary-bg transition-all duration-500 flex-shrink-0 ${
            showWelcome ? 'input-welcome' : 'input-chat'
          }`}>
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Ask AI a question or make a request"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-12 sm:pr-16 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-500 text-sm sm:text-base"
                />
                <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 sm:space-x-2">
                  <button type="button" className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                    <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--primary-color)',
                      ':hover': { backgroundColor: 'var(--primary-color)' }
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#a91125'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary-color)'}
                  >
                    <Send size={14} className="text-white sm:w-4 sm:h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          
          {showWelcome && (
            <div className="px-4 sm:px-6 py-4 sm:py-8 secondary-bg example-prompts flex-shrink-0 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                <p className="text-center text-gray-500 text-xs sm:text-sm mb-6 sm:mb-8 uppercase tracking-wide font-medium">
                  Get started with an example below
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(prompt)}
                      className="example-card p-4 sm:p-6 text-left rounded-2xl group"
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-pink-500 mt-1 sm:mt-2 flex-shrink-0"></div>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors duration-300">{prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

