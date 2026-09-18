import { useState, useRef, useEffect } from 'react'
import api from '../api/client.js'

export default function StudyChatbot({ subjectId }) {
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !subjectId) return

    const question = input.trim()
    const newMessages = [...messages, { role: 'user', content: question }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/chat', {
        subjectId,
        question,
        history: newMessages,
      })
      setMessages([...newMessages, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setError(err.response?.data?.error || 'Chat failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!subjectId) {
    return <p style={{ color: '#666' }}>Select a subject to start studying with the chatbot.</p>
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, maxWidth: 500 }}>
      <h3>Study Assistant</h3>

      <div style={{ height: 300, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ color: '#888' }}>Ask a question about this subject's course material.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#dbeafe' : '#f1f1f1',
              padding: '8px 12px',
              borderRadius: 12,
              maxWidth: '85%',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Thinking...</p>}
        <div ref={scrollRef} />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this subject..."
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  )
}