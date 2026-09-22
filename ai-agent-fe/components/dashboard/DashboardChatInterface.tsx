'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUp, MessageSquare, Brain, Sparkles, User, Bot, Maximize2, Minimize2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Markdown } from '@/components/ui/markdown';
import { MinimalRetentionPlanRenderer } from '@/components/retention/MinimalRetentionPlanRenderer';
import { EnhancedRetentionPlanRenderer, type StructuredRetentionPlan } from '@/components/retention/EnhancedRetentionPlanRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { PlanSkeleton } from '@/components/ui/plan-skeleton';

interface DashboardPlanData {
  plan_id: string;
  plan_type?: string;
  target?: {
    type?: string;
    id: string;
    name?: string;
    description?: string;
    info?: Record<string, unknown>;
  };
  recommendations?: StructuredRetentionPlan | unknown[] | string;
  financial_projections?: Record<string, unknown>;
  success_metrics?: Record<string, unknown>;
  timeline?: unknown[];
  parameters?: {
    budget?: number;
    duration_weeks?: number;
    churn_risk?: number;
    roi_estimate?: number;
  };
  template?: unknown;
  rag_sources?: unknown[];
  success?: boolean;
  customer_id?: string | number;
  strategies?: string;
  created_at?: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: string;
  displayType?: 'text' | 'retention_plan' | 'customer_data';
  isStreaming?: boolean;
  planData?: DashboardPlanData;
  customerData?: {
    mitglied_id: number;
    alter_jahre: number;
    geschlecht: string;
    vertragsbeginn: string;
    laufzeit: string;
    zahlweise: string;
    aktueller_beitrag_eur: number;
    zahlungsart: string;
    vertragsperiode: number;
    vertragsende_aktuell: string;
    anzahl_checkins: number;
    durchschn_aufenthalt_min: number;
    letzter_checkin: string;
    mitgliedschaft_dauer_monate: number;
    checkins_pro_monat: number;
    tage_seit_letztem_checkin: number;
    churn_score_bias_corrected: number;
    gekuendigt: number;
    kuendigungsdatum?: string;
    kuendigungsart?: string;
    kuendigungsgrund?: string;
    risiko_kategorie: string;
    engagement_score: number;
  };
  actionButtons?: Array<{
    label: string;
    action: 'save_plan' | 'export_pdf' | 'send_to_crm';
    planId?: string;
  }>;
  nextActions?: {
    next_actions: Array<{
      id: string;
      text: string;
      action_type: 'analysis' | 'action' | 'insight' | 'plan';
      priority: 'high' | 'medium' | 'low';
      description: string;
      clickable: boolean;
      timestamp: string;
    }>;
    title: string;
    context_info: string;
    type: string;
  };
}

interface DashboardChatInterfaceProps {
  className?: string;
  defaultContext?: string;
}

const suggestedPrompts = [
  {
    text: "Top 10 Hochrisikokunden anzeigen",
    context: "high_risk_customers",
    icon: Brain
  },
  {
    text: "Churn-Risiko für Kunde 12345 prüfen",
    context: "churn_prediction",
    icon: Sparkles
  },
  {
    text: "Retention-Plan für Kunde 67890 erstellen",
    context: "generate_retention_plan",
    icon: MessageSquare
  },
  {
    text: "Kunden mit Churn-Score > 70% finden",
    context: "high_churn_query",
    icon: Brain
  },
  {
    text: "Kunden mit <5 Checkins/Monat anzeigen",
    context: "activity_analysis",
    icon: Brain
  },
  {
    text: "Mitglieder ohne Checkin seit 30 Tagen",
    context: "inactive_members",
    icon: MessageSquare
  }
];

