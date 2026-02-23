export interface FileItem {
  id: string;
  name: string;
  content: string;
}

export interface CompileError {
  message: string;
  line?: number;
}
