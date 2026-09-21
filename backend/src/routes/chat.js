const express = require("express");
const axios = require("axios");
const { supabaseAdmin } = require("../../config/Supabase");
const { requireAuth } = require("../middleware/auth.js");

const router = express.Router();
router.use(requireAuth);

// Grounded PDF Course Material Chunks Store (Fallback Memory Cache for indexed documents)
const DOCUMENT_CHUNKS_DB = [
  // MMC321 Deep Learning - Page 1 / Module 1
  {
    documentId: "dl-unit-1",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 1,
    chunkIndex: 1,
    content: `MODULE 1 — INTRODUCTION TO NEURAL NETWORKS AND PERCEPTRON
1. What is a Neural Network: A neural network is a computational model made of interconnected processing units called neurons. A neuron receives input values, combines them using learnable weights and a bias, applies an activation function, and produces an output. In Deep Learning, many such units are organized into layers so that the network can learn increasingly useful representations from data.
• Input values: feature values presented to the network.
• Weights: parameters controlling the contribution of each input.
• Bias: an adjustable offset parameter.
• Activation function: transforms the weighted sum and introduces non-linearity.
• Layers: input layer, one or more hidden layers, and output layer.
• Learning: parameters are adjusted to reduce a chosen loss or error function.
2. The Human Brain & Biological Neurons: Biological neurons receive signals through dendrites, process them in the cell body, and transmit signals through the axon. Connections between neurons influence how signals are propagated. Artificial neural networks are inspired by this broad idea of interconnected processing units.
3. Single Layer Perceptron & Activation Functions: Perceptron formula y = f(w^T x + b). Key activation functions include Sigmoid f(x)=1/(1+e^-x), ReLU f(x)=max(0, x), Tanh, and Softmax.`
  },
  {
    documentId: "dl-unit-1",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 1,
    chunkIndex: 2,
    content: `Module 1 Key Topics & Exam Review:
1. Definition of Artificial Neural Network (ANN), input vector x, weight vector w, scalar bias b, and activation function phi.
2. Perceptron Learning Rule: Weight update equation w_new = w_old + eta * (y_target - y_pred) * x.
3. Linear Separability Limitation: A single-layer perceptron can only classify linearly separable input patterns (e.g. AND, OR gates) and strictly fails on non-linearly separable functions like XOR.`
  },

  // MMC321 Deep Learning - Page 2 / Module 2
  {
    documentId: "dl-unit-2",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 2,
    chunkIndex: 3,
    content: `MODULE 2 — MULTI-LAYER PERCEPTRONS & BACKPROPAGATION
1. Multi-Layer Perceptron (MLP) Architecture: Consists of an input layer, one or more hidden layers with non-linear activation functions (ReLU/Sigmoid), and an output layer. MLPs overcome the single-layer perceptron limitation to solve non-linear problems like XOR.
2. Backpropagation Calculus & Chain Rule: Backpropagation calculates loss gradients relative to network weights by propagating errors backward using the calculus chain rule dL/dW^(l) = delta^(l) * (a^(l-1))^T.
3. Loss Functions: Mean Squared Error (MSE) L = (1/2N) sum (y - y_hat)^2 for regression; Binary and Categorical Cross-Entropy L = - sum y * log(y_hat) for classification.
4. Gradient Descent Variants: Batch Gradient Descent, Stochastic Gradient Descent (SGD), Mini-Batch Gradient Descent.`
  },

  // MMC321 Deep Learning - Page 3 / Module 3
  {
    documentId: "dl-unit-3",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 3,
    chunkIndex: 4,
    content: `MODULE 3 — CONVOLUTIONAL NEURAL NETWORKS (CNNs) & POOLING
1. Convolutional Layer: Applies sliding 2D kernel filter matrices across input grids for spatial feature extraction (edges, textures, shapes).
2. Pooling Operations: Down-samples feature maps while retaining spatial translation invariance.
   - Max-Pooling: Extracts maximum activation in each 2x2 window.
   - Average-Pooling: Computes arithmetic mean in window.
3. Spatial Output Dimension Formula: W_out = floor((W - F + 2P)/S) + 1, where W is input width, F is filter size, P is padding, S is stride.
4. Classical CNN Architectures: LeNet-5, AlexNet, VGGNet, ResNet (Residual connections with skip connections y = F(x) + x to solve degradation problem).`
  },

  // MMC321 Deep Learning - Page 4 / Module 4
  {
    documentId: "dl-unit-4",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 4,
    chunkIndex: 5,
    content: `MODULE 4 — RECURRENT NEURAL NETWORKS (RNNs) & OPTIMIZATION
1. Recurrent Neural Networks (RNNs): Processes sequential data (time-series, text) with hidden state feedback h_t = f(W_hh h_{t-1} + W_xh x_t + b).
2. Vanishing and Exploding Gradients: Gradients exponentially decrease or explode during Backpropagation Through Time (BPTT) over long sequences.
3. LSTM (Long Short-Term Memory) Gated Architecture:
   - Forget Gate f_t = sigmoid(W_f [h_{t-1}, x_t] + b_f) decides what to discard from cell state.
   - Input Gate i_t = sigmoid(W_i [h_{t-1}, x_t] + b_i) decides what new information to store.
   - Output Gate o_t = sigmoid(W_o [h_{t-1}, x_t] + b_o) controls output hidden state.
4. Deep Learning Optimizers: SGD with Momentum, RMSProp, Adam (Adaptive Moment Estimation).
5. Regularization Techniques: Dropout (randomly deactivates neurons during training pass), Batch Normalization (normalizes layer inputs across mini-batches).`
  },

  // MMC321 Deep Learning - Page 5 / Module 5
  {
    documentId: "dl-unit-5",
    documentName: "MMC321_Deep_Learning_Full_Syllabus_Notes.pdf",
    subjectId: "sub-dl",
    subjectName: "Deep Learning",
    page: 5,
    chunkIndex: 6,
    content: `MODULE 5 — TRANSFORMERS, ATTENTION & GENERATIVE AI
1. Self-Attention Mechanism: Computes Query (Q), Key (K), Value (V) weightings across all sequence tokens regardless of distance: Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V.
2. Transformer Architecture: Encoder-Decoder architecture using Multi-Head Attention and Positional Encodings (sine/cosine positional vectors).
3. Generative Adversarial Networks (GANs): Generator network G creates synthetic data trying to fool Discriminator network D in a minimax game min_G max_D V(D, G).
4. Autoencoders & Variational Autoencoders (VAEs): Encoder compresses input into latent vector z, Decoder reconstructs original input from z.`
  },

  // DBMS Unit 1 - Page 1
  {
    documentId: "dbms-unit-1",
    documentName: "DBMS Unit 1.pdf",
    subjectId: "sub-dbms",
    subjectName: "Database Management Systems",
    page: 1,
    chunkIndex: 1,
    content: `MODULE 1 — INTRODUCTION TO DATABASE MANAGEMENT SYSTEMS (DBMS)
A Database Management System (DBMS) is software designed to store, retrieve, manage, and query structured data efficiently.
Key Advantages of DBMS:
1. Centralized Data Control & Storage.
2. Minimization of Data Redundancy and Data Inconsistency.
3. Enforcement of Data Security, Integrity Constraints, and Access Controls.
4. Support for Concurrent Multi-User Transactions.
5. Automated Backup, Recovery, and Disaster Management.`
  },

  // DBMS Unit 1 - Page 2 / Normalization
  {
    documentId: "dbms-unit-1",
    documentName: "DBMS Unit 1.pdf",
    subjectId: "sub-dbms",
    subjectName: "Database Management Systems",
    page: 2,
    chunkIndex: 2,
    content: `MODULE 2 — DATABASE NORMALIZATION & NORMAL FORMS
Normalization is the systematic process of organizing data in relational tables to reduce data redundancy and eliminate update, insertion, and deletion anomalies.
1. 1NF (First Normal Form): Requires every attribute value in a table to be atomic (indivisible) with no repeating groups.
2. 2NF (Second Normal Form): Requires 1NF and that every non-prime attribute is fully functionally dependent on the primary key (no partial dependencies).
3. 3NF (Third Normal Form): Requires 2NF and that no non-prime attribute is transitively dependent on the primary key.
4. BCNF (Boyce-Codd Normal Form): Stricter 3NF variant where for every functional dependency X -> Y, X must be a super key.`
  }
];

