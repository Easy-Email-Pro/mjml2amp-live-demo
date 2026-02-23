import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import { LANG } from '../lib/constants';
import type { CompileError } from '../types/editor';

export interface EditorPaneProps {
  activeFileName: string | null;
  activeContent: string;
  activeId: string | null;
  errors: CompileError[];
  mountError: string | null;
  theme: 'light' | 'dark';
  onEditorChange: (value: string | undefined) => void;
  beforeMount: BeforeMount;
  onMount: OnMount;
}

export function EditorPane({
  activeFileName,
  activeContent,
  activeId,
  errors,
  mountError,
  theme,
  onEditorChange,
  beforeMount,
  onMount,
}: EditorPaneProps) {
  return (
    <div className="mjml-editor__pane mjml-editor__pane--left">
      <div className="mjml-editor__header mjml-editor__header--left">
        <span className="mjml-editor__header-filename">{activeFileName ?? '—'}</span>
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
            beforeMount={beforeMount}
            onChange={onEditorChange}
            onMount={onMount}
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
  );
}
