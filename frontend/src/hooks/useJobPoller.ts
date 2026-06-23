import { useState, useEffect, useRef } from 'react';
import { contentApi } from '../services/api';

interface PollResult {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'idle';
  result: { id: string; body: string; versionNo: number } | null;
  error: string | null;
}

/**
 * Hook dùng để poll trạng thái một generation job.
 * Frontend tạo job → nhận jobId → truyền vào hook này → tự động poll đến khi xong.
 */
export function useJobPoller(contentId: string | null, jobId: string | null): PollResult {
  const [state, setState] = useState<PollResult>({ status: 'idle', result: null, error: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!contentId || !jobId) return;

    setState({ status: 'queued', result: null, error: null });

    const poll = async () => {
      try {
        const { data } = await contentApi.pollJob(contentId, jobId);
        const jobStatus = data.job.status.toLowerCase() as PollResult['status'];
        setState({ status: jobStatus, result: data.result, error: null });

        if (jobStatus === 'completed' || jobStatus === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        setState({ status: 'failed', result: null, error: 'Failed to check job status' });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    poll(); // ngay lập tức
    intervalRef.current = setInterval(poll, 2500); // poll mỗi 2.5s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [contentId, jobId]);

  return state;
}
