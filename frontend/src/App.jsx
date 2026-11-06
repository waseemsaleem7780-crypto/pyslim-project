import { useState, useRef, useEffect } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';

// 🚀 NAYA: Particle Spinner Component
const ParticleSpinner = ({ size = 150, text = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = size;
    canvas.height = size;

    let particles = [];
    let globalAngle = 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 5;

    const step = () => {
      // Trail effect ke liye background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles generate karo
      for (let i = 0; i < 3; i++) {
        const angle = globalAngle + i * 0.5;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        particles.push({
          x,
          y,
          angle: angle + Math.PI / 2, // bahar ki taraf bhaago
          speed: Math.random() * 2 + 1,
          life: 1,
          color: `hsl(${Math.random() * 80 + 150}, 100%, 60%)` // Green/Cyan
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.05; // curve
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      globalAngle += 0.08;
      animationFrameId = requestAnimationFrame(step);
    };

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    step();

    return () => cancelAnimationFrame(animationFrameId);
  }, [size]);

  return (
    <div className="particle-spinner-container">
      <canvas ref={canvasRef} className="particle-canvas" />
      {text && <p className="particle-text">{text}</p>}
    </div>
  );
};

const CodeBlock = ({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  return !inline && match ? (
    <div className="monaco-wrapper">
      <div className="monaco-header"><span>{match[1].toUpperCase()}</span><span>Read Only</span></div>
      <Editor height="300px" defaultLanguage={match[1]} value={String(children).replace(/\n$/, '')} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 10 } }} />
    </div>
  ) : <code className={className}>{children}</code>;
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false); // NAYA: Login loading

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTool, setActiveTool] = useState('code');
  const [loading, setLoading] = useState(false);
  const [fileContext, setFileContext] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  
  const [histories, setHistories] = useState(() => {
    const saved = localStorage.getItem('pyslim_histories');
    return saved ? JSON.parse(saved) : { code: [], chat: [], image: [], video: [] };
  });
  
  const chatEndRef = useRef(null);

  const tools = [
    { id: 'code', label: '💻 Code', placeholder: "Write a Python function..." },
    { id: 'chat', label: '💬 Chat', placeholder: "Ask me anything..." },
    { id: 'image', label: '🎨 Image', placeholder: "Describe an image..." },
    { id: 'video', label: '🎬 Video', placeholder: "Describe a video..." }
  ];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const saveHistory = (newMessages) => {
    if (newMessages.length === 0) return;
    const newHistoryItem = { 
      id: Date.now(), 
      title: newMessages[0].text.slice(0, 20) + '...', 
      messages: newMessages 
    };
    
    setHistories(prevHistories => {
      const updatedHistories = {
        ...prevHistories,
        [activeTool]: [newHistoryItem, ...prevHistories[activeTool]].slice(0, 15)
      };
      localStorage.setItem('pyslim_histories', JSON.stringify(updatedHistories));
      return updatedHistories;
    });
  };

  const deleteHistory = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Kya aap waqai yeh chat delete karna chahte hain?")) {
      const updatedList = histories[activeTool].filter(item => item.id !== id);
      const updatedHistories = { ...histories, [activeTool]: updatedList };
      setHistories(updatedHistories);
      localStorage.setItem('pyslim_histories', JSON.stringify(updatedHistories));
      setMessages([]);
    }
  };

  const editHistory = (id, oldTitle, e) => {
    e.stopPropagation();
    const newTitle = window.prompt("Enter new chat name:", oldTitle.replace('...', ''));
    if (newTitle && newTitle.trim() !== "") {
      const updatedList = histories[activeTool].map(item => 
        item.id === id ? { ...item, title: newTitle + '...' } : item
      );
      const updatedHistories = { ...histories, [activeTool]: updatedList };
      setHistories(updatedHistories);
      localStorage.setItem('pyslim_histories', JSON.stringify(updatedHistories));
    }
  };

  const downloadMedia = async (url, type) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `pyslim-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const endpoint = isLogin ? "login" : "register";
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Auth failed");
      
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setMessages([]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      const data = await res.json();
      if (data.text) { setFileContext(data.text); alert("✅ File Loaded!"); }
      else { alert("Error: " + data.error); }
    } catch (err) { alert("Upload failed"); }
    setFileUploading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ text: input, mode: activeTool, context: fileContext })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        const finalMsgs = [...newMessages, { role: 'ai', text: data.output, type: data.type || 'text' }];
        setMessages(finalMsgs);
        saveHistory(finalMsgs); 
        setLoading(false);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let aiMessage = "";
        const tempMessages = [...newMessages, { role: 'ai', text: "", type: activeTool }];
        setMessages(tempMessages);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiMessage += decoder.decode(value, { stream: true });
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = aiMessage;
            return updated;
          });
        }
        const finalMsgs = [...newMessages, { role: 'ai', text: aiMessage, type: activeTool }];
        saveHistory(finalMsgs);
        setLoading(false);
        setFileContext("");
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: `⚠️ Error: ${error.message}`, type: 'text' }]);
      setLoading(false);
    }
  };

  const switchTool = (toolId) => {
    setActiveTool(toolId);
    setMessages([]);
  };

  const loadHistory = (pastMessages) => {
    setMessages(pastMessages);
  };

  // --- LOGIN SCREEN ---
  if (!token) {
    return (
      <div className="unique-login-wrapper">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>

        {/* NAYA: Auth Loading Overlay */}
        {authLoading && (
          <div className="auth-loading-overlay">
            <ParticleSpinner size={300} text="Authenticating..." />
          </div>
        )}

        <div className="unique-login-card">
          <div className="login-logo">PySlim AI</div>
          <p className="login-tagline">
            {isLogin ? "Welcome back to the future of coding." : "Join the next generation of developers."}
          </p>
          
          <form onSubmit={handleAuth} className="unique-form">
            <div className="unique-input-group">
              <label>Email Address</label>
              <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="unique-input-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="unique-actions">
              <label className="remember-me"><input type="checkbox" /> Remember me</label>
              <span className="forgot-link">Forgot Password?</span>
            </div>
            <button type="submit" className="unique-submit-btn" disabled={authLoading}>
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="login-switch">
            {isLogin ? "New to PySlim? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Create an account" : "Sign in"}</span>
          </div>
          {authError && <p className="unique-error">{authError}</p>}
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">PySlim AI</div>
        <button className="new-chat" onClick={() => {setMessages([]); setFileContext("");}}>+ New Chat</button>
        
        <div className="history-list">
          <p className="history-title">{tools.find(t => t.id === activeTool).label} History</p>
          {histories[activeTool].map((item) => (
            <div key={item.id} className="history-item-wrapper" onClick={() => loadHistory(item.messages)}>
              <span className="history-title-text">💬 {item.title}</span>
              <div className="history-actions">
                <button onClick={(e) => editHistory(item.id, item.title, e)} title="Rename">✏️</button>
                <button onClick={(e) => deleteHistory(item.id, e)} title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="user-profile">
          <span>{email || "User"}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-area">
        <div className="chat-box">
          {messages.length === 0 && (
            <div className="empty-state">
              <h1>{tools.find(t => t.id === activeTool).label} Generator</h1>
              <p>{tools.find(t => t.id === activeTool).placeholder}</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="msg-content">
                {msg.role === 'ai' ? (
                  <div className={`ai-response-block ${msg.type === 'image' || msg.type === 'video' ? 'media-block' : ''}`}>
                    <div className="markdown-body">
                      {msg.type === 'image' && (
                        <div className="media-container">
                          <img src={msg.text} alt="AI" className="generated-media" />
                          <button className="small-download-icon-btn" onClick={() => downloadMedia(msg.text, 'image')} title="Download">
                            ⬇️
                          </button>
                        </div>
                      )}
                      {msg.type === 'video' && (
                        <div className="media-container">
                          <video controls className="generated-media"><source src={msg.text} type="video/mp4" /></video>
                          <button className="small-download-icon-btn" onClick={() => downloadMedia(msg.text, 'video')} title="Download">
                            ⬇️
                          </button>
                        </div>
                      )}
                      {(msg.type === 'code' || msg.type === 'text') && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ) : (<p>{msg.text}</p>)}
              </div>
            </div>
          ))}
          
          {/* NAYA: Chat Loading State with Particle Spinner */}
          {loading && <ParticleSpinner size={100} text="AI is typing..." />}
          
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <div className="mode-toggle">
            {tools.map(tool => (
              <button key={tool.id} className={activeTool === tool.id ? 'active' : ''} onClick={() => switchTool(tool.id)}>
                {tool.label}
              </button>
            ))}
          </div>
          
          <div className="file-upload-row">
            <label className="file-upload-label">
              {fileUploading ? "Uploading..." : fileContext ? "📎 Context Loaded" : "📎 Attach File"}
              <input type="file" onChange={handleFileUpload} hidden />
            </label>
          </div>

          <div className="input-box">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder={tools.find(t => t.id === activeTool).placeholder} />
            <button onClick={handleSend} disabled={loading}>↑</button>
          </div>
        </div>
      </main>
    </div>
  );
}