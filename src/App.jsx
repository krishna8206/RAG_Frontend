import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, Settings, MessageSquare, BookOpen, Activity, AlertTriangle, 
  Key, Play, CornerDownLeft, RefreshCw, Layers, Sparkles, Check, 
  CheckCircle2, XCircle, Search, ExternalLink, ArrowRight, BookMarked, 
  Code, Info, ShieldAlert, Cpu, X
} from 'lucide-react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rag-backend-nx26.onrender.com';

// Custom Markdown Inline Parser Helpers
const renderInlineMarkdown = (text) => {
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{ 
          fontFamily: 'var(--font-mono)', 
          backgroundColor: 'rgba(255, 255, 255, 0.08)', 
          padding: '0.1rem 0.35rem', 
          borderRadius: '4px', 
          fontSize: '0.85em', 
          color: '#f43f5e' 
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const mid = part.indexOf('](');
      const anchor = part.slice(1, mid);
      const url = part.slice(mid + 2, -1);
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ 
          color: 'var(--accent-cyan)', 
          textDecoration: 'underline', 
          fontWeight: '500' 
        }}>
          {anchor}
        </a>
      );
    }
    return part;
  });
};

const renderMarkdownText = (text) => {
  if (!text) return '';
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para, pIdx) => {
    // Code block check
    if (para.startsWith('```')) {
      const lines = para.split('\n');
      const language = lines[0].replace('```', '') || 'code';
      const code = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n');
      return (
        <pre key={pIdx} style={{
          backgroundColor: '#03060f',
          padding: '0.85rem',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          margin: '0.75rem 0',
          overflowX: 'auto',
          color: '#10b981'
        }}>
          <code>{code}</code>
        </pre>
      );
    }
    
    // Unordered List check
    if (para.startsWith('- ') || para.startsWith('* ')) {
      const items = para.split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
      return (
        <ul key={pIdx} style={{ paddingLeft: '1.25rem', margin: '0.5rem 0', listStyleType: 'disc' }}>
          {items.map((item, iIdx) => (
            <li key={iIdx} style={{ marginBottom: '0.25rem' }}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }

    // Numbered List check
    if (/^\d+\.\s+/.test(para)) {
      const items = para.split('\n').map(l => l.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
      return (
        <ol key={pIdx} style={{ paddingLeft: '1.25rem', margin: '0.5rem 0', listStyleType: 'decimal' }}>
          {items.map((item, iIdx) => (
            <li key={iIdx} style={{ marginBottom: '0.25rem' }}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
    }

    // Blockquote check
    if (para.startsWith('> ')) {
      return (
        <blockquote key={pIdx} style={{
          borderLeft: '3px solid var(--primary)',
          paddingLeft: '1rem',
          color: 'var(--text-secondary)',
          margin: '0.5rem 0',
          fontStyle: 'italic'
        }}>
          {renderInlineMarkdown(para.substring(2))}
        </blockquote>
      );
    }

    return (
      <p key={pIdx} style={{ marginBottom: '0.75rem', wordBreak: 'break-word', lineHeight: '1.6' }}>
        {renderInlineMarkdown(para)}
      </p>
    );
  });
};

function App() {
  // Config & API States
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_rag_apikey') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [serverHealth, setServerHealth] = useState({ status: 'unknown', chunksIndexed: 0 });
  const [chatModel, setChatModel] = useState(() => localStorage.getItem('gemini_chat_model') || 'gemini-1.5-flash');
  const [isMobile, setIsMobile] = useState(false);
  const [showContextSidebar, setShowContextSidebar] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChatModelChange = (val) => {
    setChatModel(val);
    localStorage.setItem('gemini_chat_model', val);
  };

  // Crawling Settings & Status
  const [crawlUrl, setCrawlUrl] = useState('https://react.dev/reference/react');
  const [maxPages, setMaxPages] = useState(15);
  const [maxDepth, setMaxDepth] = useState(2);
  const [delay, setDelay] = useState(1000);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState([]);
  const [crawlStats, setCrawlStats] = useState(null);

  // Workspace Navigation
  const [activeTab, setActiveTab] = useState('chat');

  // Chat/QA states
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your site-grounded assistant. Once you crawl a website, ask me anything, and I will answer strictly based on the site\'s text with source citations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [currentContexts, setCurrentContexts] = useState([]);

  // Vector Index Inspector States
  const [inspectorData, setInspectorData] = useState({ totalChunks: 0, totalPages: 0, pages: [], chunks: [] });
  const [selectedPageUrl, setSelectedPageUrl] = useState('');
  const [searchSandboxQuery, setSearchSandboxQuery] = useState('');
  const [sandboxHits, setSandboxHits] = useState([]);

  // Evaluation States
  const [evalReport, setEvalReport] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');

  const chatEndRef = useRef(null);
  const logConsoleRef = useRef(null);

  // Check backend health on boot and poll every 10s to handle Render.com free tier cold starts
  useEffect(() => {
    fetchHealth();
    fetchInspectorStats();

    const interval = setInterval(() => {
      fetchHealth();
      fetchInspectorStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isQuerying]);

  // Scroll to bottom of crawler log when crawling
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [crawlLogs]);

  // Save API Key to localStorage when updated
  const handleApiKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('gemini_rag_apikey', val);
  };

  const renderCrawlerSidebarContent = () => (
    <>
      <div className="panel-card">
        <div className="panel-title">
          <Cpu size={18} className="logo-icon" />
          <span>Polite Crawler Settings</span>
        </div>
        
        <div className="form-group">
          <label className="form-label">Starting URL</label>
          <input 
            type="text" 
            className="form-input" 
            value={crawlUrl} 
            onChange={(e) => setCrawlUrl(e.target.value)}
            disabled={isCrawling}
            placeholder="https://example.com/docs"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Max Pages</label>
            <input 
              type="number" 
              className="form-input" 
              value={maxPages} 
              onChange={(e) => setMaxPages(parseInt(e.target.value) || 5)}
              disabled={isCrawling}
              min="1"
              max="100"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Depth</label>
            <input 
              type="number" 
              className="form-input" 
              value={maxDepth} 
              onChange={(e) => setMaxDepth(parseInt(e.target.value) || 1)}
              disabled={isCrawling}
              min="1"
              max="5"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Delay (ms)</label>
          <input 
            type="number" 
            className="form-input" 
            value={delay} 
            onChange={(e) => setDelay(parseInt(e.target.value) || 500)}
            disabled={isCrawling}
            step="250"
            min="0"
          />
        </div>

        <button 
          className="btn" 
          onClick={handleStartCrawl}
          disabled={isCrawling || !crawlUrl}
        >
          {isCrawling ? (
            <>
              <RefreshCw className="pulse" size={16} />
              <span>Crawling...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Start Scrape & Index</span>
            </>
          )}
        </button>
      </div>

      <div className="panel-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
        <div className="panel-title">
          <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span>Crawler Live Console</span>
        </div>
        
        <div className="console-log" ref={logConsoleRef}>
          {crawlLogs.length === 0 ? (
            <div className="console-line info">Console ready. Trigger a crawl to stream activity.</div>
          ) : (
            crawlLogs.map((log, idx) => (
              <div key={idx} className={`console-line ${log.type}`}>
                {log.text}
              </div>
            ))
          )}
        </div>

        {crawlStats && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-green)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <span>Crawled: {crawlStats.pagesCrawled} pages</span>
            <span>Chunks: {crawlStats.chunksCreated}</span>
          </div>
        )}
      </div>
    </>
  );

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      const data = await res.json();
      setServerHealth({ status: data.status, chunksIndexed: data.chunksIndexed });
    } catch (e) {
      setServerHealth({ status: 'offline', chunksIndexed: 0 });
    }
  };

  const fetchInspectorStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/inspect`);
      const data = await res.json();
      setInspectorData(data);
      if (data.pages.length > 0 && !selectedPageUrl) {
        setSelectedPageUrl(data.pages[0].url);
      }
    } catch (e) {
      console.error('Failed to load inspector stats:', e);
    }
  };

  // Trigger Scraper
  const handleStartCrawl = () => {
    if (!crawlUrl) return;
    
    setIsCrawling(true);
    setCrawlLogs([{ type: 'status', text: 'Connecting to crawler...' }]);
    setCrawlStats(null);

    const escUrl = `${API_BASE_URL}/api/crawl?url=${encodeURIComponent(crawlUrl)}&maxPages=${maxPages}&maxDepth=${maxDepth}&delay=${delay}&apiKey=${apiKey}`;
    const eventSource = new EventSource(escUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'start') {
        setCrawlLogs([{ type: 'status', text: data.message }]);
      } else if (data.type === 'fetching') {
        setCrawlLogs(prev => [...prev, { type: 'fetching', text: `[FETCHING] Depth ${data.depth} -> ${data.url}` }]);
      } else if (data.type === 'indexed') {
        setCrawlLogs(prev => [...prev, { type: 'indexed', text: `[INDEXED] "${data.title}" (${data.contentLength} chars)` }]);
      } else if (data.type === 'skipped') {
        setCrawlLogs(prev => [...prev, { type: 'skipped', text: `[SKIPPED] ${data.url} - Reason: ${data.reason}` }]);
      } else if (data.type === 'error') {
        setCrawlLogs(prev => [...prev, { type: 'error', text: `[ERROR] ${data.url || ''} - ${data.message}` }]);
      } else if (data.type === 'status') {
        setCrawlLogs(prev => [...prev, { type: 'status', text: data.message }]);
      } else if (data.type === 'complete') {
        setCrawlLogs(prev => [...prev, { type: 'indexed', text: `\n🏁 ${data.message}` }]);
        setCrawlStats(data.stats);
        setIsCrawling(false);
        eventSource.close();
        fetchHealth();
        fetchInspectorStats();
      }
    };

    eventSource.onerror = (e) => {
      setCrawlLogs(prev => [...prev, { type: 'error', text: 'Error: Connection lost or crawl interrupted.' }]);
      setIsCrawling(false);
      eventSource.close();
    };
  };

  // Trigger Q&A query
  const handleSendMessage = () => {
    if (!chatQuery.trim() || isQuerying) return;

    const userMsg = {
      sender: 'user',
      text: chatQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory(prev => [...prev, userMsg]);
    const originalQuery = chatQuery;
    setChatQuery('');
    setIsQuerying(true);

    const assistantMsgIndex = chatHistory.length + 1;
    // Insert temporary assistant bubble
    setChatHistory(prev => [...prev, {
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      citations: [],
    }]);

    const queryUrl = `${API_BASE_URL}/api/query?q=${encodeURIComponent(originalQuery)}&apiKey=${apiKey}&model=${chatModel}`;
    const eventSource = new EventSource(queryUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'context') {
        // Top chunks retrieved
        setCurrentContexts(data.chunks);
        // Map chunks to unique URLs for unique citations
        const cites = [];
        data.chunks.forEach(chunk => {
          if (!cites.some(c => c.url === chunk.url)) {
            cites.push({ title: chunk.title, url: chunk.url });
          }
        });
        setChatHistory(prev => 
          prev.map((msg, idx) => 
            idx === assistantMsgIndex ? { ...msg, citations: cites } : msg
          )
        );
      } else if (data.type === 'token') {
        setChatHistory(prev => 
          prev.map((msg, idx) => 
            idx === assistantMsgIndex ? { ...msg, text: msg.text + data.token } : msg
          )
        );
      } else if (data.type === 'done') {
        setChatHistory(prev => 
          prev.map((msg, idx) => 
            idx === assistantMsgIndex ? { ...msg, isStreaming: false } : msg
          )
        );
        setIsQuerying(false);
        eventSource.close();
      } else if (data.type === 'error') {
        setChatHistory(prev => 
          prev.map((msg, idx) => 
            idx === assistantMsgIndex ? { ...msg, text: `Error: ${data.message}`, isStreaming: false } : msg
          )
        );
        setIsQuerying(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      setChatHistory(prev => 
        prev.map((msg, idx) => 
          idx === assistantMsgIndex ? { ...msg, text: msg.text + ' [Error: Connection to streaming backend failed]', isStreaming: false } : msg
        )
      );
      setIsQuerying(false);
      eventSource.close();
    };
  };

  // Run Eval
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvalReport(null);
    setEvalError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/evaluate?model=${chatModel}`, {
        headers: {
          'x-api-key': apiKey
        }
      });
      const data = await res.json();
      if (data.error) {
        setEvalError(data.error);
      } else {
        setEvalReport(data);
      }
    } catch (e) {
      setEvalError('Network error starting evaluation pipeline.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Inspector Search Sandbox
  const handleSandboxSearch = async () => {
    if (!searchSandboxQuery.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/query?q=${encodeURIComponent(searchSandboxQuery)}&apiKey=${apiKey}&model=${chatModel}`);
      // Query returns SSE, but since it sends context event first we can read the raw stream for debugging, 
      // or we can simulate a mock request. But wait, we can also query a dedicated search route or extract it.
      // Wait, we can implement client-side local TF-IDF search sandbox or query backend.
      // Let's implement a clean local matching or request backend. Actually, we can fetch matching chunks from the server!
      // Let's see if we can do semantic search on backend. Since query endpoint streams context first, 
      // let's fetch matching chunks or run a lightweight search query!
      // In server index.js, /api/query returns the context chunks. We can read the first event from it, or we can build 
      // a small dedicated search sandbox endpoint, OR we can just use the `/api/query` stream to parse and display hits!
      // Let's read `/api/query` stream for sandbox search:
      const queryUrl = `${API_BASE_URL}/api/query?q=${encodeURIComponent(searchSandboxQuery)}&apiKey=${apiKey}&model=${chatModel}`;
      const eventSource = new EventSource(queryUrl);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'context') {
          setSandboxHits(data.chunks);
          eventSource.close();
        }
      };
      eventSource.onerror = () => eventSource.close();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter chunks for selection page
  const pageChunksFiltered = inspectorData.chunks.filter(c => c.url === selectedPageUrl);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <Globe className="logo-icon" size={24} />
          <span>RAG Web-Chatter</span>
        </div>
        
        <div className="header-actions">
          {/* Health indicator */}
          <div className="server-health-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: serverHealth.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
              boxShadow: serverHealth.status === 'ok' ? '0 0 8px var(--accent-green)' : '0 0 8px var(--accent-red)'
            }} />
            <span>
              Server: {serverHealth.status === 'ok' ? 'Online' : 'Offline'} ({serverHealth.chunksIndexed} Chunks)
              {serverHealth.status !== 'ok' && (
                <span className="pulse" style={{ color: 'var(--accent-red)', marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  (Waking up backend...)
                </span>
              )}
            </span>
          </div>

          {/* Gemini Chat Model selector */}
          <div className="model-selector-container">
            <Cpu size={14} className="text-muted" />
            <select 
              className="model-select"
              value={chatModel}
              onChange={(e) => handleChatModelChange(e.target.value)}
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Reasoning)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>

          {/* Gemini API Key input */}
          <div className="api-key-container">
            <Key size={14} className="text-muted" />
            <input 
              type={showApiKey ? "text" : "password"} 
              className="api-key-input"
              placeholder="Gemini API Key (Optional)"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
            <button 
              className="btn-secondary" 
              style={{ border: 'none', padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer' }}
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Crawler (Desktop only) */}
        {!isMobile && (
          <aside className="sidebar">
            {renderCrawlerSidebarContent()}
          </aside>
        )}

        {/* Right Side: Tab workspace */}
        <main className="workspace-pane">
          {/* Tab Headers */}
          <nav className="tab-headers">
            {isMobile && (
              <button 
                className={`tab-btn ${activeTab === 'crawler' ? 'active' : ''}`}
                onClick={() => setActiveTab('crawler')}
              >
                <Settings size={16} />
                <span>Crawler</span>
              </button>
            )}
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>Grounded Chat</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              <Layers size={16} />
              <span>Vector Store Inspector</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluation')}
            >
              <Activity size={16} />
              <span>Evaluation Suite</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="tab-content">
            
            {/* TAB 0: Crawler (Mobile only) */}
            {isMobile && activeTab === 'crawler' && (
              <div className="sidebar" style={{ borderRight: 'none', backgroundColor: 'transparent', padding: 0, height: '100%', overflowY: 'auto' }}>
                {renderCrawlerSidebarContent()}
              </div>
            )}

            {/* TAB 1: Grounded Chat */}
            {activeTab === 'chat' && (
              <div className="chat-container">
                {/* Chat Panel */}
                <div className="chat-messages-box">
                  <div className="chat-header-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Site-Grounded Assistant</span>
                    </div>
                    {isMobile && (
                      <button 
                        className="btn-secondary" 
                        style={{ border: 'none', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => setShowContextSidebar(!showContextSidebar)}
                      >
                        <Layers size={12} />
                        <span>Sources ({currentContexts.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="chat-history">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble ${msg.sender} ${msg.text.startsWith('Error') ? 'error' : ''}`}>
                        <div className="chat-text">
                          {msg.text ? renderMarkdownText(msg.text) : (
                            <div className="typing-indicator">
                              <div className="typing-dot" />
                              <div className="typing-dot" />
                              <div className="typing-dot" />
                            </div>
                          )}
                        </div>
                        
                        {/* Display Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="citations-wrapper">
                            <span className="citation-title">Sources Cited</span>
                            <div className="citation-links">
                              {msg.citations.map((cite, cIdx) => (
                                <a 
                                  key={cIdx} 
                                  href={cite.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="citation-link-pill"
                                  title={cite.url}
                                >
                                  <BookMarked size={10} style={{ color: 'var(--accent-cyan)' }} />
                                  <span>{cite.title || 'Source'}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <span className="chat-meta">{msg.timestamp}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="chat-input-area">
                    <input 
                      type="text" 
                      className="chat-input"
                      placeholder={inspectorData.totalChunks === 0 ? "⚠️ Search index is empty. Scrape a site first..." : "Ask a question about the crawled website..."}
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isQuerying || inspectorData.totalChunks === 0}
                    />
                    <button 
                      className="btn" 
                      onClick={handleSendMessage}
                      disabled={isQuerying || !chatQuery.trim() || inspectorData.totalChunks === 0}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                {/* Context Sidebar */}
                {(!isMobile || showContextSidebar) && (
                  <div className={isMobile ? "chat-sidebar-drawer" : "chat-sidebar"}>
                    {isMobile && (
                      <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Layers size={14} />
                          Retrieved Context
                        </span>
                        <button 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          onClick={() => setShowContextSidebar(false)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                    {!isMobile && (
                      <div className="panel-title" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <Layers size={14} />
                        <span>Retrieved Context (Top-K)</span>
                      </div>
                    )}
                    
                    {currentContexts.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                        Context chunks retrieved for the last Q&A query will be displayed here for transparency.
                      </div>
                    ) : (
                      currentContexts.map((context, cidx) => (
                        <div className="context-card" key={cidx}>
                          <div className="context-card-header">
                            <span className="context-card-title" title={context.title}>{context.title}</span>
                            <span className="context-card-score">{(context.score || 0).toFixed(3)}</span>
                          </div>
                          <div className="context-card-text" title={context.text}>"{context.text}"</div>
                          <a href={context.url} target="_blank" rel="noopener noreferrer" className="context-card-link" title={context.url}>
                            {context.url}
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {isMobile && showContextSidebar && (
                  <div className="drawer-backdrop" onClick={() => setShowContextSidebar(false)} />
                )}
              </div>
            )}

            {/* TAB 2: Vector Store Inspector */}
            {activeTab === 'inspector' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden', flex: 1 }}>
                
                {/* Search Sandbox */}
                <div className="panel-card" style={{ padding: '1rem' }}>
                  <div className="panel-title" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                    <Search size={14} />
                    <span>Vector Search Sandbox Playground</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ flex: 1 }}
                      placeholder="Type a search query to test similarity matching scores..."
                      value={searchSandboxQuery}
                      onChange={(e) => setSearchSandboxQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSandboxSearch()}
                    />
                    <button className="btn" onClick={handleSandboxSearch}>Test Query</button>
                  </div>
                  
                  {sandboxHits.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {sandboxHits.map((hit, hIdx) => (
                        <div key={hIdx} className="context-card" style={{ margin: 0 }}>
                          <div className="context-card-header">
                            <span className="context-card-title">{hit.title}</span>
                            <span className="context-card-score" style={{ backgroundColor: 'var(--primary-glow)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                              Score: {hit.score.toFixed(4)}
                            </span>
                          </div>
                          <div className="context-card-text" style={{ fontSize: '0.75rem', height: '60px' }}>"{hit.text}"</div>
                          <a href={hit.url} target="_blank" rel="noopener noreferrer" className="context-card-link">{hit.url}</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="inspector-grid">
                  {/* Left Column: Page URLs */}
                  <div className="pages-list">
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Crawled Pages ({inspectorData.pages.length})
                    </div>
                    {inspectorData.pages.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No pages indexed.
                      </div>
                    ) : (
                      inspectorData.pages.map((p, idx) => (
                        <div 
                          key={idx} 
                          className={`page-item ${selectedPageUrl === p.url ? 'active' : ''}`}
                          onClick={() => setSelectedPageUrl(p.url)}
                        >
                          <span className="page-item-title">{p.title}</span>
                          <span className="page-item-url" title={p.url}>{p.url}</span>
                          <div className="page-item-stats">
                            <span>{p.chunks} chunks</span>
                            <span>|</span>
                            <span>{p.chars} chars</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right Column: Chunk List */}
                  <div className="chunks-detail">
                    <div className="chunks-detail-header">
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Document Chunks ({pageChunksFiltered.length})
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        URL: {selectedPageUrl}
                      </div>
                    </div>

                    <div className="chunks-scroller">
                      {pageChunksFiltered.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Select a page to inspect its vector chunks.
                        </div>
                      ) : (
                        pageChunksFiltered.map((chunk, idx) => (
                          <div key={idx} className="chunk-inspect-card">
                            <div className="chunk-inspect-card-header">
                              <span>Chunk Index: <span className="chunk-badge">{chunk.id}</span></span>
                              <span style={{ color: chunk.hasEmbedding ? 'var(--accent-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={12} />
                                {chunk.hasEmbedding ? 'Embeddings OK' : 'TF-IDF Fallback Mode'}
                              </span>
                            </div>
                            <div className="chunk-text-content">
                              {chunk.textPreview}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Evaluation Suite */}
            {activeTab === 'evaluation' && (
              <div className="eval-grid">
                
                {/* Start Evaluation trigger */}
                <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Activity size={32} style={{ color: 'var(--primary)' }} />
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Retrieval Recall Benchmarking</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        This benchmark generates sample test queries from the currently indexed pages, issues them to the vector search, and measures the percentage of test cases that successfully recall the expected page URL in the Top-K results.
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    className="btn" 
                    onClick={handleRunEvaluation}
                    disabled={isEvaluating || inspectorData.totalChunks === 0}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="pulse" size={16} />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Run Retrieval Eval</span>
                      </>
                    )}
                  </button>
                </div>

                {evalError && (
                  <div className="chat-bubble error" style={{ maxWidth: '100%', alignSelf: 'stretch' }}>
                    <ShieldAlert size={16} />
                    <span>Error executing evaluation pipeline: {evalError}</span>
                  </div>
                )}

                {evalReport && (
                  <>
                    {/* Summary stats */}
                    <div className="eval-summary-card">
                      <div className="eval-stat-box">
                        <div className="stat-value" style={{ color: evalReport.stats.recallRate > 80 ? 'var(--accent-green)' : 'var(--primary)' }}>
                          {evalReport.stats.recallRate}%
                        </div>
                        <div className="stat-label">Retrieval Recall</div>
                      </div>
                      <div className="eval-stat-box">
                        <div className="stat-value">{evalReport.stats.recalledCases} / {evalReport.stats.totalTestCases}</div>
                        <div className="stat-label">Successful Recalls</div>
                      </div>
                      <div className="eval-stat-box">
                        <div className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.4rem' }}>{evalReport.stats.mode}</div>
                        <div className="stat-label" style={{ marginTop: '0.6rem' }}>Search Mode</div>
                      </div>
                      <div className="eval-stat-box">
                        <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>Top-4 (K=4)</div>
                        <div className="stat-label">Rank Context Window</div>
                      </div>
                    </div>

                    {/* Detailed evaluation result list */}
                    <div className="eval-results-list">
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Detailed Test Reports
                      </h4>
                      {evalReport.results.map((res, rIdx) => (
                        <div className="eval-case-card" key={rIdx}>
                          <div className="eval-case-header">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                              <span>Test Case #{rIdx + 1}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                                ({res.isGeneratedByAI ? 'Gemini AI Generated' : 'Sentence Extracted'})
                              </span>
                            </span>
                            <span className={`eval-case-badge ${res.recalled ? 'success' : 'failure'}`}>
                              {res.recalled ? `Recalled (Rank ${res.rank})` : 'Recall Failed'}
                            </span>
                          </div>
                          
                          <div className="eval-case-body">
                            <div className="eval-case-query">
                              "{res.query}"
                            </div>
                            
                            <div className="eval-detail-row">
                              <div className="eval-detail-label">Expected URL:</div>
                              <a href={res.expectedUrl} target="_blank" rel="noopener noreferrer" className="eval-detail-val" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>
                                {res.expectedTitle} ({res.expectedUrl})
                              </a>
                            </div>

                            <div className="eval-detail-row">
                              <div className="eval-detail-label">Source Snippet:</div>
                              <div className="eval-detail-val" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                {res.chunkSnippet}
                              </div>
                            </div>

                            <div className="eval-detail-row">
                              <div className="eval-detail-label">Top Hits Retrieved:</div>
                              <div className="eval-hits-scroller">
                                {res.hits.map((hit, hIdx) => {
                                  const isTarget = hit.url === res.expectedUrl;
                                  return (
                                    <div key={hIdx} className={`eval-hit-pill ${isTarget ? 'correct' : ''}`}>
                                      <span style={{ fontWeight: '600', marginRight: '0.25rem' }}>#{hIdx + 1}</span>
                                      <span title={hit.url}>{hit.title}</span>
                                      <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                        ({hit.score.toFixed(3)})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {inspectorData.totalChunks === 0 && (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <AlertTriangle size={32} style={{ margin: '0 auto 1rem', color: 'var(--accent-red)' }} />
                    <p>No indices found. Please crawl a site from the left pane first before running evaluation.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
