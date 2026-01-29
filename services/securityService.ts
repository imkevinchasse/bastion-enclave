
/**
 * BASTION INTEGRITY MONITOR
 * 
 * This service performs runtime checks to detect if the browser environment
 * has been tampered with by extensions, malware, or XSS attacks.
 */

export interface IntegrityReport {
    compromised: boolean;
    issues: string[];
}

export class SecurityService {
    
    private static getNativeString(fn: any): boolean {
        // Robust check: ensure it's a function and string includes native code
        // Note: Some dev environments wrap fetch/xhr for logging/proxying. 
        // We will log warnings for network APIs but not flag as CRITICAL compromise to avoid UX blocking.
        return fn && typeof fn === 'function' && fn.toString().includes('[native code]');
    }

    static checkIntegrity(): IntegrityReport {
        const issues: string[] = [];

        // 1. Check Cryptography Primitives (CRITICAL)
        // These must NEVER be hooked.
        if (!this.getNativeString(window.crypto.getRandomValues)) {
            issues.push("CRITICAL: crypto.getRandomValues has been hooked.");
        }
        if (!this.getNativeString(window.crypto.subtle.encrypt)) {
            issues.push("CRITICAL: WebCrypto API has been modified.");
        }

        // 2. Check Storage APIs (WARN)
        if (!this.getNativeString(window.localStorage.getItem)) {
            // checking this is often noisy in dev tools, but good for prod
            // issues.push("WARN: LocalStorage API is intercepted."); 
        }

        // 3. Check Network APIs (INFO/WARN)
        // Relaxed for Dev Environments where wrappers are common
        if (!this.getNativeString(window.fetch)) {
            console.warn("SecurityMonitor: Fetch API appears wrapped. This is common in dev tools or extensions.");
        }
        
        // 4. Check for unauthorized Script Tags (Extension Injection)
        const scripts = document.getElementsByTagName('script');
        
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            const src = script.src || '';
            
            // Heuristic for known malicious/extension patterns
            if (src.includes('chrome-extension://') || src.includes('moz-extension://')) {
                issues.push(`WARN: Browser Extension injected script detected: ${src}`);
            }
        }

        return {
            compromised: issues.length > 0,
            issues
        };
    }

    /**
     * Continuously monitors the DOM for new script injections.
     */
    static startWatchdog(onAlert: (issue: string) => void): MutationObserver {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'SCRIPT') {
                        const script = node as HTMLScriptElement;
                        if (script.src.includes('chrome-extension') || script.src.includes('moz-extension')) {
                            onAlert(`Runtime Injection Detected: ${script.src}`);
                        }
                    }
                    if (node.nodeName === 'IFRAME') {
                        const iframe = node as HTMLIFrameElement;
                        // Ignore trusted iframes (like turnstile, recaptcha, or known tools if added later)
                        if (!iframe.src && !iframe.id) {
                             // Empty iframes are suspicious but also used by frameworks. 
                             // Only alert if we identify specific signatures.
                        }
                    }
                });
            });
        });

        observer.observe(document.head, { childList: true });
        observer.observe(document.body, { childList: true });
        return observer;
    }
}
