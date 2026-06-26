import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { personaApi, contentApi } from '../../services/api';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

const generateSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  type: z.string().min(1, 'Vui lòng chọn loại nội dung'),
  personaId: z.string().optional(),
  brief: z.string().min(1, 'Brief không được để trống'),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

interface GeneratePanelProps {
  contentId?: string;
  initialData?: Partial<GenerateFormValues>;
  onJobStarted: (jobId: string, newContentId?: string) => void;
  disabled: boolean;
}

export const GeneratePanel: React.FC<GeneratePanelProps> = ({
  contentId,
  initialData,
  onJobStarted,
  disabled,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      title: initialData?.title || '',
      type: initialData?.type || 'BLOG_POST',
      personaId: initialData?.personaId || '',
      brief: initialData?.brief || '',
    },
  });

  const initializedId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Chỉ reset form khi mở content piece khác (id đổi), không reset mỗi lần refetch
    const currentId = (initialData as any)?.id ?? contentId;
    if (initialData && currentId !== initializedId.current) {
      reset({
        title: initialData.title || '',
        type: initialData.type || 'BLOG_POST',
        personaId: initialData.personaId || '',
        brief: initialData.brief || '',
      });
      initializedId.current = currentId;
    }
  }, [initialData, contentId, reset]);

  const { data: personas = [], isLoading: isPersonasLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const res = await personaApi.list();
      return Array.isArray(res.data) ? res.data : res.data.items || [];
    },
  });

  useEffect(() => {
    if (personas.length > 0 && !getValues('personaId')) {
      const defaultPersona = personas.find((p: any) => p.isDefault);
      if (defaultPersona) {
        setValue('personaId', defaultPersona.id);
      } else if (personas[0]?.id) {
        setValue('personaId', personas[0].id);
      }
    }
  }, [personas, getValues, setValue]);

  const onSubmit = async (data: GenerateFormValues) => {
    setIsSubmitting(true);
    try {
      if (!contentId) {
        // Tạo mới
        const createRes = await contentApi.create({
          title: data.title,
          type: data.type,
          brief: data.brief,
          personaId: data.personaId || undefined,
        });
        const newId = createRes.data.id;
        const genRes = await contentApi.generate(newId);
        onJobStarted(genRes.data.jobId, newId);
      } else {
        // CÓ contentId → PATCH để lưu thay đổi rồi generate (regenerate)
        // Backend PATCH sau khi fix nhận: title, type, brief, campaignId, personaId, targetAudience, meta
        const patchPayload: Record<string, unknown> = {
          title: data.title,
          type: data.type,
          brief: data.brief,
        };
        if (data.personaId) {
          patchPayload.personaId = data.personaId;
        }
        await contentApi.update(contentId, patchPayload);
        const genRes = await contentApi.generate(contentId);
        onJobStarted(genRes.data.jobId, contentId);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đã có lỗi xảy ra khi tạo nội dung');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col h-full">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Thông tin Thiết lập</h2>
        <p className="text-xs text-gray-500 mt-1">
          Thiết lập tiêu đề, brief và persona để AI tạo nội dung.
        </p>
      </div>

      <div className="space-y-5 flex-1">
        <Input
          id="title"
          label="Tiêu đề *"
          placeholder="Nhập tiêu đề bài viết..."
          {...register('title')}
          error={errors.title?.message}
          disabled={disabled || isSubmitting}
        />

        <Select
          id="type"
          label="Loại nội dung *"
          {...register('type')}
          error={errors.type?.message}
          disabled={disabled || isSubmitting}
          options={[
            { value: 'BLOG_POST', label: 'Bài viết Blog (Blog Post)' },
            { value: 'SOCIAL_MEDIA', label: 'Mạng xã hội (Social Media)' },
            { value: 'AD_COPY', label: 'Quảng cáo (Ad Copy)' },
            { value: 'EMAIL', label: 'Email Marketing' },
          ]}
        />

        <Select
          id="personaId"
          label="Brand Persona"
          {...register('personaId')}
          disabled={isPersonasLoading || disabled || isSubmitting}
          options={[
            { value: '', label: isPersonasLoading ? 'Đang tải...' : 'Chọn Persona' },
            ...personas.map((p: any) => ({
              value: p.id,
              label: `${p.name} ${p.isDefault ? '(Mặc định)' : ''}`,
            })),
          ]}
        />

        <div className="space-y-1.5">
          <label htmlFor="brief" className="block text-xs font-semibold text-gray-700">
            Brief (Yêu cầu nội dung) *
          </label>
          <textarea
            id="brief"
            rows={6}
            placeholder="Nhập yêu cầu, thông điệp chính, sản phẩm/dịch vụ..."
            {...register('brief')}
            disabled={disabled || isSubmitting}
            className={`w-full bg-gray-50 border rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:ring-2 transition-all outline-none resize-y ${
              errors.brief ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-200 focus:border-indigo-500'
            }`}
          />
          {errors.brief && <p className="text-xs text-red-500 mt-1">{errors.brief.message}</p>}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={disabled || isSubmitting}
        >
          {contentId ? 'Tạo lại nội dung' : 'Tạo nội dung'}
        </Button>
      </div>
    </form>
  );
};
