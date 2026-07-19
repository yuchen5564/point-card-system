// src/components/Toast.jsx — 亮色主題

import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const CONFIG = {
  success: {
    icon: <CheckCircle size={17} className="text-emerald-600" />,
    cls: 'border-emerald-200 bg-emerald-50',
    textCls: 'text-emerald-900',
  },
  error: {
    icon: <XCircle size={17} className="text-red-500" />,
    cls: 'border-red-200 bg-red-50',
    textCls: 'text-red-900',
  },
  info: {
    icon: <Info size={17} className="text-indigo-500" />,
    cls: 'border-indigo-200 bg-indigo-50',
    textCls: 'text-indigo-900',
  },
}

export default function Toast({ message, type = 'info', onClose, duration = 3500 }) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const { icon, cls, textCls } = CONFIG[type] ?? CONFIG.info

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in-up ${cls}`}
    >
      {icon}
      <p className={`text-sm font-medium ${textCls}`}>{message}</p>
      <button onClick={onClose}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
        <X size={14} />
      </button>
    </div>
  )
}
