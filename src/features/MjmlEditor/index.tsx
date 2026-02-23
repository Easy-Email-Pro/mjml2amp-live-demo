import { useCallback, useEffect, useRef, useState } from 'react';
import type { BeforeMount, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { TEMPLATES } from '../../templates';
import { registerMjmlPlugin } from '../../editor/mjmlMonacoPlugin';
import { beautifyMjml } from '../../lib/beautify';
import type { FileItem } from '../../types/editor';
import { createFile, DEFAULT_EDITOR_RATIO } from '../../lib/constants';
import { useCompile } from '../../hooks/useCompile';
import { useResize } from '../../hooks/useResize';
import { EditorHeader } from '../../components/EditorHeader';
import { FileSidebar } from '../../components/FileSidebar';
import { ResizeHandle } from '../../components/ResizeHandle';
import { EditorPane } from '../../components/EditorPane';
import { PreviewPane } from '../../components/PreviewPane';
import './MjmlEditor.css';

export function MjmlEditor() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [files, setFiles] = useState<FileItem[]>(() =>
    TEMPLATES.map((t) => createFile(t.name, t.content))
  );
  const [activeId, setActiveId] = useState<string | null>(() => files[0]?.id ?? null);
  const [rightMode, setRightMode] = useState<'preview' | 'html'>('preview');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [beautifyLoading, setBeautifyLoading] = useState(false);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const beautifyRef = useRef<() => void | Promise<void>>(() => {});

  const activeFile = files.find((f) => f.id === activeId) ?? null;
  const activeContent = activeFile?.content ?? '';

  const { html, errors } = useCompile(activeContent);
  const { ratio: editorRatio, handleResizeStart } = useResize({
    containerRef: mainContentRef,
    initialRatio: DEFAULT_EDITOR_RATIO,
  });

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
    const newFile = createFile(name, '');
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
      <EditorHeader
        theme={theme}
        onThemeChange={setTheme}
        onFormat={handleBeautify}
        onExportHtml={exportHtml}
        onExportMjml={exportMjml}
        exportOpen={exportOpen}
        onExportOpenChange={setExportOpen}
        formatLoading={beautifyLoading}
        activeFileName={activeFile?.name ?? null}
      />

      <div className={`mjml-editor__body ${!previewOpen ? 'mjml-editor__body--preview-closed' : ''}`}>
        <FileSidebar
          files={files}
          activeId={activeId}
          errors={errors}
          onSelect={setActiveId}
          onClose={closeFile}
          onAdd={addFile}
        />

        <div
          ref={mainContentRef}
          className="mjml-editor__main"
          style={
            previewOpen
              ? ({ '--editor-ratio': editorRatio } as React.CSSProperties)
              : undefined
          }
        >
          <EditorPane
            activeFileName={activeFile?.name ?? null}
            activeContent={activeContent}
            activeId={activeId}
            errors={errors}
            mountError={mountError}
            theme={theme}
            onEditorChange={handleEditorChange}
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
          />

          {previewOpen && (
            <>
              <ResizeHandle onResizeStart={handleResizeStart} />
              <PreviewPane
                mode={rightMode}
                viewport={previewViewport}
                html={html}
                theme={theme}
                onModeChange={setRightMode}
                onViewportChange={setPreviewViewport}
                onClosePreview={() => setPreviewOpen(false)}
              />
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
