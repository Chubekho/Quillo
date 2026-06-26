import React from 'react';
import { Spinner } from '../ui/Spinner';
import { FileText, Sparkles, Bot, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface ContentDisplayProps {
  body?: string;
  isGenerating: boolean;
  onAction?: (op: 'rewrite' | 'expand' | 'shorten') => void;
  disabled?: boolean;
}

export const ContentDisplay: React.FC<ContentDisplayProps> = ({
  body,
  isGenerating,
  onAction,
  disabled,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Kết quả Nội dung AI</h2>
            <p className="text-xs text-gray-500 mt-0.5">Nội dung được tạo tự động từ Brief</p>
          </div>
        </div>

        {isGenerating && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đang tạo...</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 space-y-4 text-center my-auto">
            <Spinner size="lg" />
            <p className="text-sm font-medium text-gray-600">Đang tạo nội dung...</p>
          </div>
        ) : body ? (
          <>
            <div className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-6 text-gray-800 font-sans text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[700px] shadow-inner">
              {body}
            </div>

            {/* Hàng action buttons (chỉ hiện KHI có body & !isGenerating) */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={() => onAction?.('rewrite')}
                disabled={isGenerating || disabled}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Viết lại</span>
              </button>

              <button
                type="button"
                onClick={() => onAction?.('expand')}
                disabled={isGenerating || disabled}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mở rộng</span>
              </button>

              <button
                type="button"
                onClick={() => onAction?.('shorten')}
                disabled={isGenerating || disabled}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rút gọn</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center my-auto">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
              Nhập brief và bấm Tạo nội dung
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
