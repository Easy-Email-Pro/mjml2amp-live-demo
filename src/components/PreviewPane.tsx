import Editor from '@monaco-editor/react';

export type PreviewMode = 'preview' | 'html';
export type PreviewViewport = 'desktop' | 'mobile';

export interface PreviewPaneProps {
  mode: PreviewMode;
  viewport: PreviewViewport;
  html: string;
  theme: 'light' | 'dark';
  onModeChange: (mode: PreviewMode) => void;
  onViewportChange: (viewport: PreviewViewport) => void;
  onClosePreview: () => void;
}

export function PreviewPane({
  mode,
  viewport,
  html,
  theme,
  onModeChange,
  onViewportChange,
  onClosePreview,
}: PreviewPaneProps) {
  return (
    <div className="mjml-editor__pane mjml-editor__pane--right">
      <div className="mjml-editor__header mjml-editor__header--right">
        <div className="mjml-editor__right-tabs">
          <button
            type="button"
            className={`mjml-editor__right-tab ${mode === 'preview' ? 'mjml-editor__right-tab--active' : ''}`}
            onClick={() => onModeChange('preview')}
          >
            Preview
          </button>
          <button
            type="button"
            className={`mjml-editor__right-tab ${mode === 'html' ? 'mjml-editor__right-tab--active' : ''}`}
            onClick={() => onModeChange('html')}
          >
            View HTML
          </button>
        </div>
        <div className="mjml-editor__header-actions">
          {mode === 'preview' && (
            <div className="mjml-editor__viewport-toggle" role="group" aria-label="Preview viewport">
              <button
                type="button"
                className={`mjml-editor__viewport-btn ${viewport === 'desktop' ? 'mjml-editor__viewport-btn--active' : ''}`}
                onClick={() => onViewportChange('desktop')}
                title="Desktop view"
                aria-label="Desktop view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z" />
                </svg>
              </button>
              <button
                type="button"
                className={`mjml-editor__viewport-btn ${viewport === 'mobile' ? 'mjml-editor__viewport-btn--active' : ''}`}
                onClick={() => onViewportChange('mobile')}
                title="Mobile view"
                aria-label="Mobile view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z" />
                </svg>
              </button>
            </div>
          )}
          <button
            type="button"
            className="mjml-editor__pane-close"
            onClick={onClosePreview}
            aria-label="Close preview"
            title="Close preview (Ctrl+B)"
          >
            ×
          </button>
        </div>
      </div>
      <div className="mjml-editor__preview-wrap">
        {mode === 'preview' && (
          <div
            className={`mjml-editor__preview-viewport mjml-editor__preview-viewport--${viewport}`}
          >
            <iframe
              className="mjml-editor__preview-iframe"
              title="Preview"
              srcDoc={html}
            />
          </div>
        )}
        {mode === 'html' && (
          <Editor
            height="100%"
            defaultLanguage="html"
            value={html}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'on',
            }}
          />
        )}
      </div>
    </div>
  );
}
