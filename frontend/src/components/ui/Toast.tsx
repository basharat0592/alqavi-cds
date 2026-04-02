import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        error: <XCircle className="h-5 w-5 text-red-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className={`bg-white rounded-lg shadow-lg border-l-4 ${type === 'success' ? 'border-green-500' :
                type === 'error' ? 'border-red-500' :
                    type === 'warning' ? 'border-yellow-500' :
                        'border-blue-500'
                } p-4 min-w-[300px]`}>
                <div className="flex items-center gap-3">
                    {icons[type]}
                    <p className="text-sm text-gray-600 flex-1">{message}</p>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

