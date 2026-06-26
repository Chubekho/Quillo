import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contentApi } from '../services/api';
import { useJobPoller } from '../hooks/useJobPoller';
import { GeneratePanel } from '../components/content/GeneratePanel';
import { ContentDisplay } from '../components/content/ContentDisplay';
import { VersionHistory } from '../components/content/VersionHistory';
import { ExportBar } from '../components/content/ExportBar';
import { Spinner } from '../components/ui/Spinner';
import { ArrowLeft, Layers, History } from 'lucide-react';

export const ContentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNew = !id || id === 'new';

  // State nội bộ
  const [activeContentId, setActiveContentId] = useState<string | undefined>(isNew ? undefined : id);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [body, setBody] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);

  // EDIT mode (có id)
  const {
    data: contentData,
    isLoading: isContentLoading,
    isError: isContentError,
    refetch,
  } = useQuery({
    queryKey: ['content', activeContentId],
    queryFn: async () => {
      if (!activeContentId) return null;
      const res = await contentApi.get(activeContentId);
      return res.data;
    },
    enabled: !!activeContentId,
  });

  // set body = data.activeVersion?.body ?? undefined
  useEffect(() => {
    if (contentData?.activeVersion?.body) {
      setBody(contentData.activeVersion.body);
    }
  }, [contentData]);

  // Poller
  const pollState = useJobPoller(activeContentId || null, currentJobId);

  useEffect(() => {
    if (!currentJobId) return;
    // Guard: bỏ qua status cũ thuộc job trước
    if (pollState.jobId !== currentJobId) return;

    if (pollState.status === 'completed') {
      if (pollState.result?.body) {
        setBody(pollState.result.body);
      }
      toast.success('Đã tạo xong');
      if (activeContentId) {
        queryClient.invalidateQueries({ queryKey: ['content', activeContentId] });
        queryClient.invalidateQueries({ queryKey: ['versions', activeContentId] });
      }
      setCurrentJobId(null);
    } else if (pollState.status === 'failed') {
      toast.error(pollState.error ?? 'Tạo thất bại');
      setCurrentJobId(null);
    }
  }, [pollState.status, pollState.jobId, pollState.result, pollState.error, currentJobId, activeContentId, queryClient]);

  const handleJobStarted = (jobId: string, newId?: string) => {
    if (newId && newId !== activeContentId) {
      setActiveContentId(newId);
      navigate(`/content/${newId}`, { replace: true });
    }
    setCurrentJobId(jobId);
  };

  const handleAction = async (op: 'rewrite' | 'expand' | 'shorten') => {
    if (!activeContentId) return;
    try {
      const res = await contentApi[op](activeContentId);
      setCurrentJobId(res.data.jobId);
      toast.success(`Đã gửi yêu cầu ${op === 'rewrite' ? 'viết lại' : op === 'expand' ? 'mở rộng' : 'rút gọn'} nội dung`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đã có lỗi xảy ra khi thực hiện thao tác');
    }
  };

  const isGenerating = currentJobId != null && (pollState.status === 'queued' || pollState.status === 'processing');

  if (isContentLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner size="lg" />
        <span className="text-sm text-gray-500 font-medium">Đang tải thông tin nội dung...</span>
      </div>
    );
  }

  if (isContentError) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center space-y-3">
          <p className="font-semibold text-base">Không tìm thấy nội dung hoặc đã có lỗi xảy ra</p>
          <button
            onClick={() => navigate('/content')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/content')}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors shadow-sm flex items-center justify-center"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                {!activeContentId ? 'Tạo nội dung mới' : 'Chỉnh sửa nội dung'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1 truncate max-w-xl">
              {contentData?.title || 'Bản nháp nội dung mới'}
            </h1>
          </div>
        </div>

        {activeContentId && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all shadow-sm ${
              showHistory
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{showHistory ? 'Ẩn Lịch sử phiên bản' : 'Lịch sử phiên bản'}</span>
          </button>
        )}
      </div>

      {/* Layout 2 vùng responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5">
          <GeneratePanel
            contentId={activeContentId}
            initialData={contentData || undefined}
            onJobStarted={handleJobStarted}
            disabled={isGenerating}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <ContentDisplay
            body={body}
            isGenerating={isGenerating}
            onAction={handleAction}
            disabled={isGenerating}
          />

          {activeContentId && body && (
            <ExportBar contentId={activeContentId} disabled={isGenerating} />
          )}
        </div>
      </div>

      {/* Version History section */}
      {activeContentId && showHistory && (
        <div className="mt-8">
          <VersionHistory
            contentId={activeContentId}
            onRestored={() => {
              refetch();
            }}
          />
        </div>
      )}
    </div>
  );
};
