import { getImageUrlsForAmp, mjml2amp } from 'mjml2amp';
import { EditorCore } from 'easy-email-pro-core';
import type { CompileError } from '../types/editor';

export interface CompileResult {
  html: string;
  errors: CompileError[];
}

async function getImageDimensions(
  urls: string[]
): Promise<Record<string, { width: number; height: number }>> {
  const result: Record<string, { width: number; height: number }> = {};
  const list = Array.isArray(urls) ? urls : [];
  await Promise.all(
    list.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            result[url] = {
              width: img.naturalWidth,
              height: img.naturalHeight,
            };
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
  return result;
}

export async function compileMjmlToAmp(mjmlStr: string): Promise<CompileResult> {
  try {
    await EditorCore.auth(process.env.CLIENT_ID ?? '');
    const imageUrls = await getImageUrlsForAmp(mjmlStr);
    const imageDimensions = await getImageDimensions(imageUrls);

    const result = mjml2amp(mjmlStr, {
      validationLevel: 'soft',
      imageDimensionsStrict: false,
      imageDimensions,
    });

    return {
      html: result.html ?? '',
      errors: (result.errors ?? []) as CompileError[],
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      html: '',
      errors: [{ message, line: undefined }],
    };
  }
}
