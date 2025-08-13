'use client';

import { useEffect, useRef, useState } from 'react';

interface LexicalEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSourceView: boolean;
  onToggleSourceView: () => void;
}

export default function LexicalEditor({ value, onChange, isSourceView, onToggleSourceView }: LexicalEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Format text function for WYSIWYG editor
  const formatText = (command: string) => {
    document.execCommand(command, false, undefined);
    handleContentChange();
  };

  // Insert heading function
  const insertHeading = (level: string) => {
    if (level) {
      document.execCommand('formatBlock', false, `h${level}`);
      handleContentChange();
    }
  };

  // Handle content change in WYSIWYG mode
  const handleContentChange = () => {
    if (editorRef.current && !isSourceView) {
      const newContent = editorRef.current.innerHTML;
      if (newContent !== value) {
        onChange(newContent);
      }
    }
  };

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isSourceView) {
      if (!isEditorReady || editorRef.current.innerHTML !== value) {
        // Set the HTML content directly
        editorRef.current.innerHTML = value || '<p>Brief içeriği burada görünecek ve düzenleyebilirsiniz...</p>';
        setIsEditorReady(true);
      }
    }
  }, [value, isSourceView, isEditorReady]);

  if (isSourceView) {
    return (
      <div className="flex flex-col h-full">
        {/* HTML Source View Toolbar */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">HTML Source</h3>
          <button
            onClick={onToggleSourceView}
            className="px-3 py-1 text-xs font-medium rounded transition-colors bg-blue-600 text-white"
          >
            WYSIWYG
          </button>
        </div>
        
        {/* HTML Source Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 w-full p-4 font-mono text-sm border-0 resize-none focus:outline-none"
          placeholder="HTML source code will appear here..."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* WYSIWYG Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => formatText('bold')}
            className="px-2 py-1 text-xs font-bold border rounded hover:bg-gray-200"
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => formatText('italic')}
            className="px-2 py-1 text-xs italic border rounded hover:bg-gray-200"
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => formatText('underline')}
            className="px-2 py-1 text-xs underline border rounded hover:bg-gray-200"
            title="Underline"
          >
            U
          </button>
          <div className="w-px h-6 bg-gray-300"></div>
          <select
            onChange={(e) => insertHeading(e.target.value)}
            className="text-xs border rounded px-2 py-1"
            defaultValue=""
          >
            <option value="" disabled>Heading</option>
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
          </select>
          <button
            onClick={() => formatText('insertUnorderedList')}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-200"
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => formatText('insertOrderedList')}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-200"
            title="Numbered List"
          >
            1.
          </button>
        </div>
        <button
          onClick={onToggleSourceView}
          className="px-3 py-1 text-xs font-medium rounded transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          HTML
        </button>
      </div>
      
      {/* WYSIWYG Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="flex-1 w-full p-4 focus:outline-none overflow-auto"
        style={{ 
          minHeight: '500px',
          lineHeight: '1.6',
          border: 'none',
          background: 'white',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
        suppressContentEditableWarning={true}
      />
      
      {/* CSS Styles for proper HTML rendering */}
      <style jsx>{`
        div[contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
          color: #1a202c;
        }
        div[contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.83em 0;
          color: #2d3748;
        }
        div[contenteditable] h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0;
          color: #4a5568;
        }
        div[contenteditable] h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1.33em 0;
          color: #4a5568;
        }
        div[contenteditable] p {
          margin: 1em 0;
          line-height: 1.6;
        }
        div[contenteditable] strong {
          font-weight: bold;
        }
        div[contenteditable] em {
          font-style: italic;
        }
        div[contenteditable] ul {
          list-style-type: disc;
          margin: 1em 0;
          padding-left: 2em;
        }
        div[contenteditable] ol {
          list-style-type: decimal;
          margin: 1em 0;
          padding-left: 2em;
        }
        div[contenteditable] li {
          margin: 0.5em 0;
          line-height: 1.4;
        }
        div[contenteditable] blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #4a5568;
        }
        div[contenteditable] code {
          background-color: #f7fafc;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }
        div[contenteditable] pre {
          background-color: #f7fafc;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        div[contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        div[contenteditable] th, div[contenteditable] td {
          border: 1px solid #e2e8f0;
          padding: 0.5em;
          text-align: left;
        }
        div[contenteditable] th {
          background-color: #f7fafc;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
