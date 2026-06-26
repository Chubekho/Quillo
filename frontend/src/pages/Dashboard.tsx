import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { orgApi, contentApi } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  FolderKanban, 
  ArrowRight, 
  AlertCircle, 
  Calendar,
  Zap 
} from 'lucide-react';

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
    case 'QUEUED': return 'Đang chờ';
    case 'PROCESSING': return 'Đang xử lý';
    case 'COMPLETED': return 'Hoàn thành';
    case 'FAILED': return 'Thất bại';
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

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // 1. Fetch Org / Usage data
  const { 
    data: orgData, 
    isLoading: isOrgLoading, 
    isError: isOrgError, 
    error: orgError 
  } = useQuery({
    queryKey: ['org'],
    queryFn: async () => {
      const res = await orgApi.get();
      return res.data;
    },
  });

  // 2. Fetch Recent Content data
  const { 
    data: contentData, 
    isLoading: isContentLoading, 
    isError: isContentError, 
    error: contentError 
  } = useQuery({
    queryKey: ['recentContent'],
    queryFn: async () => {
      const res = await contentApi.list({ limit: '5' });
      return res.data;
    },
  });

  // Tính toán quota và used
  const quota = (orgData?.monthlyTokenQuota !== undefined ? orgData.monthlyTokenQuota : orgData?.usage?.quota) ?? null;
  const used = (orgData?.currentMonthTokens !== undefined ? orgData.currentMonthTokens : orgData?.usage?.used) ?? 0;

  // Danh sách nội dung gần đây (tối đa 5 item)
  const items = (contentData?.items || []).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý hạn mức sử dụng AI, nội dung gần đây và truy cập nhanh các chức năng.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Usage Widget & Quick Actions */}
        <div className="space-y-8 lg:col-span-1">
          {/* 1. Usage Widget */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span>Sử dụng Token (Tháng này)</span>
              </h2>
              {orgData?.plan && (
                <Badge variant="PUBLISHED">{orgData.plan}</Badge>
              )}
            </div>

            {isOrgLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Spinner size="md" />
                <span className="text-xs text-gray-500 font-medium">Đang tải thông tin sử dụng...</span>
              </div>
            ) : isOrgError ? (
              <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Không thể tải thông tin sử dụng</p>
                  <p className="text-xs text-red-600 mt-1">
                    {(orgError as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {quota === null ? (
                  <div className="py-2">
                    <div className="text-3xl font-bold text-gray-900 tracking-tight">
                      {used.toLocaleString()} <span className="text-base font-normal text-gray-500">/ Không giới hạn</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Gói dịch vụ của bạn không giới hạn số lượng token.</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-gray-900 tracking-tight">
                      {used.toLocaleString()} <span className="text-base font-normal text-gray-500">/ {quota.toLocaleString()} tokens</span>
                    </div>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          used > quota ? 'bg-red-600' : used > quota * 0.8 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (used / quota) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="mt-2.5 flex justify-between text-xs text-gray-500 font-medium">
                      <span>{((used / quota) * 100).toFixed(1)}% đã sử dụng</span>
                      <span>{Math.max(0, quota - used).toLocaleString()} còn lại</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Thao tác nhanh</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/content')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/20 transition-all duration-200 text-left group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">Xem nội dung</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Danh sách bài viết và nội dung</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/personas')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-200 hover:bg-purple-50/20 transition-all duration-200 text-left group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-purple-600 transition-colors">Quản lý Persona</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Thiết lập giọng điệu thương hiệu</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/campaigns')}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-200 text-left group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">Xem chiến dịch</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Quản lý các chiến dịch marketing</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Cột phải: Recent Content */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Nội dung gần đây</span>
              </h2>
              <button
                onClick={() => navigate('/content')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 transition-all"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isContentLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Spinner size="md" />
                <span className="text-xs text-gray-500 font-medium">Đang tải danh sách nội dung...</span>
              </div>
            ) : isContentError ? (
              <div className="p-6">
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
              <div className="py-16 px-6 text-center">
                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-gray-900 font-semibold text-base">Chưa có nội dung nào</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Hãy bắt đầu tạo nội dung đầu tiên của bạn để theo dõi và quản lý tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="p-6 hover:bg-gray-50/75 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-base">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(item.createdAt)}</span>
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
      </div>
    </div>
  );
};

