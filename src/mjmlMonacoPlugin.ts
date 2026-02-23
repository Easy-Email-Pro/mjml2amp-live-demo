/**
 * MJML Monaco plugin (adapted from vscode-mjml)
 * - Syntax highlighting: Monarch
 * - Completion: tag attributes, CSS in mj-style, HTML in mj-text, MJML snippets (mjml.json)
 * - Language config: language-configuration.json
 */
import type { Monaco } from '@monaco-editor/react';
import type { editor, languages } from 'monaco-editor';
import { tagAttributes, cssProperties, htmlTags } from './snippets';
import { languageConfiguration } from './snippets/languageConfiguration';
import mjmlSnippetsJson from './snippets/mjml.json';

type MjmlSnippetDef = { prefix: string; body: string | string[]; description?: string };

function getSnippetBody(def: MjmlSnippetDef): string {
  return Array.isArray(def.body) ? def.body.join('\n') : def.body;
}

function getOffset(model: editor.ITextModel, position: { lineNumber: number; column: number }): number {
  return model.getOffsetAt(position);
}

/** Same logic as vscode-mjml completion.ts isWithinOpeningTag */
function isWithinOpeningTag(
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
  regex: RegExp
): boolean {
  const docText = model.getValue();
  const tagMatches = docText.match(regex);
  if (!tagMatches) return false;
  const cursorPos = getOffset(model, position);
  let indexOfPos = 0;
  for (const tag of tagMatches) {
    const tagStart = docText.indexOf(tag, indexOfPos);
    const tagEnd = tagStart + tag.length;
    indexOfPos = tagEnd;
    if (cursorPos > tagStart && cursorPos <= tagEnd) return true;
  }
  return false;
}

/** Same logic as vscode-mjml completion.ts isWithinTags */
function isWithinTags(
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
  regex: RegExp
): boolean {
  const docText = model.getValue();
  const tagMatches = docText.match(regex);
  if (!tagMatches) return false;
  const offset = getOffset(model, position);
  let isWithinOpeningTag = false;
  let isWithinClosingTag = false;
  let indexOfPos = 0;
  for (const tag of tagMatches) {
    if (isWithinOpeningTag && isWithinClosingTag) break;
    const tagIndex = docText.indexOf(tag, indexOfPos);
    const tagLength = tagIndex + tag.length;
    const isHTMLTag = tag[0] === '<';
    indexOfPos = tagLength;
    if ((isHTMLTag && tag[1] !== '/') || tag === '{') {
      isWithinOpeningTag = tagLength < offset;
    } else if (tag[1] === '/' || tag === '}') {
      isWithinClosingTag = tagIndex > offset - 1;
    }
  }
  return isWithinOpeningTag && isWithinClosingTag;
}

/** Monarch grammar */
const R = (s: string) => new RegExp(s);
const nextComment = '@comment';
const nextPop = '@pop';
const nextTag = '@tag';
const nextStringDouble = '@stringDouble';
const nextStringSingle = '@stringSingle';
const nextRoot = '@root';

const monarchRoot = [
  [R('<!--'), 'comment', nextComment],
  [R('\\s*<\\s*\\/\\s*'), 'delimiter.xml'],
  [R('(\\s*<\\s*)((?:mjml|mj-body|mj-head)\\b)'), ['delimiter.xml', { token: 'keyword', next: nextTag }]],
  [R('(\\s*<\\s*)([a-zA-Z][a-zA-Z0-9\\-:]*)'), ['delimiter.xml', { token: 'tag', next: nextTag }]],
  [R('\\s*<\\s*'), 'delimiter.xml'],
  [R("[^<]+"), ''],
];
const monarchComment = [
  [R('-->'), 'comment', nextPop],
  [R('[^-]+'), 'comment'],
  [R('.'), 'comment'],
];
const monarchTag = [
  [R('([a-zA-Z][a-zA-Z0-9\\-:]*)(\\s*=\\s*)'), ['attribute.name', 'delimiter']],
  [R('([a-zA-Z][a-zA-Z0-9\\-:]*)\\s*'), 'attribute.name'],
  [R('"'), 'string', nextStringDouble],
  [R("'"), 'string', nextStringSingle],
  [R('\\s*\\/?\\s*>'), { token: 'delimiter.xml', next: nextRoot }],
];
const monarchStringDouble = [
  [R('[^"]+'), 'string'],
  [R('"'), { token: 'string', next: nextTag }],
];
const monarchStringSingle = [
  [R("[^']+"), 'string'],
  [R("'"), { token: 'string', next: nextTag }],
];

const MJML_MONARCH_RAW = {
  defaultToken: 'source',
  tokenPostfix: '',
  ignoreCase: true,
  tokenizer: {
    root: monarchRoot,
    comment: monarchComment,
    tag: monarchTag,
    stringDouble: monarchStringDouble,
    stringSingle: monarchStringSingle,
  },
};
const MJML_MONARCH = MJML_MONARCH_RAW as unknown as languages.IMonarchLanguage;

