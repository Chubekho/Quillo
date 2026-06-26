import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { personaApi } from '../services/api';
import { PersonaForm } from '../components/persona/PersonaForm';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const PersonaEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  // Fetch persona in edit mode
  const {
    data: personaData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['persona', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await personaApi.get(id);
      return res.data;
    },
    enabled: isEditMode,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: unknown) => personaApi.create(data),
    onSuccess: () => {
      toast.success('Tạo persona thành công!');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      navigate('/personas');
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi tạo persona.';
      toast.error(message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: unknown) => personaApi.update(id!, data),
    onSuccess: () => {
      toast.success('Cập nhật persona thành công!');
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      queryClient.invalidateQueries({ queryKey: ['persona', id] });
      navigate('/personas');
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Đã có lỗi xảy ra khi cập nhật persona.';
      toast.error(message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (formData: any) => {
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Sửa Persona' : 'Tạo Persona'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode
              ? 'Chỉnh sửa thông tin hồ sơ thương hiệu hiện tại.'
              : 'Thiết lập hồ sơ thương hiệu mới để định hình giọng văn cho nội dung AI.'}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/personas')}
          className="flex-shrink-0 self-start sm:self-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Hủy</span>
        </Button>
      </div>

      {/* Content / Form */}
      {isEditMode && isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <Spinner size="lg" />
          <span className="text-sm text-gray-500 font-medium">Đang tải thông tin persona...</span>
        </div>
      ) : isEditMode && isError ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể tải thông tin persona</p>
                <p className="text-xs text-red-600 mt-1">
                  {(error as any)?.response?.data?.message || (error as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/personas')}
              className="flex-shrink-0 self-start sm:self-center bg-red-100 hover:bg-red-200 text-red-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </Button>
          </div>
        </div>
      ) : (
        <PersonaForm
          key={personaData?.id || 'new'}
          defaultValues={isEditMode ? personaData : undefined}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
