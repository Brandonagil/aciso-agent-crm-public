import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';

// Get the environment-specific configuration
const dataScAgentURL = process.env.DATA_SCIENCE_AGENT_URL || 'http://localhost:8001';
const bypassAuth = process.env.NO_ADK_AUTH === "true" || process.env.NO_ADK_AUTH === "yes" || process.env.NO_ADK_AUTH === "1";
const debugMode = process.env.DEBUG_ADK_INTEGRATION === 'true';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: string;
}

interface ChatRequest {
  message: string;
  context?: string;
  sessionId?: string;
  history?: ChatMessage[];
}

/**
 * Get authentication headers for ADK requests
 */
async function getAuthHeaders(userToken?: string): Promise<HeadersInit> {
  if (bypassAuth) {
    return {};
  }

  try {
    // If we have a user token, verify it and get user info
    if (userToken) {
      const adminApp = getAdminApp();
      const auth = getAuth(adminApp);
      const decodedToken = await auth.verifyIdToken(userToken.replace('Bearer ', ''));
      
      if (debugMode) {
        console.log('Verified user:', decodedToken.uid);
      }
    }

    // Get service account token for ADK authentication
    const adminApp = getAdminApp();
    if (adminApp && adminApp.options.credential) {
      const token = await adminApp.options.credential.getAccessToken();
      return {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      };
    }
  } catch (error) {
    console.error('Error getting auth headers:', error);
  }

  return {
    'Content-Type': 'application/json'
  };
}

/**
 * Create CRM context prompt for the ADK agent
 */
function createCRMContextPrompt(message: string, context?: string, history?: ChatMessage[]): string {
  const systemContext = `Du bist ein CRM Intelligence Assistent für Customer Churn Prediction und Kundenbindungsverbesserung. 

KONTEXT:
- Wir haben BigQuery ML Modelle für Churn-Prediction
- Aktuelle Churn-Rate: 8.2%
- 342 Hochrisikokunden identifiziert
- €1.24M Umsatz gefährdet
- Verfügbare Tools: BQML Churn-Analyse, Customer Segmentierung, Retention-Strategien

VERFÜGBARE DATEN:
- Kundenprofil-Daten (Demographics, Vertragsdetails)
- Nutzungsverhalten und Engagement-Metriken
- Churn-Wahrscheinlichkeiten pro Kunde
- Umsatz- und CLV-Daten
- Risikofaktoren und Trigger-Events

AUFGABE: Beantworte Fragen zu Customer Analytics, erstelle datenbasierte Empfehlungen und nutze die verfügbaren BigQuery Tools für konkrete Analysen.`;

  let conversationHistory = '';
  if (history && history.length > 1) {
    conversationHistory = '\n\nVORHERIGE UNTERHALTUNG:\n' + 
      history.slice(-6).map(msg => `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.content}`).join('\n');
  }

  const contextInfo = context ? `\nSPEZIFISCHER KONTEXT: ${context}` : '';

  return `${systemContext}${contextInfo}${conversationHistory}

USER: ${message}

ASSISTANT:`;
}

export async function POST(request: NextRequest) {
  let message = '';
  let context = '';
  let sessionId = '';
  let history: ChatMessage[] = [];
  
  try {
    const authHeader = request.headers.get('Authorization');
    const body: ChatRequest = await request.json();
    message = body.message || '';
    context = body.context || '';
    sessionId = body.sessionId || '';
    history = body.history || [];

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get authentication headers
    const authHeaders = await getAuthHeaders(authHeader ?? undefined);

    // Create the session ID if not provided
    const chatSessionId = sessionId || `chat_${Date.now()}`;
    const userId = 'dashboard_user'; // For dashboard chat, use fixed user
    const appName = 'aciso_agent'; // Use correct ADK agent name

    // First, ensure the session exists
    if (debugMode) {
      console.log('Session URL:', `${dataScAgentURL}/apps/${appName}/users/${userId}/sessions/${chatSessionId}`);
    }
    
    const sessionResponse = await fetch(
      `${dataScAgentURL}/apps/${appName}/users/${userId}/sessions/${chatSessionId}`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (debugMode) {
      console.log('Session creation response:', sessionResponse.status, sessionResponse.statusText);
    }

    // Handle session creation failure explicitly
    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('Failed to create ADK session:', sessionResponse.status, errorText);
      // This will be caught by the main try/catch block and return a detailed error
      throw new Error(`ADK session creation failed with status ${sessionResponse.status}: ${errorText}`);
    }

    // Prepare the ADK request payload for /run endpoint
    const prompt = createCRMContextPrompt(message, context, history);
    
    const adkPayload = {
      appName: appName,
      userId: userId,
      sessionId: chatSessionId,
      newMessage: {
        parts: [
          {
            text: prompt
          }
        ],
        role: 'user'
      },
      streaming: false
    };

    if (debugMode) {
      console.log('ADK Request URL:', `${dataScAgentURL}/run`);
      console.log('ADK Payload:', JSON.stringify(adkPayload, null, 2));
    }

    // Make request to ADK /run endpoint
    const adkResponse = await fetch(
      `${dataScAgentURL}/run`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(adkPayload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      }
    );

    if (!adkResponse.ok) {
      console.error('ADK Response Error:', adkResponse.status, adkResponse.statusText);
      const errorText = await adkResponse.text();
      console.error('ADK Error Details:', errorText);
      
      // Fallback to simulated response
      return NextResponse.json({
        content: getFallbackResponse(),
        sessionId: chatSessionId,
        source: 'fallback'
      });
    }

    const adkResult = await adkResponse.json();
    
    if (debugMode) {
      console.log('ADK Response:', JSON.stringify(adkResult, null, 2));
    }

    // Extract the response content from ADK events
    let responseContent = 'Entschuldigung, ich konnte keine Antwort generieren.';
    
    // ADK returns an array of events
    if (Array.isArray(adkResult) && adkResult.length > 0) {
      // Look for events with content and text parts
      const textResponses = [];
      
      for (const event of adkResult) {
        if (event.content && event.content.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              textResponses.push(part.text);
            }
          }
        }
      }
      
      if (textResponses.length > 0) {
        responseContent = textResponses.join('\n\n');
      }
    }

    return NextResponse.json({
      content: responseContent,
      sessionId: chatSessionId,
      source: responseContent.includes('Entschuldigung') ? 'fallback' : 'adk',
      toolCalls: adkResult.tool_calls || [],
      metadata: adkResult.metadata || {},
      debug: debugMode ? {
        eventsCount: Array.isArray(adkResult) ? adkResult.length : 0,
        extractedLength: responseContent.length
      } : undefined
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Use already parsed message and context
    
    return NextResponse.json({
      content: getFallbackResponse(),
      sessionId: `fallback_${Date.now()}`,
      source: 'fallback_error',
      error: debugMode ? errorMessage : 'ADK service unavailable',
      errorStack: debugMode ? errorStack : undefined
    });
  }
}

/**
 * Fallback response when ADK is not available
 */
function getFallbackResponse(): string {
  // Return minimal fallback - all content should come from ADK with real data
  return `Die Anfrage wird verarbeitet. Für eine vollständige Analyse mit aktuellen BigQuery-Daten wird die ADK-Verbindung benötigt.

Bitte versuchen Sie es erneut oder stellen Sie eine spezifische Frage zu Ihren Kundendaten.`;
}
