/**
 * MJML code formatter.
 * Uses js-beautify + post-processing: fix missing '>', put tag content on its own line.
 */
import beautify from 'js-beautify';
import type { HTMLBeautifyOptions } from 'js-beautify';

/** Fix missing '>' after attribute value, e.g. padding="0"<mj-column → padding="0"><mj-column */
function fixMissingClosingBracket(html: string): string {
  return html.replace(/"(\s*)<(mj-[a-zA-Z0-9-]+)/g, '">$1<$2');
}

/** Get leading indent (spaces/tabs) of the line at the given position */
function getLineIndent(str: string, beforeIndex: number): string {
  const lineStart = str.lastIndexOf('\n', beforeIndex - 1) + 1;
  const lineBefore = str.slice(lineStart, beforeIndex);
  return (lineBefore.match(/^[ \t]*/)?.[0] ?? '');
}

/**
 * If text follows '>' of an opening tag, put content on a new line with same indent and align closing tag.
 */
function ensureContentOnNewLine(html: string): string {
  let out = html.replace(
    />(\s*)([^\s<][^<]*)(<\/[^>]+>)/g,
    (_, spaces, content, closing, offset, fullString) => {
      if (!content.trim()) return `>${spaces}`;
      const indent = getLineIndent(fullString, offset);
      return `>\n${indent}  ${content.trim()}\n${indent}${closing}`;
    }
  );
  out = out.replace(
    />(\s*)([^\s<][^\n<]+)(?!\s*<\/)/g,
    (_, spaces, content, offset, fullString) => {
      if (!content.trim()) return `>${spaces}`;
      const indent = getLineIndent(fullString, offset);
      return `>\n${indent}  ${content.trim()}`;
    }
  );
  return out;
}

const BEAUTIFY_OPTIONS: HTMLBeautifyOptions = {
  indent_size: 2,
  indent_char: ' ',
  wrap_line_length: 80,
  wrap_attributes: 'force-aligned',
  wrap_attributes_indent_size: 2,
  preserve_newlines: false,
  max_preserve_newlines: 0,
  indent_inner_html: true,
  end_with_newline: true,
  inline: ['a', 'span', 'b', 'i', 'strong', 'em', 'u', 'br'],
  inline_custom_elements: false,
};

export async function beautifyMjml(content: string): Promise<string> {
  const fixed = fixMissingClosingBracket(content.trim());
  const out = beautify.html(fixed, BEAUTIFY_OPTIONS);
  return ensureContentOnNewLine(out);
}
