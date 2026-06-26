import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { campaignApi } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  FolderKanban, 
  Plus, 
  Calendar, 
  Archive, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';

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

export const CampaignList: React.FC = () => {
  const queryClient = useQueryClient();

  // State quản lý inline form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch danh sách chiến dịch
  const {
    data: campaignsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await campaignApi.list();
      return Array.isArray(res.data) ? res.data : res.data.items || [];
    },
  });

  // Mutation tạo chiến dịch
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await campaignApi.create(data);
    },
    onSuccess: () => {
      toast.success('Đã tạo chiến dịch');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setName('');
      setDescription('');
      setShowCreateForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Tạo chiến dịch thất bại');
    },
  });

  // Mutation xóa (lưu trữ) chiến dịch
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await campaignApi.remove(id);
    },
    onSuccess: () => {
      toast.success('Đã lưu trữ chiến dịch');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lưu trữ chiến dịch thất bại');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên chiến dịch');
      return;
    }
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  const handleCancelCreate = () => {
    setName('');
    setDescription('');
    setShowCreateForm(false);
  };

  const handleArchive = (id: string, campName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn lưu trữ chiến dịch "${campName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const items = campaignsData || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chiến dịch</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các chiến dịch marketing và phân loại nội dung theo từng mục tiêu cụ thể.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Đóng form' : 'Tạo chiến dịch'}</span>
        </Button>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-fadeIn">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tạo chiến dịch mới</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tên chiến dịch <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên chiến dịch..."
                disabled={createMutation.isPending}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mô tả (Tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả cho chiến dịch..."
                rows={3}
                disabled={createMutation.isPending}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelCreate}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createMutation.isPending}
              >
                Tạo
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách chiến dịch */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Spinner size="lg" />
            <span className="text-sm text-gray-500 font-medium">Đang tải danh sách chiến dịch...</span>
          </div>
        ) : isError ? (
          <div className="p-8">
            <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Không thể tải danh sách chiến dịch</p>
                <p className="text-xs text-red-600 mt-1">
                  {(error as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => refetch()}
                className="py-1.5 px-3 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Thử lại
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 px-6 text-center">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FolderKanban className="w-7 h-7" />
            </div>
            <p className="text-gray-900 font-semibold text-base">Chưa có chiến dịch nào</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto mb-6">
              Tổ chức của bạn hiện chưa có chiến dịch nào. Hãy tạo chiến dịch đầu tiên để quản lý nội dung hiệu quả.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Tạo chiến dịch đầu tiên</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="p-6 hover:bg-gray-50/75 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate text-base">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant={item.status === 'ACTIVE' ? 'COMPLETED' : item.status}>
                    {item.status === 'ACTIVE' ? 'Hoạt động' : 'Đã lưu trữ'}
                  </Badge>
                  
                  {item.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleArchive(item.id, item.name)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                      title="Lưu trữ chiến dịch"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Lưu trữ</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
