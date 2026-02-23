export interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ onResizeStart }: ResizeHandleProps) {
  return (
    <div
      className="mjml-editor__resize-handle"
      onMouseDown={onResizeStart}
      aria-label="Drag to resize"
      title="Drag to resize editor and preview"
    />
  );
}
