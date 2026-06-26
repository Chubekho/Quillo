import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { contentApi } from '../../services/api';
import { Button } from '../ui/Button';
import { Download, FileText } from 'lucide-react';

interface ExportBarProps {
  contentId: string;
  disabled: boolean;
}

export const ExportBar: React.FC<ExportBarProps> = ({ contentId, disabled }) => {
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);

  const handleExport = async (format: 'PDF' | 'DOCX' | 'HTML') => {
    try {
      setLoadingFormat(format);
      const res = await contentApi.export(contentId, format);
      const url = res.data.downloadUrl;
      if (url) {
        window.open(url, '_blank');
        toast.success(`Đã xuất file ${format} thành công`);
      } else {
        throw new Error('Không tìm thấy đường dẫn tải về');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Đã có lỗi xảy ra khi xuất file ${format}`);
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Xuất nội dung</h3>
          <p className="text-xs text-gray-500 mt-0.5">Tải về trực tiếp dưới dạng file hoàn chỉnh</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || (loadingFormat !== null && loadingFormat !== 'PDF')}
          isLoading={loadingFormat === 'PDF'}
          onClick={() => handleExport('PDF')}
          className="flex-1 sm:flex-none border border-gray-200 hover:border-gray-300 shadow-sm"
        >
          <FileText className="w-4 h-4 text-red-600" />
          <span>PDF</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={disabled || (loadingFormat !== null && loadingFormat !== 'DOCX')}
          isLoading={loadingFormat === 'DOCX'}
          onClick={() => handleExport('DOCX')}
          className="flex-1 sm:flex-none border border-gray-200 hover:border-gray-300 shadow-sm"
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>DOCX</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={disabled || (loadingFormat !== null && loadingFormat !== 'HTML')}
          isLoading={loadingFormat === 'HTML'}
          onClick={() => handleExport('HTML')}
          className="flex-1 sm:flex-none border border-gray-200 hover:border-gray-300 shadow-sm"
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>HTML</span>
        </Button>
      </div>
    </div>
  );
};
