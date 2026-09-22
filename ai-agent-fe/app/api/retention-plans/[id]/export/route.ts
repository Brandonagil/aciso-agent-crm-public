import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/admin';
import { jsPDF } from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'pdf';
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    // Get plan from Firestore
    const adminApp = getAdminApp();
    const db = adminApp.firestore();
    
    const planDoc = await db.collection('retention_plans').doc(id).get();
    
    if (!planDoc.exists) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const plan = planDoc.data();

    if (format === 'pdf') {
      // Try to generate PDF using backend ADK agent first
      try {
        const backendResponse = await fetch('http://localhost:8001/api/export-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan_data: plan?.plan_data || {},
            plan_id: id
          })
        });

        if (backendResponse.ok) {
          const pdfBuffer = await backendResponse.arrayBuffer();
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="retention-plan-${id}.pdf"`
            }
          });
        } else {
          console.warn('Backend PDF generation failed, falling back to frontend generation');
        }
      } catch (error) {
        console.warn('Backend PDF generation error, falling back to frontend:', error);
      }

      // Fallback to frontend PDF generation
      const pdfContent = generatePdfContent(plan);
      
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="retention-plan-${id}.pdf"`
        }
      });
      
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error exporting retention plan:', error);
    return NextResponse.json(
      { error: 'Failed to export retention plan' },
      { status: 500 }
    );
  }
}

interface ExportPlan {
  created_at?: Date | string | number | { toDate(): Date };
  plan_data?: { strategies?: string; customer_id?: string };
}

function generatePdfContent(plan: ExportPlan | undefined): Buffer {
  const planData = plan?.plan_data || {};
  
  // Create new PDF document
  const doc = new jsPDF();
  let yPos = 20;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.height;
  
  // Helper function to add text with line breaks and markdown processing
  const addText = (text: string, fontSize = 12, isBold = false) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, 180);
    lines.forEach((line: string) => {
      doc.text(line, 15, yPos);
      yPos += lineHeight;
    });
    yPos += 2; // Extra spacing
  };

  // Process markdown-like content to clean PDF text
  const processMarkdownText = (text: string): string => {
    if (!text) return '';
    
    return text
      // Remove markdown bold/italic markers
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  };

  // Extract customer info from strategies content
  const extractCustomerInfo = (strategies: string): { customerId: string; customerName: string } => {
    const customerIdMatch = strategies.match(/(?:Mitglied|Kunde|Customer ID|ID).*?(\d+)/i);
    const customerId = customerIdMatch ? customerIdMatch[1] : (planData.customer_id || 'Unbekannt');
    
    // Try to extract customer name if present
    const nameMatch = strategies.match(/Name.*?:\s*([^\n]+)/i);
    const customerName = nameMatch ? nameMatch[1].trim() : `Kunde ${customerId}`;
    
    return { customerId, customerName };
  };

  // Title and Header
  addText('RETENTION-PLAN', 20, true);
  yPos += 5;
  
  // Extract customer info if available
  const strategies = planData?.strategies || '';
  const { customerId, customerName } = extractCustomerInfo(strategies);
  
  addText(`Kunde: ${customerName} (ID: ${customerId})`, 14, true);
  
  // Format creation date
  let createdDate = 'N/A';
  if (plan?.created_at) {
    try {
      const date = typeof plan.created_at === 'object' && 'toDate' in plan.created_at ? plan.created_at.toDate() : new Date(plan.created_at);
      createdDate = date.toLocaleDateString('de-DE');
    } catch {
      createdDate = new Date().toLocaleDateString('de-DE');
    }
  } else {
    createdDate = new Date().toLocaleDateString('de-DE');
  }
  addText(`Erstellt am: ${createdDate}`, 12);
  yPos += 10;

  // Main Content: Complete formatted strategies
  if (strategies) {
    const cleanedStrategies = processMarkdownText(strategies);
    
    // Split content into sections and process each
    const sections = cleanedStrategies.split(/(?=##\s|\*\*[A-ZÄÖÜ][A-ZÄÖÜ\s]+:\*\*|[A-ZÄÖÜ][A-ZÄÖÜ\s]+:(?!\d))/);
    
    sections.forEach((section) => {
      if (!section.trim()) return;
      
      const lines = section.split('\n');
      
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          yPos += 3; // Add spacing for empty lines
          return;
        }
        
        // Detect headers (all caps with colon, or markdown headers)
        if (trimmedLine.match(/^[A-ZÄÖÜ][A-ZÄÖÜ\s]*:/) || trimmedLine.startsWith('##')) {
          yPos += 3; // Extra spacing before headers
          const headerText = trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '');
          addText(headerText, 14, true);
        }
        // Detect bullet points or numbered lists
        else if (trimmedLine.match(/^[\d•\-\*]\s/) || trimmedLine.match(/^\d+\./)) {
          addText(trimmedLine, 11);
        }
        // Regular content
        else {
          addText(trimmedLine, 11);
        }
      });
    });
  } else {
    addText('Keine Retention-Strategien verfügbar.', 12);
  }

  yPos += 10;

  // Footer with generation info
  addText('────────────────────────────────────────', 10);
  addText(`Generiert am: ${new Date().toLocaleString('de-DE')}`, 10);
  addText('Aciso AI Agent - Intelligente Churn-Prävention', 10);

  // Return PDF as buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
