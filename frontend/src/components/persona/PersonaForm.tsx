import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X, Plus, Trash2 } from 'lucide-react';

const personaSchema = z.object({
  name: z.string().min(1, 'Tên persona không được để trống'),
  tone: z.string().min(1, 'Vui lòng chọn giọng điệu'),
  voice: z.string().optional(),
  formalityLevel: z.coerce.number().min(1).max(5),
  targetAudience: z.string().min(1, 'Đối tượng mục tiêu không được để trống'),
  keywords: z.array(z.object({ value: z.string() })).default([]),
  avoidWords: z.array(z.object({ value: z.string() })).default([]),
  exampleOutputs: z.array(z.object({ value: z.string() })).default([]),
});

type PersonaFormValues = z.infer<typeof personaSchema>;

interface PersonaFormProps {
  defaultValues?: Partial<{
    name: string;
    tone: string;
    voice?: string | null;
    formalityLevel: number;
    targetAudience: string;
    keywords: string[];
    avoidWords: string[];
    exampleOutputs: string[];
  }>;
  onSubmit: (data: {
    name: string;
    tone: string;
    voice?: string;
    formalityLevel: number;
    targetAudience: string;
    keywords: string[];
    avoidWords: string[];
    exampleOutputs: string[];
  }) => void;
  isSubmitting: boolean;
}

