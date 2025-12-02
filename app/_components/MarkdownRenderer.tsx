import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Paragraphs: Add margin for readability, but remove it from the last one
        p: ({ children }) => <p style={{ margin: '0 0 8px 0', lastChild: { marginBottom: 0 } } as any}>{children}</p>,
        
        // Lists: Ensure proper indentation
        ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '4px 0' }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
        
        // Code blocks and inline code
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          
          return isInline ? (
            <code 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                padding: '2px 4px', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              }} 
              {...props}
            >
              {children}
            </code>
          ) : (
            <div style={{ margin: '8px 0' }}>
              <code 
                style={{ 
                  display: 'block',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }} 
                {...props}
              >
                {children}
              </code>
            </div>
          );
        },
        
        // Links: Make them visible and clickable
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#8ab4f8', textDecoration: 'underline' }}
          >
            {children}
          </a>
        ),

        // Bold text
        strong: ({ children }) => <strong style={{ fontWeight: 'bold', color: '#e8eaed' }}>{children}</strong>,
        
        // Tables
        table: ({ children }) => (
          <div style={{ overflowX: 'auto', margin: '8px 0' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9em' }}>{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th style={{ border: '1px solid #5f6368', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.1)' }}>{children}</th>
        ),
        td: ({ children }) => (
          <td style={{ border: '1px solid #5f6368', padding: '6px 10px' }}>{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
