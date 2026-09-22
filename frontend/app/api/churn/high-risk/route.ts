import { NextRequest, NextResponse } from 'next/server';
import { createBigQueryClient, getBigQueryTable, getMemberDataset } from '@/lib/config/google-cloud';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 High-risk API route called');

    // URL Parameter auslesen
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const minRisk = parseFloat(searchParams.get('min_risk') || '0.60'); // Minimum 60% Churn-Risiko
    const maxRisk = parseFloat(searchParams.get('max_risk') || '1.0'); // Maximum 100% Churn-Risiko

    console.log(`📊 Parameters: limit=${limit}, offset=${offset}, minRisk=${minRisk}, maxRisk=${maxRisk}`);

    const bigquery = createBigQueryClient();

    const actualDataset = await getMemberDataset(bigquery);


    // SQL Query für Top Risiko-Kunden mit korrektem Dataset-Namen
    const sqlQuery = `
      SELECT 
        mitglied_id,
        alter_jahre,
        geschlecht,
        vertragsbeginn,
        laufzeit,
        zahlweise,
        aktueller_beitrag_eur,
        zahlungsart,
        vertragsperiode,
        vertragsende_aktuell,
        anzahl_checkins,
        durchschn_aufenthalt_min,
        letzter_checkin,
        mitgliedschaft_dauer_monate,
        checkins_pro_monat,
        tage_seit_letztem_checkin,
        churn_score_bias_corrected as churn_score_prozent,
        gekuendigt,
        kuendigungsdatum,
        kuendigungsart,
        kuendigungsgrund,
        risiko_kategorie,
        engagement_score
      FROM \`${getBigQueryTable(actualDataset)}\`
      WHERE gekuendigt = 0  -- Nur aktive Kunden
        AND churn_score_bias_corrected >= ${minRisk * 100}  -- Minimum Churn-Risiko (bias-korrigiert, als Prozent)
        AND churn_score_bias_corrected <= ${maxRisk * 100}  -- Maximum Churn-Risiko (bias-korrigiert, als Prozent)
      ORDER BY churn_score_bias_corrected DESC  -- Höchstes Risiko zuerst (bias-korrigiert)
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log('🔍 Executing BigQuery for high-risk customers...');
    console.log('📝 SQL Query:', sqlQuery);

    const [rows] = await bigquery.query(sqlQuery);

    console.log(`✅ BigQuery returned ${rows.length} high-risk customers`);

    // Daten transformieren in Frontend-Format
    const customers = rows.map((row, index) => {
      const churnProbability = row.churn_score_prozent / 100; // Bereits bias-korrigiert, Umrechnung von Prozent zu Dezimal

      // KORRIGIERTE Intelligente Segmentierung basierend auf echten Daten
      const getSegment = () => {
        const membershipMonths = row.mitgliedschaft_dauer_monate || 0;
        const age = row.alter_jahre || 0;
        const daysInactive = row.tage_seit_letztem_checkin || 0;
        const monthlyFee = row.aktueller_beitrag_eur || 0;

        console.log(`DEBUG Segmentation for ${row.mitglied_id}: membershipMonths=${membershipMonths}, age=${age}, daysInactive=${daysInactive}, monthlyFee=${monthlyFee}`);

        // 🔥 KRITISCHE FRÜHAUSFÄLLE - HÖCHSTE PRIORITÄT!
        // Neue Mitglieder (< 6 Monate) UND längere Inaktivität (> 30 Tage)
        if (membershipMonths < 6 && daysInactive > 30) {
          console.log(`DEBUG: ${row.mitglied_id} -> 🚨 KRITISCHE FRÜHAUSFÄLLE (${membershipMonths} Monate, ${daysInactive} Tage inaktiv)`);
          return '🚨 KRITISCHE FRÜHAUSFÄLLE';
        }

        // VIP Gefährdete (hohe Monatsbeiträge UND inaktiv)
        if (monthlyFee >= 100 && daysInactive > 7) {
          console.log(`DEBUG: ${row.mitglied_id} -> VIP Gefährdete (€${monthlyFee}, ${daysInactive} Tage inaktiv)`);
          return 'VIP Gefährdete';
        }

        // Neue Mitglieder (< 6 Monate UND aktiv/kürzlich aktiv)
        if (membershipMonths < 6 && daysInactive <= 30) {
          console.log(`DEBUG: ${row.mitglied_id} -> Neue Mitglieder (${membershipMonths} Monate, nur ${daysInactive} Tage inaktiv)`);
          return 'Neue Mitglieder';
        }

        // Langzeit-Risikokunden (> 24 Monate)
        if (membershipMonths > 24) {
          console.log(`DEBUG: ${row.mitglied_id} -> Langzeit-Risikokunden`);
          return 'Langzeit-Risikokunden';
        }

        // Stark Inaktive Kunden (> 90 Tage inaktiv) - sehr kritisch
        if (daysInactive > 90) {
          if (age <= 35) {
            console.log(`DEBUG: ${row.mitglied_id} -> Junge Stark-Inaktive (${daysInactive} Tage)`);
            return 'Junge Stark-Inaktive';
          } else if (age >= 50) {
            console.log(`DEBUG: ${row.mitglied_id} -> Ältere Stark-Inaktive (${daysInactive} Tage)`);
            return 'Ältere Stark-Inaktive';
          } else {
            console.log(`DEBUG: ${row.mitglied_id} -> Stark-Inaktive Kunden (${daysInactive} Tage)`);
            return 'Stark-Inaktive Kunden';
          }
        }

        // Moderat Inaktive Kunden (30-90 Tage)
        if (daysInactive > 30) {
          if (age <= 35) {
            console.log(`DEBUG: ${row.mitglied_id} -> Junge Inaktive (${daysInactive} Tage)`);
            return 'Junge Inaktive';
          } else if (age >= 50) {
            console.log(`DEBUG: ${row.mitglied_id} -> Ältere Gefährdete (${daysInactive} Tage)`);
            return 'Ältere Gefährdete';
          } else {
            console.log(`DEBUG: ${row.mitglied_id} -> Mittel-Alter Inaktive (${daysInactive} Tage)`);
            return 'Mittel-Alter Inaktive';
          }
        }

        // VIP Aktive (hohe Gebühren aber noch aktiv)
        if (monthlyFee >= 100) {
          console.log(`DEBUG: ${row.mitglied_id} -> VIP Aktive (€${monthlyFee}, aktiv)`);
          return 'VIP Aktive';
        }

        // Altersbasierte Segmente für aktive Kunden
        if (age <= 35) {
          console.log(`DEBUG: ${row.mitglied_id} -> Junge Aktive (${daysInactive} Tage inaktiv)`);
          return 'Junge Aktive';
        } else if (age >= 50) {
          console.log(`DEBUG: ${row.mitglied_id} -> Ältere Aktive (${daysInactive} Tage inaktiv)`);
          return 'Ältere Aktive';
        }

        // Fallback
        console.log(`DEBUG: ${row.mitglied_id} -> Standard Risikokunden (Fallback)`);
        return 'Standard Risikokunden';
      };

      const segment = getSegment();

      // Retention Priority basierend auf Churn-Score
      const getRetentionPriority = (score: number) => {
        if (score >= 90) return 'URGENT';
        if (score >= 80) return 'HIGH';
        if (score >= 70) return 'MEDIUM';
        return 'LOW';
      };

      // Activity Status basierend auf Inaktivität
      const getActivityStatus = (daysInactive: number) => {
        if (daysInactive === 0) return 'AKTIV';
        if (daysInactive <= 7) return 'RECENT';
        if (daysInactive <= 30) return 'INACTIVE';
        return 'VERY_INACTIVE';
      };

      const customer = {
        customer_id: row.mitglied_id.toString(),
        name: `Mitglied ${row.mitglied_id}`,
        churn_probability: churnProbability,
        risk_category: row.risiko_kategorie || 'UNBEKANNT',
        risk_rank: offset + index + 1,
        risk_segment: segment,
        profile: {
          age: row.alter_jahre || 0,
          gender: row.geschlecht || 'Unbekannt',
          payment_method: row.zahlungsart || 'Unbekannt',
          monthly_fee: row.aktueller_beitrag_eur || 0,
          activity_status: getActivityStatus(row.tage_seit_letztem_checkin || 0),
          contract_duration_months: row.vertragsperiode || 0
        },
        business_metrics: {
          days_inactive: row.tage_seit_letztem_checkin || 0,
          total_checkins: row.anzahl_checkins || 0,
          contract_ltv: (row.aktueller_beitrag_eur || 0) * (row.vertragsperiode || 0),
          checkins_per_euro: row.anzahl_checkins && row.aktueller_beitrag_eur ?
            (row.anzahl_checkins / row.aktueller_beitrag_eur).toFixed(2) : 0,
          churn_score_raw: row.churn_score_prozent || 0, // Bias-korrigiert
          membership_months: row.mitgliedschaft_dauer_monate || 0
        },
        retention_priority: getRetentionPriority(row.churn_score_prozent || 0) // Bias-korrigiert
      };

      console.log(`Customer ${row.mitglied_id}: Segment = ${segment}, Membership Months = ${row.mitgliedschaft_dauer_monate}, Age = ${row.alter_jahre}, Monthly Fee = ${row.aktueller_beitrag_eur}, Days Inactive = ${row.tage_seit_letztem_checkin}`);

      return customer;
    });

    const response = {
      success: true,
      customers,
      source: 'bigquery_real_data',
      query_info: {
        total_rows: customers.length,
        limit: limit,
        offset: offset,
        min_risk: minRisk,
        description: `Top ${customers.length} aktive Hochrisikokunden (≥${Math.round(minRisk * 100)}% Churn-Risiko)`,
        highest_churn_score: customers.length > 0 ? customers[0].business_metrics.churn_score_raw : 0,
        lowest_churn_score: customers.length > 0 ? customers[customers.length - 1].business_metrics.churn_score_raw : 0
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Returning real BigQuery customer data:', {
      customerCount: customers.length,
      source: response.source,
      highestRisk: response.query_info.highest_churn_score,
      lowestRisk: response.query_info.lowest_churn_score,
      minRiskThreshold: minRisk
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in high-risk BigQuery API route:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch high-risk customer data from BigQuery',
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'bigquery_error',
        details: error instanceof Error ? {
          name: error.name,
          stack: error.stack
        } : null
      },
      { status: 500 }
    );
  }
}

