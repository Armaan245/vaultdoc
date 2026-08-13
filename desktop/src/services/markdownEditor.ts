export function insertMarkdownAction(currentText: string, action: string): string {
  const tableSnippet = '\n\n| Column 1 | Column 2 |\n| --- | --- |\n| Data 1 | Data 2 |\n\n';
  const linkSnippet = '[Link Text](https://example.com)';
  const hrSnippet = '\n\n---\n\n';

  switch (action) {
    case 'h1':
      return currentText ? `${currentText}\n\n# Heading 1` : '# Heading 1\n\n';
    case 'h2':
      return currentText ? `${currentText}\n\n## Heading 2` : '## Heading 2\n\n';
    case 'h3':
      return currentText ? `${currentText}\n\n### Heading 3` : '### Heading 3\n\n';
    case 'bold':
      return currentText ? `${currentText} **bold text**` : '**bold text**';
    case 'italic':
      return currentText ? `${currentText} *italic text*` : '*italic text*';
    case 'strikethrough':
      return currentText ? `${currentText} ~~strikethrough~~` : '~~strikethrough~~';
    case 'code':
      return currentText ? `${currentText} \`code snippet\`` : '`code snippet`';
    case 'table':
      return currentText ? `${currentText}${tableSnippet}` : tableSnippet.trim();
    case 'link':
      return currentText ? `${currentText} ${linkSnippet}` : linkSnippet;
    case 'hr':
      return currentText ? `${currentText}${hrSnippet}` : '---\n\n';
    default:
      return currentText;
  }
}