export function DashboardChatInterface({ className }: DashboardChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdkConnected, setIsAdkConnected] = useState<boolean | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Persistent session ID - stored in sessionStorage
  const [sessionId, setSessionId] = useState<string | null>(null);



  // Initialize session ID and restore messages on mount
  useEffect(() => {
    if (!user) return;

    // Try to get existing session ID from localStorage (persists across page reloads)
    const storageKey = `dashboard_session_${user.uid}`;
    const messagesKey = `dashboard_messages_${user.uid}`;
    const existingSessionId = localStorage.getItem(storageKey);
    const savedMessages = localStorage.getItem(messagesKey);

    if (existingSessionId) {
      setSessionId(existingSessionId);

      // Restore saved messages if they exist
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Only restore if messages are from today (prevent old messages)
          const today = new Date().toDateString();
          const validMessages = parsedMessages.filter((msg: Message) => {
            const msgDate = new Date(msg.timestamp).toDateString();
            return msgDate === today;
          });

          if (validMessages.length > 0) {
            setMessages(validMessages);
          } else {
            // Add welcome message if no valid messages
            setMessages([{
              id: '1',
              content: '**CRM Intelligence Assistant aktiviert**\n\nHallo! Ich bin mit Ihren BigQuery ML-Modellen und CRM-Daten verbunden. Ich kann Ihnen bei folgenden Analysen helfen:\n\n• **Churn-Prediction & Risiko-Bewertung**\n• **Customer Segmentierung & Retention-Strategien**\n• **ROI-Berechnungen für Kundenbindungsmaßnahmen**\n• **Echtzeit-BigQuery Abfragen**\n\nWas möchten Sie analysieren?',
              role: 'assistant',
              timestamp: new Date(),
            }]);
          }
        } catch (error) {
          console.error('Error parsing saved messages:', error);
          // Add welcome message on error
          setMessages([{
            id: '1',
            content: '**CRM Intelligence Assistant aktiviert**\n\nHallo! Ich bin mit Ihren BigQuery ML-Modellen und CRM-Daten verbunden. Ich kann Ihnen bei folgenden Analysen helfen:\n\n• **Churn-Prediction & Risiko-Bewertung**\n• **Customer Segmentierung & Retention-Strategien**\n• **ROI-Berechnungen für Kundenbindungsmaßnahmen**\n• **Echtzeit-BigQuery Abfragen**\n\nWas möchten Sie analysieren?',
            role: 'assistant',
            timestamp: new Date(),
          }]);
        }
      } else {
        // No saved messages, add welcome message
        setMessages([{
          id: '1',
          content: '**CRM Intelligence Assistant aktiviert**\n\nHallo! Ich bin mit Ihren BigQuery ML-Modellen und CRM-Daten verbunden. Ich kann Ihnen bei folgenden Analysen helfen:\n\n• **Churn-Prediction & Risiko-Bewertung**\n• **Customer Segmentierung & Retention-Strategien**\n• **ROI-Berechnungen für Kundenbindungsmaßnahmen**\n• **Echtzeit-BigQuery Abfragen**\n\nWas möchten Sie analysieren?',
          role: 'assistant',
          timestamp: new Date(),
        }]);
      }
    } else {
      // Generate new session ID and add welcome message
      const newSessionId = `dashboard_${user.uid}_${Date.now()}`;
      localStorage.setItem(storageKey, newSessionId);
      setSessionId(newSessionId);

      setMessages([{
        id: '1',
        content: '**CRM Intelligence Assistant aktiviert**\n\nHallo! Ich bin mit Ihren BigQuery ML-Modellen und CRM-Daten verbunden. Ich kann Ihnen bei folgenden Analysen helfen:\n\n• **Churn-Prediction & Risiko-Bewertung**\n• **Customer Segmentierung & Retention-Strategien**\n• **ROI-Berechnungen für Kundenbindungsmaßnahmen**\n• **Echtzeit-BigQuery Abfragen**\n\nWas möchten Sie analysieren?',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    }
  }, [user]);

  // Save messages to localStorage whenever messages change (persists across page reloads)
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const messagesKey = `dashboard_messages_${user.uid}`;
    try {
      localStorage.setItem(messagesKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }, [messages, user]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Auto-scroll when new messages are added
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [messages]);

  // Also scroll when loading state changes
  useEffect(() => {
    if (isLoading) {
      setTimeout(scrollToBottom, 50);
    }
  }, [isLoading]);

  const handleNewChat = () => {
    if (!user) return;
    
    // Generate new session ID
    const newSessionId = `dashboard_${user.uid}_${Date.now()}`;
    setSessionId(newSessionId);
    localStorage.setItem(`dashboard_session_${user.uid}`, newSessionId);
    
    // Clear messages and add welcome message
    setMessages([{
      id: '1',
      content: '**CRM Intelligence Assistant aktiviert**\n\nHallo! Ich bin mit Ihren BigQuery ML-Modellen und CRM-Daten verbunden. Ich kann Ihnen bei folgenden Analysen helfen:\n\n• **Churn-Prediction & Risiko-Bewertung**\n• **Customer Segmentierung & Retention-Strategien**\n• **ROI-Berechnungen für Kundenbindungsmaßnahmen**\n• **Echtzeit-BigQuery Abfragen**\n\nWas möchten Sie analysieren?',
      role: 'assistant',
      timestamp: new Date(),
    }]);
    
    // Clear input
    setInput('');
    
    // Clear stored messages
    const messagesKey = `dashboard_messages_${user.uid}`;
    localStorage.removeItem(messagesKey);
  };

  // JSON-zu-Markdown Konvertierung für Retention Plans
  const convertJsonToMarkdown = (jsonData: StructuredRetentionPlan) => {
    const sections = [];
    sections.push("# 📈 RETENTION DASHBOARD\n");
    
    // Executive Summary
    const exec: Partial<NonNullable<StructuredRetentionPlan['executive_summary']>> = jsonData.executive_summary || {};
    const churnEmoji = (exec.churn_risk ?? 0) >= 70 ? "🔴" : (exec.churn_risk ?? 0) >= 50 ? "🟠" : (exec.churn_risk ?? 0) >= 30 ? "🟡" : "🟢";
    const clvEmoji = (exec.clv_uplift ?? 0) >= 200 ? "🟢" : (exec.clv_uplift ?? 0) >= 100 ? "🟡" : (exec.clv_uplift ?? 0) >= 50 ? "🟠" : "🔴";
    const roiEmoji = (exec.roi_estimate ?? 0) >= 200 ? "🟢" : (exec.roi_estimate ?? 0) >= 100 ? "🟡" : (exec.roi_estimate ?? 0) >= 50 ? "🟠" : "🔴";
    
    sections.push("## 📊 Key Metrics\n");
    sections.push(`${churnEmoji} **Churn-Risiko:** ${exec.churn_risk || 0}%`);
    sections.push(`${clvEmoji} **CLV-Uplift:** €${exec.clv_uplift || 0}`);
    sections.push(`${roiEmoji} **ROI-Potenzial:** ${exec.roi_estimate || 0}%\n`);
    
    if (exec.top_insight) {
      sections.push(`💡 **Insight:** ${exec.top_insight}\n`);
    }
    
    // Customer Profile
    const customer: Partial<NonNullable<StructuredRetentionPlan['customer_profile']>> = jsonData.customer_profile || {};
    const metrics: Partial<NonNullable<StructuredRetentionPlan['customer_profile']>['key_metrics']> = customer.key_metrics || {};
    sections.push("## 👤 Kundenprofil\n");
    sections.push(`**ID ${customer.id || 'N/A'}** • ${customer.age_group || 'Unbekannt'} • ${metrics.days_inactive || 0}d inaktiv • ${metrics.monthly_visits || 0} Besuche/Monat\n`);
    
    // Top Actions
    const actions = jsonData.top_actions || [];
    sections.push("## 🎯 Top-Maßnahmen\n");
    
    actions.slice(0, 3).forEach((action, index) => {
      const priority = action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢';
      sections.push(`### ${priority} ${index + 1}. ${action.title || 'Maßnahme'}`);
      sections.push(`**Beschreibung:** ${action.description || 'Keine Beschreibung'}`);
      sections.push(`**Zeitrahmen:** ${action.timeframe || 'Nicht spezifiziert'}`);
      sections.push(`**Erwartetes Ergebnis:** ${action.expected_result || 'Nicht spezifiziert'}\n`);
    });
    
    return sections.join('\n');
  };

  const handleSend = async (messageText?: string, context?: string) => {
    const content = messageText || input;
    if (!content.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      context
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const streamingMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, streamingMessage]);

    try {
      // Get Firebase auth token
      await user.getIdToken();

      // Use persistent session ID or create a temporary one
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        console.warn('No session ID available, creating temporary session');
        currentSessionId = `dashboard_${user.uid}_${Date.now()}`;
        setSessionId(currentSessionId);
        localStorage.setItem(`dashboard_session_${user.uid}`, currentSessionId);
      }

      // Enhanced message formatting for retention plan requests
      let enhancedMessage = content;
      if (context === 'generate_retention_plan') {
        enhancedMessage = `ERSTELLE RETENTION-PLAN: ${content}`;
      }

      // Send message to ADK agent using the working /api/adk endpoint
      const contextPrefix = context ? `[CRM ${context.toUpperCase()}]: ` : '';
      const response = await fetch('/api/adk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json' // Accept both SSE and JSON
        },
        body: JSON.stringify({
          message: `${contextPrefix}${enhancedMessage}`,
          sessionId: currentSessionId,
          streaming: true // Request streaming
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle streaming response with temporary/final message separation
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';
        let planData: Message['planData'] = undefined;
        
        // Update streaming message to show it's streaming
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, isStreaming: true }
            : msg
        ));
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                
                try {
                  const parsed = JSON.parse(data);
                  
                  // ADK-konforme Implementierung: Verbesserte Event-basierte Akkumulation
                  if (parsed.content?.parts?.[0]?.text) {
                    const text = parsed.content.parts[0].text;
                    
                    // Korrekte Akkumulation - bei partial=true anhängen, sonst ersetzen
                    if (parsed.partial === true) {
                      accumulatedContent += text;
                    } else {
                      accumulatedContent = text;
                    }
                    
                    // Content-Verarbeitung für Display
                    let displayContent = accumulatedContent;
                    const reactMarkers = ['/PLANNING/', '/ACTION/', '/REASONING/', '/OBSERVATION/', '/FINAL_ANSWER/', '/*FINAL_ANSWER*/'];
                    
                    // Prüfe ob es ReAct-Marker enthält
                    const hasReactMarkers = reactMarkers.some(marker => displayContent.includes(marker));
                    
                    if (hasReactMarkers && !parsed.turn_complete) {
                      // Während des Streamings: Extrahiere Content nach /FINAL_ANSWER/ falls vorhanden
                      // Handle both formats: /FINAL_ANSWER/ and /*FINAL_ANSWER*/
                      const finalAnswerMarkers = ['/FINAL_ANSWER/', '/*FINAL_ANSWER*/'];
                      let finalAnswerIndex = -1;
                      let markerLength = 0;
                      
                      for (const marker of finalAnswerMarkers) {
                        const index = displayContent.indexOf(marker);
                        if (index !== -1) {
                          finalAnswerIndex = index;
                          markerLength = marker.length;
                          break;
                        }
                      }
                      
                      if (finalAnswerIndex !== -1) {
                        // Extract content after FINAL_ANSWER marker
                        const extractedContent = displayContent.substring(finalAnswerIndex + markerLength).trim();
                        
                        // Always show the extracted content, even if it's short
                        // This prevents getting stuck in "processing" state
                        displayContent = extractedContent;
                      } else {
                        // Andere ReAct-Marker - zeige Status
                        if (displayContent.includes('/PLANNING/')) {
                          displayContent = "📋 Planung der Analyse...";
                        } else if (displayContent.includes('/REASONING/')) {
                          displayContent = "🧠 Denke nach...";
                        } else if (displayContent.includes('/ACTION/')) {
                          displayContent = "⚡ Führe Aktion aus...";
                        } else if (displayContent.includes('/OBSERVATION/')) {
                          displayContent = "🔍 Analysiere Ergebnisse...";
                        } else {
                          displayContent = "🤔 Verarbeitung läuft...";
                        }
                      }
                    }
                    
                    console.log('ADK Event:', {
                      partial: parsed.partial,
                      turn_complete: parsed.turn_complete,
                      content_length: text.length,
                      accumulated_length: accumulatedContent.length,
                      hasReactMarkers,
                      displayContent: displayContent.substring(0, 50) + "..."
                    });
                    
                    // ADK-Muster: Immer die gleiche Nachricht aktualisieren
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { 
                            ...msg, 
                            content: displayContent, 
                            isStreaming: true
                          }
                        : msg
                    ));
                  }
                  
                  // ADK-Muster: Bei turn_complete finale Nachricht setzen
                  if (parsed.turn_complete === true) {
                    console.log('Turn complete - ADK pattern');
                    
                    // Finale Content-Verarbeitung für turn_complete
                    let finalContent = accumulatedContent;
                    const allReactMarkers = ['/PLANNING/', '/ACTION/', '/REASONING/', '/OBSERVATION/', '/FINAL_ANSWER/', '/*FINAL_ANSWER*/'];
                    
                    // Verbesserte Extraktion nach /FINAL_ANSWER/ oder /*FINAL_ANSWER*/
                    const finalAnswerMarkers = ['/FINAL_ANSWER/', '/*FINAL_ANSWER*/'];
                    let finalAnswerIndex = -1;
                    let markerLength = 0;
                    
                    for (const marker of finalAnswerMarkers) {
                      const index = finalContent.indexOf(marker);
                      if (index !== -1) {
                        finalAnswerIndex = index;
                        markerLength = marker.length;
                        break;
                      }
                    }
                    
                    if (finalAnswerIndex !== -1) {
                      finalContent = finalContent.substring(finalAnswerIndex + markerLength).trim();
                    } else {
                      // Kein /FINAL_ANSWER/ gefunden - entferne alle ReAct-Marker
                      allReactMarkers.forEach(marker => {
                        finalContent = finalContent.replace(new RegExp(marker.replace('/', '\\/'), 'g'), '');
                      });
                    }
                    
                    // Clean up extra whitespace und mehrfache Zeilenumbrüche
                    finalContent = finalContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
                    
                    // Falls Content leer ist nach Filterung, Fallback-Nachricht
                    if (!finalContent || finalContent.length < 10) {
                      finalContent = "Die Analyse wurde abgeschlossen. Bitte stellen Sie eine spezifische Frage zu Ihren Kundendaten.";
                    }
                    
                    // Plan-Daten extrahieren falls vorhanden
                    let displayType: 'text' | 'retention_plan' | 'customer_data' = 'text';
                    
                    // ERSTE PRIORITÄT: Structured JSON Retention Plan Detection
                    try {
                      // First try parsing directly
                      let jsonToParse = finalContent;
                      let directJson = null;
                      
                      try {
                        directJson = JSON.parse(jsonToParse);
                      } catch {
                        // If direct parsing fails, try to extract JSON from text that contains prefix
                        // More flexible regex to capture JSON blocks regardless of prefix text
                        console.log('🔍 STREAMING: Direct JSON parse failed, trying regex extraction...');
                        console.log('🔍 STREAMING: FinalContent preview:', finalContent.substring(0, 200) + '...');
                        const jsonMatch = finalContent.match(/(\{[\s\S]+\})/);
                        if (jsonMatch) {
                          jsonToParse = jsonMatch[1];
                          console.log('🔍 STREAMING: EXTRACTED JSON:', jsonToParse.substring(0, 200) + '...');
                          directJson = JSON.parse(jsonToParse);
                          console.log('🔍 STREAMING: JSON parsed successfully');
                        } else {
                          console.log('🔍 STREAMING: Regex failed to extract JSON');
                        }
                      }
                      
                      // Check for new structured JSON retention plan format  
                      if (directJson && directJson.executive_summary && directJson.customer_profile && directJson.top_actions) {
                        console.log('🎯 STREAMING: Detected structured JSON retention plan format');
                        
                        // Create plan data in expected format for the UI
                        planData = {
                          plan_id: `plan_${Date.now()}`,
                          plan_type: 'executive_summary',
                          target: {
                            id: directJson.customer_profile?.id || 'unknown',
                            name: `Kunde ${directJson.customer_profile?.id || 'Unknown'}`,
                            description: `${directJson.customer_profile?.age_group || ''} • ${directJson.customer_profile?.value_tier || ''}`
                          },
                          recommendations: directJson, // Store the complete structured JSON
                          rag_sources: directJson.rag_sources || [],
                          parameters: { 
                            budget: directJson.executive_summary?.clv_uplift || 0, 
                            duration_weeks: 12,
                            churn_risk: directJson.executive_summary?.churn_risk || 0,
                            roi_estimate: directJson.executive_summary?.roi_estimate || 0
                          },
                          template: directJson
                        };
                        displayType = 'retention_plan'; // AKTIVIERT für strukturierte JSON-Pläne
                        
                        // Convert JSON to markdown for display using frontend logic
                        
                        finalContent = convertJsonToMarkdown(directJson);
                        
                        console.log('🎯 STREAMING: Converted JSON to markdown, length:', finalContent.length);
                      }
                    } catch (e) {
                      console.log('🎯 STREAMING: JSON parsing failed:', e);
                      // Not JSON, check for traditional plan indicators
                      if (finalContent.includes('Mitglied') || finalContent.includes('Churn') || finalContent.includes('Retention')) {
                        planData = {
                          success: true,
                          plan_id: `plan_${Date.now()}`,
                          plan_type: 'analysis',
                          strategies: finalContent,
                          created_at: new Date().toISOString()
                        };
                      }
                    }
                    
                    console.log('Final content after filtering:', {
                      length: finalContent.length,
                      preview: finalContent.substring(0, 100) + "...",
                      hasPlanData: !!planData
                    });
                    
                    // Add action buttons for retention plans
                    let actionButtons: Message['actionButtons'] = undefined;
                    if (planData && displayType === 'retention_plan') {
                      actionButtons = [
                        {
                          label: "Plan speichern",
                          action: "save_plan", 
                          planId: planData.plan_id
                        }
                      ];
                    }
                    
                    // Finale Nachricht ohne Streaming-State
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { 
                            ...msg, 
                            content: finalContent,
                            isStreaming: false,
                            displayType,
                            planData,
                            actionButtons
                          }
                        : msg
                    ));
                    
                    // ADK-Muster: Nach turn_complete aufhören
                    break;
                  }
                  
                } catch (e) {
                  console.warn('Failed to parse streaming data:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          // ADK-Muster: Sicherstellen dass Streaming-State entfernt wird
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, isStreaming: false }
              : msg
          ));
        }
        
        setIsAdkConnected(true);
        return;
      }

      const data = await response.json();

      // Update ADK connection status based on response
      setIsAdkConnected(true);

      let responseContent = data.text || 'Entschuldigung, ich konnte keine Antwort generieren.';

      // Extract next actions from response
      let nextActions: Message['nextActions'] = undefined;
      if (data.next_actions?.next_actions?.length > 0) {
        nextActions = data.next_actions;
        console.log('Next actions extracted:', nextActions);
      }

      // Check if response contains plan data or customer data
      let planData: Message['planData'] = undefined;
      const customerData: Message['customerData'] = undefined;
      let displayType: 'text' | 'retention_plan' | 'customer_data' = 'text';
      let actionButtons: Message['actionButtons'] = undefined;

      try {
        // PRECISE retention plan detection based on exact structure
        const isRetentionPlan = (
          // Method 1: Structured data from backend tool
          (data.plan_id && data.recommendations && data.target) ||
          (data.plan_data && data.plan_data.plan_id) ||
          // Method 2: EXACT retention plan content structure (like your example)
          (responseContent.includes('KUNDENPROFIL UND RISIKOANALYSE') &&
            responseContent.includes('MASSGESCHNEIDERTE MASSNAHMEN') &&
            responseContent.includes('SOFORTMASSNAHMEN') &&
            responseContent.includes('STABILISIERUNGSMASSNAHMEN') &&
            responseContent.includes('LANGFRISTIGE BINDUNG') &&
            responseContent.includes('KUNDENSPEZIFISCHE ERFOLGS-KPIS') &&
            responseContent.includes('KOSTEN-NUTZEN-ANALYSE') &&
            responseContent.length > 3000)
        );

        console.log('Retention plan detection:', {
          isRetentionPlan,
          hasStructuredData: !!(data.plan_id && data.strategies),
          hasContentStructure: responseContent.includes('KUNDENPROFIL UND RISIKOANALYSE') && responseContent.includes('KOSTEN-NUTZEN-ANALYSE'),
          responseLength: responseContent.length,
          dataKeys: Object.keys(data)
        });

        // Add save button IMMEDIATELY for retention plans (no card needed)
        if (isRetentionPlan) {
          actionButtons = [
            {
              label: "Plan speichern",
              action: "save_plan",
              planId: `retention_${Date.now()}`
            }
          ];

          console.log('Save button added for retention plan');

          // Method 1: Direct plan_data from response
          if (data.plan_data) {
            console.log('Using data.plan_data');
            // Handle deeply nested plan_data structure from ADK
            let extractedPlanData = data.plan_data;

            // Navigate through nested structure: plan_data.plan_data.plan_data
            if (data.plan_data.plan_data?.plan_data) {
              console.log('🔧 Detected triple nested plan_data structure');
              extractedPlanData = data.plan_data.plan_data.plan_data;
            } else if (data.plan_data.plan_data) {
              console.log('🔧 Detected double nested plan_data structure');
              extractedPlanData = data.plan_data.plan_data;
            }

            // Ensure we preserve the complete recommendations content from the backend
            if (extractedPlanData.recommendations) {
              console.log('🔧 Full recommendations content preserved from backend');
            } else if (extractedPlanData.text) {
              // Fallback: use text field if recommendations is not available
              extractedPlanData.recommendations = extractedPlanData.text;
              console.log('🔧 Using text field as recommendations fallback');
            }

            planData = extractedPlanData;
            // displayType = 'retention_plan'; // DEAKTIVIERT - nur Save Button, keine Card

            console.log('Extracted plan data:', {
              plan_id: planData?.plan_id,
              target_id: planData?.target?.id,
              has_recommendations: !!planData?.recommendations,
              recommendations_length: typeof planData?.recommendations === 'string' || Array.isArray(planData?.recommendations) ? planData.recommendations.length : 0,
              recommendations_preview: Array.isArray(planData?.recommendations) ? 
                `Array[${planData.recommendations.length}]` : 
                (typeof planData?.recommendations === 'string' ? 
                  planData.recommendations.substring(0, 100) + '...' : 'N/A')
            });
          }
          // Method 1.5: Direct plan structure in data object (from ADK tool response)
          else if (data.plan_id && data.recommendations && data.target) {
            console.log('Using direct plan structure from data object');
            planData = {
              plan_id: data.plan_id,
              target: data.target,
              recommendations: data.recommendations,
              financial_projections: data.financial_projections || {},
              success_metrics: data.success_metrics || {},
              timeline: data.timeline || [],
              parameters: data.parameters || { budget: 0, duration_weeks: 8 },
              template: data.template || {}
            };
            // displayType = 'retention_plan'; // DEAKTIVIERT - nur Save Button, keine Card

            console.log('Created plan data from direct structure:', {
              plan_id: planData.plan_id,
              target_id: planData.target?.id,
              has_recommendations: !!planData.recommendations,
              recommendations_length: Array.isArray(planData.recommendations) ? 
                planData.recommendations.length : 
                (typeof planData.recommendations === 'string' ? planData.recommendations.length : 0),
              recommendations_preview: Array.isArray(planData.recommendations) ? 
                `Array[${planData.recommendations.length}]` : 
                (typeof planData.recommendations === 'string' ? 
                  planData.recommendations.substring(0, 100) + '...' : 'N/A')
            });
          }
          // Method 2: Try to parse entire response as JSON 
          else {
            try {
              const directJson = JSON.parse(responseContent);
              
              // Check for new structured JSON retention plan format
              if (directJson.executive_summary && directJson.customer_profile && directJson.top_actions) {
                console.log('🎯 Detected new structured JSON retention plan format');
                
                // Create plan data in expected format for the UI
                planData = {
                  plan_id: `plan_${Date.now()}`,
                  plan_type: 'executive_summary',
                  target: {
                    id: directJson.customer_profile?.id || 'unknown',
                    name: `Kunde ${directJson.customer_profile?.id || 'Unknown'}`,
                    description: `${directJson.customer_profile?.age_group || ''} • ${directJson.customer_profile?.value_tier || ''}`
                  },
                  recommendations: directJson, // Store the complete structured JSON
                  rag_sources: directJson.rag_sources || [],
                  parameters: { 
                    budget: directJson.executive_summary?.clv_uplift || 0, 
                    duration_weeks: 12,
                    churn_risk: directJson.executive_summary?.churn_risk || 0,
                    roi_estimate: directJson.executive_summary?.roi_estimate || 0
                  },
                  template: directJson
                };
                displayType = 'retention_plan'; // REAKTIVIERT für neue JSON-Struktur
                
                // Convert JSON to markdown for display consistency
                responseContent = convertJsonToMarkdown(directJson);
                
                console.log('🎯 Created structured plan data:', {
                  plan_id: planData.plan_id,
                  target_id: planData.target?.id,
                  churn_risk: planData.parameters?.churn_risk,
                  has_structured_data: !!planData.recommendations,
                  actions_count: directJson.top_actions?.length || 0
                });
              }
              // Check for legacy format
              else if (directJson.plan_data || directJson.customer_id || directJson.success) {
                console.log('Using direct JSON parsing');
                // Handle deeply nested plan_data in JSON response
                let extractedPlanData = directJson;

                if (directJson.plan_data?.plan_data?.plan_data) {
                  console.log('🔧 Detected triple nested plan_data in JSON');
                  extractedPlanData = directJson.plan_data.plan_data.plan_data;
                } else if (directJson.plan_data?.plan_data) {
                  console.log('🔧 Detected double nested plan_data in JSON');
                  extractedPlanData = directJson.plan_data.plan_data;
                } else if (directJson.plan_data) {
                  console.log('🔧 Using single nested plan_data in JSON');
                  extractedPlanData = directJson.plan_data;
                }

                // Ensure we preserve the complete strategies content from JSON
                if (extractedPlanData.strategies) {
                  console.log('🔧 JSON: Full strategies content preserved');
                } else if (extractedPlanData.text) {
                  // Fallback: use text field if recommendations is not available
                  extractedPlanData.recommendations = extractedPlanData.text;
                  console.log('🔧 JSON: Using text field as recommendations fallback');
                }

                planData = extractedPlanData;
                displayType = 'retention_plan'; // REAKTIVIERT für Legacy-Format
              }
            } catch {
              // Method 2.5: Try to extract raw JSON from text that contains prefix
              try {
                console.log('🔍 NON-STREAMING: Trying to extract JSON from prefix text...');
                console.log('🔍 NON-STREAMING: ResponseContent preview:', responseContent.substring(0, 200) + '...');
                const jsonMatch = responseContent.match(/(\{[\s\S]+\})/);
                if (jsonMatch) {
                  console.log('🔍 NON-STREAMING: Regex matched, extracting JSON...');
                  const extractedJson = JSON.parse(jsonMatch[1]);
                  console.log('🔍 NON-STREAMING: JSON parsed successfully');
                  
                  // Check for new structured JSON retention plan format
                  if (extractedJson.executive_summary && extractedJson.customer_profile && extractedJson.top_actions) {
                    console.log('🎯 NON-STREAMING: Detected structured JSON retention plan format from prefix text');
                    
                    // Create plan data in expected format for the UI
                    planData = {
                      plan_id: `plan_${Date.now()}`,
                      plan_type: 'executive_summary',
                      target: {
                        id: extractedJson.customer_profile?.id || 'unknown',
                        name: `Kunde ${extractedJson.customer_profile?.id || 'Unknown'}`,
                        description: `${extractedJson.customer_profile?.age_group || ''} • ${extractedJson.customer_profile?.value_tier || ''}`
                      },
                      recommendations: extractedJson, // Store the complete structured JSON
                      rag_sources: extractedJson.rag_sources || [],
                      parameters: { 
                        budget: extractedJson.executive_summary?.clv_uplift || 0, 
                        duration_weeks: 12,
                        churn_risk: extractedJson.executive_summary?.churn_risk || 0,
                        roi_estimate: extractedJson.executive_summary?.roi_estimate || 0
                      },
                      template: extractedJson
                    };
                    displayType = 'retention_plan'; // ACTIVATED for structured JSON from prefix text
                    
                    // Convert JSON to markdown for display consistency
                    responseContent = convertJsonToMarkdown(extractedJson);
                    
                    console.log('🎯 NON-STREAMING: Created structured plan data from prefix text:', {
                      plan_id: planData.plan_id,
                      target_id: planData.target?.id,
                      churn_risk: planData.parameters?.churn_risk,
                      has_structured_data: !!planData.recommendations,
                      actions_count: extractedJson.top_actions?.length || 0
                    });
                    
                    // Add action buttons for retention plans
                    actionButtons = [
                      {
                        label: "Plan speichern",
                        action: "save_plan", 
                        planId: planData.plan_id
                      }
                    ];
                  }
                }
              } catch (innerE) {
                console.log('🎯 NON-STREAMING: Failed to extract JSON from prefix text:', innerE);
              }
              
              // Method 3: Extract from JSON code block
              const planMatches = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
              if (planMatches) {
                try {
                  const parsedPlan = JSON.parse(planMatches[1]);
                  console.log('Using JSON block parsing');
                  // Handle deeply nested plan_data in code block
                  let extractedPlanData = parsedPlan;

                  if (parsedPlan.plan_data?.plan_data?.plan_data) {
                    console.log('🔧 Detected triple nested plan_data in code block');
                    extractedPlanData = parsedPlan.plan_data.plan_data.plan_data;
                  } else if (parsedPlan.plan_data?.plan_data) {
                    console.log('🔧 Detected double nested plan_data in code block');
                    extractedPlanData = parsedPlan.plan_data.plan_data;
                  } else if (parsedPlan.plan_data) {
                    console.log('🔧 Using single nested plan_data in code block');
                    extractedPlanData = parsedPlan.plan_data;
                  }

                  // Ensure we preserve the complete recommendations content from code block
                  if (extractedPlanData.recommendations) {
                    console.log('🔧 Code block: Full recommendations content preserved');
                  } else if (extractedPlanData.text) {
                    // Fallback: use text field if recommendations is not available
                    extractedPlanData.recommendations = extractedPlanData.text;
                    console.log('🔧 Code block: Using text field as recommendations fallback');
                  } else if (!extractedPlanData.recommendations && responseContent.includes('SOFORTMASSNAHMEN')) {
                    // If the JSON block doesn't have recommendations but the full response does, use the full response
                    extractedPlanData.recommendations = responseContent;
                    console.log('🔧 Code block: Using full responseContent as recommendations fallback');
                  }

                  planData = extractedPlanData;
                  // displayType = 'retention_plan'; // DEAKTIVIERT - nur Save Button, keine Card
                } catch (e) {
                  console.warn('JSON block parsing failed:', e);
                }
              }

              // Method 4: Extract text values; absent fields use explicit synthetic defaults.
              if (!planData) {
                console.log('Creating plan from text content with synthetic defaults');

                // Extract customer ID
                const customerIdMatch = responseContent.match(/(?:Mitglied|customer_id|Kunde|ID).*?(\d+)/i);
                const customerId = customerIdMatch ? parseInt(customerIdMatch[1]) : 1;

                // Extract real churn risk percentage
                const churnRiskMatch = responseContent.match(/Churn-Risiko:\s*(\d+(?:\.\d+)?)%/i);
                const churnRisk = churnRiskMatch ? parseFloat(churnRiskMatch[1]) : 20;

                // Extract real monthly fee
                const monthlyFeeMatch = responseContent.match(/Monatsbeitrag:\s*(\d+(?:\.\d+)?)€/i);
                const monthlyFee = monthlyFeeMatch ? parseFloat(monthlyFeeMatch[1]) : 40;

                // Extract real membership duration
                const membershipMatch = responseContent.match(/Mitgliedschaftsdauer:\s*(\d+(?:\.\d+)?)\s*Monate/i);
                const membershipDuration = membershipMatch ? parseFloat(membershipMatch[1]) : 3;

                // Extract real monthly visits
                const visitsMatch = responseContent.match(/(?:Monatliche\s+Besuche|Besuche[^:]*?):\s*(\d+(?:\.\d+)?)/i);
                const monthlyVisits = visitsMatch ? parseFloat(visitsMatch[1]) : 4;

                // Extract days since last visit
                const lastVisitMatch = responseContent.match(/(?:Tage\s+seit\s+letztem\s+Besuch|letzter\s+Besuch\s+vor)\s*:?\s*(\d+)/i);
                const daysSinceLastVisit = lastVisitMatch ? parseInt(lastVisitMatch[1]) : 1;

                // Extract risk category
                const riskMatch = responseContent.match(/(NIEDRIG|MITTEL|HOCH|KRITISCH)/i);
                const riskCategory = riskMatch ? riskMatch[1].toUpperCase() : 'NIEDRIG';

                planData = {
                  plan_id: `text_plan_${Date.now()}`,
                  target: {
                    type: 'individual',
                    id: customerId.toString(),
                    info: {
                      source: 'text_extraction_with_synthetic_defaults',
                      customer_id: customerId,
                      churn_probability: churnRisk,
                      risk_category: riskCategory,
                      current_monthly_fee: monthlyFee,
                      estimated_annual_value_eur: monthlyFee * 12,
                      membership_duration_months: membershipDuration,
                      checkins_per_month: monthlyVisits,
                      days_since_last_checkin: daysSinceLastVisit
                    }
                  },
                  recommendations: responseContent, // CRITICAL: Use the FULL responseContent, not a summary
                  financial_projections: {
                    source: 'synthetic_estimate_not_evaluated',
                    cost_savings: monthlyFee * 12,
                    revenue_protection: monthlyFee * 12 * 0.5
                  },
                  success_metrics: {
                    source: 'synthetic_estimate_not_evaluated',
                    retention_rate: 0.8,
                    satisfaction_score: 4
                  },
                  timeline: [
                    'Sofortiger persönlicher Kontakt',
                    'Individuelles Retention-Angebot erstellen',
                    'Monitoring und Follow-up'
                  ],
                  parameters: {
                    budget: monthlyFee * 2,
                    duration_weeks: 8
                  },
                  template: {
                    type: 'individual_retention',
                    created_at: new Date().toISOString()
                  }
                };
                // displayType = 'retention_plan'; // DEAKTIVIERT - nur Save Button, keine Card

                console.log('Created plan data with full content:', {
                  plan_id: planData.plan_id,
                  recommendations_length: typeof planData.recommendations === 'string' || Array.isArray(planData.recommendations) ? planData.recommendations.length : 0,
                  customer_id: planData.target?.id || 'N/A'
                });
              }
            }
          }
        }

        // Customer data detection vollständig deaktiviert

        // If we have valid plan data, add action buttons
        if (planData && (planData.plan_id || planData.customer_id || planData.success)) {
          const planId = planData.plan_id || `plan_${Date.now()}`;
          planData.plan_id = planId; // Ensure plan has an ID

          actionButtons = [
            { label: '💾 Plan speichern', action: 'save_plan' as const, planId },
            { label: 'Als PDF exportieren', action: 'export_pdf' as const, planId }
          ];

          console.log('Action buttons created for plan:', planId);
        }
      } catch (e) {
        console.log('No plan data found in response, displaying as text:', e);
      }

      // Remove automatic prefix to avoid duplicate messages
      // responseContent = `**Live ADK Response**\n\n${responseContent}`;

      // DEBUG: Final message creation
      console.log('FINAL: Creating assistant message:', {
        displayType,
        hasPlanData: !!planData,
        planDataKeys: planData ? Object.keys(planData) : null,
        planDataPlanId: planData?.plan_id,
        planDataStrategiesLength: planData?.strategies?.length || 0,
        hasActionButtons: !!actionButtons,
        actionButtonsLength: actionButtons?.length || 0
      });

      const assistantMessage: Message = {
        id: data.messageId || (Date.now() + 1).toString(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
        displayType,
        planData,
        customerData,
        actionButtons,
        nextActions
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat API Error:', error);
      setIsAdkConnected(false);

      // Proper error handling without mock data
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `**FEHLER: Verbindungsfehler zur BigQuery-Datenbank**\n\nDie Verbindung zum ADK Agent (Port 8001) ist momentan nicht verfügbar.\n\n**Mögliche Ursachen:**\n• ADK Agent ist nicht gestartet\n• BigQuery-Authentifizierung fehlgeschlagen\n• Netzwerkverbindung unterbrochen\n\n**Lösungsschritte:**\n1. ADK Agent neu starten: \`cd Aciso-Agent_Final && python main.py\`\n2. BigQuery-Verbindung prüfen\n3. Die lokale Konfiguration und die Server-Logs prüfen.`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages.length, isLoading]);

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Custom Event Listener für Quick Actions aus TopRiskCustomerFilter
  useEffect(() => {
    const handleChatTrigger = (event: CustomEvent) => {
      console.log('📨 Chat trigger received:', event.detail);

      const { message, context } = event.detail;
      if (message) {
        // Trigger handleSend with the received message and context
        handleSendRef.current(message, context);
      }
    };

    // Add event listener for custom chat triggers
    window.addEventListener('triggerChatMessage', handleChatTrigger as EventListener);

    // Cleanup event listener
    return () => {
      window.removeEventListener('triggerChatMessage', handleChatTrigger as EventListener);
    };
  }, []);

  const handleNextAction = async (actionText: string) => {
    console.log('Next action clicked:', actionText);
    // Send the action text as a new message to the chat
    await handleSend(actionText);
  };

  const handlePlanAction = async (action: string, planId: string) => {
    console.log(`Plan action: ${action} for plan ${planId}`);

    try {
      switch (action) {
        case 'save_plan':
          // Find any retention plan message in recent messages
          const retentionPlanMessage = [...messages].reverse().find(msg => 
            msg.content.includes('executive_summary') && 
            (msg.content.includes('customer_profile') || msg.content.includes('top_actions'))
          );
          
          if (retentionPlanMessage) {
            console.log('Found retention plan message, saving...');
            // Extract JSON from content for saving
            const jsonMatch = retentionPlanMessage.content.match(/(\{[\s\S]+\})/);
            if (jsonMatch) {
              const planData = JSON.parse(jsonMatch[1]);
              
              // Save to Firebase via API
              try {
                const response = await fetch('/api/retention-plans', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.uid || 'demo'}`
                  },
                  body: JSON.stringify({
                    plan_data: planData,
                    user_id: user?.uid || 'demo',
                    customer_id: planData.customer_profile?.id?.toString() || planId,
                    name: `Retention Plan ${planData.customer_profile?.id || 'Kunde'} - ${new Date().toLocaleDateString('de-DE')}`
                  })
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log('Successfully saved retention plan to Firebase:', result);
                  
                  // Show success message
                  const successMessage: Message = {
                    id: `save_success_${Date.now()}`,
                    content: `✅ Retention Plan wurde erfolgreich gespeichert! [Zu den gespeicherten Plänen](/dashboard/retention-plans)`,
                    timestamp: new Date(),
                    role: 'assistant',
                    isStreaming: false,
                    displayType: 'text'
                  };
                  setMessages(prev => [...prev, successMessage]);
                } else {
                  throw new Error(`HTTP ${response.status}`);
                }
              } catch (apiError) {
                console.error('Error saving to Firebase:', apiError);
                throw apiError;
              }
            }
          } else {
            console.error('No retention plan found to save');
          }
          break;
        case 'export_pdf':
          await exportPlan(planId, 'pdf');
          break;
        default:
          console.log(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action}:`, error);
      
      // Show error message
      const errorMessage: Message = {
        id: `save_error_${Date.now()}`,
        content: '❌ Fehler beim Speichern des Plans.',
        timestamp: new Date(),
        role: 'assistant',
        isStreaming: false,
        displayType: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const exportPlan = async (planId: string, format: 'pdf' | 'excel') => {
    if (!user) return;

    try {
      const authToken = await user.getIdToken();
      const response = await fetch(`/api/retention-plans/${planId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `retention-plan-${planId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`Plan exported as ${format}`);
      } else {
        throw new Error(`Failed to export plan as ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting plan as ${format}:`, error);
    }
  };

  // getContextualResponse function removed - CLAUDE.md strictly prohibits mock data
  // All responses must come from real BigQuery connections via ADK Agent

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isExpanded && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border-gray-200/50 dark:border-gray-800/50">
            <CardHeader className="flex flex-row items-center justify-between border-b p-3 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <MessageSquare className="h-7 w-7 text-primary" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAdkConnected === true ? 'bg-green-400' : isAdkConnected === false ? 'bg-red-400' : 'bg-yellow-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isAdkConnected === true ? 'bg-green-500' : isAdkConnected === false ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                  </span>
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight">CRM Intelligence Chat - Erweiterte Ansicht</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isAdkConnected ? "default" : "destructive"} className="transition-all duration-300 ease-in-out">
                  {isAdkConnected === null ? 'Verbinde...' : isAdkConnected ? 'ADK Live' : 'ADK Offline'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNewChat}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Neuer Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="hover:bg-secondary"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <ScrollArea className="flex-1 h-0 p-4" ref={scrollAreaRef}>
                  <div className="space-y-3 pb-3 max-w-3xl mx-auto">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            duration: 0.3, 
                            ease: "easeOut",
                            layout: { duration: 0.2 }
                          }}
                          layout
                          className={cn(
                            'flex items-start gap-4',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                        {message.role === 'assistant' && (
                          <div className="p-3 rounded-full bg-primary/10">
                            <Bot className={cn(
                              "h-7 w-7",
                              "text-primary"
                            )} />
                          </div>
                        )}

                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg p-2 text-sm shadow-sm backdrop-blur-sm border border-transparent transition-all duration-200',
                            message.role === 'user'
                              ? 'bg-blue-600 text-white rounded-br-none hover:shadow-md'
                              : false
                                ? 'bg-orange-50 text-orange-900 rounded-bl-none border-orange-200 animate-pulse'
                                : 'bg-muted/60 text-foreground rounded-bl-none hover:bg-muted/70 border-border/50'
                          )}
                        >
                          
                          {message.displayType === 'retention_plan' ? (
                            <EnhancedRetentionPlanRenderer 
                              content={message.content}
                              planData={message.planData}
                              actionButtons={message.actionButtons}
                              onAction={handlePlanAction}
                            />
                          ) : message.content.includes('{') && message.content.includes('executive_summary') ? (
                            message.content === '' || message.content.length < 50 ? (
                              <PlanSkeleton />
                            ) : (
                              <MinimalRetentionPlanRenderer 
                                content={message.content} 
                                onAction={handlePlanAction}
                              />
                            )
                          ) : (
                            <Markdown content={message.content} />
                          )}

                          {message.actionButtons && message.displayType !== 'customer_data' && message.displayType !== 'retention_plan' && (
                            <div className="mt-4 space-y-2">
                              <div className="text-sm text-muted-foreground font-medium">Aktionen für diesen Plan:</div>
                              <div className="flex flex-wrap gap-2">
                                {message.actionButtons.map((btn, index) => (
                                  <Button
                                    key={index}
                                    size="sm"
                                    variant={btn.action === 'save_plan' ? 'default' : 'outline'}
                                    className={cn(
                                      'transition-all duration-200',
                                      btn.action === 'save_plan' && 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                                    )}
                                    onClick={() => handlePlanAction(btn.action, btn.planId!)}
                                  >
                                    {btn.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.nextActions && message.nextActions.next_actions.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                {message.nextActions.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-3">{message.nextActions.context_info}</p>
                              <div className="flex flex-wrap gap-2">
                                {message.nextActions.next_actions.map((action) => (
                                  <Button
                                    key={action.id}
                                    size="sm"
                                    variant={action.priority === 'high' ? 'default' : 'outline'}
                                    className={cn(
                                      'h-auto py-2 px-3 text-left whitespace-normal justify-start',
                                      action.priority === 'high' && 'bg-primary/10 hover:bg-primary/20 border-primary/30',
                                      action.priority === 'medium' && 'border-orange-300/50 hover:bg-orange-50',
                                      action.priority === 'low' && 'border-gray-300/50 hover:bg-gray-50'
                                    )}
                                    onClick={() => handleNextAction(action.text)}
                                    title={action.description}
                                  >
                                    <div className="flex items-center gap-2">
                                      {action.action_type === 'analysis' && <Brain className="h-3 w-3" />}
                                      {action.action_type === 'action' && <Sparkles className="h-3 w-3" />}
                                      {action.action_type === 'insight' && <MessageSquare className="h-3 w-3" />}
                                      {action.action_type === 'plan' && <User className="h-3 w-3" />}
                                      <span className="text-xs">{action.text}</span>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {message.role === 'user' && (
                          <div className="bg-muted p-3 rounded-full">
                            <User className="h-7 w-7 text-foreground" />
                          </div>
                        )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isLoading && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex items-center space-x-4 justify-start"
                      >
                        <div className="bg-primary/10 p-3 rounded-full">
                          <Bot className="h-7 w-7 text-primary" />
                        </div>
                        <TypingIndicator />
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="p-6 border-t bg-background/95 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="max-w-3xl mx-auto"
                >
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Fragen Sie nach Kundendaten, Churn-Analyse, Retention-Strategien..."
                        disabled={isLoading}
                        className="text-sm h-12"
                      />
                      {input && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      className="h-12 w-12"
                    >
                      <ArrowUp className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={cn("h-full flex flex-col shadow-lg border-gray-200/50 dark:border-gray-800/50", className)}>
        <CardHeader className="flex flex-row items-center justify-between border-b p-3 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <MessageSquare className="h-7 w-7 text-primary" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAdkConnected === true ? 'bg-green-400' : isAdkConnected === false ? 'bg-red-400' : 'bg-yellow-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isAdkConnected === true ? 'bg-green-500' : isAdkConnected === false ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
              </span>
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">CRM Intelligence Chat</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAdkConnected ? "default" : "destructive"} className="transition-all duration-300 ease-in-out">
              {isAdkConnected === null ? 'Verbinde...' : isAdkConnected ? 'ADK Live' : 'ADK Offline'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNewChat}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Neuer Chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(true)}
              className="hover:bg-secondary"
              title="Chat erweitern"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 h-0 p-3" ref={scrollAreaRef}>
              <div className="space-y-2 pb-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        'flex items-start gap-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                    {message.role === 'assistant' && (
                      <div className={cn(
                        "p-2 rounded-full",
                        false 
                          ? "bg-orange-100 animate-pulse border-2 border-orange-200" 
                          : "bg-primary/10"
                      )}>
                        <Bot className={cn(
                          "h-6 w-6",
                          false ? "text-orange-500" : "text-primary"
                        )} />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg p-1.5 text-xs shadow-sm backdrop-blur-sm border border-transparent transition-all duration-200',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none hover:shadow-md'
                          : message.isStreaming
                            ? 'bg-slate-50 text-slate-900 rounded-bl-none border-slate-200 animate-pulse'
                            : 'bg-muted/60 text-foreground rounded-bl-none hover:bg-muted/70 border-border/50'
                      )}
                    >
                      {message.isStreaming && (
                        <div className="text-xs text-slate-700 mb-1 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse"></div>
                          Denke nach...
                        </div>
                      )}
                      
                      {/* SELECTIVE RETENTION PLAN RENDERER - Only for structured JSON */}
                      {(() => {
                        // Check if content contains structured retention plan JSON
                        const hasExecutiveSummary = message.content.includes('executive_summary');
                        const hasCustomerProfile = message.content.includes('customer_profile');
                        const hasTopActions = message.content.includes('top_actions');
                        const isStructuredPlan = hasExecutiveSummary && (hasCustomerProfile || hasTopActions);
                        
                        
                        if (isStructuredPlan) {
                          return (
                            <MinimalRetentionPlanRenderer 
                              content={message.content}
                              onAction={handlePlanAction}
                            />
                          );
                        } else {
                          return <Markdown content={message.content} />;
                        }
                      })()}

                      {message.actionButtons && message.displayType !== 'customer_data' && message.displayType !== 'retention_plan' && (
                        <div className="mt-4 space-y-2">
                          <div className="text-xs text-muted-foreground font-medium">Aktionen für diesen Plan:</div>
                          <div className="flex flex-wrap gap-2">
                            {message.actionButtons.map((btn, index) => (
                              <Button
                                key={index}
                                size="sm"
                                variant={btn.action === 'save_plan' ? 'default' : 'outline'}
                                className={cn(
                                  'transition-all duration-200',
                                  btn.action === 'save_plan' && 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                                )}
                                onClick={() => handlePlanAction(btn.action, btn.planId!)}
                              >
                                {btn.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.nextActions && message.nextActions.next_actions.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            {message.nextActions.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">{message.nextActions.context_info}</p>
                          <div className="flex flex-wrap gap-2">
                            {message.nextActions.next_actions.map((action) => (
                              <Button
                                key={action.id}
                                size="sm"
                                variant={action.priority === 'high' ? 'default' : 'outline'}
                                className={cn(
                                  'h-auto py-2 px-3 text-left whitespace-normal justify-start',
                                  action.priority === 'high' && 'bg-primary/10 hover:bg-primary/20 border-primary/30',
                                  action.priority === 'medium' && 'border-orange-300/50 hover:bg-orange-50',
                                  action.priority === 'low' && 'border-gray-300/50 hover:bg-gray-50'
                                )}
                                onClick={() => handleNextAction(action.text)}
                                title={action.description}
                              >
                                <div className="flex items-center gap-2">
                                  {action.action_type === 'analysis' && <Brain className="h-3 w-3" />}
                                  {action.action_type === 'action' && <Sparkles className="h-3 w-3" />}
                                  {action.action_type === 'insight' && <MessageSquare className="h-3 w-3" />}
                                  {action.action_type === 'plan' && <User className="h-3 w-3" />}
                                  <span className="text-xs">{action.text}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="bg-muted p-2 rounded-full">
                        <User className="h-6 w-6 text-foreground" />
                      </div>
                    )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center space-x-4 justify-start"
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="bg-primary/10 p-2 rounded-full"
                    >
                      <Bot className="h-6 w-6 text-primary" />
                    </motion.div>
                    <div className="bg-gradient-to-r from-muted/60 via-muted/50 to-muted/60 text-foreground rounded-2xl p-4 rounded-bl-none shadow-sm backdrop-blur-sm border border-border/30">
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 border-t flex-shrink-0">
              <p className="text-xs font-medium text-muted-foreground my-2 text-center">Schnellzugriff</p>
              <div className="grid grid-cols-2 gap-1">
                {suggestedPrompts.slice(0, 4).map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-start text-left text-xs px-2 py-1"
                      onClick={() => handleSend(prompt.text, prompt.context)}
                    >
                      <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{prompt.text.substring(0, 25)}...</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="p-3 border-t bg-background/95 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Fragen Sie nach Kundendaten, Churn-Analyse, Retention-Strategien..."
                    disabled={isLoading}
                  />
                  {input && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
