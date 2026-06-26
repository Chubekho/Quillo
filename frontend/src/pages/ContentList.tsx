import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contentApi, campaignApi } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { 
  FileText, 
  Filter, 
  RotateCcw, 
  AlertCircle, 
  Calendar,
  FolderKanban,
  CheckCircle2,
  Layers,
  Plus
} from 'lucide-react';

const CONTENT_TYPES = ['BLOG_POST', 'SOCIAL_MEDIA', 'AD_COPY', 'EMAIL'];
const CONTENT_STATUSES = ['DRAFT', 'GENERATING', 'READY', 'PUBLISHED', 'ARCHIVED'];

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'BLOG_POST': return 'Bài viết Blog';
    case 'SOCIAL_MEDIA': return 'Mạng xã hội';
    case 'AD_COPY': return 'Quảng cáo';
    case 'EMAIL': return 'Email';
    default: return type;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'Bản nháp';
    case 'GENERATING': return 'Đang tạo';
    case 'READY': return 'Sẵn sàng';
    case 'PUBLISHED': return 'Đã xuất bản';
    case 'ARCHIVED': return 'Đã lưu trữ';
    default: return status;
  }
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const ContentList: React.FC = () => {
  const navigate = useNavigate();

  // State bộ lọc
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCampaignId, setFilterCampaignId] = useState<string>('');

  // Fetch danh sách chiến dịch cho dropdown
  const { 
    data: campaigns = [], 
    isLoading: isCampaignsLoading 
  } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await campaignApi.list();
      return Array.isArray(res.data) ? res.data : res.data.items || [];
    },
  });

  // Fetch danh sách nội dung (Server-side filtering qua query params)
  const { 
    data: contentData, 
    isLoading: isContentLoading, 
    isError: isContentError, 
    error: contentError 
  } = useQuery({
    queryKey: ['contents', filterType, filterStatus, filterCampaignId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterCampaignId) params.campaignId = filterCampaignId;
      
      const res = await contentApi.list(params);
      return res.data;
    },
  });

  const items = contentData?.items || [];
  const hasActiveFilter = filterType !== '' || filterStatus !== '' || filterCampaignId !== '';

  const handleResetFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setFilterCampaignId('');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách Nội dung</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý toàn bộ bài viết, bài đăng mạng xã hội, quảng cáo và email marketing của doanh nghiệp.
          </p>
        </div>
        <button
          onClick={() => navigate('/content/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo nội dung</span>
        </button>
      </div>

      {/* Bộ lọc (Filters) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Bộ lọc nội dung</span>
          </div>
          {hasActiveFilter && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Filter Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              <span>Loại nội dung</span>
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            >
              <option value="">Tất cả</option>
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Trạng thái</span>
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            >
              <option value="">Tất cả</option>
              {CONTENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Campaign */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
              <span>Chiến dịch</span>
            </label>
            <select
              value={filterCampaignId}
              onChange={(e) => setFilterCampaignId(e.target.value)}
              disabled={isCampaignsLoading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{isCampaignsLoading ? 'Đang tải chiến dịch...' : 'Tất cả'}</option>
              {campaigns.map((camp: any) => (
                <option key={camp.id} value={camp.id}>
                  {camp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Danh sách Content & Trạng thái */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isContentLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Spinner size="lg" />
            <span className="text-sm text-gray-500 font-medium">Đang tải danh sách nội dung...</span>
          </div>
        ) : isContentError ? (
          <div className="p-8">
            <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể tải danh sách nội dung</p>
                <p className="text-xs text-red-600 mt-1">
                  {(contentError as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
                </p>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 px-6 text-center">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            {hasActiveFilter ? (
              <>
                <p className="text-gray-900 font-semibold text-base">Không tìm thấy nội dung nào phù hợp với bộ lọc</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Vui lòng thử điều chỉnh hoặc xóa bộ lọc để xem các nội dung khác.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-xl shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa filter</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-900 font-semibold text-base">Chưa có nội dung nào</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Tổ chức của bạn hiện chưa có nội dung nào. Hãy tạo bài viết đầu tiên để bắt đầu quản lý.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item: any) => (
              <div
                key={item.id}
                onClick={() => navigate(`/content/${item.id}`)}
                className="p-6 hover:bg-gray-50/75 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-base">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    {item.campaign?.name && (
                      <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                        <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[200px]">{item.campaign.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={item.type}>{getTypeLabel(item.type)}</Badge>
                  <Badge variant={item.status}>{getStatusLabel(item.status)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

