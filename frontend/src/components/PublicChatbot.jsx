import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './PublicChatbot.css'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

const SUGGESTED_QUESTIONS = [
  'What departments are available at DSATM?',
  'Tell me about the MCA department placement rate.',
  'What are the course fee details for CSE?',
]

export default function PublicChatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(questionText) {
    if (!questionText.trim() || loading) return

    const question = questionText.trim()
    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data } = await publicApi.post('/public/chat', { question, history: newMessages })
      setMessages([...newMessages, { role: 'assistant', content: data.answer || 'Thank you for inquiring!' }])
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'I am here to assist! Please check back or try asking another question about departments & fees.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="public-chatbot-card">
      <div className="chatbot-header">
        <div className="chatbot-avatar">🤖</div>
        <div className="chatbot-title-wrap">
          <h3>College AI Assistant</h3>
          <span className="chatbot-status">● Live Information AI</span>
        </div>
      </div>

      <div className="chatbot-messages-area">
        {messages.length === 0 && (
          <div className="chatbot-empty-state">
            <div className="empty-icon">💬</div>
            <p>Ask anything about departments, fees, placements, or facilities.</p>

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
            {m.content}
          </div>
        ))}

        {loading && <div className="chat-typing-indicator">⚡ AI Assistant is typing...</div>}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="chatbot-input-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about fees, courses..."
          className="chatbot-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="chatbot-send-btn">
          Send
        </button>
      </form>
    </div>
  )
}