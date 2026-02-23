export interface EditorHeaderProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onFormat: () => void;
  onExportHtml: () => void;
  onExportMjml: () => void;
  exportOpen: boolean;
  onExportOpenChange: (open: boolean) => void;
  formatLoading: boolean;
  activeFileName: string | null;
}

export function EditorHeader({
  theme,
  onThemeChange,
  onFormat,
  onExportHtml,
  onExportMjml,
  exportOpen,
  onExportOpenChange,
  formatLoading,
  activeFileName,
}: EditorHeaderProps) {
  return (
    <header className="mjml-editor__top-header">
      <div className="mjml-editor__top-header-left">
        <span className="mjml-editor__top-header-title">MJML Online Editor</span>
      </div>
      <div className="mjml-editor__top-header-right">
        <div className="mjml-editor__theme-switch">
          <button
            type="button"
            className={`mjml-editor__theme-btn ${theme === 'light' ? 'mjml-editor__theme-btn--active' : ''}`}
            onClick={() => onThemeChange('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`mjml-editor__theme-btn ${theme === 'dark' ? 'mjml-editor__theme-btn--active' : ''}`}
            onClick={() => onThemeChange('dark')}
          >
            Dark
          </button>
        </div>
        <button
          type="button"
          className="mjml-editor__export-btn"
          onClick={onFormat}
          disabled={formatLoading || activeFileName == null}
          title="Format MJML"
        >
          {formatLoading ? 'Formatting…' : 'Format'}
        </button>
        <div className="mjml-editor__export-wrap">
          <button
            type="button"
            className="mjml-editor__export-btn"
            onClick={() => onExportOpenChange(!exportOpen)}
          >
            Export
          </button>
          {exportOpen && (
            <>
              <div
                className="mjml-editor__export-backdrop"
                onClick={() => onExportOpenChange(false)}
                aria-hidden
              />
              <div className="mjml-editor__export-menu">
                <button type="button" onClick={onExportHtml}>
                  Export AMP HTML
                </button>
                <button type="button" onClick={onExportMjml}>
                  Export MJML
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
