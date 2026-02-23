import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { TEMPLATES } from './templates';
import { registerMjmlPlugin } from './mjmlMonacoPlugin';
import { beautifyMjml } from './beautify';
import './MjmlEditor.css';
import { getImageUrlsForAmp, mjml2amp } from 'mjml2amp';

type FileItem = { id: string; name: string; content: string };

const LANG = 'mjml';

async function getImageDimensions(
  urls: string[]
): Promise<Record<string, { width: number; height: number; }>> {
  const result: Record<string, { width: number; height: number; }> = {};
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

function generateId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createFile(name: string, content: string): FileItem {
  return { id: generateId(), name, content };
}

export function MjmlEditor() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [files, setFiles] = useState<FileItem[]>(() =>
    TEMPLATES.map((t) => createFile(t.name, t.content))
  );
  const [activeId, setActiveId] = useState<string | null>(() => files[0]?.id ?? null);
  const [rightMode, setRightMode] = useState<'preview' | 'html'>('preview');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [editorRatio, setEditorRatio] = useState(0.4);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [html, setHtml] = useState('');
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number }>>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [beautifyLoading, setBeautifyLoading] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const beautifyRef = useRef<() => void | Promise<void>>(() => {});

  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const activeContent = activeFile?.content ?? '';

  const compile = useCallback(async(mjmlStr: string) => {
    try {
      const imageUrls = await getImageUrlsForAmp(mjmlStr);
      const imageDimensions = await getImageDimensions(imageUrls);
      const result = mjml2amp(mjmlStr, { 
        validationLevel: 'soft',
        imageDimensionsStrict: false,
        imageDimensions
       });

      setHtml(result.html ?? '');
      setErrors(result.errors ?? []);
      return result;
    } catch (e: any) {
      setHtml('');
      setErrors([{ message: String(e?.message ?? e), line: undefined }]);
      return { html: '', errors: [] };
    }
  }, []);

  useEffect(() => {
    compile(activeContent);
  }, [activeContent, compile]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setPreviewOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      if (!mainContentRef.current) return;
      const rect = mainContentRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setEditorRatio(Math.min(0.75, Math.max(0.25, ratio)));
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
  }, []);

  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed || !ed.getModel()) return;
    const model = ed.getModel()!;
    const markers = errors
      .filter((e) => e.line != null && e.line > 0)
      .map((e) => ({
        severity: monaco.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line!,
        startColumn: 1,
        endLineNumber: e.line!,
        endColumn: model.getLineMaxColumn(e.line!),
      }));
    monaco.editor.setModelMarkers(model, 'mjml', markers);
  }, [errors]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    try {
      registerMjmlPlugin(monaco);
      setMountError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMountError(`Plugin load failed: ${msg}`);
      console.error('MJML plugin error:', e);
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMountError(null);
    editor.addAction({
      id: 'mjml.beautify',
      label: 'Format MJML',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => {
        beautifyRef.current?.();
      },
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeId == null) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeId ? { ...f, content: value ?? '' } : f))
    );
  };

  const addFile = () => {
    const name = `untitled-${files.length + 1}.mjml`;
    const newFile = createFile(name, "");
    setFiles((prev) => [...prev, newFile]);
    setActiveId(newFile.id);
  };

  const closeFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeId === id && next.length) setActiveId(next[0].id);
      else if (activeId === id) setActiveId(null);
      return next;
    });
  };

  const exportHtml = () => {
    navigator.clipboard.writeText(html);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeFile?.name ?? 'template').replace(/\.mjml$/i, '') + '.html';
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const exportMjml = () => {
    navigator.clipboard.writeText(activeContent);
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile?.name ?? 'template.mjml';
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const handleBeautify = useCallback(async () => {
    if (activeId == null || !activeContent.trim()) return;
    setBeautifyLoading(true);
    try {
      const formatted = await beautifyMjml(activeContent);
      setFiles((prev) =>
        prev.map((f) => (f.id === activeId ? { ...f, content: formatted } : f))
      );
    } catch (e) {
      console.error('Beautify failed:', e);
    } finally {
      setBeautifyLoading(false);
    }
  }, [activeId, activeContent]);
  beautifyRef.current = handleBeautify;

  return (
    <div className="mjml-editor" data-theme={theme}>
      <header className="mjml-editor__top-header">
        <div className="mjml-editor__top-header-left">
          <span className="mjml-editor__top-header-title">MJML Online Editor</span>
        </div>
        <div className="mjml-editor__top-header-right">
          <div className="mjml-editor__theme-switch">
            <button
              type="button"
              className={`mjml-editor__theme-btn ${theme === 'light' ? 'mjml-editor__theme-btn--active' : ''}`}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              className={`mjml-editor__theme-btn ${theme === 'dark' ? 'mjml-editor__theme-btn--active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
          </div>
          <button
            type="button"
            className="mjml-editor__export-btn"
            onClick={handleBeautify}
            disabled={beautifyLoading || activeId == null}
            title="Format MJML"
          >
            {beautifyLoading ? 'Formatting…' : 'Format'}
          </button>
          <div className="mjml-editor__export-wrap">
            <button
              type="button"
              className="mjml-editor__export-btn"
              onClick={() => setExportOpen((o) => !o)}
            >
              Export
            </button>
            {exportOpen && (
              <>
                <div
                  className="mjml-editor__export-backdrop"
                  onClick={() => setExportOpen(false)}
                  aria-hidden
                />
                <div className="mjml-editor__export-menu">
                  <button type="button" onClick={exportHtml}>
                    Export AMP HTML
                  </button>
                 
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`mjml-editor__body ${!previewOpen ? 'mjml-editor__body--preview-closed' : ''}`}>
        <aside className="mjml-editor__sidebar">
          <div className="mjml-editor__sidebar-title">
            <span className="mjml-editor__sidebar-title-text">Files</span>
          </div>
          <ul className="mjml-editor__sidebar-list">
            {files.map((f) => (
              <li
                key={f.id}
                className={`mjml-editor__sidebar-item ${f.id === activeId ? 'mjml-editor__sidebar-item--active' : ''}`}
                onClick={() => setActiveId(f.id)}
              >
                <span className="mjml-editor__sidebar-icon">📄</span>
                <span className="mjml-editor__sidebar-name">{f.name}</span>
                {errors.length > 0 && f.id === activeId && (
                  <span className="mjml-editor__sidebar-badge">{errors.length}</span>
                )}
                <button
                  type="button"
                  className="mjml-editor__sidebar-close"
                  onClick={(e) => closeFile(e, f.id)}
                  aria-label="Close"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mjml-editor__sidebar-footer">
            <button type="button" className="mjml-editor__sidebar-new" onClick={addFile}>
              <span className="mjml-editor__sidebar-new-icon">+</span>
              New File
            </button>
          </div>
        </aside>

        <div
          ref={mainContentRef}
          className="mjml-editor__main"
          style={
            previewOpen
              ? ({ '--editor-ratio': editorRatio } as React.CSSProperties)
              : undefined
          }
        >
          <div className="mjml-editor__pane mjml-editor__pane--left">
          <div className="mjml-editor__header mjml-editor__header--left">
            <span className="mjml-editor__header-filename">{activeFile?.name ?? '—'}</span>
            {errors.length > 0 && (
              <span className="mjml-editor__error mjml-editor__error-count">
                {errors.length} error(s)
              </span>
            )}
          </div>
          {errors.length > 0 && (
            <div className="mjml-editor__error-box">
              {errors.map((e, i) => (
                <div key={i}>
                  {e.line != null ? `Line ${e.line}: ` : ''}{e.message}
                </div>
              ))}
            </div>
          )}
          <div className="mjml-editor__preview-wrap">
            {mountError && (
              <div className="mjml-editor__error-box" style={{ margin: 8 }}>
                {mountError}
              </div>
            )}
            {activeId != null ? (
              <Editor
                height="100%"
                defaultLanguage={LANG}
                value={activeContent}
                beforeMount={handleBeforeMount}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'vs-dark-mjml' : 'vs-light-mjml'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="mjml-editor__loading">Select or create a file from the sidebar</div>
            )}
          </div>
          </div>

          {previewOpen && (
            <>
              <div
                className="mjml-editor__resize-handle"
                onMouseDown={handleResizeStart}
                aria-label="Drag to resize"
                title="Drag to resize editor and preview"
              />
              <div className="mjml-editor__pane mjml-editor__pane--right">
                <div className="mjml-editor__header mjml-editor__header--right">
                  <div className="mjml-editor__right-tabs">
                    <button
                      type="button"
                      className={`mjml-editor__right-tab ${rightMode === 'preview' ? 'mjml-editor__right-tab--active' : ''}`}
                      onClick={() => setRightMode('preview')}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className={`mjml-editor__right-tab ${rightMode === 'html' ? 'mjml-editor__right-tab--active' : ''}`}
                      onClick={() => setRightMode('html')}
                    >
                      View HTML
                    </button>
                  </div>
                  <div className="mjml-editor__header-actions">
                    {rightMode === 'preview' && (
                      <div className="mjml-editor__viewport-toggle" role="group" aria-label="Preview viewport">
                        <button
                          type="button"
                          className={`mjml-editor__viewport-btn ${previewViewport === 'desktop' ? 'mjml-editor__viewport-btn--active' : ''}`}
                          onClick={() => setPreviewViewport('desktop')}
                          title="Desktop view"
                          aria-label="Desktop view"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={`mjml-editor__viewport-btn ${previewViewport === 'mobile' ? 'mjml-editor__viewport-btn--active' : ''}`}
                          onClick={() => setPreviewViewport('mobile')}
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
                      onClick={() => setPreviewOpen(false)}
                      aria-label="Close preview"
                      title="Close preview (Ctrl+B)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="mjml-editor__preview-wrap">
              {rightMode === 'preview' && (
                <div
                  className={`mjml-editor__preview-viewport mjml-editor__preview-viewport--${previewViewport}`}
                >
                  <iframe
                    className="mjml-editor__preview-iframe"
                    title="Preview"
                    srcDoc={html}
                  />
                </div>
              )}
              {rightMode === 'html' && (
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
            </>
          )}
        </div>

        {!previewOpen && (
          <button
            type="button"
            className="mjml-editor__preview-reopen"
            onClick={() => setPreviewOpen(true)}
            title="Open preview (Ctrl+B)"
            aria-label="Open preview"
          >
            <span className="mjml-editor__preview-reopen-icon">◀</span>
            <span className="mjml-editor__preview-reopen-text">Preview</span>
          </button>
        )}
      </div>
    </div>
  );
}
