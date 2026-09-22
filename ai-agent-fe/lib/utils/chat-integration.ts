// Chat-Integration Utilities für Dashboard-Interaktionen
import { useRouter } from 'next/navigation';
import { ChurnCustomer } from '@/lib/data/churn-data';

export interface ChatContext {
  type: 'customer' | 'metric' | 'segment' | 'general';
  title: string;
  description: string;
  data?: unknown;
  suggestedPrompts: string[];
}

export function createCustomerChatContext(customer: ChurnCustomer): ChatContext {
  const riskLevel = customer.risk_category === 'KRITISCH' ? 'kritischen' : 
                   customer.risk_category === 'HOCH' ? 'hohen' : 'erhöhten';
  
  return {
    type: 'customer',
    title: `Churn-Analyse: ${customer.name}`,
    description: `Kunde mit ${riskLevel} Abwanderungsrisiko (${(customer.churn_probability * 100).toFixed(1)}%)`,
    data: customer,
    suggestedPrompts: [
      `Analysiere die Churn-Risikofaktoren für ${customer.name}`,
      `Welche Retention-Strategien empfiehlst du für diesen Kunden?`,
      `Berechne den potenziellen Umsatzverlust wenn dieser Kunde kündigt`,
      `Erstelle einen Aktionsplan zur Kundenrückgewinnung`,
      `Vergleiche diesen Kunden mit ähnlichen Profilen`
    ]
  };
}

export function createMetricChatContext(
  metricName: string, 
  value: number | string, 
  context?: string
): ChatContext {
  const metricContexts: Record<string, {
    title: string;
    description: string;
    prompts: string[];
  }> = {
    'churn_rate': {
      title: 'Churn Rate Analyse',
      description: `Aktuelle Churn-Rate: ${value}%`,
      prompts: [
        'Analysiere die Entwicklung der Churn-Rate über die letzten Monate',
        'Welche Faktoren beeinflussen unsere Churn-Rate am meisten?',
        'Erstelle einen Plan zur Churn-Rate Reduzierung',
        'Vergleiche unsere Churn-Rate mit Branchenbenchmarks'
      ]
    },
    'clv': {
      title: 'Customer Lifetime Value',
      description: `Durchschnittlicher CLV: €${value}`,
      prompts: [
        'Wie können wir den durchschnittlichen CLV erhöhen?',
        'Analysiere CLV-Trends nach Kundensegmenten',
        'Welche Kunden haben das höchste CLV-Potenzial?',
        'Erstelle eine CLV-Optimierungsstrategie'
      ]
    },
    'high_risk_customers': {
      title: 'Hochrisikokunden Analyse',
      description: `${value} Kunden mit hohem Churn-Risiko`,
      prompts: [
        'Priorisiere die Hochrisikokunden nach Umsatzpotenzial',
        'Erstelle personalisierte Retention-Kampagnen',
        'Analysiere gemeinsame Merkmale der Hochrisikokunden',
        'Entwickle ein Frühwarnsystem für Churn-Risiko'
      ]
    }
  };

  const config = metricContexts[metricName] || {
    title: 'Metrik Analyse',
    description: `${metricName}: ${value}`,
    prompts: [`Analysiere die Metrik ${metricName} und gib Handlungsempfehlungen`]
  };

  return {
    type: 'metric',
    title: config.title,
    description: config.description,
    data: { metric: metricName, value, context },
    suggestedPrompts: config.prompts
  };
}

export function createSegmentChatContext(
  segmentName: string, 
  segmentData: unknown
): ChatContext {
  return {
    type: 'segment',
    title: `Segment Analyse: ${segmentName}`,
    description: `Kundensegment-Performance und Churn-Risiko`,
    data: segmentData,
    suggestedPrompts: [
      `Analysiere das Churn-Risiko im ${segmentName} Segment`,
      `Welche Retention-Strategien sind für ${segmentName} Kunden am effektivsten?`,
      `Vergleiche die Performance mit anderen Segmenten`,
      `Erstelle einen Aktionsplan für das ${segmentName} Segment`
    ]
  };
}

// Hook für Chat-Navigation mit Kontext
export function useChatIntegration() {
  const router = useRouter();

  const openChatWithContext = async (chatContext: ChatContext) => {
    // Erstelle eine neue Chat-Session mit Kontext
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: chatContext.title,
          initialContext: chatContext
        })
      });

      if (response.ok) {
        const session = await response.json();
        
        // Navigiere zum Chat mit der neuen Session
        const queryParams = new URLSearchParams({
          sessionId: session.sessionId,
          context: 'dashboard',
          contextType: chatContext.type
        });
        
        router.push(`/chat?${queryParams.toString()}`);
      } else {
        console.error('Failed to create chat session');
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
      // Fallback: Navigiere direkt zum Chat
      router.push('/chat');
    }
  };

  const openChatWithPrompt = (prompt: string, context?: ChatContext) => {
    const queryParams = new URLSearchParams({
      prompt: prompt,
      source: 'dashboard'
    });
    
    if (context) {
      queryParams.set('contextType', context.type);
      queryParams.set('contextData', JSON.stringify(context.data));
    }
    
    router.push(`/chat?${queryParams.toString()}`);
  };

  return {
    openChatWithContext,
    openChatWithPrompt
  };
}

// Chat Button Component für Dashboard-Elemente
export interface ChatButtonProps {
  context: ChatContext;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

// Utility für URL-Parameter Handling
export function parseChatContextFromUrl(searchParams: URLSearchParams) {
  const contextType = searchParams.get('contextType');
  const contextData = searchParams.get('contextData');
  const prompt = searchParams.get('prompt');
  const source = searchParams.get('source');

  if (source === 'dashboard' && contextType && contextData) {
    try {
      return {
        type: contextType,
        data: JSON.parse(contextData),
        prompt
      };
    } catch (error) {
      console.error('Error parsing chat context:', error);
    }
  }

  return null;
}