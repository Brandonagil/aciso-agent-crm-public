'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Konstanten für bessere Wartbarkeit
const RETENTION_PLAN_KEYWORDS = [
  'KUNDENPROFIL UND RISIKOANALYSE',
  'MASSGESCHNEIDERTE MASSNAHMEN',
  'SOFORTMASSNAHMEN',
  'STABILISIERUNGSMASSNAHMEN',
  'LANGFRISTIGE BINDUNG',
  'KUNDENSPEZIFISCHE ERFOLGS-KPIS',
  'KOSTEN-NUTZEN-ANALYSE'
].map(k => k.toLowerCase());

const SOURCE_HEADINGS = [
  'VERWENDETE STRATEGIEN UND QUELLEN',
  'WISSENSCHAFTLICHE BASIS', 
  'DATENGRUNDLAGE'
].map(k => k.toLowerCase());

const SOURCE_AUTHORS = [
  'Kinesiologia', 'Kriegel', 'Homburg', 'Nerdinger', 'Diller', 'Meyer',
  'Verhaltenspsychologie', 'Kundenbindungsmanagement', 'BigQuery', 
  'Kundendatensatz', 'Analysezeitpunkt'
];

// Dynamische Regex für Quellenangaben
const sourceAuthorRegex = new RegExp(`^(${SOURCE_AUTHORS.join('|')})`, 'i');

// Robuste Textextraktion aus React-Markdown-Nodes
const extractTextFromChildren = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
};

