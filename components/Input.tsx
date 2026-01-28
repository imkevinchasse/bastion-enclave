
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full group">
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 group-focus-within:text-indigo-400 transition-colors">{label}</label>}
      <div className="relative">
        <input
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className={`w-full bg-slate-900/50 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700/50 focus:border-indigo-500/50'} text-slate-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none placeholder-slate-600 shadow-inner backdrop-blur-sm ${icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
        {icon && (
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-slate-500 group-focus-within:text-indigo-400'}`}>
            {icon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 ml-1 text-xs text-red-400 font-medium flex items-center gap-1">
        <span className="inline-block w-1 h-1 rounded-full bg-red-400"/>
        {error}
      </p>}
    </div>
  );
};
