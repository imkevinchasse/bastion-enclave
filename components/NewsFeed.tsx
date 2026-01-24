
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { ExternalLink, Calendar, Loader2, Signal, AlertTriangle } from 'lucide-react';

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
        // Direct connection to Bastion Iron Ledger via Blogger JSON API
        // Using JSONP (Script Injection) to bypass CORS restrictions enforced by browsers on 'fetch'
        const data: any = await new Promise((resolve, reject) => {
            const callbackName = 'bastion_ledger_' + Math.round(Math.random() * 100000);
            const script = document.createElement('script');
            const url = `https://bastionironledger.blogspot.com/feeds/posts/default?alt=json&callback=${callbackName}&t=${Date.now()}`;

            // Safety Timeout (8s)
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Connection timeout"));
            }, 8000);

            const cleanup = () => {
                // @ts-ignore
                delete window[callbackName];
                if (document.head.contains(script)) document.head.removeChild(script);
                clearTimeout(timeout);
            }

            // Register global callback
            // @ts-ignore
            window[callbackName] = (response) => {
                cleanup();
                resolve(response);
            };

            script.src = url;
            script.onerror = () => {
                cleanup();
                reject(new Error("Network protocol error"));
            };

            document.head.appendChild(script);
        });

        const entries = data.feed.entry || [];

        const mappedPosts: BlogPost[] = entries.map((entry: any) => {
             const content = entry.content?.$t || entry.summary?.$t || "";
             
             // Extract Link
             const linkObj = entry.link.find((l: any) => l.rel === 'alternate');
             const link = linkObj ? linkObj.href : 'https://bastionironledger.blogspot.com';

             // Extract Thumbnail
             let thumbnail = entry.media$thumbnail?.url;
             if (thumbnail) {
                 // Upgrade thumbnail resolution from 72px to 600px for high-density displays
                 thumbnail = thumbnail.replace(/\/s[0-9]+-c\//, "/w600/"); 
             } else {
                 // Fallback: Scrape first image from HTML content
                 const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
                 if (imgMatch) thumbnail = imgMatch[1];
             }

             return {
                 title: entry.title.$t,
                 pubDate: entry.published.$t,
                 link: link,
                 description: content, // Full content, we strip it in UI
                 thumbnail: thumbnail || '',
                 author: entry.author?.[0]?.name?.$t || 'Bastion HQ'
             };
        });
        
        setPosts(mappedPosts);
      } catch (e) {
        console.error(e);
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
