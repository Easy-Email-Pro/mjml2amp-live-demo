import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_EDITOR_RATIO, MIN_EDITOR_RATIO, MAX_EDITOR_RATIO } from '../lib/constants';

interface UseResizeOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialRatio?: number;
  min?: number;
  max?: number;
}

export function useResize({
  containerRef,
  initialRatio = DEFAULT_EDITOR_RATIO,
  min = MIN_EDITOR_RATIO,
  max = MAX_EDITOR_RATIO,
}: UseResizeOptions): {
  ratio: number;
  setRatio: React.Dispatch<React.SetStateAction<number>>;
  handleResizeStart: (e: React.MouseEvent) => void;
} {
  const [ratio, setRatio] = useState(initialRatio);
  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = (e.clientX - rect.left) / rect.width;
      setRatio(Math.min(max, Math.max(min, newRatio)));
    };
    const onUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [containerRef, min, max]);

  return { ratio, setRatio, handleResizeStart };
}