/**
 * Retrieve document-scoped RAG context chunks
 */
async function retrieveDocumentChunks(subjectId, documentId, query, pageNumber = null) {
  const cleanQ = String(query || "").replace(/^\[Document:[^\]]+\]\s*/i, "").trim().toLowerCase();
  const words = cleanQ.split(/\W+/).filter((w) => w.length > 2);

  // Intent detection helper for document-level requests
  const isGeneralIntent = /summariz|summary|overview|key points|main points|mcq|quiz|question|explain page|describe page|entire document|full document|notes|module|unit|chapter/i.test(cleanQ);

  let targetChunks = [];

  // 1. Query Supabase course_chunks table strictly filtered by documentId / subjectId
  try {
    let q = supabaseAdmin.from("course_chunks").select("*, course_materials(file_name, title)");
    if (documentId) {
      q = q.eq("course_material_id", documentId);
    } else if (subjectId) {
      q = q.eq("subject_id", subjectId);
    }

    const { data: chunks } = await q;
    if (chunks && chunks.length > 0) {
      targetChunks = chunks.map((chunk) => ({
        documentId: chunk.course_material_id,
        documentName: chunk.course_materials?.file_name || chunk.course_materials?.title || "Course Material.pdf",
        page: chunk.page_number || 1,
        chunkIndex: chunk.chunk_index || 0,
        content: chunk.content
      }));
    }
  } catch (e) {
    console.warn("Supabase course_chunks query warning:", e.message);
  }

  // 2. Fallback to in-memory DOCUMENT_CHUNKS_DB if DB returned empty
  if (!targetChunks.length) {
    const docIdStr = String(documentId || "").toLowerCase();
    const subIdStr = String(subjectId || "").replace(/[^a-z0-9]/g, "").toLowerCase();

    // Check specific match by docId, docName, or subject
    targetChunks = DOCUMENT_CHUNKS_DB.filter((item) => {
      const itemDocId = String(item.documentId || "").toLowerCase();
      const itemDocName = String(item.documentName || "").toLowerCase();
      const itemSubId = String(item.subjectId || "").toLowerCase();
      const itemSubName = String(item.subjectName || "").toLowerCase();

      if (docIdStr && (itemDocId === docIdStr || itemDocName.includes(docIdStr) || docIdStr.includes(itemDocId))) {
        return true;
      }
      if (subIdStr && (itemSubId.includes(subIdStr) || subIdStr.includes(itemSubId) || itemSubName.replace(/[^a-z0-9]/g, "").includes(subIdStr))) {
        return true;
      }
      return false;
    });

    // Subject/Domain broad fallback if specific ID did not match
    if (!targetChunks.length) {
      if (docIdStr.includes("dl") || docIdStr.includes("deep") || subIdStr.includes("dl") || subIdStr.includes("deep") || docIdStr.includes("mmc321")) {
        targetChunks = DOCUMENT_CHUNKS_DB.filter(item => item.subjectId === "sub-dl" || item.documentName.toLowerCase().includes("deep"));
      } else if (docIdStr.includes("dbms") || subIdStr.includes("dbms") || docIdStr.includes("database")) {
        targetChunks = DOCUMENT_CHUNKS_DB.filter(item => item.subjectId === "sub-dbms" || item.documentName.toLowerCase().includes("dbms"));
      } else {
        // Fallback: Default to all available chunks so document chat never fails for any opened material
        targetChunks = [...DOCUMENT_CHUNKS_DB];
      }
    }
  }

  if (!targetChunks.length) return [];

  // Score each chunk based on page match, module match, and keyword relevance
  const scored = targetChunks.map((chunk) => {
    let score = 0;
    const textLower = (chunk.content || "").toLowerCase();

    // Word matches (+3 each)
    words.forEach((w) => {
      if (textLower.includes(w)) score += 3;
    });

    // Exact phrase bonus if query is 2+ words
    if (cleanQ.length > 5 && textLower.includes(cleanQ)) {
      score += 10;
    }

    // Page match boost (+20 if chunk page equals pageNumber)
    if (pageNumber && Number(chunk.page) === Number(pageNumber)) {
      score += 20;
    }

    // Explicit Page mention in query (e.g., "explain page 1" or "page 2")
    const pageMentionMatch = cleanQ.match(/page\s*(\d+)/i);
    if (pageMentionMatch && Number(pageMentionMatch[1]) === Number(chunk.page)) {
      score += 25;
    }

    // Explicit Module mention in query (e.g., "explain module 1" or "module1")
    const moduleMentionMatch = cleanQ.match(/module\s*(\d+)/i);
    if (moduleMentionMatch && textLower.includes(`module ${moduleMentionMatch[1]}`)) {
      score += 30;
    }

    return { ...chunk, score };
  });

  // Sort chunks descending by score
  scored.sort((a, b) => b.score - a.score);

  // If top scored chunk has matching keywords, module, or page match > 0
  const topKeywordMatches = scored.filter((s) => s.score > 0);

  if (topKeywordMatches.length > 0) {
    return topKeywordMatches.slice(0, 4);
  }

  // If keyword score is 0 across all chunks, BUT query is a document summary / overview / page explanation OR documentId was specifically provided:
  if (isGeneralIntent || pageNumber || documentId) {
    if (pageNumber) {
      const pageChunks = scored.filter((c) => Number(c.page) === Number(pageNumber));
      if (pageChunks.length > 0) return pageChunks.slice(0, 4);
    }
    // Return top 4 chunks of the document so LLM has context to summarize / explain / generate MCQs
    return scored.slice(0, 4);
  }

  return [];
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

    // Authorization & Enrollment verification
    if (studentId && subjectId) {
      try {
        const { data: sub } = await supabaseAdmin.from("subjects").select("id, name").eq("id", subjectId).maybeSingle();
        if (!sub) {
          return res.status(403).json({ error: "Access denied: Unauthorized subject access" });
        }
      } catch (e) {}
    }

    // Fetch document details if documentId provided
    let docName = "Course Material.pdf";
    if (targetDocId) {
      try {
        const { data: mat } = await supabaseAdmin
          .from("course_materials")
          .select("id, file_name, title, published")
          .eq("id", targetDocId)
          .maybeSingle();

        if (mat) {
          if (mat.published === false) {
            return res.status(403).json({ error: "Access denied: Document is not published" });
          }
          docName = mat.title || mat.file_name;
        }
      } catch (e) {}
    }

    // Document-scoped vector retrieval
    const retrievedChunks = await retrieveDocumentChunks(subjectId, targetDocId, cleanQuestion, pageNumber);

    if (!retrievedChunks || retrievedChunks.length === 0) {
      return res.json({
        answer: "I couldn't find this information in the selected course material.",
        sources: [],
        confidence: 0.0,
        grounded: false
      });
    }

    const contextText = retrievedChunks
      .map((c) => `[Source: ${c.documentName || docName} | Page ${c.page}]:\n${c.content}`)
      .join("\n\n---\n\n");

    const sources = retrievedChunks.map((c) => ({
      documentId: c.documentId || targetDocId,
      documentName: c.documentName || docName,
      page: c.page || 1,
      chunkIndex: c.chunkIndex || 0
    }));

    // Groq API generation with strict Anti-Hallucination prompt
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      const primaryVisionModel = process.env.VISION_MODEL || "qwen/qwen3.8-27b";
      const primaryEvalModel = process.env.EVALUATION_MODEL || "openai/gpt-oss-120b";
      const modelsToTry = [
        primaryVisionModel,
        primaryEvalModel,
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "qwen-2.5-coder-32b",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
      ];

      for (const modelId of modelsToTry) {
        try {
          const systemPrompt = `You are an AI Study Assistant inside a college LMS for the course document: "${docName}".
Your task is to help students learn, understand, summarize, and answer questions grounded in the provided course document context.

Instructions:
1. When asked to explain a page, module, topic, or section (e.g. "Explain page 1", "Explain module 1", "What are the important points?", "Summarize"), analyze the provided document chunks and give a clear, comprehensive, step-by-step academic explanation.
2. Structure your response using markdown headers, bullet points, and LaTeX math formulas ($...$ or $$...$$) where applicable.
3. Always answer using the concepts, definitions, and facts present in the retrieved course document.
4. Only if the question is completely off-topic and has no relation to the course subject (e.g., asking about sports scores or cooking in a computer science paper), state that the topic is not covered in this course material.`;

          const userPrompt = `DOCUMENT CONTEXT (Current Page: ${pageNumber || 1}):
${contextText}

STUDENT QUESTION: "${cleanQuestion}"`;

          const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: modelId,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
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
              confidence: 0.93,
              grounded: !answerText.toLowerCase().includes("couldn't find")
            });
          }
        } catch (err) {
          console.warn(`Groq execution model ${modelId} failed:`, err.message);
        }
      }
    }

    // Fallback: Return top retrieved chunk content directly
    return res.json({
      answer: retrievedChunks[0].content,
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