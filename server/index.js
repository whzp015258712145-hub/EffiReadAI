require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to construct the unified prompt
function constructPrompt(targetText, previousContext, nextContext, userPrompt) {
  return `
    Following is content from a document. Please process it according to the [User Instruction].
    
    [User Instruction]:
    ${userPrompt || 'You are my professor. Please guide me through these topics in a way that is easy to understand yet profound, balancing detail with brevity where appropriate.'}
    
    [Context Awareness Rules]:
    - Use "Previous Context" and "Next Context" ONLY to understand incomplete sentences or ambiguous references in the "Target Content".
    - Do NOT summarize or include the "Previous Context" or "Next Context" in your output. Focus strictly on the "Target Content".
    
    === Previous Context (Page before the range) ===
    ${previousContext || '(None)'}
    
    === Target Content (The pages to process) ===
    ${targetText || '(Content provided as images, see attached)'}
    
    === Next Context (Page after the range) ===
    ${nextContext || '(None)'}
  `;
}

// Stream Handler for OpenAI-compatible providers
async function streamOpenAI(res, apiKey, baseUrl, prompt, targetImages) {
  let base = baseUrl || 'https://api.openai.com/v1';
  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  const url = base + '/chat/completions';
  
  let model = 'gpt-4o';
  if (baseUrl && baseUrl.includes('deepseek')) {
    model = 'deepseek-chat';
  }

  const userContent = [{ type: 'text', text: prompt }];
  if (targetImages && targetImages.length > 0) {
    targetImages.forEach(img => {
        userContent.push({
            type: 'image_url',
            image_url: { url: 'data:image/jpeg;base64,' + img }
        });
    });
  }

  try {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
            model: model,
            stream: true, 
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                {
                    role: 'user', 
                    content: (targetImages && targetImages.length > 0) ? userContent : prompt 
                }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error('AI_PROVIDER_ERROR_' + response.status + ': ' + errorBody);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmed.slice(6));
                    const text = json.choices[0]?.delta?.content || '';
                    if (text) {
                        res.write('data: ' + JSON.stringify({ text: text }) + '\n\n');
                    }
                } catch (e) {
                    // Ignore partial chunks
                }
            }
        }
    }
  } catch (error) {
    throw error;
  }
}

// Model Cache
const modelCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; 

async function getSortedGeminiModels(apiKey) {
  const cached = modelCache.get(apiKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.models;
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.models) return [];

    const validModels = data.models.filter(m => 
      m.supportedGenerationMethods && 
      m.supportedGenerationMethods.includes('generateContent')
    );

    const sortedModels = validModels.map(m => {
        const name = m.name.replace('models/', '');
        const match = name.match(/gemini-(\d+)\.(\d+)/);
        let versionScore = 0;
        
        if (match) {
            versionScore = parseFloat(match[1] + '.' + match[2]);
        } else if (name.includes('gemini-pro')) {
            versionScore = 1.0; 
        }

        if (name.includes('exp') || name.includes('latest')) {
            versionScore += 0.01;
        }

        if (name.includes('flash')) {
            versionScore += 0.5; 
            if (name.includes('8b')) {
                versionScore += 0.3; 
            }
        }

        return { name: name, versionScore: versionScore };
    })
    .sort((a, b) => b.versionScore - a.versionScore)
    .map(m => m.name);

    modelCache.set(apiKey, { timestamp: Date.now(), models: sortedModels });
    return sortedModels;
  } catch (error) {
    console.warn('[Backend] Failed to list dynamic models:', error.message);
    return [];
  }
}

app.post('/api/summarize', async (req, res) => {
  let heartbeat;
  const cleanupStream = () => {
    if (heartbeat) clearInterval(heartbeat);
  };

  try {
    const apiKey = req.headers['x-api-key'] || req.headers['x-google-api-key'];
    const provider = req.headers['x-ai-provider'] || 'auto';
    const baseUrl = req.headers['x-ai-base-url'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API Key.', code: 'ERR_001' });
    }

    const { targetText, targetImages, previousContext, nextContext, userPrompt } = req.body;
    const hasText = targetText && targetText.trim().length > 0;
    const hasImages = targetImages && targetImages.length > 0;

    if (!hasText && !hasImages) {
      return res.status(400).json({ error: 'No content to summarize.', code: 'ERR_002' });
    }

    const prompt = constructPrompt(targetText, previousContext, nextContext, userPrompt);
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Keep-alive heartbeat every 1 second
    heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 1000);

    req.on('close', cleanupStream);

    const isGemini = provider === 'gemini' || (provider === 'auto' && apiKey.startsWith('AIza'));

    if (isGemini) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const parts = [{ text: prompt }];
      if (targetImages && targetImages.length > 0) {
        targetImages.forEach(img => {
            parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
        });
      }

      let candidates = await getSortedGeminiModels(apiKey);
      if (candidates.length === 0) {
          candidates = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
      }

      console.log('[Backend] Candidates:', candidates);

      let success = false;
      let lastError = null;

      for (const modelName of candidates) {
        if (hasImages && modelName === 'gemini-pro') continue;

        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContentStream(parts);
            for await (const chunk of result.stream) {
                const text = chunk.text();
                res.write('data: ' + JSON.stringify({ text: text }) + '\n\n');
            }
            success = true;
            break; 
        } catch (err) {
            lastError = err;
        }
      }

      if (!success) {
        const msg = (hasImages && lastError?.message?.includes('404')) 
            ? "Vision Not Supported: Key lacks access to Gemini 1.5/2.0."
            : (lastError?.message || "All models failed");
        res.write('event: error\ndata: ' + JSON.stringify({ message: msg }) + '\n\n');
      }

    } else {
      await streamOpenAI(res, apiKey, baseUrl, prompt, targetImages);
    }

    res.write('data: [DONE]\n\n');
    cleanupStream();
    res.end();

  } catch (error) {
    cleanupStream();
    if (!res.headersSent) {
         res.status(500).json({ error: 'Server Error: ' + error.message, code: 'ERR_004' });
    } else {
         res.write('event: error\ndata: ' + JSON.stringify({ message: error.message }) + '\n\n');
         res.end();
    }
  }
});

app.listen(port, () => {
  console.log('Server running at http://localhost:' + port);
});