export function registerMjmlPlugin(monaco: Monaco): () => void {
  const langId = 'mjml';

  if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === langId)) {
    return () => {};
  }

  monaco.languages.register({ id: langId, extensions: ['.mjml'], aliases: ['MJML'] });
  monaco.languages.setMonarchTokensProvider(langId, MJML_MONARCH as any);

  const darkColors: Record<string, string> = {
    'editor.foreground': '#D4D4D4',
    'editor.background': '#1E1E1E',
  };
  const lightColors: Record<string, string> = {
    'editor.foreground': '#000000',
    'editor.background': '#FFFFFF',
  };
  monaco.editor.defineTheme('vs-dark-mjml', {
    base: 'vs-dark',
    inherit: true,
    colors: darkColors,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'tag', foreground: '4EC9B0' },
      { token: 'attribute.name', foreground: '9CDCFE' },
      { token: 'delimiter.xml', foreground: '808080' },
    ],
  });
  monaco.editor.defineTheme('vs-light-mjml', {
    base: 'vs',
    inherit: true,
    colors: lightColors,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'string', foreground: 'A31515' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'tag', foreground: '267F99' },
      { token: 'attribute.name', foreground: '001080' },
      { token: 'delimiter.xml', foreground: '000000' },
    ],
  });

  monaco.languages.setLanguageConfiguration(langId, {
    comments: languageConfiguration.comments,
    brackets: [...languageConfiguration.brackets],
    autoClosingPairs: [...languageConfiguration.autoClosingPairs],
    surroundingPairs: [...languageConfiguration.surroundingPairs],
    folding: languageConfiguration.folding,
  });

  const tagRegex = /<[^/](?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/gm;
  const mjStyleRegex = /<\/?mj-style(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;
  const bracketRegex = /{|}/gm;
  const mjTextRegex = /<\/?mj-text(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;
  const htmlTagRegex = /<\/?[^/?mj\-.*](?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;

  const completionProvider = monaco.languages.registerCompletionItemProvider(langId, {
    triggerCharacters: ['<', ' ', '\n'],
    provideCompletionItems(
      model: editor.ITextModel,
      position: { lineNumber: number; column: number }
    ): { suggestions: languages.CompletionItem[] } {
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1);
      const wordUntil = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordUntil.startColumn,
        endColumn: position.column,
      };
      const suggestions: languages.CompletionItem[] = [];

      if (isWithinOpeningTag(model, position, tagRegex)) {
        for (const attr of tagAttributes) {
          suggestions.push({
            label: attr.prefix,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: attr.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'MJML',
            documentation: attr.description,
            range,
          });
        }
        return { suggestions };
      }

      const lastLineChar = lineContent[position.column - 1];
      if (lastLineChar !== ';' && isWithinTags(model, position, mjStyleRegex) && isWithinTags(model, position, bracketRegex)) {
        for (const prop of cssProperties) {
          suggestions.push({
            label: prop.prefix,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: prop.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'MJML (CSS)',
            documentation: prop.description,
            range,
          });
        }
        return { suggestions };
      }

      if (isWithinTags(model, position, mjTextRegex) && !isWithinOpeningTag(model, position, htmlTagRegex)) {
        for (const tag of htmlTags) {
          suggestions.push({
            label: tag.prefix,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: tag.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'MJML (HTML)',
            documentation: tag.description,
            range,
          });
        }
        return { suggestions };
      }

      const tagMatch = textUntilPosition.match(/<\s*([a-zA-Z0-9\-:]*)$/);
      const currentWord = (wordUntil.word || '').toLowerCase();

      if (tagMatch || textUntilPosition.endsWith('<')) {
        const prefix = (tagMatch && tagMatch[1]) || '';
        for (const key of Object.keys(mjmlSnippetsJson)) {
          const def = (mjmlSnippetsJson as Record<string, MjmlSnippetDef>)[key];
          if (!def || def.prefix.toLowerCase().startsWith('<')) continue;
          if (!def.prefix.toLowerCase().startsWith(prefix.toLowerCase())) continue;
          const body = getSnippetBody(def);
          if (body.startsWith('<') && body.includes('>')) {
            suggestions.push({
              label: def.prefix,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: body,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: def.description ?? 'MJML',
              range,
            });
          }
        }
      }

      if (currentWord) {
        for (const key of Object.keys(mjmlSnippetsJson)) {
          const def = (mjmlSnippetsJson as Record<string, MjmlSnippetDef>)[key];
          if (!def || !def.prefix.toLowerCase().startsWith(currentWord)) continue;
          suggestions.push({
            label: def.prefix,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: getSnippetBody(def),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: def.description ?? 'MJML',
            range,
          });
        }
      }

      return { suggestions };
    },
  });

  return () => completionProvider.dispose();
}
