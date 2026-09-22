// BQML Feature-Dictionary für Churn-Modell
// Mapping zwischen Feature-IDs und Business-Context

export interface FeatureMetadata {
  label: string;
  description: string;
  businessAction: string;
  category: 'activity' | 'financial' | 'engagement' | 'demographic' | 'behavioral';
  unit?: string;
  riskDirection: 'higher_increases_churn' | 'lower_increases_churn' | 'both';
  composition: {
    source: string;
    calculation?: string;
    components?: string[];
    dataSource: string;
  };
}

export const featureDictionary: Record<string, FeatureMetadata> = {
  'tage_seit_letztem_checkin': {
    label: 'Tage seit letztem Check-in',
    description: 'Misst die Inaktivitätsdauer. Je höher der Wert, desto wahrscheinlicher ist eine Kündigung. Eines der stärksten Churn-Signal überhaupt.',
    businessAction: 'Trigger automatische Re-Engagement-Kampagnen bei > 14 Tagen Inaktivität. Push-Benachrichtigungen und personalisierte Angebote.',
    category: 'activity',
    unit: 'Tage',
    riskDirection: 'higher_increases_churn',
    composition: {
      source: 'BigQuery Berechnung',
      calculation: 'CURRENT_DATE() - DATE(letzter_checkin)',
      components: ['letzter_checkin (Timestamp)', 'Aktuelle Systemzeit'],
      dataSource: 'Studio Check-in System'
    }
  },
  'checkins_pro_monat': {
    label: 'Check-ins pro Monat',
    description: 'Direkte Messung der Nutzungsfrequenz. Niedrige Werte signalisieren schwindende Motivation und erhöhtes Churn-Risiko.',
    businessAction: 'Gamification-Elemente einführen. Ziel: Mindestens 8 Check-ins/Monat. Challenges und Streak-Belohnungen implementieren.',
    category: 'activity',
    unit: 'Check-ins',
    riskDirection: 'lower_increases_churn',
    composition: {
      source: 'BigQuery Aggregation',
      calculation: 'anzahl_checkins / mitgliedschaft_dauer_monate',
      components: ['anzahl_checkins (Total)', 'mitgliedschaft_dauer_monate (Zeitraum)'],
      dataSource: 'Studio Zugangssystem'
    }
  },
  'aktueller_beitrag_eur': {
    label: 'Monatlicher Beitrag',
    description: 'Preissensitivität-Indikator. Hohe Beiträge erhöhen Churn-Risiko, besonders bei niedriger Nutzung (schlechte Value-Perception).',
    businessAction: 'Value-based Pricing prüfen. Für Hochzahler: Premium-Services anbieten. Bei niedriger Nutzung: Downgrades vorschlagen.',
    category: 'financial',
    unit: 'EUR',
    riskDirection: 'higher_increases_churn',
    composition: {
      source: 'CRM System',
      calculation: 'Direkter Feldwert',
      components: ['Basis-Mitgliedschaftstarif', 'Zusatzleistungen', 'Rabatte/Aktionen'],
      dataSource: 'Abrechnungssystem'
    }
  },
  'engagement_score': {
    label: 'Engagement-Score',
    description: 'Kombinierter Score aus Aktivitätsmustern, Kursbesuch und App-Nutzung. Niedrige Scores zeigen schwindende Bindung.',
    businessAction: 'Personalisierte Content-Empfehlungen. Bei Score < 30: Persönliche Beratung durch Trainer anbieten.',
    category: 'engagement',
    unit: 'Punkte (0-100)',
    riskDirection: 'lower_increases_churn',
    composition: {
      source: 'Algorithmus (gewichteter Score)',
      calculation: '(check_freq * 0.4) + (aufenthalt_qual * 0.3) + (kurs_teilnahme * 0.2) + (app_nutzung * 0.1)',
      components: ['Check-in Frequenz (40%)', 'Aufenthaltsqualität (30%)', 'Kurs-Teilnahme (20%)', 'App-Nutzung (10%)'],
      dataSource: 'Multi-System Aggregation'
    }
  },
  'zahlweise': {
    label: 'Zahlungsweise',
    description: 'Zahlungsrhythmus-Risiko. Flexible/monatliche Zahlung = höheres Churn-Risiko vs. Jahresverträge.',
    businessAction: 'Incentivierung längerer Vertragslaufzeiten durch Rabatte. Monatszahler: frühzeitige Retention-Maßnahmen.',
    category: 'financial',
    riskDirection: 'both',
    composition: {
      source: 'Vertragsystem (kategorisch)',
      calculation: 'One-Hot-Encoding für ML',
      components: ['F (Flexibel)', '1M (Monatlich)', '3M (Quartal)', '1T (Jährlich)', '24M (2-Jahre)'],
      dataSource: 'Vertragsverwaltung'
    }
  },
  'alter_jahre': {
    label: 'Alter',
    description: 'Demografischer Churn-Prädiktor. Verschiedene Altersgruppen zeigen unterschiedliche Kündigungsmuster.',
    businessAction: 'Altersgerechte Programme entwickeln. 18-25: Social Features. 45+: Gesundheitsfokus und Flexibilität.',
    category: 'demographic',
    unit: 'Jahre',
    riskDirection: 'both',
    composition: {
      source: 'Kundenstammdaten',
      calculation: 'CURRENT_DATE() - geburtsdatum',
      components: ['Geburtsdatum (CRM)', 'Aktuelles Datum'],
      dataSource: 'Anmeldedaten / CRM'
    }
  },
  'durchschn_aufenthalt_min': {
    label: 'Ø Aufenthaltsdauer',
    description: 'Nutzungsintensität pro Besuch. Kurze Aufenthalte können auf Unzufriedenheit oder mangelnde Motivation hindeuten.',
    businessAction: 'Trainingsqualität überprüfen. Kurze Sessions: Workout-Guidance anbieten. Ziel: 60+ Minuten durchschnittlich.',
    category: 'behavioral',
    unit: 'Minuten',
    riskDirection: 'lower_increases_churn',
    composition: {
      source: 'Zugangssystem Berechnung',
      calculation: 'AVG(checkout_time - checkin_time)',
      components: ['Check-in Timestamp', 'Check-out Timestamp', 'Zeitdifferenz-Berechnung'],
      dataSource: 'Studio Zugangssystem'
    }
  },
  'mitgliedschaft_dauer_monate': {
    label: 'Mitgliedschaftsdauer',
    description: 'Kundenlebenszyklus-Indikator. Kritische Perioden: erste 3 Monate und nach 12 Monaten (Vertragsende).',
    businessAction: 'Onboarding in ersten 90 Tagen intensivieren. Bei 10+ Monaten: Loyalty-Programme und Verlängerungsangebote.',
    category: 'behavioral',
    unit: 'Monate',
    riskDirection: 'both',
    composition: {
      source: 'Vertragsdaten Berechnung',
      calculation: 'DATEDIFF(CURRENT_DATE, vertragsbeginn) / 30',
      components: ['Vertragsbeginn (Datum)', 'Aktuelles Datum', 'Monats-Konvertierung'],
      dataSource: 'Vertragsverwaltung'
    }
  }
};

