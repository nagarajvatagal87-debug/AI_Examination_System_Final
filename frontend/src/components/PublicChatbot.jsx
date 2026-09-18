import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export default function PublicChatbot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const question = input.trim()
    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data } = await publicApi.post('/public/chat', { question, history: newMessages })
      setMessages([...newMessages, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, maxWidth: 500 }}>
      <h3>College AI Assistant</h3>
      <div style={{ height: 250, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && <p style={{ color: '#888' }}>Ask about departments, fees, placements...</p>}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            background: m.role === 'user' ? '#dbeafe' : '#f1f1f1',
            padding: '8px 12px', borderRadius: 12, maxWidth: '85%',
          }}>
            {m.content}
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Thinking...</p>}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." style={{ flex: 1 }} />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  )
}