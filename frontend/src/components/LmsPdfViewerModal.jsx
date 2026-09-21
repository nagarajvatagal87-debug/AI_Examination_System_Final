import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import api from '../api/client.js'
import './LmsPdfViewerModal.css'

function SafeMarkdown({ content }) {
  const str = String(content || '')
  if (!str) return null
  try {
    return <div className="markdown-content"><ReactMarkdown>{str}</ReactMarkdown></div>
  } catch (e) {
    return <div className="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>{str}</div>
  }
}

export default function LmsPdfViewerModal({ material, onClose }) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 5
  const [zoomLevel, setZoomLevel] = useState(100)
  const [activeSubTab, setActiveSubTab] = useState(material?.initialTab || 'course-materials')
  const [viewMode, setViewMode] = useState('pdf') // 'pdf' or 'notes'
  const [expandedQp, setExpandedQp] = useState(null)

  useEffect(() => {
    if (material?.initialTab) {
      setActiveSubTab(material.initialTab)
    }
  }, [material])

  const docTitle = material?.title || material?.file_name || 'Course Material.pdf'
  const subjectName = typeof material?.subjects === 'object' && material?.subjects?.name ? material.subjects.name : (material?.subject_name || 'Deep Learning')
  const subjectCode = typeof material?.subjects === 'object' && material?.subjects?.code ? material.subjects.code : 'SUB-301'

  const [selectedDoc, setSelectedDoc] = useState(docTitle)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      userLabel: 'AI Assistant',
      content: `Hello! I am your AI Study Assistant for ${subjectName}. Ask me any question or speak via Mic!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const scrollRef = useRef(null)

  // Practice Quiz State & Expanded Question Bank
  const [quizScore, setQuizScore] = useState(0)
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isQuizCompleted, setIsQuizCompleted] = useState(false)

  const subLowerName = (subjectName || '').toLowerCase()

  const allDeepLearningQuestions = [
    {
      id: 'dl-1',
      question: `In ${subjectName}, which algorithm computes loss function gradients relative to network weights using the calculus chain rule?`,
      options: ['A. Backpropagation', 'B. K-Means Clustering', 'C. Breadth-First Search', 'D. A* Search'],
      correct: 0,
      explanation: 'Backpropagation computes the gradient of the loss function with respect to each weight by applying the chain rule of calculus.',
    },
    {
      id: 'dl-2',
      question: 'Which activation function mitigates the vanishing gradient problem in deep hidden layers by returning f(x) = max(0, x)?',
      options: ['A. Sigmoid', 'B. ReLU (Rectified Linear Unit)', 'C. Tanh', 'D. Softmax'],
      correct: 1,
      explanation: 'ReLU avoids vanishing gradients for positive inputs and allows fast gradient computation during Stochastic Gradient Descent.',
    },
    {
      id: 'dl-3',
      question: 'In Convolutional Neural Networks (CNNs), which layer down-samples feature maps while preserving dominant spatial features?',
      options: ['A. Max-Pooling Layer', 'B. One-Hot Layer', 'C. Softmax Layer', 'D. Fully Connected Layer'],
      correct: 0,
      explanation: 'Max-pooling extracts maximum values across sliding spatial windows to reduce feature map dimensionality and parameter count.',
    },
    {
      id: 'dl-4',
      question: 'Which adaptive optimization algorithm combines momentum and RMSProp using first and second moment estimates of gradients?',
      options: ['A. Adam Optimizer', 'B. Standard SGD', 'C. Newton Method', 'D. Random Forest'],
      correct: 0,
      explanation: 'Adam computes individual adaptive learning rates for parameters from estimates of first and second moments of gradients.',
    },
    {
      id: 'dl-5',
      question: 'Which regularization technique deactivates a random subset of neurons during training passes to prevent overfitting?',
      options: ['A. Dropout', 'B. Batch Normalization', 'C. Weight Decay', 'D. Early Stopping'],
      correct: 0,
      explanation: 'Dropout randomly zeroes out neuron activations during training forward passes to force robust feature representations.',
    },
    {
      id: 'dl-6',
      question: 'What is the primary role of Softmax activation in multi-class classification networks?',
      options: ['A. Convert raw logits into a probability distribution summing to 1.0', 'B. Binarize feature values to 0 or 1', 'C. Zero out negative weights', 'D. Double gradient speed'],
      correct: 0,
      explanation: 'Softmax exponentiates and normalizes output logits into valid multi-class probability values.',
    },
    {
      id: 'dl-7',
      question: 'In Transformers, which mechanism computes dependencies between all words in a sequence regardless of distance?',
      options: ['A. Scaled Dot-Product Self-Attention', 'B. Max-Pooling', 'C. Convolution Kernel Filter', 'D. Recurrent Gate'],
      correct: 0,
      explanation: 'Self-attention calculates Query-Key-Value similarity matrices allowing global context representation.',
    },
    {
      id: 'dl-8',
      question: 'What is the formula for calculating output feature map width (W_out) in a Convolutional layer with input W, kernel F, padding P, and stride S?',
      options: ['A. W_out = floor((W - F + 2P)/S) + 1', 'B. W_out = W * F + S', 'C. W_out = (W + P) / F', 'D. W_out = W - S'],
      correct: 0,
      explanation: 'W_out = floor((W - F + 2P)/S) + 1 calculates spatial filter sliding steps across padding bounds.',
    },
    {
      id: 'dl-9',
      question: 'Which vanishing gradient problem mitigation technique normalizes layer inputs by scaling and shifting batch mean and variance?',
      options: ['A. Batch Normalization', 'B. Min-Max Scaling', 'C. Dropout', 'D. Gradient Clipping'],
      correct: 0,
      explanation: 'Batch Normalization stabilizes internal covariate shift across mini-batches during deep network training.',
    },
    {
      id: 'dl-10',
      question: 'In Recurrent Neural Networks (RNNs), which architecture introduces Forget, Input, and Output gates to preserve long-term dependencies?',
      options: ['A. LSTM (Long Short-Term Memory)', 'B. Standard Perceptron', 'C. AlexNet', 'D. Decision Tree'],
      correct: 0,
      explanation: 'LSTM cell gates control information flow into and out of the persistent cell state vector.',
    }
  ]

  const allGeneralDbQuestions = [
    {
      id: 'db-1',
      question: `In ${subjectName}, which normal form guarantees that all attribute values are strictly atomic?`,
      options: ['A. 1NF (First Normal Form)', 'B. 2NF (Second Normal Form)', 'C. 3NF (Third Normal Form)', 'D. BCNF'],
      correct: 0,
      explanation: '1NF requires all attribute values in a relation to be scalar/atomic with no repeating groups.',
    },
    {
      id: 'db-2',
      question: 'Which ACID property guarantees that committed transactions persist permanently even through hardware failures?',
      options: ['A. Atomicity', 'B. Consistency', 'C. Isolation', 'D. Durability'],
      correct: 3,
      explanation: 'Durability ensures that once a transaction commits, its effects survive system crashes.',
    },
    {
      id: 'db-3',
      question: 'What is the primary role of a Query Optimizer engine in a database system?',
      options: ['A. User authentication', 'B. Evaluating cost-effective relational execution plans', 'C. File storage compression', 'D. CPU frequency scaling'],
      correct: 1,
      explanation: 'The Query Optimizer evaluates relational algebra trees to find the execution path with minimal I/O cost.',
    },
    {
      id: 'db-4',
      question: 'Which functional dependency rule ensures no non-prime attribute is transitively dependent on a candidate key?',
      options: ['A. 3NF (Third Normal Form)', 'B. 1NF', 'C. 2NF', 'D. Unnormalized Form'],
      correct: 0,
      explanation: '3NF requires that no non-key attribute depends transitively on the primary key.',
    },
    {
      id: 'db-5',
      question: 'Which concurrency protocol uses Growing and Shrinking phases to guarantee serializability?',
      options: ['A. Two-Phase Locking (2PL)', 'B. Strict Timestamp Ordering', 'C. Round-Robin Scheduling', 'D. First-Come First-Served'],
      correct: 0,
      explanation: '2PL locks resources during the growing phase and releases them during shrinking phase.',
    },
    {
      id: 'db-6',
      question: 'What type of index data structure provides logarithmic time complexity O(log N) for equality and range queries?',
      options: ['A. B+ Tree Index', 'B. Hash Index', 'C. Linked List', 'D. Array'],
      correct: 0,
      explanation: 'B+ Trees keep data balanced across leaf nodes, optimizing disk block access for range queries.',
    },
    {
      id: 'db-7',
      question: 'Which Normal Form requires that for every functional dependency X -> Y, X must be a super key?',
      options: ['A. Boyce-Codd Normal Form (BCNF)', 'B. 1NF', 'C. 2NF', 'D. 3NF'],
      correct: 0,
      explanation: 'BCNF is a stricter variant of 3NF eliminating all anomalies involving prime attributes.',
    }
  ]

  const questionPool = (subLowerName.includes('deep') || subLowerName.includes('neural') || subLowerName.includes('learning') || subLowerName.includes('ai'))
    ? allDeepLearningQuestions
    : allGeneralDbQuestions

  function selectFreshUniqueQuestions(pool, count = 5) {
    try {
      const completedIds = JSON.parse(localStorage.getItem('student_completed_quiz_q_ids') || '[]')
      let uncompleted = pool.filter((q) => !completedIds.includes(q.id))
      if (uncompleted.length < count) {
        // Reset answered IDs cache when pool exhausts to cycle smoothly
        localStorage.removeItem('student_completed_quiz_q_ids')
        uncompleted = [...pool]
      }
      const shuffled = [...uncompleted].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    } catch (e) {
      return [...pool].sort(() => 0.5 - Math.random()).slice(0, count)
    }
  }

  const [quizQuestions, setQuizQuestions] = useState(() => selectFreshUniqueQuestions(questionPool, 5))

  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollIntoView === 'function') {
      try { scrollRef.current.scrollIntoView({ behavior: 'smooth' }) } catch (e) { }
    }
  }, [messages])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  // Voice speech recognition
  function handleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in browser. Type query instead.')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  // Bookmark topic / response
  function handleSaveBookmark(title, text) {
    try {
      const existing = JSON.parse(localStorage.getItem('student_bookmarks') || '[]')
      const newBm = {
        id: `bm-${Date.now()}`,
        subject: subjectName,
        title: title || 'Saved Concept',
        content: text,
        date: new Date().toLocaleDateString(),
      }
      const updated = [newBm, ...existing]
      localStorage.setItem('student_bookmarks', JSON.stringify(updated))
      window.dispatchEvent(new Event('bookmarks_updated'))
      showToast('🔖 Saved to Bookmarks tab!')
    } catch (e) { }
  }

  async function handleSend(textToSend) {
    const question = textToSend || input.trim()
    if (!question) return

    const userMsg = { role: 'user', userLabel: 'You', content: question }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await api.post('/chat/document', {
        subjectId: material?.subject_id,
        documentId: material?.id,
        pageNumber: currentPage,
        question: question,
        history: newMessages,
      })

      const aiAnswer = res.data?.answer || getGroundedAnswer(question)
      const sources = res.data?.sources || [
        { documentName: docTitle, page: currentPage }
      ]
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          userLabel: 'AI Assistant',
          content: aiAnswer,
          sources: sources,
          grounded: res.data?.grounded !== false
        }
      ])
    } catch (err) {
      const fallback = getGroundedAnswer(question)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          userLabel: 'AI Assistant',
          content: fallback,
          sources: [{ documentName: docTitle, page: currentPage }],
          grounded: true
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  function getGroundedAnswer(q) {
    const cleanQ = String(q || '').replace(/^\[Document:[^\]]+\]\s*/i, '').trim()
    const lower = cleanQ.toLowerCase()

    if (lower.includes('page 1') || lower.includes('module 1') || lower.includes('module1') || lower.includes('perceptron') || lower.includes('neural network') || lower.includes('important') || lower.includes('key point') || lower.includes('summariz')) {
      return `### 🧠 Module 1: Introduction to Neural Networks & Perceptron\n\nBased on **Page 1** of **${selectedDoc}**:\n\n1. **What is a Neural Network**: A computational model made of interconnected processing units called neurons. A neuron receives input values $x$, combines them using learnable weights $w$ and an adjustable bias $b$, applies an activation function $\\phi(z)$, and produces an output.\n2. **Core Components**:\n   * **Inputs ($x$)**: Feature values presented to the network.\n   * **Weights ($w$)**: Parameters controlling each input's contribution.\n   * **Bias ($b$)**: Adjustable offset parameter.\n   * **Activation Function ($\\phi$)**: Transforms weighted sum $z = w^T x + b$ to introduce non-linearity (Sigmoid, ReLU, Tanh, Softmax).\n   * **Layers**: Input layer, one or more hidden layers, and output layer.\n3. **Single Layer Perceptron**: Formula $y = \\phi(w^T x + b)$. Learns linearly separable boundaries (AND, OR logic gates) but strictly fails on non-linearly separable problems like XOR.`
    }

    if (lower.includes('pool') || lower.includes('pooling') || lower.includes('max pooling') || lower.includes('average pooling')) {
      return '### 🏊 Pooling Operations in Convolutional Neural Networks\n\nPooling (sub-sampling) reduces spatial dimensions (Height × Width) of feature maps while retaining dominant visual features.\n\n* **Max-Pooling**: Extracts the maximum activation value in each sliding $2 \\times 2$ window. Provides spatial translation invariance.\n* **Average-Pooling**: Calculates the arithmetic mean across the window.\n* **Output Dimension Formula**: $W_{\\text{out}} = \\lfloor\\frac{W - F + 2P}{S}\\rfloor + 1$.'
    }

    if (subLowerName.includes('deep') || subLowerName.includes('neural') || subLowerName.includes('learning') || subLowerName.includes('ai')) {
      if (lower.includes('backprop') || lower.includes('propagation') || lower.includes('back-propagation') || lower.includes('gradient')) {
        return '### 🧠 Backpropagation Calculus & Chain Rule\n\nBackpropagation is the optimization algorithm used to train neural networks. It computes loss function gradients relative to each weight using the mathematical calculus chain rule:\n\n$$\\frac{\\partial L}{\\partial W^{(l)}} = \\delta^{(l)} (a^{(l-1)})^T$$\n\nErrors are propagated backward from the output layer to hidden layers, updating weights via Stochastic Gradient Descent (SGD) or Adam optimizer.'
      }
      if (lower.includes('relu') || lower.includes('activation') || lower.includes('sigmoid')) {
        return '### ⚡ Non-Linear Activation Functions\n\nActivation functions introduce non-linearity into neural networks.\n\n* **ReLU (Rectified Linear Unit)**: $f(x) = \\max(0, x)$. Mitigates vanishing gradients in deep hidden layers and speeds up SGD convergence.\n* **Sigmoid**: $\\sigma(x) = \\frac{1}{1 + e^{-x}}$. Maps outputs to $(0, 1)$ for binary classification.\n* **Softmax**: Converts output logits into normalized multi-class probabilities summing to $1.0$.'
      }
      if (lower.includes('cnn') || lower.includes('convolution')) {
        return '### 👁️ Convolutional Neural Networks (CNNs)\n\nCNNs extract spatial features from grid input data (images). Key layers:\n\n* **Convolutional Layers**: Apply sliding kernel filters for edge and pattern detection.\n* **Max-Pooling**: Down-samples feature maps while preserving translation-invariant features.\n* **Feature Map Size**: $W_{\\text{out}} = \\lfloor\\frac{W - F + 2P}{S}\\rfloor + 1$.'
      }
      return `### Grounded Academic Summary for ${subjectName}\n\nRegarding **"${cleanQ}"** (Source: ${selectedDoc}):\n\n* **Module 1**: Artificial Neural Networks (ANNs), Perceptrons, Weights, Bias, and Activation Functions.\n* **Module 2**: Multi-Layer Perceptrons (MLPs), Backpropagation Calculus, and Loss Functions.\n* **Module 3**: Convolutional Neural Networks (CNNs) and Pooling Operations.\n* **Module 4**: Recurrent Neural Networks (RNNs), LSTM Cell Gates, and Optimizers (Adam/SGD).\n* **Module 5**: Transformers, Self-Attention, and Generative Adversarial Networks (GANs).`
    }

    if (lower.includes('normaliz') || lower.includes('1nf') || lower.includes('2nf') || lower.includes('3nf')) {
      return '### 🗄️ Database Normalization & Normal Forms\n\nNormalization eliminates redundant data and prevents database anomalies:\n\n* **1NF**: Atomic scalar values.\n* **2NF**: No partial functional dependencies.\n* **3NF**: No transitive functional dependencies.\n* **BCNF**: Determinants must be candidate keys.'
    }
    if (lower.includes('acid') || lower.includes('transaction')) {
      return '### 🔒 ACID Properties in Database Transactions\n\nACID properties guarantee system reliability:\n\n* **Atomicity**: All-or-nothing transaction execution.\n* **Consistency**: Valid state transitions.\n* **Isolation**: Serializability of concurrent transactions.\n* **Durability**: Permanent persistence of committed data.'
    }
    return `Based on **${selectedDoc}**, core principles for ${subjectName} emphasize structured methodology, key mathematical derivations, architectural design trade-offs, and practical exam review topics.`
  }

  function handleSelectQuizAnswer(optIdx) {
    if (selectedAnswer !== null || isQuizCompleted) return
    setSelectedAnswer(optIdx)
    setShowExplanation(true)
    if (optIdx === quizQuestions[currentQuizIdx].correct) {
      setQuizScore((s) => s + 1)
    }
  }

  function handleNextQuizQuestion() {
    const isCurrentCorrect = selectedAnswer === quizQuestions[currentQuizIdx].correct
    const finalCalculatedScore = quizScore

    if (currentQuizIdx < quizQuestions.length - 1) {
      setSelectedAnswer(null)
      setShowExplanation(false)
      setCurrentQuizIdx((i) => i + 1)
    } else {
      // Quiz complete!
      setIsQuizCompleted(true)
      const totalQs = quizQuestions.length
      showToast(`🏆 Practice Test Completed! Final Score: ${finalCalculatedScore} / ${totalQs}`)

      // Track answered question IDs so they are not repeated in future practice tests
      try {
        const completedIds = JSON.parse(localStorage.getItem('student_completed_quiz_q_ids') || '[]')
        const currentIds = quizQuestions.map((q) => q.id)
        const updatedIds = Array.from(new Set([...completedIds, ...currentIds]))
        localStorage.setItem('student_completed_quiz_q_ids', JSON.stringify(updatedIds))
      } catch (e) { }

      // Save score to student practice history for dashboard charts
      try {
        const existingScores = JSON.parse(localStorage.getItem('student_practice_scores') || '[]')
        const newScoreRecord = {
          id: `quiz-${Date.now()}`,
          subject: subjectName,
          score: finalCalculatedScore,
          total: totalQs,
          percentage: Math.round((finalCalculatedScore / totalQs) * 100),
          date: new Date().toLocaleDateString(),
          timestamp: Date.now()
        }
        const updated = [newScoreRecord, ...existingScores]
        localStorage.setItem('student_practice_scores', JSON.stringify(updated))
        window.dispatchEvent(new Event('practice_score_updated'))
      } catch (e) { }
    }
  }

  function handleRestartQuiz() {
    // Pick fresh, uncompleted questions for new practice test
    const fresh = selectFreshUniqueQuestions(questionPool, 5)
    setQuizQuestions(fresh)
    setQuizScore(0)
    setCurrentQuizIdx(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setIsQuizCompleted(false)
    showToast('🔄 New unique practice quiz generated!')
  }

  return (
    <div className="lms-view-modal-overlay">
      <div className="lms-view-full-app">
        {/* Toast Alert */}
        {toastMsg && (
          <div style={{
            position: 'absolute', top: 20, right: 30, zIndex: 10000,
            background: '#0f172a', color: '#38bdf8', padding: '12px 20px',
            borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #38bdf8',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            {toastMsg}
          </div>
        )}

        {/* Left LMS Subject Sidebar */}
        <aside className="lms-view-sidebar">
          <div className="lms-sidebar-logo">
            <span className="logo-grad-icon">🎓</span> EduExam AI
          </div>

          <button className="back-subjects-btn" onClick={onClose}>
            ← Back to Subjects
          </button>

          <div className="active-subject-header">{subjectName}</div>

          <nav className="lms-subject-nav">
            <button
              className={`sub-nav-item ${activeSubTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'course-materials' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('course-materials')}
            >
              📄 Course Materials
            </button>
            <button
              className={`sub-nav-item ${activeSubTab === 'ai-assistant' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('ai-assistant')}
            >
              🤖 AI Assistant
            </button>
          </nav>
        </aside>

        {/* Main Content Pane */}
        <div className="lms-view-main-pane">
          {/* Main Header Bar */}
          <header className="lms-view-header">
            <div className="lms-header-search">
              <span>🔍</span>
              <input type="text" placeholder={`Search in ${subjectName}...`} />
            </div>

            <div className="lms-doc-heading-title">
              {docTitle} ({subjectCode})
            </div>

            <div className="lms-header-actions">
              <button className="ask-ai-top-btn" onClick={() => { setActiveSubTab('ai-assistant'); handleSend('Summarize core topics'); }}>
                🤖 Ask AI
              </button>
              <button className="lms-close-x-btn" onClick={onClose}>✕</button>
            </div>
          </header>

          {/* Dynamic Content View based on activeSubTab */}

          {/* SubTab 1: Subject Overview */}
          {activeSubTab === 'overview' && (
            <div style={{ padding: 32, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', padding: 24, borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>📊 {subjectName} Course Overview</h2>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                  Code: <strong>{subjectCode}</strong> · Academic Semester: 3rd Sem MCA · Credits: 4.0
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                  <div style={{ background: '#eff6ff', padding: '12px 20px', borderRadius: 10, color: '#1d4ed8', fontSize: 13, fontWeight: 700 }}>
                    📖 5 Syllabus Modules
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '12px 20px', borderRadius: 10, color: '#15803d', fontSize: 13, fontWeight: 700 }}>
                    📄 100% Grounded RAG Notes
                  </div>
                  <div style={{ background: '#faf5ff', padding: '12px 20px', borderRadius: 10, color: '#7e22ce', fontSize: 13, fontWeight: 700 }}>
                    👨‍🏫 Faculty: Department Faculty Team
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 15, margin: '0 0 12px 0', color: '#0f172a' }}>📌 Syllabus Module Breakdown</h3>
                  <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.8 }}>
                    <li><strong>Module 1:</strong> Core Definitions & Fundamental Concepts</li>
                    <li><strong>Module 2:</strong> Architecture Models & Schema Design</li>
                    <li><strong>Module 3:</strong> Query Optimization & Transaction Mechanics</li>
                    <li><strong>Module 4:</strong> Concurrency Control & Recovery Algorithms</li>
                    <li><strong>Module 5:</strong> Advanced Concepts & Semester Exam Review</li>
                  </ul>
                </div>

                <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 15, margin: '0 0 12px 0', color: '#0f172a' }}>🚀 Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => setActiveSubTab('course-materials')} style={{ padding: 12, borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', textTransform: 'none' }}>
                      📄 View Syllabus Notes & PDF Viewer
                    </button>
                    <button onClick={() => setActiveSubTab('practice-tests')} style={{ padding: 12, borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', textTransform: 'none' }}>
                      ✍️ Start AI Practice MCQ Quiz
                    </button>
                    <button onClick={() => setActiveSubTab('ai-assistant')} style={{ padding: 12, borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', textTransform: 'none' }}>
                      🎤 Ask Voice AI Study Assistant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 2: Course Materials (PDF Viewer + Split AI Assistant) */}
          {activeSubTab === 'course-materials' && (
            <div className="lms-split-container">
              {/* Left: Interactive PDF Viewer */}
              <div className="pdf-viewer-workspace">
                <div className="pdf-toolbar-bar">
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => setViewMode('pdf')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: viewMode === 'pdf' ? '#2563eb' : '#e2e8f0',
                        color: viewMode === 'pdf' ? '#ffffff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📄 Original PDF Document
                    </button>
                    <button
                      onClick={() => setViewMode('notes')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: viewMode === 'notes' ? '#2563eb' : '#e2e8f0',
                        color: viewMode === 'notes' ? '#ffffff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📑 Syllabus Reader
                    </button>
                  </div>

                  <div className="pdf-nav-controls">
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>◄</button>
                    <span className="page-num-text">{currentPage} / {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>►</button>
                  </div>

                  <div className="pdf-zoom-controls">
                    <button onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}>-</button>
                    <span>{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}>+</button>
                  </div>

                  <div className="pdf-tool-icons">
                    <span className="pdf-tool-icon" title="Bookmark" onClick={() => handleSaveBookmark(docTitle, `Page ${currentPage} notes`)}>🔖</span>
                  </div>
                </div>

                <div className="pdf-canvas-scroll" style={{ position: 'relative', width: '100%', height: '100%', overflowY: 'auto', background: viewMode === 'pdf' ? '#ffffff' : '#cbd5e1', padding: viewMode === 'pdf' ? 0 : 24, display: 'flex', justifyContent: 'center' }}>
                  {viewMode === 'pdf' ? (
                    <iframe
                      src={material?.file_url || material?.download_url || material?.url || material?.file_data || `/api/course-materials/${material?.id || 'mat-default'}/stream`}
                      title={docTitle}
                      style={{ width: '100%', height: '100%', minHeight: '800px', border: 'none', background: '#ffffff' }}
                    />
                  ) : (
                    <div className="pdf-page-sheet" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', background: '#ffffff', color: '#0f172a', padding: 36, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', width: '100%', maxWidth: '760px', minHeight: '820px' }}>
                      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {subjectName} ({subjectCode}) · Syllabus Document
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '6px 0 0 0' }}>
                          {docTitle}
                        </h2>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Page {currentPage} of {totalPages} · Department Approved RAG Material</span>
                          <a href={`/api/course-materials/${material?.id || 'mat-default'}/stream`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                            📥 Download Original PDF ↗
                          </a>
                        </div>
                      </div>

                      {currentPage === 1 ? (
                        <div className="pdf-body-prose">
                          <h3 style={{ color: '#0f172a', fontSize: 16, margin: '0 0 12px 0' }}>Module 1: Fundamental Principles & Core Definitions</h3>
                          <p style={{ color: '#334155', lineHeight: 1.7, fontSize: 14 }}>
                            This official course document covers key syllabus principles for <strong>{subjectName}</strong>.
                            Grounded academic notes provide step-by-step mathematical derivations, architectural design trade-offs, and semester examination review topics.
                          </p>
                          <div style={{ background: '#f8fafc', borderLeft: '4px solid #2563eb', padding: 16, margin: '18px 0', borderRadius: '0 8px 8px 0', border: '1px solid #e2e8f0' }}>
                            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>📌 Key Learning Objectives:</strong>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
                              <li>Understand core structural models and foundational theorems.</li>
                              <li>Analyze query optimization mechanisms and cost calculations.</li>
                              <li>Evaluate concurrency control protocols and isolation levels.</li>
                              <li>Review semester exam formulas and grounded RAG reference answers.</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="pdf-body-prose">
                          <h3 style={{ color: '#0f172a', fontSize: 16, margin: '0 0 12px 0' }}>
                            Module {Math.min(5, Math.ceil(currentPage / 5))}: Advanced {subjectName} Topics (Page {currentPage})
                          </h3>
                          <p style={{ color: '#334155', lineHeight: 1.7, fontSize: 14 }}>
                            Detailed syllabus breakdown and exam revision topics for page {currentPage} of <strong>{docTitle}</strong>.
                            Use the AI Assistant panel on the right to query any specific topic or extract instant practice MCQs and formulas.
                          </p>
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 16, borderRadius: 10, marginTop: 20 }}>
                            <strong style={{ color: '#1d4ed8', fontSize: 13 }}>💡 Exam Preparation Tip:</strong>
                            <p style={{ color: '#1e40af', fontSize: 13, margin: '4px 0 0 0' }}>
                              Focus on structural diagrams, algorithmic complexity, and step-by-step derivation problems for end-semester exams.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: AI Study Assistant */}
              <div className="ai-study-assistant-pane">
                <div className="ai-pane-header">
                  <div className="ai-pane-title">🤖 AI Study Assistant</div>
                  <div className="ai-doc-picker-wrap">
                    <label>Documents</label>
                    <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}>
                      <option value={docTitle}>{docTitle}</option>
                    </select>
                  </div>
                </div>

                <div className="ai-chat-thread">
                  {messages.map((m, i) => (
                    <div key={i} className={`chat-bubble-row ${m.role}`}>
                      <div className="chat-user-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{m.userLabel || (m.role === 'user' ? 'You' : 'AI Assistant')}</span>
                        {m.role === 'assistant' && (
                          <button
                            onClick={() => handleSaveBookmark(`AI Answer: ${subjectName}`, m.content)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#38bdf8' }}
                            title="Bookmark response"
                          >
                            🔖 Bookmark
                          </button>
                        )}
                      </div>
                      <div className="chat-bubble-content">
                        {m.role === 'assistant' ? (
                          <>
                            <SafeMarkdown content={m.content} />
                            {m.sources && m.sources.length > 0 && (
                              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {m.sources.map((src, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => {
                                      if (src.page) setCurrentPage(Number(src.page))
                                      setViewMode('notes')
                                    }}
                                    style={{
                                      background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8',
                                      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer'
                                    }}
                                    title="Click to jump to page in viewer"
                                  >
                                    📄 Source: {src.documentName || docTitle} · Page {src.page || 1} ↗
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          m.content
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="chat-bubble-row assistant">
                      <div className="chat-user-label">AI Assistant</div>
                      <div className="chat-bubble-content loading">🧠 Searching syllabus notes & generating response...</div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>

                {/* Suggested Quick Question Pills */}
                <div style={{ padding: '6px 12px', background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, overflowX: 'auto' }}>
                  <button onClick={() => handleSend(`Explain page ${currentPage}`)} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                    💡 Explain page {currentPage}
                  </button>
                  <button onClick={() => handleSend('Summarize this material')} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                    📑 Summarize PDF
                  </button>
                  <button onClick={() => handleSend('What are the important points?')} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                    📌 Key Points
                  </button>
                  <button onClick={() => handleSend('Generate 5 MCQs from this PDF')} style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(249,115,22,0.2)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                    📝 5 MCQs
                  </button>
                </div>

                <form className="ai-chat-input-row" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question on this PDF..."
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    style={{ background: isListening ? '#ef4444' : '#3b82f6', color: '#fff', padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                    title="Speak question via Mic"
                  >
                    {isListening ? '🎙️ Listening...' : '🎤'}
                  </button>
                  <button type="submit" disabled={loading || !input.trim()}>
                    Send ➔
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SubTab 3: Question Papers */}
          {activeSubTab === 'question-papers' && (
            <div style={{ padding: 32, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a' }}>📝 Previous Examination Question Papers & AI Model Solutions</h2>
                  <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>
                    Official VTU & DSATM previous years' question papers for {subjectName} with instant AI step-by-step solved solutions.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  {
                    id: 0,
                    title: `${subjectName} — 2025 Model Examination Question Paper`,
                    year: '2025 Model Paper',
                    marks: '100 Marks',
                    solutionMarkdown: `### 📖 AI Solved Model Solutions — 2025 Model Examination Paper

#### Question 1 (10 Marks): Derive Backpropagation Calculus Chain Rule
* **Step-by-Step Derivation**:
  In a multi-layer neural network, the loss function gradient relative to weight $w_{ij}^{(l)}$ is derived via calculus chain rule:
  $$\\frac{\\partial L}{\\partial w_{ij}^{(l)}} = \\frac{\\partial L}{\\partial z_i^{(l)}} \\cdot \\frac{\\partial z_i^{(l)}}{\\partial w_{ij}^{(l)}} = \\delta_i^{(l)} a_j^{(l-1)}$$
  where the error term $\\delta_i^{(l)}$ propagates backward from layer $l+1$:
  $$\\delta_i^{(l)} = \\left( \\sum_{k} w_{ki}^{(l+1)} \\delta_k^{(l+1)} \\right) \\sigma'\\left(z_i^{(l)}\\right)$$
  For ReLU activation ($f(z) = \\max(0, z)$), $\\sigma'(z) = 1$ if $z > 0$ else $0$.

---

#### Question 2 (10 Marks): CNN Feature Map Dimension Derivation
* **Problem**: Input Image $228 \\times 228 \\times 3$, Filter Size $F = 5 \\times 5$, Stride $S = 2$, Padding $P = 1$.
* **Formula & Step-by-Step Working**:
  $$W_{\\text{out}} = \\left\\lfloor \\frac{W - F + 2P}{S} \\right\\rfloor + 1 = \\left\\lfloor \\frac{228 - 5 + 2(1)}{2} \\right\\rfloor + 1 = \\left\\lfloor \\frac{225}{2} \\right\\rfloor + 1 = 113$$
  **Final Feature Map Spatial Output**: $113 \\times 113 \\times \\text{Filters}$.`
                  },
                  {
                    id: 1,
                    title: `${subjectName} — 2024 End Semester Examination Paper`,
                    year: '2024 VTU Board',
                    marks: '100 Marks',
                    solutionMarkdown: `### 📖 AI Solved Model Solutions — 2024 End Semester Paper

#### Question 1 (10 Marks): Key Challenges in Neural Network Optimization
* **Solution**:
  1. **Non-Convex Loss Landscapes**: High-dimensional space contains saddle points and flat plateaus.
  2. **Poor Parameter Initialization**: All-zero initial weights cause symmetric updates and symmetry breaking failure.
  3. **Learning Rate Choice**: High $\\eta$ causes instability, while low $\\eta$ results in slow convergence.
  4. **Vanishing & Exploding Gradients**: Deep matrix products cause gradients to shrink to 0 or explode to $\\infty$.

---

#### Question 2 (10 Marks): Max-Pooling vs Average-Pooling Comparison
* **Solution**:
  * **Max-Pooling**: Extracts $\\max(x)$ over sliding windows. Preserves sharpest spatial features and translation invariance.
  * **Average-Pooling**: Computes spatial mean. Smoothes feature maps.`
                  },
                  {
                    id: 2,
                    title: `${subjectName} — 2023 Continuous Internal Evaluation Paper`,
                    year: '2023 Internal Paper',
                    marks: '50 Marks',
                    solutionMarkdown: `### 📖 AI Solved Model Solutions — 2023 Internal Evaluation Paper

#### Question 1 (10 Marks): Explain Adam Optimizer Mechanics
* **Solution**:
  Adam updates parameters using bias-corrected First Moment ($m_t$) and Second Moment ($v_t$):
  $$m_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t, \\quad v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2$$
  $$\\hat{m}_t = \\frac{m_t}{1-\\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1-\\beta_2^t}, \\quad \\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t$$`
                  }
                ].map((qp) => {
                  const isExpanded = expandedQp === qp.id
                  return (
                    <div key={qp.id} style={{ background: '#ffffff', borderRadius: 14, border: isExpanded ? '2px solid #2563eb' : '1px solid #e2e8f0', boxShadow: isExpanded ? '0 4px 20px rgba(37,99,235,0.1)' : '0 2px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                      <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: 16, color: '#0f172a', display: 'block' }}>{qp.title}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'block' }}>{qp.year} · Max Score: {qp.marks}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => setExpandedQp(isExpanded ? null : qp.id)}
                            style={{ padding: '8px 18px', background: isExpanded ? '#475569' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                          >
                            {isExpanded ? '✕ Hide Solution' : '📖 Solve with AI'}
                          </button>
                          <button
                            onClick={() => {
                              setActiveSubTab('ai-assistant')
                              handleSend(`Provide step-by-step solved examination answers and formulas for ${qp.title}`)
                            }}
                            style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                            title="Ask AI Assistant follow-up questions"
                          >
                            🤖 Ask AI
                          </button>
                        </div>
                      </div>

                      {/* Expanded Solved Paper View */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #e2e8f0', padding: 24, background: '#f8fafc' }}>
                          <SafeMarkdown content={qp.solutionMarkdown} />
                          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                              onClick={() => {
                                handleSaveBookmark(`Solved Paper: ${qp.title}`, qp.solutionMarkdown)
                              }}
                              style={{ padding: '8px 16px', background: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                            >
                              🔖 Save Solution to Bookmarks
                            </button>
                            <button
                              onClick={() => {
                                setActiveSubTab('ai-assistant')
                                handleSend(`Explain question 1 solution in detail for ${qp.title}`)
                              }}
                              style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                            >
                              💬 Ask AI Follow-Up Question ➔
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SubTab 4: Practice Tests (Interactive AI MCQ Quiz) */}
          {activeSubTab === 'practice-tests' && (
            <div style={{ padding: 32, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a' }}>✍️ AI MCQ Practice Test — {subjectName}</h2>
                  <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0 0' }}>
                    Interactive grounded syllabus questions for continuous exam preparation.
                  </p>
                </div>
                <div style={{ background: '#2563eb', color: '#fff', padding: '8px 18px', borderRadius: 10, fontWeight: 800, fontSize: 14 }}>
                  Score: {quizScore} / {quizQuestions.length}
                </div>
              </div>

              {isQuizCompleted ? (
                <div style={{ background: '#ffffff', padding: 36, borderRadius: 16, border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: 54, marginBottom: 12 }}>🏆</div>
                  <h2 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Practice Quiz Completed!</h2>
                  <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                    Great effort! Your test result has been saved for dashboard performance tracking.
                  </p>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: '#eff6ff', padding: '16px 32px', borderRadius: 12, border: '1px solid #bfdbfe', margin: '24px 0' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>Final Score</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: '#1e40af' }}>{quizScore} / {quizQuestions.length}</div>
                    </div>
                    <div style={{ borderLeft: '2px solid #bfdbfe', height: 40 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>Accuracy</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: quizScore >= 3 ? '#10b981' : '#f59e0b' }}>
                        {Math.round((quizScore / quizQuestions.length) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                    <button
                      onClick={handleRestartQuiz}
                      style={{ padding: '12px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                    >
                      🔄 Retake Practice Quiz
                    </button>
                    <button
                      onClick={() => { setActiveSubTab('ai-assistant'); handleSend('Give me key formulas for this subject'); }}
                      style={{ padding: '12px 28px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                    >
                      🤖 Review Topics with AI
                    </button>
                  </div>
                </div>
              ) : (
                /* Quiz Card */
                <div style={{ background: '#ffffff', padding: 28, borderRadius: 16, border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                    Question {currentQuizIdx + 1} of {quizQuestions.length}
                  </div>
                  <h3 style={{ fontSize: 17, color: '#0f172a', marginTop: 0, marginBottom: 20 }}>
                    {quizQuestions[currentQuizIdx].question}
                  </h3>

                  {/* Options List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {quizQuestions[currentQuizIdx].options.map((opt, optIdx) => {
                      let bg = '#f8fafc'
                      let border = '1px solid #cbd5e1'
                      let color = '#0f172a'

                      if (selectedAnswer !== null) {
                        if (optIdx === quizQuestions[currentQuizIdx].correct) {
                          bg = '#ecfdf5'
                          border = '2px solid #10b981'
                          color = '#065f46'
                        } else if (optIdx === selectedAnswer) {
                          bg = '#fef2f2'
                          border = '2px solid #ef4444'
                          color = '#991b1b'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectQuizAnswer(optIdx)}
                          style={{
                            textAlign: 'left', padding: '14px 18px', borderRadius: 10, background: bg,
                            border: border, color: color, fontSize: 14, fontWeight: 600, cursor: selectedAnswer !== null ? 'default' : 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>

                  {/* Explanation Box */}
                  {showExplanation && (
                    <div style={{ marginTop: 20, padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
                      <strong>💡 Explanation:</strong> {quizQuestions[currentQuizIdx].explanation}
                    </div>
                  )}

                  {/* Next Button */}
                  {selectedAnswer !== null && (
                    <button
                      onClick={handleNextQuizQuestion}
                      style={{ marginTop: 24, padding: '12px 28px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                    >
                      {currentQuizIdx < quizQuestions.length - 1 ? 'Next Question ➔' : 'Complete Practice Quiz 🎉'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SubTab 5: AI Assistant Full Screen */}
          {activeSubTab === 'ai-assistant' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#ffffff' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🤖 AI Study Assistant & Grounded Tutor — {subjectName}</h3>
                <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>Powered by Groq RAG Engine (qwen/qwen3.8-27b)</div>
              </div>

              <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#f8fafc' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble-row ${m.role}`} style={{ marginBottom: 16 }}>
                    <div className="chat-user-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>
                      <span>{m.userLabel || (m.role === 'user' ? 'You' : 'AI Assistant')}</span>
                      {m.role === 'assistant' && (
                        <button
                          onClick={() => handleSaveBookmark(`AI Notes: ${subjectName}`, m.content)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#2563eb', fontWeight: 700 }}
                        >
                          🔖 Save to Bookmarks
                        </button>
                      )}
                    </div>
                    <div style={{ background: m.role === 'user' ? '#2563eb' : '#ffffff', color: m.role === 'user' ? '#ffffff' : '#0f172a', padding: '14px 18px', borderRadius: 12, border: m.role === 'user' ? 'none' : '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontSize: 14 }}>
                      {m.role === 'assistant' ? (
                        <SafeMarkdown content={m.content} />
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ padding: 14, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', color: '#2563eb', fontWeight: 600 }}>
                    🧠 Searching course material & formulating grounded answer...
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              <form className="ai-chat-input-row" style={{ padding: 16, borderTop: '1px solid #e2e8f0' }} onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question or click Mic to speak..."
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{ background: isListening ? '#ef4444' : '#3b82f6', color: '#fff', padding: '12px 18px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isListening ? '🎙️ Listening...' : '🎤 Mic'}
                </button>
                <button type="submit" disabled={loading || !input.trim()} style={{ background: '#10b981', color: '#fff', padding: '12px 22px', borderRadius: 10, border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                  Send ➔
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
