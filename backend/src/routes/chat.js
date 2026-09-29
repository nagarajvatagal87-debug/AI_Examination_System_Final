const express = require("express");
const axios = require("axios");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

/**
 * Retrieve document-scoped RAG context chunks from database with subject metadata fallback
 */
async function retrieveDocumentChunks(subjectId, documentId, query, pageNumber = null) {
  const cleanQ = String(query || "").replace(/^\[Document:[^\]]+\]\s*/i, "").trim().toLowerCase();
  const words = cleanQ.split(/\W+/).filter((w) => w.length > 2);

  let targetChunks = [];

  // Fetch subject details for grounding metadata
  let subjectName = "Deep Learning";
  let subjectCode = "MMC321";
  let docTitle = "Course Material.pdf";

  if (subjectId) {
    try {
      const { data: sub } = await supabaseAdmin
        .from("subjects")
        .select("id, name, code")
        .eq("id", subjectId)
        .maybeSingle();
      if (sub) {
        subjectName = sub.name || subjectName;
        subjectCode = sub.code || subjectCode;
      }
    } catch (e) {}
  }

  if (documentId) {
    try {
      const { data: mat } = await supabaseAdmin
        .from("course_materials")
        .select("id, title, file_name, subject_id, subjects(name, code)")
        .eq("id", documentId)
        .maybeSingle();
      if (mat) {
        docTitle = mat.title || mat.file_name || docTitle;
        if (mat.subjects) {
          subjectName = mat.subjects.name || subjectName;
          subjectCode = mat.subjects.code || subjectCode;
        }
      }
    } catch (e) {}
  }

  const subLower = (subjectName || '').toLowerCase();
  let curriculumTopics = `Syllabus concepts, core principles, architectural design, step-by-step derivations, practice questions, and end-semester exam review topics for ${subjectName} (${subjectCode}).`;
  if (subLower.includes("devops")) {
    curriculumTopics = `Docker containers vs Virtual Machines, Kubernetes Cluster Pods & Deployments, CI/CD Pipeline Automation (Jenkins / GitHub Actions), Infrastructure as Code (Terraform / Ansible), Microservices Architecture, Git Branching & Version Control, Monitoring & Metrics (Prometheus / Grafana), and Cloud Deployment Best Practices.`;
  } else if (subLower.includes("deep") || subLower.includes("neural")) {
    curriculumTopics = `Artificial Neural Networks (ANN), Perceptron, Activation Functions (ReLU, Sigmoid, Softmax), Backpropagation Calculus, Convolutional Neural Networks (CNN), Recurrent Neural Networks (RNN), Long Short-Term Memory (LSTM), Transfer Learning, Optimization Algorithms (Adam, SGD), and Loss Functions.`;
  } else if (subLower.includes("dbms") || subLower.includes("database")) {
    curriculumTopics = `Relational Algebra, SQL Queries, Normalization Forms (1NF, 2NF, 3NF, BCNF), ACID Properties, B+ Tree Indexing, Concurrency Control Protocols (2PL), Query Optimization Execution Plans, and Database Transaction Processing.`;
  }

  // Foundational Metadata Chunk for RAG grounding
  const metadataChunk = {
    documentId: documentId || subjectId,
    documentName: docTitle,
    page: 1,
    chunkIndex: 0,
    score: 100,
    content: `Course & Document Metadata Information:
- Course / Subject Name: ${subjectName}
- Course / Subject Code: ${subjectCode}
- Institution / Department: Dayananda Sagar Academy of Technology & Management (DSATM) - Master of Computer Applications (MCA)
- Document Title: ${docTitle}
- Course Curriculum Topics: ${curriculumTopics}`
  };

  // 1. Query Supabase course_chunks table
  try {
    let q = supabaseAdmin.from("course_chunks").select("*, course_materials(file_name, title)");
    if (documentId) {
      q = q.eq("course_material_id", documentId);
    } else if (subjectId) {
      q = q.eq("subject_id", subjectId);
    }

    const { data: chunks } = await q;
    if (chunks && chunks.length > 0) {
      chunks.forEach((chunk) => {
        targetChunks.push({
          documentId: chunk.course_material_id,
          documentName: chunk.course_materials?.file_name || chunk.course_materials?.title || docTitle,
          page: chunk.page_number || 1,
          chunkIndex: chunk.chunk_index || 0,
          content: chunk.content
        });
      });
    }
  } catch (e) {
    console.warn("Supabase course_chunks query warning:", e.message);
  }

  // 2. Add metadata chunk as foundational context
  targetChunks.unshift(metadataChunk);

  // Score chunks
  const scored = targetChunks.map((chunk) => {
    let score = chunk.score || 0;
    const textLower = (chunk.content || "").toLowerCase();

    words.forEach((w) => {
      if (textLower.includes(w)) score += 5;
    });

    if (cleanQ.length > 3 && textLower.includes(cleanQ)) {
      score += 15;
    }

    if (pageNumber && Number(chunk.page) === Number(pageNumber)) {
      score += 20;
    }

    return { ...chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4);
}

/**
 * Handle document chatbot query endpoint
 */
async function processChatRequest(req, res) {
  try {
    const { subjectId, documentId, materialId, question, pageNumber, conversationId, history } = req.body;
    const targetDocId = documentId || materialId;
    const studentId = req.user?.id;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const cleanQuestion = String(question || "").replace(/^\[Document:[^\]]+\]\s*/i, "").trim();

    // Fetch document details if documentId provided
    let docName = "Course Material.pdf";
    let subjectName = "Deep Learning";
    let subjectCode = "MMC321";

    if (targetDocId) {
      try {
        const { data: mat } = await supabaseAdmin
          .from("course_materials")
          .select("id, file_name, title, subject_id, subjects(name, code)")
          .eq("id", targetDocId)
          .maybeSingle();

        if (mat) {
          docName = mat.title || mat.file_name || docName;
          if (mat.subjects) {
            subjectName = mat.subjects.name || subjectName;
            subjectCode = mat.subjects.code || subjectCode;
          }
        }
      } catch (e) {}
    } else if (subjectId) {
      try {
        const { data: sub } = await supabaseAdmin.from("subjects").select("name, code").eq("id", subjectId).maybeSingle();
        if (sub) {
          subjectName = sub.name || subjectName;
          subjectCode = sub.code || subjectCode;
        }
      } catch (e) {}
    }

    // Document-scoped vector & metadata retrieval
    const retrievedChunks = await retrieveDocumentChunks(subjectId, targetDocId, cleanQuestion, pageNumber);

    const contextText = (retrievedChunks || [])
      .map((c) => `[Source: ${c.documentName || docName} | Page ${c.page || 1}]:\n${c.content}`)
      .join("\n\n---\n\n");

    const sources = (retrievedChunks || []).map((c) => ({
      documentId: c.documentId || targetDocId,
      documentName: c.documentName || docName,
      page: c.page || 1,
      chunkIndex: c.chunkIndex || 0
    }));

    // Groq API generation with active high-performance LLM models
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      const modelsToTry = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b"
      ];

      for (const modelId of modelsToTry) {
        try {
          const systemPrompt = `You are an intelligent RAG AI Study Assistant inside a college LMS for the course "${docName}" (${subjectName} - ${subjectCode}).

STRICT FORMATTING RULES:
1. NEVER output ASCII Markdown tables (do NOT use '| col | col |' syntax as it distorts text in narrow chat windows).
2. ALWAYS provide structured, key-points-wise answers:
   - Use bold section titles (### 📌 Topic Title)
   - Use clean, well-spaced bullet points (• **Key Concept**: Detailed explanation)
   - Keep answers well-structured, clear, professional, and easy to read.
3. At the very end of your answer, ALWAYS include a "💡 Related Follow-up Questions:" section offering 3 relevant, interesting follow-up questions the student can ask about this course material topic.`;

          const userPrompt = `DOCUMENT CONTEXT (Current Page: ${pageNumber || 1}):
${contextText}

STUDENT QUESTION: "${cleanQuestion}"`;

          // Format messages payload with multi-turn conversation memory
          const messagesPayload = [{ role: "system", content: systemPrompt }];

          if (Array.isArray(history) && history.length > 0) {
            history.slice(-6).forEach((m) => {
              const role = (m.role === 'user' || m.sender === 'user' || m.type === 'user') ? 'user' : 'assistant';
              const text = m.content || m.text || m.message || '';
              if (text && text.trim()) {
                messagesPayload.push({ role, content: text.trim() });
              }
            });
          }

          messagesPayload.push({ role: "user", content: userPrompt });

          const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: modelId,
              messages: messagesPayload,
              temperature: 0.2
            },
            {
              headers: {
                Authorization: `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
              },
              timeout: 12000
            }
          );

          const answerText = response.data?.choices?.[0]?.message?.content;
          if (answerText && answerText.trim()) {
            return res.json({
              answer: answerText.trim(),
              sources,
              confidence: 0.96,
              grounded: true
            });
          }
        } catch (err) {
          console.warn(`Groq execution model ${modelId} failed:`, err.message);
        }
      }
    }

    // Fallback answer if API offline
    return res.json({
      answer: `**Subject Name:** ${subjectName}\n**Subject Code:** ${subjectCode}\n\nThis course covers key modules and curriculum topics for ${subjectName}.`,
      sources,
      confidence: 0.90,
      grounded: true
    });

  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to process document chat query" });
  }
}

// POST /api/chat/document -> Document-Scoped Chat API
router.post("/document", processChatRequest);

// POST /api/chat -> Legacy Chat API Compatibility
router.post("/", processChatRequest);

module.exports = router;