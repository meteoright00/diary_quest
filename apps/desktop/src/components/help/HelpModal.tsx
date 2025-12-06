import { X } from 'lucide-react';
import { HelpContent } from '@/lib/helpContent';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: HelpContent;
}

export default function HelpModal({ isOpen, onClose, content }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 mb-2 rounded-full bg-amber-500/10 text-amber-500">
                        ?
                    </div>
                    <h2 className="text-xl font-bold text-white">{content.title}</h2>
                </div>

                <div className="text-gray-300 leading-relaxed">
                    {content.description}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors text-sm font-medium"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
}