export const PersonaForm: React.FC<PersonaFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      tone: defaultValues?.tone || 'professional',
      voice: defaultValues?.voice || '',
      formalityLevel: defaultValues?.formalityLevel || 3,
      targetAudience: defaultValues?.targetAudience || '',
      keywords: defaultValues?.keywords?.map((val) => ({ value: val })) || [],
      avoidWords: defaultValues?.avoidWords?.map((val) => ({ value: val })) || [],
      exampleOutputs: defaultValues?.exampleOutputs?.map((val) => ({ value: val })) || [],
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name || '',
        tone: defaultValues.tone || 'professional',
        voice: defaultValues.voice || '',
        formalityLevel: defaultValues.formalityLevel || 3,
        targetAudience: defaultValues.targetAudience || '',
        keywords: defaultValues.keywords?.map((val) => ({ value: val })) || [],
        avoidWords: defaultValues.avoidWords?.map((val) => ({ value: val })) || [],
        exampleOutputs: defaultValues.exampleOutputs?.map((val) => ({ value: val })) || [],
      });
    }
  }, [defaultValues, reset]);

  const {
    fields: keywordFields,
    append: appendKeyword,
    remove: removeKeyword,
  } = useFieldArray({ control, name: 'keywords' });

  const {
    fields: avoidWordFields,
    append: appendAvoidWord,
    remove: removeAvoidWord,
  } = useFieldArray({ control, name: 'avoidWords' });

  const {
    fields: exampleFields,
    append: appendExample,
    remove: removeExample,
  } = useFieldArray({ control, name: 'exampleOutputs' });

  const [keywordInput, setKeywordInput] = useState('');
  const [avoidWordInput, setAvoidWordInput] = useState('');

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = keywordInput.trim();
      if (val && !keywordFields.some((field) => field.value === val)) {
        appendKeyword({ value: val });
        setKeywordInput('');
      }
    }
  };

  const handleAddAvoidWord = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = avoidWordInput.trim();
      if (val && !avoidWordFields.some((field) => field.value === val)) {
        appendAvoidWord({ value: val });
        setAvoidWordInput('');
      }
    }
  };

  const onFormSubmit = (data: PersonaFormValues) => {
    onSubmit({
      name: data.name,
      tone: data.tone,
      voice: data.voice,
      formalityLevel: data.formalityLevel,
      targetAudience: data.targetAudience,
      keywords: data.keywords.map((k) => k.value),
      avoidWords: data.avoidWords.map((a) => a.value),
      exampleOutputs: data.exampleOutputs.map((e) => e.value),
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Name */}
        <div className="sm:col-span-2">
          <Input
            id="name"
            label="Tên Persona *"
            placeholder="Ví dụ: Casual Gen-Z, Formal B2B..."
            {...register('name')}
            error={errors.name?.message}
          />
        </div>

        {/* Tone */}
        <div>
          <Select
            id="tone"
            label="Giọng điệu (Tone) *"
            {...register('tone')}
            error={errors.tone?.message}
            options={[
              { value: 'professional', label: 'Professional (Chuyên nghiệp)' },
              { value: 'playful', label: 'Playful (Vui nhộn, năng động)' },
              { value: 'empathetic', label: 'Empathetic (Đồng cảm, thấu hiểu)' },
            ]}
          />
        </div>

        {/* Formality Level */}
        <div>
          <Select
            id="formalityLevel"
            label="Mức độ trang trọng (Formality Level) *"
            {...register('formalityLevel')}
            error={errors.formalityLevel?.message}
            options={[
              { value: 1, label: '1 - Rất casual (Thân mật)' },
              { value: 2, label: '2 - Hơi casual' },
              { value: 3, label: '3 - Cân bằng (Bán trang trọng)' },
              { value: 4, label: '4 - Trang trọng' },
              { value: 5, label: '5 - Rất formal (Rất trang trọng)' },
            ]}
          />
        </div>

        {/* Voice */}
        <div className="sm:col-span-2">
          <Select
            id="voice"
            label="Mô tả phong cách (Voice)"
            {...register('voice')}
            error={errors.voice?.message}
            options={[
              { value: '', label: 'Không chọn (Tự do)' },
              { value: 'Chúng tôi là người bạn đồng hành tin cậy...', label: 'Chúng tôi là người bạn đồng hành tin cậy...' },
            ]}
          />
        </div>

        {/* Target Audience */}
        <div className="sm:col-span-2">
          <Input
            id="targetAudience"
            label="Đối tượng mục tiêu (Target Audience) *"
            placeholder="Ví dụ: Giám đốc doanh nghiệp, Giới trẻ 18-24 tuổi..."
            {...register('targetAudience')}
            error={errors.targetAudience?.message}
          />
        </div>

        {/* Keywords */}
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Từ khóa ưu tiên (Keywords)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {keywordFields.map((field, idx) => (
              <span key={field.id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-xs font-medium border border-indigo-200">
                <input type="hidden" {...register(`keywords.${idx}.value`)} defaultValue={field.value} />
                {field.value}
                <button type="button" onClick={() => removeKeyword(idx)} className="hover:bg-indigo-100 p-0.5 rounded-full text-indigo-500 hover:text-indigo-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Nhập từ khóa và nhấn Enter để thêm tag..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleAddKeyword}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
          <p className="text-xs text-gray-400">Nhấn Enter sau mỗi từ khóa để thêm vào danh sách.</p>
        </div>

        {/* Avoid Words */}
        <div className="sm:col-span-2 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">
            Từ khóa cấm kỵ (Avoid Words)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {avoidWordFields.map((field, idx) => (
              <span key={field.id} className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-xl text-xs font-medium border border-red-200">
                <input type="hidden" {...register(`avoidWords.${idx}.value`)} defaultValue={field.value} />
                {field.value}
                <button type="button" onClick={() => removeAvoidWord(idx)} className="hover:bg-red-100 p-0.5 rounded-full text-red-500 hover:text-red-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Nhập từ cấm kỵ và nhấn Enter để thêm tag..."
            value={avoidWordInput}
            onChange={(e) => setAvoidWordInput(e.target.value)}
            onKeyDown={handleAddAvoidWord}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
          <p className="text-xs text-gray-400">Nhấn Enter sau mỗi từ cấm kỵ để thêm vào danh sách.</p>
        </div>

        {/* Example Outputs */}
        <div className="sm:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700">
              Ví dụ mẫu (Example Outputs)
            </label>
            <Button type="button" variant="secondary" onClick={() => appendExample({ value: '' })} className="text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ví dụ</span>
            </Button>
          </div>
          {exampleFields.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Chưa có ví dụ mẫu nào. Thêm ví dụ giúp AI học theo phong cách tốt hơn (few-shot prompting).</p>
          ) : (
            <div className="space-y-3">
              {exampleFields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <textarea
                    {...register(`exampleOutputs.${idx}.value`)}
                    rows={3}
                    placeholder={`Ví dụ mẫu #${idx + 1}...`}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-y"
                  />
                  <button
                    type="button"
                    onClick={() => removeExample(idx)}
                    className="mt-1 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                    title="Xóa ví dụ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {defaultValues?.name ? 'Cập nhật Persona' : 'Tạo Persona'}
        </Button>
      </div>
    </form>
  );
};
