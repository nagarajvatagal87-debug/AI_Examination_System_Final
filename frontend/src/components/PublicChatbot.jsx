import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import './PublicChatbot.css'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

const SUGGESTED_QUESTIONS = [
  'What departments are available at DSATM?',
  'Tell me about the MCA department placement & fee rate.',
  'Where is DSATM located and how to reach?',
  'Show me nearby student PGs & hostels.',
]

export default function PublicChatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatAreaRef = useRef(null)

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [messages, loading])

  async function sendMessage(questionText) {
    if (!questionText.trim() || loading) return

    const question = questionText.trim()
    const historyToSend = messages.slice(-6)
    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data } = await publicApi.post('/public/chat', { question, history: historyToSend })
      setMessages([...newMessages, { role: 'assistant', content: data.answer || 'Thank you for inquiring! Please feel free to ask more details about DSATM.' }])
    } catch (err) {
      console.warn('Chat request failed, trying fallback response:', err)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'I encountered a brief connectivity delay. You can contact the DSATM Admissions Helpline at **+91 80 2843 2999** or ask another question about departments, fees, or campus location.'
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleClearChat() {
    setMessages([])
    setInput('')
  }

  return (
    <div className="public-chatbot-card">
      <div className="chatbot-header">
        <div className="chatbot-avatar">🤖</div>
        <div className="chatbot-title-wrap">
          <h3>College AI Assistant</h3>
          <span className="chatbot-status">● Live RAG Information AI</span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="chatbot-clear-btn"
            onClick={handleClearChat}
            title="Reset conversation"
          >
            🔄 Reset
          </button>
        )}
      </div>

      <div className="chatbot-messages-area" ref={chatAreaRef}>
        {messages.length === 0 && (
          <div className="chatbot-empty-state">
            <div className="empty-icon">💬</div>
            <p>Ask anything about departments, fees, placements, location, or nearby PGs.</p>

            <div className="quick-prompts-label">Suggested Questions:</div>
            <div className="quick-prompts-wrap">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="quick-prompt-btn"
                  onClick={() => sendMessage(q)}
                >
                  💡 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
            {m.role === 'assistant' ? (
              <div className="markdown-content">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-typing-indicator">
            <span className="typing-pulse">⚡</span> AI Assistant is searching campus records...
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="mini-chips-wrap">
          {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
            <button
              key={q}
              type="button"
              className="mini-chip-btn"
              disabled={loading}
              onClick={() => sendMessage(q)}
            >
              💡 {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="chatbot-input-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about fees, location, PGs..."
          className="chatbot-input"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="chatbot-send-btn">
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}