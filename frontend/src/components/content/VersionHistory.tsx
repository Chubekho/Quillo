import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi } from '../../services/api';
import { Spinner } from '../ui/Spinner';
import { History, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface VersionHistoryProps {
  contentId: string;
  onRestored?: () => void;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const VersionHistory: React.FC<VersionHistoryProps> = ({ contentId, onRestored }) => {
  const queryClient = useQueryClient();

  // Fetch danh sách phiên bản
  const {
    data: versions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['versions', contentId],
    queryFn: async () => {
      const res = await contentApi.listVersions(contentId);
      return res.data;
    },
    enabled: !!contentId,
  });

  // Mutation khôi phục phiên bản
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await contentApi.restoreVersion(contentId, versionId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', contentId] });
      toast.success('Đã khôi phục phiên bản thành công');
      onRestored?.();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể khôi phục phiên bản');
    },
  });

  const handleRestore = (versionId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục phiên bản này? Phiên bản hiện tại sẽ bị thay thế.')) {
      restoreMutation.mutate(versionId);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Lịch sử Phiên bản</h2>
          <p className="text-xs text-gray-500 mt-0.5">Quản lý và khôi phục các phiên bản nội dung trước đó</p>
        </div>
      </div>

      {/* 3 Trạng thái: Loading, Error, Empty */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Spinner size="md" />
          <span className="text-sm text-gray-500 font-medium">Đang tải lịch sử phiên bản...</span>
        </div>
      ) : isError ? (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 my-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-semibold text-sm">Không thể tải lịch sử phiên bản</p>
            <p className="text-xs text-red-600 mt-1">{(error as Error)?.message || 'Đã có lỗi xảy ra.'}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            Thử lại
          </button>
        </div>
      ) : versions.length === 0 ? (
        <div className="py-16 px-6 text-center">
          <div className="w-12 h-12 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-500">Chưa có phiên bản nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version: any) => (
            <div
              key={version.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                version.isActive
                  ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                  : 'bg-white hover:bg-gray-50/60 border-gray-200'
              }`}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-gray-900">
                    Phiên bản #{version.versionNo}
                  </span>
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                    {version.source}
                  </span>
                  {version.isActive && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đang Active</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatDate(version.createdAt)}
                  {version.inputTokens != null && version.outputTokens != null && (
                    <span className="ml-2 text-gray-400">
                      ({version.inputTokens} in / {version.outputTokens} out tokens)
                    </span>
                  )}
                </p>
              </div>

              {!version.isActive && (
                <button
                  type="button"
                  onClick={() => handleRestore(version.id)}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
