
import React, { useEffect, useState } from 'react';
import { SecurityService } from '../services/securityService';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export const SecurityMonitor: React.FC = () => {
    const [alerts, setAlerts] = useState<string[]>([]);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // 1. Initial Scan
        const report = SecurityService.checkIntegrity();
        if (report.compromised) {
            setAlerts(prev => [...prev, ...report.issues]);
        }

        // 2. Real-time Watchdog
        const observer = SecurityService.startWatchdog((issue) => {
            setAlerts(prev => {
                // Prevent duplicate alerts
                if (prev.includes(issue)) return prev;
                return [...prev, issue];
            });
        });

        return () => observer.disconnect();
    }, []);

    if (alerts.length === 0 || dismissed) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-500">
            <div className="bg-red-950/95 border-b border-red-500 backdrop-blur-md p-4 shadow-2xl">
                <div className="max-w-6xl mx-auto flex items-start gap-4">
                    <div className="p-2 bg-red-900 rounded-lg animate-pulse text-red-200">
                        <ShieldAlert size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-red-100 font-bold text-sm uppercase tracking-widest mb-1">
                            Environment Integrity Compromised
                        </h3>
                        <p className="text-red-200/80 text-xs mb-2">
                            Bastion detected external code running in this tab. This is usually caused by Browser Extensions or Malware. 
                            For maximum security, disable extensions or use Incognito mode.
                        </p>
                        <ul className="space-y-1">
                            {alerts.slice(0, 3).map((alert, i) => (
                                <li key={i} className="text-[10px] font-mono text-red-300 flex items-center gap-2">
                                    <AlertTriangle size={10} /> {alert}
                                </li>
                            ))}
                            {alerts.length > 3 && (
                                <li className="text-[10px] font-mono text-red-300 italic">
                                    ...and {alerts.length - 3} more issues.
                                </li>
                            )}
                        </ul>
                    </div>
                    <button 
                        onClick={() => setDismissed(true)}
                        className="text-red-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
