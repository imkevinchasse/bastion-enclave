import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Radio, ExternalLink, Calendar, Loader2, Signal, AlertTriangle } from 'lucide-react';

interface BlogPost {
  title: string;
  pubDate: string;
  link: string;
  description: string;
  thumbnail: string;
  author: string;
}

interface NewsFeedProps {
  compact?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ compact = false }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Using rss2json to bridge the XML feed to JSON and bypass CORS securely
        const FEED_URL = 'https://bastionironledger.blogspot.com/feeds/posts/default?alt=rss';
        const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
        
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.status === 'ok') {
          setPosts(data.items);
        } else {
          throw new Error("Signal jammed");
        }
      } catch (e) {
        setError("Unable to establish uplink with Bastion Iron Ledger.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Utility to strip HTML tags for secure preview rendering
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className={`space-y-6 mx-auto animate-in fade-in slide-in-from-bottom-8 ${compact ? 'w-full' : 'max-w-4xl'}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    <div className="relative">
                        <Signal size={24} className="text-emerald-400" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    </div>
                    Iron Ledger
                </h2>
                <p className="text-slate-500 text-sm mt-1">Public advisories & system logs from HQ</p>
            </div>
            <a href="https://bastionironledger.blogspot.com" target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">
                    Visit Site <ExternalLink size={14} />
                </Button>
            </a>
        </div>
      )}

      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
              <div className="font-mono text-xs uppercase tracking-widest">Establishing Secure Handshake...</div>
          </div>
      ) : error ? (
          <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-8 text-center">
              <AlertTriangle size={32} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Connection Failed</h3>
              <p className="text-slate-400 text-sm">{error}</p>
              <Button onClick={() => window.location.reload()} variant="secondary" className="mt-6">Retry Connection</Button>
          </div>
      ) : (
          <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              {posts.map((post, index) => (
                  <a 
                    key={index} 
                    href={post.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`group bg-slate-900/50 border border-white/5 rounded-2xl hover:border-indigo-500/30 hover:bg-slate-900/80 transition-all duration-300 relative overflow-hidden flex flex-col h-full ${compact ? 'p-4' : 'p-6'}`}
                  >
                      {/* Hover Decoration */}
                      <div className="absolute top-0 right-0 p-16 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex-1">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 uppercase tracking-wider mb-2">
                              <Calendar size={12} />
                              {new Date(post.pubDate).toLocaleDateString()}
                          </div>
                          
                          <h3 className={`font-bold text-slate-200 mb-2 group-hover:text-white leading-tight ${compact ? 'text-sm' : 'text-lg'}`}>
                              {post.title}
                          </h3>
                          
                          {!compact && (
                              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-4">
                                  {stripHtml(post.description)}
                              </p>
                          )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mt-auto opacity-70 group-hover:opacity-100 transition-opacity">
                          READ_ENTRY <ExternalLink size={12} />
                      </div>
                  </a>
              ))}
          </div>
      )}
    </div>
  );
};