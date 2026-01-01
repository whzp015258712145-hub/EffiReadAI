import { useState, useEffect } from 'react';
import { Key, Lock, Server, Globe } from 'lucide-react';

export type AIProvider = 'auto' | 'gemini' | 'openai' | 'deepseek' | 'custom';

interface APIKeyModalProps {
  isOpen: boolean;
  onSave: (key: string, provider: AIProvider, baseUrl?: string) => void;
  onClose: () => void;
  canClose: boolean;
}

const PROVIDERS: { id: AIProvider; name: string; defaultUrl?: string }[] = [
  { id: 'auto', name: 'Auto Detect (Recommended)' },
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'custom', name: 'Custom OpenAI-Compatible' },
];

export function APIKeyModal({ isOpen, onSave, onClose, canClose }: APIKeyModalProps) {
  const [key, setKey] = useState('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKey(localStorage.getItem('gemini_api_key') || '');
      setProvider((localStorage.getItem('ai_provider') as AIProvider) || 'auto');
      setBaseUrl(localStorage.getItem('ai_base_url') || '');
    }
  }, [isOpen]);

  // Auto-detect provider logic
  useEffect(() => {
    if (provider === 'auto' && key) {
      if (key.startsWith('AIza')) {
        // Visual feedback only, we don't change state to avoid fighting user
        // But for internal logic we know it's Gemini
      } else if (key.startsWith('sk-')) {
        // Could be OpenAI or DeepSeek, hard to say
      }
    }
  }, [key, provider]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      localStorage.setItem('ai_provider', provider);
      
      let finalBaseUrl = baseUrl;
      if (provider === 'deepseek' && !baseUrl) {
        finalBaseUrl = 'https://api.deepseek.com';
      }
      
      localStorage.setItem('ai_base_url', finalBaseUrl);
      onSave(key.trim(), provider, finalBaseUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        {canClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
        
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">AI Settings</h2>
          <p className="text-sm text-gray-500 text-center mt-2">
            Configure your AI provider. Support for Gemini, OpenAI, DeepSeek, and more.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProvider)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={provider === 'gemini' ? "AIza..." : "sk-..."}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            {provider === 'auto' && key.startsWith('AIza') && (
              <p className="text-xs text-green-600 mt-1">Detected: Google Gemini</p>
            )}
          </div>

          {/* Base URL (Conditional) */}
          {(provider === 'custom' || provider === 'openai' || provider === 'deepseek') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base URL {provider === 'deepseek' && '(Optional)'}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'deepseek' ? "https://api.deepseek.com" :
                    provider === 'openai' ? "https://api.openai.com/v1" :
                    "https://api.example.com/v1"
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
          >
            Save Configuration
          </button>
        </form>
      </div>
    </div>
  );
}