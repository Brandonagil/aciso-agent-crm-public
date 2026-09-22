'use client';

import { Markdown } from '@/components/ui/markdown';

export default function TestMarkdownPage() {
  const testContent = `
# Test Heading 1

## Test Heading 2: With Colon

### Test Heading 3

**Bold text test**

*Italic text test*

Normal paragraph text.

- Bullet point 1
- Bullet point 2
- Bullet point 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3

\`Inline code\`

\`\`\`
Code block
multiple lines
\`\`\`

> Blockquote test

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

🎯 **Churn-Analyse für Mitglied 12345**

👤 **Kundendaten:**
• Alter: 35 Jahre
• Geschlecht: Männlich
• Monatlicher Beitrag: €29.99

📊 **Risiko-Bewertung:**
• Churn-Score: 75.3%
• Risiko-Kategorie: HOCH

⚠️ HOHES RISIKO - Retention-Maßnahmen empfohlen
`;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Markdown Rendering Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Raw Markdown Source:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {testContent}
          </pre>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Rendered Output:</h2>
          <div className="border p-4 rounded bg-white">
            <Markdown content={testContent} />
          </div>
        </div>
      </div>
    </div>
  );
}