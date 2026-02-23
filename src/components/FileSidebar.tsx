import type { FileItem } from '../types/editor';
import type { CompileError } from '../types/editor';

export interface FileSidebarProps {
  files: FileItem[];
  activeId: string | null;
  errors: CompileError[];
  onSelect: (id: string) => void;
  onClose: (e: React.MouseEvent, id: string) => void;
  onAdd: () => void;
}

export function FileSidebar({
  files,
  activeId,
  errors,
  onSelect,
  onClose,
  onAdd,
}: FileSidebarProps) {
  return (
    <aside className="mjml-editor__sidebar">
      <div className="mjml-editor__sidebar-title">
        <span className="mjml-editor__sidebar-title-text">Files</span>
      </div>
      <ul className="mjml-editor__sidebar-list">
        {files.map((f) => (
          <li
            key={f.id}
            className={`mjml-editor__sidebar-item ${f.id === activeId ? 'mjml-editor__sidebar-item--active' : ''}`}
            onClick={() => onSelect(f.id)}
          >
            <span className="mjml-editor__sidebar-icon">📄</span>
            <span className="mjml-editor__sidebar-name">{f.name}</span>
            {errors.length > 0 && f.id === activeId && (
              <span className="mjml-editor__sidebar-badge">{errors.length}</span>
            )}
            <button
              type="button"
              className="mjml-editor__sidebar-close"
              onClick={(e) => onClose(e, f.id)}
              aria-label="Close"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mjml-editor__sidebar-footer">
        <button type="button" className="mjml-editor__sidebar-new" onClick={onAdd}>
          <span className="mjml-editor__sidebar-new-icon">+</span>
          New File
        </button>
      </div>
    </aside>
  );
}
