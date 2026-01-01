import { useState, useEffect } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { PDFViewer } from './components/PDFViewer';
import { APIKeyModal, AIProvider } from './components/APIKeyModal';
import { getContextAwareText } from './lib/pdf-utils';
import { Loader2, Settings, BookOpen } from 'lucide-react';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  
  const [apiKey, setApiKey] = useState<string>('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  const [userPrompt, setUserPrompt] = useState<string>('You are my professor. Please guide me through these topics in a way that is easy to understand yet profound, balancing detail with brevity where appropriate.');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedProvider = localStorage.getItem('ai_provider') as AIProvider;
    const storedBaseUrl = localStorage.getItem('ai_base_url');
    const storedPrompt = localStorage.getItem('user_prompt');

    if (storedKey) {
      setApiKey(storedKey);
      setProvider(storedProvider || 'auto');
      setBaseUrl(storedBaseUrl || '');
    } else {
      setIsKeyModalOpen(true);
    }

    if (storedPrompt) {
      setUserPrompt(storedPrompt);
    }
  }, []);

  const handleSaveKey = (key: string, newProvider: AIProvider, newBaseUrl?: string) => {
    setApiKey(key);
    setProvider(newProvider);
    setBaseUrl(newBaseUrl || '');
    setIsKeyModalOpen(false);
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsSummarizing(false);
    }
  };

  const handlePromptChange = (val: string) => {
    setUserPrompt(val);
    localStorage.setItem('user_prompt', val);
  };

  const handleSummarize = async (pageNumber: number, count: number = 1) => {
    if (!pdfDocument || isSummarizing) return;
    
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }
    
    const controller = new AbortController();
    setAbortController(controller);
    setIsSummarizing(true);
    setSummary(null); 

    try {
      const context = await getContextAwareText(pdfDocument, pageNumber, count);
      
      if ((!context.targetText || !context.targetText.trim()) && (!context.targetImages || context.targetImages.length === 0)) {
        setSummary('⚠️ No content found on these pages.');
        setIsSummarizing(false);
        return;
      }

      const baseUrlHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrlHost}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-ai-provider': provider,
          'x-api-base-url': baseUrl,
        },
        body: JSON.stringify({ ...context, userPrompt }),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed', { cause: data.code });
      }

      if (!response.body) throw new Error('Response body is empty');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') return true;
            try {
                const json = JSON.parse(dataStr);
                if (json.message) throw new Error(json.message);
                if (json.text) setSummary(prev => (prev || '') + json.text);
            } catch (e) { /* partial */ }
        }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (processLine(line)) break;
            }
        }
        if (done) {
            if (buffer.trim()) processLine(buffer);
            break;
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Summarization aborted');
      } else {
        console.error('Failed to summarize:', error);
        const errorCode = error.cause ? ` [Code: ${error.cause}]` : '';
        setSummary(`Error: ${error.message}${errorCode}`);
      }
    } finally {
      setIsSummarizing(false);
      setAbortController(null);
    }
  };

  const [isSummaryVisible, setIsSummaryVisible] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
      <APIKeyModal 
        isOpen={isKeyModalOpen} 
        onSave={handleSaveKey}
        onClose={() => setIsKeyModalOpen(false)}
        canClose={!!apiKey}
      />

      <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shrink-0 shadow-sm z-30">
        <h1 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight">EffiReadAI</h1>
        <div className="flex items-center gap-2 md:gap-4">
          {file && (
            <button 
              onClick={() => { setFile(null); setSummary(null); setPdfDocument(null); }}
              className="text-xs md:text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Close File
            </button>
          )}
          <button
            onClick={() => setIsSummaryVisible(!isSummaryVisible)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full md:hidden"
            title="Toggle Summary"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all"
            title="API Key Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {!file ? (
          <div className="flex flex-1 items-center justify-center p-4 md:p-8 bg-gray-50">
            <div className="w-full max-w-xl">
              <PDFUploader onFileSelect={setFile} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* PDF Panel */}
            <div className={`flex-1 min-w-0 bg-gray-200 relative ${!isSummaryVisible ? 'block' : 'hidden md:block'}`}>
              <PDFViewer 
                file={file} 
                onPageChange={() => {}}
                onSummarize={handleSummarize}
                onStop={handleStop}
                isSummarizing={isSummarizing}
                onDocumentLoad={setPdfDocument}
              />
            </div>

            {/* Summary Panel */}
            <aside className={`${isSummaryVisible ? 'flex' : 'hidden md:flex'} w-full md:w-[350px] lg:w-[400px] flex-col border-l border-gray-200 bg-white shadow-2xl z-10 shrink-0 h-full overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b bg-gray-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Instruction</h2>
                  <button 
                    onClick={() => setIsSummaryVisible(false)}
                    className="md:hidden text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-inner transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  rows={2}
                  value={userPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Tell AI what to do..."
                />
              </div>
              
              <div className="flex items-center justify-between border-b px-4 py-2 bg-white">
                <h2 className="text-sm font-bold text-gray-700">Summary</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                {!summary && isSummarizing ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <span className="text-sm font-medium animate-pulse">Deep Learning...</span>
                  </div>
                ) : summary ? (
                  <article className="prose prose-slate max-w-none">
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-sans text-sm md:text-[15px]">
                      {summary}
                    </div>
                    {isSummarizing && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600 italic">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Generating...
                      </div>
                    )}
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 italic">
                      Pick a section and hit "Summarize"
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;