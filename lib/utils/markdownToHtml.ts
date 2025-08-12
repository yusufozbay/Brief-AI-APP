/**
 * Converts Markdown to HTML with specific formatting rules
 * - # → H1
 * - ## → H2  
 * - ### → H3
 * - #### → H4
 * - **text** → <strong>text</strong>
 * - * item → <li>item</li>
 * - - item → <li>item</li>
 */
export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert headings (order matters - start with H4, then H3, H2, H1)
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert lists - handle both * and - bullets
  // First, identify list blocks and convert them
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line is a list item
    const isListItem = trimmedLine.match(/^[-*]\s+(.+)$/);
    
    if (isListItem) {
      if (!inList) {
        // Start a new list
        processedLines.push('<ul>');
        inList = true;
      }
      // Add list item
      processedLines.push(`<li>${isListItem[1]}</li>`);
    } else {
      if (inList) {
        // End the current list
        processedLines.push('</ul>');
        inList = false;
      }
      // Add regular line
      processedLines.push(line);
    }
  }
  
  // Close any remaining open list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  html = processedLines.join('\n');
  
  // Convert line breaks to paragraphs for better formatting
  // Split by double line breaks and wrap in <p> tags
  const paragraphs = html.split('\n\n').filter(p => p.trim());
  html = paragraphs.map(paragraph => {
    const trimmed = paragraph.trim();
    // Don't wrap headings, lists, or HTML tags in paragraphs
    if (trimmed.match(/^<(h[1-6]|ul|li|\/ul)/)) {
      return trimmed;
    }
    // Don't wrap empty lines or lines that are already HTML
    if (!trimmed || trimmed.startsWith('<')) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  }).join('\n\n');
  
  return html;
}

/**
 * Clean and format HTML for better display
 */
export function cleanHtml(html: string): string {
  return html
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/(<\/h[1-6]>)\s*(<p>)/g, '$1\n\n$2') // Add spacing after headings
    .replace(/(<\/ul>)\s*(<p>)/g, '$1\n\n$2') // Add spacing after lists
    .replace(/(<\/p>)\s*(<h[1-6]>)/g, '$1\n\n$2'); // Add spacing before headings
}