// Helper-Funktionen für UI-Integration
export function getFeatureDetails(featureId: string): FeatureMetadata | null {
  return featureDictionary[featureId] || null;
}

export function getCategoryColor(category: FeatureMetadata['category']): string {
  const categoryColors = {
    activity: 'var(--chart-1)',      // Rot/Orange - Activity
    financial: 'var(--chart-2)',    // Gelb - Financial  
    engagement: 'var(--chart-3)',   // Grün - Engagement
    demographic: 'var(--chart-4)',  // Blau - Demographic
    behavioral: 'var(--chart-5)'    // Lila - Behavioral
  };
  return categoryColors[category];
}

export function getRiskDirectionIcon(direction: FeatureMetadata['riskDirection']): string {
  switch (direction) {
    case 'higher_increases_churn': return '📈'; // Höher = mehr Risiko
    case 'lower_increases_churn': return '📉';  // Niedriger = mehr Risiko  
    case 'both': return '⚖️';                   // Beide Richtungen
    default: return '❓';
  }
}

// Feature-Kategorien für Gruppierung
export const featureCategories = {
  activity: 'Aktivitätsverhalten',
  financial: 'Finanzielle Faktoren', 
  engagement: 'Engagement & Bindung',
  demographic: 'Demografische Merkmale',
  behavioral: 'Verhaltenspatterns'
} as const;