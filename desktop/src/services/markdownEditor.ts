export function applyMarkdownFormatting(
  text: string,
  action: string,
  selectionStart?: number,
  selectionEnd?: number
): { newText: string; cursorPosition: number } {
  const start = selectionStart ?? text.length;
  const end = selectionEnd ?? text.length;
  
  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);

  switch (action) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const levelMap: Record<string, string> = { h1: '# ', h2: '## ', h3: '### ' };
      const targetPrefix = levelMap[action];

      // Find current line boundaries
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = text.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = text.length;

      const currentLine = text.substring(lineStart, lineEnd);
      // Clean off existing bold wrappers if title was wrapped in **
      let cleanedLine = currentLine.replace(/^\*{2}/, '').replace(/\*{2}$/, '');
      // Clean off existing heading markers
      cleanedLine = cleanedLine.replace(/^#{1,6}\s*/, '');

      // Toggle heading if already applied, otherwise set new heading level
      let newLine = '';
      if (currentLine.startsWith(targetPrefix)) {
        newLine = cleanedLine; // Toggle heading off
      } else {
        newLine = `${targetPrefix}${cleanedLine}`;
      }

      const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
      return { newText, cursorPosition: lineStart + newLine.length };
    }

    case 'bold': {
      if (selected) {
        // Prevent double bolding ****text****
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
          const inner = selected.slice(2, -2);
          return { newText: before + inner + after, cursorPosition: start + inner.length };
        } else {
          const inserted = `**${selected}**`;
          return { newText: before + inserted + after, cursorPosition: start + inserted.length };
        }
      } else {
        // Check if cursor is surrounding ** **
        if (before.endsWith('**') && after.startsWith('**')) {
          const newBefore = before.slice(0, -2);
          const newAfter = after.slice(2);
          return { newText: newBefore + newAfter, cursorPosition: newBefore.length };
        }
        const inserted = '**bold text**';
        return { newText: before + inserted + after, cursorPosition: start + inserted.length };
      }
    }

    case 'italic': {
      if (selected) {
        if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length >= 2) {
          const inner = selected.slice(1, -1);
          return { newText: before + inner + after, cursorPosition: start + inner.length };
        } else {
          const inserted = `*${selected}*`;
          return { newText: before + inserted + after, cursorPosition: start + inserted.length };
        }
      } else {
        const inserted = '*italic text*';
        return { newText: before + inserted + after, cursorPosition: start + inserted.length };
      }
    }

    case 'strikethrough': {
      if (selected) {
        if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
          const inner = selected.slice(2, -2);
          return { newText: before + inner + after, cursorPosition: start + inner.length };
        } else {
          const inserted = `~~${selected}~~`;
          return { newText: before + inserted + after, cursorPosition: start + inserted.length };
        }
      } else {
        const inserted = '~~strikethrough~~';
        return { newText: before + inserted + after, cursorPosition: start + inserted.length };
      }
    }

    case 'code': {
      if (selected) {
        if (selected.startsWith('`') && selected.endsWith('`') && selected.length >= 2) {
          const inner = selected.slice(1, -1);
          return { newText: before + inner + after, cursorPosition: start + inner.length };
        } else {
          const inserted = `\`${selected}\``;
          return { newText: before + inserted + after, cursorPosition: start + inserted.length };
        }
      } else {
        const inserted = '`code snippet`';
        return { newText: before + inserted + after, cursorPosition: start + inserted.length };
      }
    }

    case 'table': {
      const inserted = '\n\n| Column 1 | Column 2 |\n| --- | --- |\n| Data 1 | Data 2 |\n\n';
      return { newText: before + inserted + after, cursorPosition: start + inserted.length };
    }

    case 'link': {
      const inserted = selected ? `[${selected}](https://example.com)` : '[Link Text](https://example.com)';
      return { newText: before + inserted + after, cursorPosition: start + inserted.length };
    }

    case 'hr': {
      const inserted = '\n\n---\n\n';
      return { newText: before + inserted + after, cursorPosition: start + inserted.length };
    }

    default:
      return { newText: text, cursorPosition: start };
  }
}

export function detectActiveFormats(
  text: string,
  selectionStart: number,
  selectionEnd: number
): Record<string, boolean> {
  const formats: Record<string, boolean> = {};
  if (!text) return formats;

  const start = Math.min(selectionStart, text.length);
  const end = Math.min(selectionEnd, text.length);

  // Line-level detection for headings
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', start);
  if (lineEnd === -1) lineEnd = text.length;

  const currentLine = text.substring(lineStart, lineEnd);
  if (currentLine.startsWith('# ')) formats.h1 = true;
  else if (currentLine.startsWith('## ')) formats.h2 = true;
  else if (currentLine.startsWith('### ')) formats.h3 = true;

  // Selected or surrounding text detection
  const selected = text.substring(start, end);
  const before = text.substring(0, start);
  const after = text.substring(end);

  if (
    (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) ||
    (before.endsWith('**') && after.startsWith('**'))
  ) {
    formats.bold = true;
  }

  if (
    (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length >= 2) ||
    (before.endsWith('*') && after.startsWith('*') && !before.endsWith('**'))
  ) {
    formats.italic = true;
  }

  if (
    (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) ||
    (before.endsWith('~~') && after.startsWith('~~'))
  ) {
    formats.strikethrough = true;
  }

  if (
    (selected.startsWith('`') && selected.endsWith('`') && selected.length >= 2) ||
    (before.endsWith('`') && after.startsWith('`'))
  ) {
    formats.code = true;
  }

  return formats;
}

// Backward compatibility helper
export function insertMarkdownAction(currentText: string, action: string): string {
  return applyMarkdownFormatting(currentText, action).newText;
}