interface CustomerRow {
  mitglied_id: number | string;
  alter_jahre: number;
  geschlecht: string;
  aktueller_beitrag_eur: number;
  churn_score_bias_corrected: number;
  risiko_kategorie: string;
  tage_seit_letztem_checkin: number;
}

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  // Check if content contains JSON array or object
  const trimmedContent = content.trim();
  const containsJsonArray = /\[\s*\{[\s\S]*?\}\s*\]/.test(trimmedContent);
  const isDirectJsonArray = /^\[\s*\{/.test(trimmedContent);
  const isDirectJsonObject = /^\{/.test(trimmedContent);
  
  // Try to extract and parse JSON from content
  if (containsJsonArray || isDirectJsonArray || isDirectJsonObject) {
    try {
      let jsonString = trimmedContent;
      
      // If it's not a direct JSON, try to extract it
      if (!isDirectJsonArray && !isDirectJsonObject && containsJsonArray) {
        const jsonMatch = trimmedContent.match(/(\[[\s\S]*\])/);
        if (jsonMatch) {
          jsonString = jsonMatch[1];
        }
      }
      
      console.log('🔍 JSON detection:', {
        containsJsonArray,
        isDirectJsonArray,
        isDirectJsonObject,
        contentPreview: trimmedContent.substring(0, 100),
        jsonStringPreview: jsonString.substring(0, 100)
      });
      
      const parsed = JSON.parse(jsonString);
      
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].mitglied_id) {
        // Render as customer data table
        return (
          <div className={cn("max-w-none", className)}>
            <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Alter</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Geschlecht</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Beitrag</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Churn-Score</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Risiko</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Letzte Aktivität</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900/50 dark:divide-gray-700">
                  {parsed.map((item: CustomerRow, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.mitglied_id}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {item.alter_jahre}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {item.geschlecht}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        €{item.aktueller_beitrag_eur}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.churn_score_bias_corrected >= 80 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : item.churn_score_bias_corrected >= 60
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                            : item.churn_score_bias_corrected >= 40
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {item.churn_score_bias_corrected}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.risiko_kategorie === 'KRITISCH'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : item.risiko_kategorie === 'HOCH'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                            : item.risiko_kategorie === 'MITTEL'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {item.risiko_kategorie}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {item.tage_seit_letztem_checkin} Tage
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    } catch {
      // Fall back to normal processing if JSON parsing fails
    }
  }

  // Robuste Retention-Plan-Erkennung (case-insensitive)
  const isRetentionPlan = RETENTION_PLAN_KEYWORDS.some(keyword => 
    content.toLowerCase().includes(keyword)
  );

  // Pre-process content to ensure proper markdown formatting
  let processedContent = content;

  if (isRetentionPlan) {
    // Enhanced retention plan formatting
    processedContent = content
      // Add proper spacing around major sections
      .replace(/(KUNDENPROFIL UND RISIKOANALYSE|MASSGESCHNEIDERTE MASSNAHMEN|SOFORTMASSNAHMEN|STABILISIERUNGSMASSNAHMEN|LANGFRISTIGE BINDUNG|KUNDENSPEZIFISCHE ERFOLGS-KPIS|KOSTEN-NUTZEN-ANALYSE)/g, '\n\n## $1\n')
      // Add spacing around subsections
      .replace(/(### [A-ZÄÖÜ][^:]*:)/g, '\n$1\n')
      // Format bold key-value pairs better
      .replace(/\*\*([^:]+):\*\* ([^\n]+)/g, '\n**$1:** $2')
      // Add spacing around numbered sections
      .replace(/(\d+\.\s+[A-ZÄÖÜ][^:]*:)/g, '\n### $1\n')
      // Ensure proper list formatting
      .replace(/^[\s]*-\s+/gm, '\n- ')
      .replace(/^[\s]*\*\s+/gm, '\n* ')
      // Add spacing around bullet points that start with capital letters
      .replace(/(\n[\s]*[•-]\s*[A-ZÄÖÜ][^:]*:)/g, '\n$1')
      // Format sources section at the end with smaller text
      .replace(/(VERWENDETE STRATEGIEN UND QUELLEN:|WISSENSCHAFTLICHE BASIS:|DATENGRUNDLAGE:)/g, '\n\n### $1\n')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    // Standard formatting for non-retention plans
    processedContent = content
      .replace(/^### /gm, '\n### ') // Ensure h3 has line break before
      .replace(/^## /gm, '\n## ')   // Ensure h2 has line break before
      .replace(/^# /gm, '\n# ')     // Ensure h1 has line break before
      .replace(/^\* /gm, '\n* ')    // Ensure bullet points have line break before
      .replace(/^\d+\. /gm, '\n$&') // Ensure numbered lists have line break before
      .trim();
  }

  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style headers with special colon formatting
          h1: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            return (
              <h1 className="text-2xl mb-4 mt-6 first:mt-0 text-gray-900 dark:text-gray-100 border-b pb-2 border-gray-200 dark:border-gray-700">
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h1>
            );
          },
          h2: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            // Robuste Erkennung von Retention-Plan-Hauptsektionen
            const headerText = extractTextFromChildren(children).toLowerCase();
            const isRetentionSection = RETENTION_PLAN_KEYWORDS.some(keyword => 
              headerText.includes(keyword)
            );

            return (
              <h2 className={cn(
                "text-xl mb-4 mt-6 first:mt-0 text-gray-800 dark:text-gray-200",
                isRetentionSection && "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-lg border-l-4 border-blue-500 dark:border-blue-400 font-semibold text-blue-900 dark:text-blue-100"
              )}>
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h2>
            );
          },
          h3: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            // Robuste Erkennung von Quellen-Sektionen
            const headerText = extractTextFromChildren(children).toLowerCase();
            const isSourcesSection = SOURCE_HEADINGS.some(heading => 
              headerText.includes(heading)
            );

            return (
              <h3 className={cn(
                "mb-2 mt-4 first:mt-0 text-gray-700 dark:text-gray-300",
                isSourcesSection ? "text-xs font-medium text-gray-500 dark:text-gray-400" : "text-lg"
              )}>
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h3>
            );
          },
          h4: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            return (
              <h4 className="text-base mb-2 mt-3 first:mt-0 text-gray-700 dark:text-gray-300">
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h4>
            );
          },
          h5: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            return (
              <h5 className="text-sm mb-2 mt-3 first:mt-0 text-gray-700 dark:text-gray-300 font-semibold">
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h5>
            );
          },
          h6: ({ children }) => {
            const processHeaderText = (content: React.ReactNode) => {
              if (typeof content === 'string' && content.includes(':')) {
                const [beforeColon, ...afterColon] = content.split(':');
                return (
                  <>
                    <span className="font-bold">{beforeColon}</span>
                    <span className="font-normal">:{afterColon.join(':')}</span>
                  </>
                );
              }
              return content;
            };

            return (
              <h6 className="text-xs mb-2 mt-2 first:mt-0 text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide">
                {Array.isArray(children) 
                  ? children.map((child, index) => (
                      <span key={index}>{processHeaderText(child)}</span>
                    ))
                  : processHeaderText(children)
                }
              </h6>
            );
          },
          // Style paragraphs
          p: ({ children }) => {
            // Robuste Erkennung von Quellenangaben-Absätzen
            const paragraphText = extractTextFromChildren(children);
            const isSourcesParagraph = sourceAuthorRegex.test(paragraphText);

            return (
              <p className={cn(
                "mb-3 last:mb-0 leading-relaxed",
                isSourcesParagraph 
                  ? "text-xs text-gray-500 dark:text-gray-400" 
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {children}
              </p>
            );
          },
          // Style lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside mb-3 ml-6 space-y-1.5 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside mb-3 ml-6 space-y-1.5 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed pl-1">{children}</li>
          ),
          // Style strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
          ),
          // Style emphasis/italic text
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">{children}</em>
          ),
          // Style links
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-700 hover:decoration-blue-500 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Style code
          code: ({ children, ...props }) => {
            // @ts-expect-error - inline prop exists but not in types
            const isInline = props.inline;
            
            return isInline ? (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs font-mono overflow-x-auto mb-3 border border-gray-200 dark:border-gray-700">
                <code className="text-gray-800 dark:text-gray-200">{children}</code>
              </pre>
            );
          },
          // Style code blocks with language
          pre: ({ children }) => (
            <>{children}</>
          ),
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-3 italic bg-blue-50 dark:bg-blue-950/30 rounded-r-lg">
              <div className="text-gray-700 dark:text-gray-300">{children}</div>
            </blockquote>
          ),
          // Style tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900/50 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider bg-gray-100 dark:bg-gray-800">
              {children}
            </th>
          ),
          td: ({ children }) => {
            // Check if this cell contains a churn score percentage
            const cellText = extractTextFromChildren(children);
            const isChurnScore = /^\d{1,3}%$/.test(cellText.trim());
            const churnValue = isChurnScore ? parseInt(cellText.replace('%', '')) : null;
            
            // Check if this cell contains a risk category
            const isRiskCategory = /^(NIEDRIG|MITTEL|HOCH|KRITISCH)$/i.test(cellText.trim());
            const riskCategory = isRiskCategory ? cellText.trim().toUpperCase() : null;
            
            if (isChurnScore && churnValue !== null) {
              return (
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    churnValue >= 80 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : churnValue >= 60
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                      : churnValue >= 40
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {children}
                  </span>
                </td>
              );
            }
            
            if (isRiskCategory && riskCategory) {
              return (
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    riskCategory === 'KRITISCH'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : riskCategory === 'HOCH'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                      : riskCategory === 'MITTEL'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  }`}>
                    {children}
                  </span>
                </td>
              );
            }
            
            return (
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {children}
              </td>
            );
          },
          // Style horizontal rules
          hr: () => (
            <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}