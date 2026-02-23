import type { FileItem } from '../types/editor';

export const LANG = 'mjml';

export const DEFAULT_EDITOR_RATIO = 0.4;
export const MIN_EDITOR_RATIO = 0.25;
export const MAX_EDITOR_RATIO = 0.75;

export function generateId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFile(name: string, content: string): FileItem {
  return { id: generateId(), name, content };
}
