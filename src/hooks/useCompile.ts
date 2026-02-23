import { useEffect, useState } from 'react';
import { compileMjmlToAmp } from '../lib/compile';
import type { CompileError } from '../types/editor';

export function useCompile(mjmlContent: string): {
  html: string;
  errors: CompileError[];
} {
  const [html, setHtml] = useState('');
  const [errors, setErrors] = useState<CompileError[]>([]);

  useEffect(() => {
    let cancelled = false;
    compileMjmlToAmp(mjmlContent).then((result) => {
      if (!cancelled) {
        setHtml(result.html);
        setErrors(result.errors);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mjmlContent]);

  return { html, errors };
}
