import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { personaApi } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  AlertCircle,
  RotateCcw,
  Check,
  Edit2,
  Trash2,
  UserCheck,
} from 'lucide-react';

interface BrandPersona {
  id: string;
  name: string;
  tone: string;
  voice: string;
  targetAudience: string;
  formalityLevel?: string;
  isDefault: boolean;
}

export const PersonaList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch danh sách brand personas
  const {
    data: personasData = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const res = await personaApi.list();
      return (Array.isArray(res.data) ? res.data : res.data.items || []) as BrandPersona[];
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => personaApi.setDefault(id),
    onSuccess: () => {
      toast.success('Đã đặt làm mặc định');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi đặt mặc định.';
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => personaApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa persona');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi xóa persona.';
      toast.error(message);
    },
  });

  const isPending = setDefaultMutation.isPending || deleteMutation.isPending;

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa persona này không?')) {
      deleteMutation.mutate(id);
    }
  };

  const items = personasData;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Personas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các hồ sơ thương hiệu (persona) để định hình giọng văn và đối tượng mục tiêu cho nội dung AI.
          </p>
        </div>
        <button
          onClick={() => navigate('/personas/new')}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2.5 rounded-xl shadow-sm flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo Persona</span>
        </button>
      </div>

      {/* Danh sách Persona & Trạng thái */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Spinner size="lg" />
            <span className="text-sm text-gray-500 font-medium">Đang tải danh sách persona...</span>
          </div>
        ) : isError ? (
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Không thể tải danh sách persona</p>
                  <p className="text-xs text-red-600 mt-1">
                    {(error as any)?.response?.data?.message || (error as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200 transition-colors px-3 py-1.5 rounded-lg flex-shrink-0 self-start sm:self-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 px-6 text-center">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <UserCheck className="w-7 h-7" />
            </div>
            <p className="text-gray-900 font-semibold text-base">Chưa có persona nào</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Tổ chức của bạn hiện chưa có brand persona nào. Hãy tạo persona đầu tiên để định hình phong cách cho nội dung AI.
            </p>
            <button
              onClick={() => navigate('/personas/new')}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-4 py-2 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Persona đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((persona) => (
              <div
                key={persona.id}
                className="p-6 hover:bg-gray-50/75 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6 group"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-base">
                      {persona.name}
                    </h3>
                    {persona.isDefault && (
                      <Badge variant="READY">Mặc định</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <span className="font-medium text-gray-700">Tone:</span>
                      <span className="truncate">{persona.tone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4 truncate max-w-[200px]">
                      <span className="font-medium text-gray-700">Voice:</span>
                      <span className="truncate">{persona.voice}</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4 truncate max-w-[250px]">
                      <span className="font-medium text-gray-700">Audience:</span>
                      <span className="truncate">{persona.targetAudience}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-1 sm:flex-shrink-0">
                  {!persona.isDefault && (
                    <button
                      onClick={() => handleSetDefault(persona.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đặt mặc định</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/personas/${persona.id}/edit`)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={() => handleDelete(persona.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
