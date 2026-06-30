import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, usageApi } from '../services/api';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Box,
  Cpu,
  Server,
  Shield,
  Zap,
} from 'lucide-react';

export const UsagePage: React.FC = () => {
  // 1. Fetch Org data
  const {
    data: orgData,
    isLoading: isOrgLoading,
    isError: isOrgError,
    error: orgError,
    refetch: refetchOrg,
  } = useQuery({
    queryKey: ['org'],
    queryFn: async () => {
      const res = await orgApi.get();
      return res.data;
    },
  });

  // 2. Fetch Usage data
  const {
    data: usageData,
    isLoading: isUsageLoading,
    isError: isUsageError,
    error: usageError,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await usageApi.getSummary();
      return res.data;
    },
  });

  const isLoading = isOrgLoading || isUsageLoading;
  const isError = isOrgError || isUsageError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Spinner size="lg" />
        <span className="text-sm text-gray-500 font-medium">Đang tải thông tin sử dụng...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <div className="space-y-1">
            <p className="font-semibold text-base">Không thể tải thông tin sử dụng</p>
            <p className="text-xs text-red-600">
              {(orgError as Error)?.message || (usageError as Error)?.message || 'Đã có lỗi xảy ra khi kết nối đến máy chủ.'}
            </p>
          </div>
          <button
            onClick={() => {
              refetchOrg();
              refetchUsage();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
        </div>
      </div>
    );
  }

  // Lấy thông tin quota và token đã dùng từ orgData và usageData
  const quota = (orgData?.monthlyTokenQuota !== undefined ? orgData.monthlyTokenQuota : usageData?.quota) ?? null;
  const used = (usageData?.used !== undefined ? usageData.used : orgData?.currentMonthTokens) ?? 0;
  const plan = orgData?.plan || 'FREE';
  const byModel = usageData?.byModel || [];

  // Tiêu đề: "Sử dụng tháng [tháng hiện tại]" (dùng new Date() format)
  const now = new Date();
  const currentMonthStr = new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(now);

  const BEDROCK_GENERATE_MODEL = 'gemini-2.5-flash';
  const BEDROCK_EDIT_MODEL = 'gemini-2.5-flash-lite';

  const percent = quota !== null && quota > 0 ? (used / quota) * 100 : 0;
  // Nếu usage >= 90% quota → progress bar màu đỏ (cảnh báo)
  const isWarning = quota !== null && used >= quota * 0.9;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Activity className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Quản lý tài nguyên</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sử dụng AI & Hạn mức</h1>
        </div>
        <button
          onClick={() => {
            refetchOrg();
            refetchUsage();
          }}
          className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-xs font-semibold"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cột trái / Trên: Section 1 & Section 3 */}
        <div className="space-y-8 lg:col-span-1">
          {/* Section 1 — Tổng quan tháng này */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span>Sử dụng tháng {currentMonthStr}</span>
              </h2>
            </div>

            {quota === null ? (
              <div className="py-2">
                <div className="text-3xl font-bold text-gray-900 tracking-tight">
                  {used.toLocaleString()} <span className="text-base font-normal text-gray-500">/ Không giới hạn</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Gói dịch vụ của bạn không giới hạn số lượng token.</p>
                {used === 0 && (
                  <p className="text-xs text-indigo-600 font-medium mt-3 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                    Chưa có hoạt động nào tháng này
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight">
                  {used.toLocaleString()} <span className="text-base font-normal text-gray-500">/ {quota.toLocaleString()} tokens</span>
                </div>
                <div className="mt-4 w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${isWarning ? 'bg-red-600' : 'bg-indigo-600'
                      }`}
                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  ></div>
                </div>
                <div className="mt-2.5 flex justify-between text-xs text-gray-500 font-medium">
                  <span>{percent.toFixed(1)}% đã sử dụng</span>
                  <span>{Math.max(0, quota - used).toLocaleString()} còn lại</span>
                </div>
                {used === 0 && (
                  <p className="text-xs text-indigo-600 font-medium mt-4 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                    Chưa có hoạt động nào tháng này
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 3 — Thông tin plan */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span>Thông tin Gói dịch vụ</span>
              </h2>
              <Badge variant="PUBLISHED">{plan}</Badge>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-2 text-xs font-medium">
                  <Server className="w-4 h-4 text-gray-400" />
                  <span>Hạn mức tháng</span>
                </span>
                <span className="font-semibold text-gray-900">
                  {quota === null ? 'Không giới hạn' : `${quota.toLocaleString()} tokens`}
                </span>
              </div>

              <div className="space-y-1.5 py-1">
                <span className="text-gray-500 flex items-center gap-2 text-xs font-medium">
                  <Cpu className="w-4 h-4 text-gray-400" />
                  <span>Model Generate chính</span>
                </span>
                <p className="font-mono text-xs bg-gray-50 text-indigo-600 p-2 rounded-xl border border-gray-100 truncate">
                  {BEDROCK_GENERATE_MODEL}
                </p>
              </div>

              <div className="space-y-1.5 py-1">
                <span className="text-gray-500 flex items-center gap-2 text-xs font-medium">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <span>Model Edit / Chỉnh sửa</span>
                </span>
                <p className="font-mono text-xs bg-gray-50 text-purple-600 p-2 rounded-xl border border-gray-100 truncate">
                  {BEDROCK_EDIT_MODEL}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải / Dưới: Section 2 — Breakdown theo model */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                <Box className="w-5 h-5 text-indigo-600" />
                <span>Chi tiết theo Model (Breakdown)</span>
              </h2>
            </div>

            {used === 0 || byModel.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-3">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Activity className="w-7 h-7" />
                </div>
                <p className="text-gray-900 font-semibold text-base">Chưa có hoạt động nào tháng này</p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Các hoạt động tạo và chỉnh sửa nội dung bằng AI trong tháng sẽ được thống kê chi tiết tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-4 px-6">Model</th>
                      <th className="py-4 px-6 text-center">Số lượt gọi</th>
                      <th className="py-4 px-6 text-right">Tổng token</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {byModel.map((item: any, index: number) => (
                      <tr key={item.model || index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4.5 px-6 font-mono text-xs font-medium text-gray-900">
                          {item.model}
                        </td>
                        <td className="py-4.5 px-6 text-center font-medium text-gray-700">
                          {item.requestCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-4.5 px-6 text-right font-semibold text-indigo-600">
                          {item.totalTokens?.toLocaleString() || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
