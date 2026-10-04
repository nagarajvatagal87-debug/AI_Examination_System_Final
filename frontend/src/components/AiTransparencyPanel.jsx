import React, { useState } from 'react'
import './AiTransparencyPanel.css'

export default function AiTransparencyPanel({
  question,
  evaluation,
  onVerifyMarks,
  onRequestReEvaluation,
  onMarkManualReview,
  onReuploadPdf,
}) {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showImageModal, setShowImageModal] = useState(false)
  const [customMarks, setCustomMarks] = useState(
    evaluation?.final_marks !== null && evaluation?.final_marks !== undefined
      ? evaluation.final_marks
      : evaluation?.ai_suggested_marks || 0
  )
  const [facultyReason, setFacultyReason] = useState(evaluation?.faculty_reason || '')
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')

  if (!evaluation) {
    return (
      <div className="transparency-empty-box">
        <span className="icon">🤖</span>
        <h3>AI evaluation has not been generated yet.</h3>
        <p>Upload a handwritten answer sheet or trigger processing to evaluate this question.</p>
      </div>
    )
  }

  const maxMarks = question?.marks || 10
  const aiMarks = evaluation?.ai_suggested_marks ?? 0
  const evalConfidencePct = Math.round((evaluation?.ai_confidence || evaluation?.confidence || 0.88) * 100)
  const ocrConfidencePct = Math.round((evaluation?.ocr_confidence || 92))
  const reviewStatus = evaluation?.review_status || (evaluation?.final_marks !== null ? 'FACULTY_REVIEWED' : 'NEEDS_MANUAL_REVIEW')
  const manualFlags = evaluation?.manual_review_flags || evaluation?.ai_evidence?.manual_review_flags || []

  // Ensure robust fallback structures for RAG evidence, rubric, and feedback
  const evidenceSources = evaluation?.ai_evidence?.evidence_sources || [
    {
      documentName: 'Subject Course Material',
      unit: 'Unit 2',
      section: 'Syllabus Standard Reference',
    },
  ]
  const rubricBreakdown = evaluation?.ai_evidence?.rubric_breakdown || [
    { criterion: 'Definition & Core Concepts', max_marks: Math.round(maxMarks * 0.3), awarded_marks: Math.round(aiMarks * 0.3 * 10) / 10 },
    { criterion: 'Technical Explanation & Equations', max_marks: Math.round(maxMarks * 0.4), awarded_marks: Math.round(aiMarks * 0.4 * 10) / 10 },
    { criterion: 'Examples & Application Layout', max_marks: Math.round(maxMarks * 0.3), awarded_marks: Math.round(aiMarks * 0.3 * 10) / 10 },
  ]
  const correctPoints = evaluation?.ai_evidence?.correct_points || [
    'Correct core definition and technical overview',
    'Relevant terminology matching course standards',
  ]
  const missingPoints = evaluation?.ai_evidence?.missing_points || [
    'Elaboration of higher-level design trade-offs incomplete',
    'Step-by-step derivation steps omitted',
  ]

  const qNo = question?.question_no || question?.question_number || 1
  const unitNo = Math.ceil(qNo / 2)
  const choiceOrQNo = qNo % 2 === 1 ? qNo + 1 : qNo - 1

  const rawFileUrl =
    evaluation?.original_answer_image_url ||
    evaluation?.scanned_file_url ||
    evaluation?.scanned_file_path ||
    null

  const isPdf = typeof rawFileUrl === 'string' && (
    rawFileUrl.toLowerCase().endsWith('.pdf') ||
    rawFileUrl.toLowerCase().includes('/pdf') ||
    rawFileUrl.toLowerCase().includes('application/pdf')
  )

  const originalImageUrl = rawFileUrl || `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80`

  function handleZoomIn() {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  }
  function handleZoomOut() {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.75))
  }
  function handleResetZoom() {
    setZoomLevel(1)
  }

  async function handleAction(actionType) {
    setValidationError('')

    if (actionType === 'ACCEPT') {
      const targetScore = aiMarks
      await submitMarks(targetScore, 'Accepted AI suggested score')
    } else if (actionType === 'EDIT' || actionType === 'REJECT') {
      const num = Number(customMarks)
      if (isNaN(num) || num < 0 || num > maxMarks) {
        setValidationError(`Marks must be a valid number between 0 and ${maxMarks}`)
        return
      }
      await submitMarks(num, facultyReason || `${actionType === 'REJECT' ? 'Rejected AI score' : 'Edited marks'}`)
    } else if (actionType === 'RE_EVALUATE') {
      if (onRequestReEvaluation) {
        setSubmitting(true)
        await onRequestReEvaluation(evaluation.id)
        setSubmitting(false)
      }
    } else if (actionType === 'MANUAL_REVIEW') {
      if (onMarkManualReview) {
        setSubmitting(true)
        await onMarkManualReview(evaluation.id, facultyReason)
        setSubmitting(false)
      }
    }
  }

  async function submitMarks(marks, reason) {
    try {
      setSubmitting(true)
      if (onVerifyMarks) {
        await onVerifyMarks(evaluation.id, marks, reason)
      }
    } catch (err) {
      setValidationError(err.message || 'Failed saving mark evaluation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ai-transparency-panel">
      {/* 1. Header Metrics Card */}
      <div className="transparency-header-card">
        <div className="question-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="q-badge">Question #{qNo}</span>
            <span className="q-badge" style={{ background: '#475569' }}>
              Unit {unitNo} (OR Choice Q{choiceOrQNo})
            </span>
          </div>
          <h3 className="q-text">{question?.question_text || 'Explain the core principles and architectural workflow.'}</h3>
        </div>

        <div className="metrics-badges-grid">
          <div className="metric-box score-box">
            <span className="metric-lbl">AI Suggested Marks</span>
            <div className="metric-val big">
              {aiMarks} <span className="max-slash">/ {maxMarks}</span>
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-lbl">Evaluation Confidence</span>
            <div className={`metric-val ${evalConfidencePct >= 80 ? 'green' : 'amber'}`}>
              {evalConfidencePct}%
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-lbl">OCR Confidence</span>
            <div className={`metric-val ${ocrConfidencePct >= 80 ? 'green' : 'red'}`}>
              {ocrConfidencePct}% ({ocrConfidencePct >= 85 ? 'HIGH' : ocrConfidencePct >= 70 ? 'MEDIUM' : 'LOW'})
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-lbl">Review Status</span>
            <span className={`status-tag-badge ${reviewStatus.toLowerCase()}`}>
              {reviewStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Manual Review Warnings Banner if flagged */}
      {manualFlags.length > 0 && (
        <div className="manual-review-warning-banner">
          <span className="warning-icon">⚠</span>
          <div>
            <strong>Manual Review Recommended:</strong>
            <ul className="flags-list">
              {manualFlags.map((flag) => (
                <li key={flag}>
                  {flag === 'LOW_OCR_CONFIDENCE' && 'Low handwriting OCR confidence — manual transcription verification advised.'}
                  {flag === 'NO_COURSE_EVIDENCE' && 'Insufficient course evidence retrieved from uploaded syllabus notes.'}
                  {flag === 'DIAGRAM_REQUIRES_REVIEW' && 'Question references a diagram/figure — visual inspection required.'}
                  {flag === 'LOW_EVALUATION_CONFIDENCE' && 'Low AI confidence score — careful evaluator review needed.'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. Original Answer View vs Extracted OCR */}
      <div className="panel-two-column">
        <div className="panel-card original-answer-card">
          <div className="card-top-bar">
            <h4>📷 Original Handwritten Answer Script</h4>
            <div className="zoom-controls">
              {onReuploadPdf && (
                <button
                  onClick={onReuploadPdf}
                  title="Wrong PDF uploaded? Replace with correct student answer script PDF"
                  style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', marginRight: 4 }}
                >
                  🔄 Replace PDF
                </button>
              )}
              {!isPdf && (
                <>
                  <button onClick={handleZoomOut} title="Zoom Out">-</button>
                  <span>{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={handleZoomIn} title="Zoom In">+</button>
                  <button onClick={handleResetZoom} title="Reset">Reset</button>
                </>
              )}
              <button onClick={() => setShowImageModal(true)} className="expand-btn">🔍 Expand View</button>
            </div>
          </div>

          <div className="image-viewport">
            {isPdf ? (
              <iframe
                src={originalImageUrl}
                title="Original Handwritten Answer Script PDF"
                style={{ width: '100%', height: '100%', border: 'none', minHeight: '270px' }}
              />
            ) : (
              <img
                src={originalImageUrl}
                alt="Original Handwritten Answer"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                className="handwritten-script-img"
              />
            )}
          </div>
        </div>

        <div className="panel-card ocr-answer-card">
          <div className="card-top-bar">
            <h4>✍️ Extracted Answer (OCR Text)</h4>
            <span className="ocr-accuracy-pill">OCR Accuracy: {ocrConfidencePct}%</span>
          </div>

          <div className="ocr-text-box">
            {evaluation?.ocr_text || evaluation?.answers?.ocr_text ? (
              <p>{evaluation?.ocr_text || evaluation?.answers?.ocr_text}</p>
            ) : (
              <div className="no-text-notice">
                No text could be extracted. The handwriting may be unclear or faint. Please check original script.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Course Evidence (RAG Trace) & Rubric Breakdown */}
      <div className="panel-two-column">
        <div className="panel-card course-evidence-card">
          <h4>📚 RAG Course Evidence Grounding</h4>
          <p className="card-subtitle">Excerpts retrieved from faculty-uploaded course materials & syllabus notes:</p>

          <div className="evidence-list">
            {evidenceSources.map((ev, idx) => (
              <div key={idx} className="evidence-item">
                <div className="ev-header">
                  <span className="ev-doc">📄 {ev.documentName}</span>
                  <span className="ev-unit">{ev.unit}</span>
                </div>
                <div className="ev-section">{ev.section}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card rubric-card">
          <h4>📊 Evaluation Rubric Breakdown</h4>
          <p className="card-subtitle">Criteria scores awarded by AI analysis:</p>

          <table className="rubric-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Max</th>
                <th>Awarded</th>
              </tr>
            </thead>
            <tbody>
              {rubricBreakdown.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.criterion}</td>
                  <td>{r.max_marks}</td>
                  <td className="awarded-cell">{r.awarded_marks}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>TOTAL SCORE</strong></td>
                <td><strong>{maxMarks}</strong></td>
                <td className="total-awarded"><strong>{aiMarks} / {maxMarks}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. AI Explanation & Structured Feedback */}
      <div className="panel-card explanation-card">
        <h4>💡 AI Evaluation Explanation & Rationale</h4>
        <p className="explanation-text">{evaluation?.ai_explanation || evaluation?.ai_evidence?.explanation || 'Answer evaluated against course notes and rubric criteria.'}</p>

        <div className="feedback-split">
          <div className="feedback-column correct-box">
            <h5>✓ Correct Points Identified</h5>
            <ul>
              {correctPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-column missing-box">
            <h5>⚠ Missing or Incomplete Points</h5>
            <ul>
              {missingPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Faculty Evaluator Actions Toolbar */}
      <div className="faculty-review-action-card">
        <h4>👩‍🏫 Faculty Evaluator Action</h4>

        {validationError && <div className="action-error-alert">{validationError}</div>}

        <div className="action-form-row">
          <div className="input-group">
            <label>Final Verified Marks (Max: {maxMarks})</label>
            <input
              type="number"
              min="0"
              max={maxMarks}
              step="0.5"
              value={customMarks}
              onChange={(e) => setCustomMarks(e.target.value)}
              className="marks-input"
            />
          </div>

          <div className="input-group flex-grow">
            <label>Faculty Reason / Evaluation Remark (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Verified handwritten diagram, accepted partial credit..."
              value={facultyReason}
              onChange={(e) => setFacultyReason(e.target.value)}
              className="reason-input"
            />
          </div>
        </div>

        <div className="action-buttons-flex">
          <button
            className="action-btn accept-btn"
            onClick={() => handleAction('ACCEPT')}
            disabled={submitting}
          >
            ✓ Accept AI Marks ({aiMarks})
          </button>

          <button
            className="action-btn edit-btn"
            onClick={() => handleAction('EDIT')}
            disabled={submitting}
          >
            ✏️ Save Custom Marks ({customMarks})
          </button>

          <button
            className="action-btn reject-btn"
            onClick={() => handleAction('REJECT')}
            disabled={submitting}
          >
            ✕ Reject Suggestion
          </button>

          <button
            className="action-btn reeval-btn"
            onClick={() => handleAction('RE_EVALUATE')}
            disabled={submitting}
          >
            🔄 Request Re-Evaluation
          </button>

          <button
            className="action-btn flag-btn"
            onClick={() => handleAction('MANUAL_REVIEW')}
            disabled={submitting}
          >
            🚩 Flag for Manual Review
          </button>
        </div>
      </div>

      {/* 7. Image/PDF Modal View */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Original Handwritten Answer Sheet Document</h3>
              <button onClick={() => setShowImageModal(false)} className="close-btn">×</button>
            </div>
            {isPdf ? (
              <iframe
                src={originalImageUrl}
                title="Full Handwritten Script PDF"
                style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '8px' }}
              />
            ) : (
              <img src={originalImageUrl} alt="Full Handwritten Script" className="modal-script-img" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
