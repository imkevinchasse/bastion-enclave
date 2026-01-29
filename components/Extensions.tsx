
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { zip, Zippable } from 'fflate';
import { Chrome, Compass, AppWindow, ShieldCheck, Download, Zap, HelpCircle, CheckCircle, Copy, AlertCircle, Bookmark, ExternalLink, ArrowRight, MousePointer2 } from 'lucide-react';

type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'brave' | 'unknown';
type InstallStep = 'select' | 'download' | 'configure' | 'install';

export const Extensions: React.FC = () => {
  const [browser, setBrowser] = useState<BrowserType>('unknown');
  const [step, setStep] = useState<InstallStep>('select');
  const [activeTab, setActiveTab] = useState<'extension' | 'bookmark'>('extension');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Simple User Agent Detection
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('brave')) setBrowser('brave');
    else if (ua.includes('edg')) setBrowser('edge');
    else if (ua.includes('chrome')) setBrowser('chrome');
    else if (ua.includes('firefox')) setBrowser('firefox');
    else if (ua.includes('safari') && !ua.includes('chrome')) setBrowser('safari');
  }, []);

  const getBrowserName = (b: BrowserType) => {
    switch (b) {
      case 'chrome': return 'Google Chrome';
      case 'edge': return 'Microsoft Edge';
      case 'brave': return 'Brave Browser';
      case 'firefox': return 'Mozilla Firefox';
      case 'safari': return 'Safari';
      default: return 'Browser';
    }
  };

  const getExtensionUrl = () => {
    switch (browser) {
      case 'chrome': return 'chrome://extensions';
      case 'brave': return 'brave://extensions';
      case 'edge': return 'edge://extensions';
      case 'firefox': return 'about:debugging#/runtime/this-firefox';
      default: return 'chrome://extensions';
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getExtensionUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const generateExtension = () => {
    // 1. MANIFEST V3 (Universal for Chromium) / V2 for Firefox compatibility
    const manifest = {
      "manifest_version": 3,
      "name": "Bastion Enclave Connector",
      "version": "1.0.0",
      "description": "Secure bridge for Bastion Enclave Vault",
      "icons": { "48": "icon.png" },
      "permissions": ["storage"],
      "content_scripts": [
        {
          "matches": ["<all_urls>"],
          "js": ["content.js"],
          "run_at": "document_idle"
        }
      ],
      "host_permissions": ["<all_urls>"]
    };

    // 2. CONTENT SCRIPT
    const contentScript = `
const isBastion = document.querySelector('meta[name="bastion-app"]');
if (isBastion) {
  console.log('[Bastion Enclave] Handshake Initiated');
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type === 'BASTION_SYNC' && event.data.payload) {
      chrome.storage.local.set({ bastion_data: event.data.payload }, () => console.log('[Bastion] Secured'));
    }
  });
  chrome.storage.local.get(['bastion_data'], (result) => {
    if (result.bastion_data) {
      setTimeout(() => window.postMessage({ type: 'BASTION_RESTORE', payload: result.bastion_data }, '*'), 500);
    }
  });
}
`;
    // Dummy Icon (1x1 Pixel transparent)
    const iconData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

    // 3. GENERATE ZIP
    const zipData: Zippable = {
      'manifest.json': [new TextEncoder().encode(JSON.stringify(manifest, null, 2)), { level: 0 }],
      'content.js': [new TextEncoder().encode(contentScript), { level: 0 }],
      'icon.png': [iconData, { level: 0 }],
      'README_INSTALL.txt': [new TextEncoder().encode(`BASTION ENCLAVE CONNECTOR INSTALLATION
1. Unzip this folder.
2. Open your browser extensions page.
3. Enable 'Developer Mode' (Top right switch).
4. Drag the unzipped folder onto the browser window.
`), { level: 0 }]
    };

    zip(zipData, (err, data) => {
      if (err) {
        alert("Generation failed.");
        return;
      }
      // Fix: Cast data to any to avoid TS2322 (SharedArrayBuffer mismatch)
      const blob = new Blob([data as any], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bastion-Enclave-Connector-${browser}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStep('configure');
    });
  };

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['chrome', 'edge', 'brave', 'firefox'] as BrowserType[]).map((b) => (
                <button
                  key={b}
                  onClick={() => { setBrowser(b); setStep('download'); }}
                  className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                    browser === b 
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-105' 
                      : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'
                  }`}
                >
                  {b === 'chrome' && <Chrome size={32} className={browser === b ? "text-indigo-400" : "text-slate-400"} />}
                  {b === 'edge' && <Compass size={32} className={browser === b ? "text-blue-400" : "text-slate-400"} />}
                  {b === 'brave' && <ShieldCheck size={32} className={browser === b ? "text-orange-400" : "text-slate-400"} />}
                  {b === 'firefox' && <AppWindow size={32} className={browser === b ? "text-red-400" : "text-slate-400"} />}
                  <span className="font-bold text-sm capitalize">{b}</span>
                </button>
              ))}
            </div>
            {browser !== 'unknown' && (
              <div className="text-center">
                 <p className="text-slate-500 text-sm mb-4">We detected you are using <span className="text-white font-bold">{getBrowserName(browser)}</span>.</p>
                 <Button size="lg" onClick={() => setStep('download')} className="w-full md:w-auto">
                    Start Setup <ArrowRight size={18} />
                 </Button>
              </div>
            )}
          </div>
        );

      case 'download':
        return (
          <div className="text-center space-y-8 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
                <Download size={40} />
             </div>
             <div>
                <h3 className="text-2xl font-bold text-white mb-2">Step 1: Download Connector</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                   Since Bastion Enclave is a private secure vault, you must generate your own unique connector file.
                </p>
             </div>
             
             <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-md mx-auto flex gap-3 text-left">
                <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200/80">
                   <strong>Important:</strong> After downloading, <span className="underline decoration-amber-400/50">Unzip/Extract</span> the file to a folder. You will need the folder in Step 3.
                </div>
             </div>

             <Button size="lg" onClick={generateExtension}>
                 Generate & Download Key
             </Button>
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-8 animate-in slide-in-from-right-8">
             <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Step 2: Prepare Browser</h3>
                <p className="text-slate-400">We need to authorize this manual connection.</p>
             </div>

             <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
                 {/* URL Copy */}
                 <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-lg border border-white/5">
                    <div className="flex-1 px-3 font-mono text-sm text-slate-400 truncate">
                        {getExtensionUrl()}
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleCopyUrl} className={copiedLink ? "text-emerald-400" : ""}>
                        {copiedLink ? <CheckCircle size={14} /> : <Copy size={14} />} {copiedLink ? "Copied" : "Copy URL"}
                    </Button>
                 </div>
                 <p className="text-xs text-center text-slate-500">
                    Paste this URL into a new tab, or open your browser's <strong>Extensions</strong> menu.
                 </p>

                 {/* Visual Guide */}
                 <div className="grid md:grid-cols-2 gap-4">
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center gap-2">
                         <div className="h-8 w-12 bg-slate-700 rounded-full relative">
                             <div className="absolute right-1 top-1 h-6 w-6 bg-emerald-500 rounded-full shadow-lg"></div>
                         </div>
                         <h4 className="font-bold text-white text-sm">1. Toggle Developer Mode</h4>
                         <p className="text-xs text-slate-400">Find the switch (usually top right) and turn it ON.</p>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center gap-2">
                         <FolderIcon />
                         <h4 className="font-bold text-white text-sm">2. Load Unpacked</h4>
                         <p className="text-xs text-slate-400">Click "Load Unpacked" and select your unzipped folder.</p>
                     </div>
                 </div>
             </div>

             <div className="flex justify-center gap-4">
                 <Button variant="secondary" onClick={() => setStep('download')}>Back</Button>
                 <Button onClick={() => setStep('install')}>I've Done This <ArrowRight size={18}/></Button>
             </div>
          </div>
        );

      case 'install':
        return (
          <div className="text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                  <CheckCircle size={48} />
              </div>
              <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Setup Complete</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                      If you successfully loaded the extension, refreshing this page should trigger the handshake.
                  </p>
              </div>
              <Button onClick={() => window.location.reload()}>
                  Refresh Bastion Enclave
              </Button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8">
        
        {/* Toggle Header */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900 p-1 rounded-xl border border-white/10 flex">
                <button 
                    onClick={() => setActiveTab('extension')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'extension' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Browser Extension
                </button>
                <button 
                    onClick={() => setActiveTab('bookmark')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bookmark' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    Smart Bookmark
                </button>
            </div>
        </div>

        {activeTab === 'extension' ? (
            <div className="glass-panel p-8 rounded-2xl border border-white/5">
                {/* Progress Stepper */}
                <div className="flex justify-between items-center max-w-lg mx-auto mb-12 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -z-10"></div>
                    {(['select', 'download', 'configure', 'install'] as InstallStep[]).map((s, i) => {
                        const stepIdx = ['select', 'download', 'configure', 'install'].indexOf(step);
                        const currIdx = ['select', 'download', 'configure', 'install'].indexOf(s);
                        const isDone = currIdx <= stepIdx;
                        return (
                            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isDone ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>
                                {currIdx + 1}
                            </div>
                        )
                    })}
                </div>

                {renderStep()}
            </div>
        ) : (
            <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-8 animate-in fade-in">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white">The Easy Way</h2>
                    <p className="text-slate-400 max-w-xl mx-auto text-lg">
                        Don't want to install an extension? Just use the Smart Bookmark.
                        Drag the button below to your bookmarks bar. When you need a password, click it to open your Vault.
                    </p>
                </div>

                <div className="py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 uppercase font-bold tracking-widest">
                        <MousePointer2 className="animate-bounce" /> Drag this to bookmarks bar
                    </div>
                    
                    <a 
                        href={`javascript:(function(){window.open('${window.location.origin}', 'BastionVault', 'width=450,height=700,status=no,toolbar=no,menubar=no,location=no');})();`}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] flex items-center gap-3 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                        onClick={(e) => e.preventDefault()}
                    >
                        <Bookmark fill="currentColor" /> Open Bastion
                    </a>

                    <p className="text-xs text-slate-500 max-w-sm">
                        Note: This method works on all computers, but requires you to copy/paste passwords manually.
                    </p>
                </div>
            </div>
        )}

    </div>
  );
};

const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    </svg>
);
