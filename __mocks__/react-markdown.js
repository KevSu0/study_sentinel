import React from 'react';

const ReactMarkdown = ({ children }) => {
  // A more realistic mock that processes markdown-like syntax
  const renderContent = (content) => {
    if (typeof content !== 'string') {
      return content;
    }
    
    // Basic bold and italic support
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;

    let processedContent = content.replace(boldRegex, '<strong>$1</strong>');
    processedContent = processedContent.replace(italicRegex, '<em>$1</em>');
    
    // This is a simplified mock, so we'll just dangerously set inner HTML.
    // In a real app, you'd use a safer method.
    return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
  };

  return <>{renderContent(children)}</>;
};

export default ReactMarkdown;