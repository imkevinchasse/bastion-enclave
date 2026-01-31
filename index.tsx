
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- RUNTIME POLYFILLS ---
// These stubs prevent "module not found" or "process is undefined" errors 
// when using libraries originally designed for Node.js (e.g., long, protobufjs)
if (typeof window !== 'undefined') {
    // 1. Process Stub
    if (!('process' in window)) {
        (window as any).process = { env: {} };
    }
    
    // 2. Buffer Stub (Robust implementation for AI libs)
    if (!('Buffer' in window)) {
        (window as any).Buffer = {
            isBuffer: (a: any) => false,
            from: (data: any, encoding?: string) => {
                if (typeof data === 'string') {
                    return new TextEncoder().encode(data);
                }
                return new Uint8Array(data);
            },
            alloc: (size: number) => new Uint8Array(size),
            byteLength: (string: string) => string.length
        };
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
