import { NextResponse } from 'next/server';
import { createBigQueryClient, getBigQueryTable, getMemberDataset } from '@/lib/config/google-cloud';
export async function GET() {
    try {
        console.log('Starting comprehensive retention analytics from BigQuery...');

        const bigquery = createBigQueryClient();
        const actualDataset = await getMemberDataset(bigquery);

        // 1. Cohort Retention Analysis
        console.log('Fetching cohort retention data...');
        const cohortData = await getCohortRetentionData(actualDataset);
        console.log(`Cohort data loaded: ${cohortData.length} cohorts`);

        // 2. Risk Distribution Analysis  
        console.log('Fetching risk distribution data...');
        const riskDistribution = await getRiskDistributionData(actualDataset);
        console.log(`Risk distribution loaded: ${riskDistribution.length} members`);

        // 3. Churn by Segments Analysis
        console.log('Fetching segment analysis data...');
        const churnBySegments = await getChurnBySegmentsData(actualDataset);
        console.log(`Segment data loaded: ${churnBySegments.length} segments`);

        // 4. Monthly Trends Analysis
        console.log('🔍 Fetching monthly trends data...');
        const monthlyTrends = await getMonthlyTrendsData(actualDataset);
        console.log(`✅ Monthly trends loaded: ${monthlyTrends.length} months`);

        // 5. Engagement vs Churn Analysis
        console.log('🔍 Fetching engagement analysis data...');
        const engagementAnalysis = await getEngagementVsChurnData(actualDataset);
        console.log(`✅ Engagement analysis loaded: ${engagementAnalysis.length} groups`);

        return NextResponse.json({
            success: true,
            data: {
                cohort_retention: cohortData,
                risk_distribution: riskDistribution,
                churn_by_segments: churnBySegments,
                monthly_trends: monthlyTrends,
                engagement_analysis: engagementAnalysis
            },
            source: 'bigquery_comprehensive_analytics',
            timestamp: new Date().toISOString(),
            metadata: {
                description: 'Comprehensive retention analytics with bias-corrected churn scores',
                data_sources: ['mitglieder table with real churn predictions'],
                chart_types: ['cohort_heatmap', 'risk_scatter', 'segment_radar', 'trend_composed', 'engagement_correlation']
            }
        });

    } catch (error) {
        console.error('❌ Error fetching comprehensive retention analytics:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch comprehensive retention analytics',
                message: error instanceof Error ? error.message : 'Unknown error',
                source: 'bigquery_error'
            },
            { status: 500 }
        );
    }
}

// 1. Cohort Churn-Score Analysis - Durchschnittliche Churn-Scores pro Kohorte
async function getCohortRetentionData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH cohort_users AS (
            SELECT 
                mitglied_id,
                DATE_TRUNC(DATE(vertragsbeginn), MONTH) as cohort_month,
                vertragsbeginn,
                churn_score_bias_corrected,
                mitgliedschaft_dauer_monate
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2023-01-01'
                AND DATE(vertragsbeginn) <= '2025-04-30'
                AND churn_score_bias_corrected IS NOT NULL
        ),
        cohort_churn_analysis AS (
            SELECT 
                cohort_month,
                COUNT(*) as cohort_size,
                -- Durchschnittlicher Churn-Score der gesamten Kohorte
                ROUND(AVG(churn_score_bias_corrected), 1) as avg_churn_score,
                -- Churn-Score für Mitglieder mit 0-1 Monaten Mitgliedschaft
                ROUND(AVG(CASE WHEN mitgliedschaft_dauer_monate <= 1 THEN churn_score_bias_corrected END), 1) as M0_M1,
                -- Churn-Score für Mitglieder mit 2-3 Monaten Mitgliedschaft  
                ROUND(AVG(CASE WHEN mitgliedschaft_dauer_monate BETWEEN 2 AND 3 THEN churn_score_bias_corrected END), 1) as M2_M3,
                -- Churn-Score für Mitglieder mit 4-6 Monaten Mitgliedschaft
                ROUND(AVG(CASE WHEN mitgliedschaft_dauer_monate BETWEEN 4 AND 6 THEN churn_score_bias_corrected END), 1) as M4_M6,
                -- Churn-Score für Mitglieder mit 7-12 Monaten Mitgliedschaft
                ROUND(AVG(CASE WHEN mitgliedschaft_dauer_monate BETWEEN 7 AND 12 THEN churn_score_bias_corrected END), 1) as M7_M12,
                -- Churn-Score für Mitglieder mit 13+ Monaten Mitgliedschaft
                ROUND(AVG(CASE WHEN mitgliedschaft_dauer_monate > 12 THEN churn_score_bias_corrected END), 1) as M13_plus
            FROM cohort_users
            GROUP BY cohort_month
            HAVING COUNT(*) >= 10  -- Only meaningful cohorts
        )
        SELECT 
            cohort_month,
            cohort_size,
            avg_churn_score,
            M0_M1 as M0,
            M2_M3 as M1,
            M4_M6 as M2,
            M7_M12 as M3,
            M13_plus as M6,
            NULL as M12,
            NULL as M18,
            NULL as M24
        FROM cohort_churn_analysis
        ORDER BY cohort_month DESC
        LIMIT 12
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        cohort: row.cohort_month ? new Date(row.cohort_month.value || row.cohort_month).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' }) : 'Unbekannt',
        total: row.cohort_size,
        avg_score: row.avg_churn_score,
        M0: row.M0 || null,
        M1: row.M1 || null,
        M2: row.M2 || null,
        M3: row.M3 || null,
        M6: row.M6 || null,
        M12: row.M12 || null,
        M18: row.M18 || null,
        M24: row.M24 || null
    }));
}

// 2. Risk Distribution Analysis - Complete active member distribution
async function getRiskDistributionData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        SELECT 
            mitglied_id,
            tage_seit_letztem_checkin,
            checkins_pro_monat,
            churn_score_bias_corrected,
            churn_score_prozent, -- Fallback für fehlende bias-corrected Werte
            aktueller_beitrag_eur,
            mitgliedschaft_dauer_monate,
            alter_jahre,
            CASE 
                WHEN COALESCE(churn_score_bias_corrected, churn_score_prozent) >= 70 THEN 'critical'
                WHEN COALESCE(churn_score_bias_corrected, churn_score_prozent) >= 60 THEN 'high' 
                WHEN COALESCE(churn_score_bias_corrected, churn_score_prozent) >= 40 THEN 'medium'
                ELSE 'low'
            END as risk_level
        FROM \`${getBigQueryTable(dataset)}\`
        WHERE gekuendigt = 0  -- Only active members
            AND vertragsbeginn IS NOT NULL
            AND (churn_score_bias_corrected IS NOT NULL OR churn_score_prozent IS NOT NULL)
            AND DATE(vertragsbeginn) <= '2025-04-30'  -- Data cutoff
        -- Keine Sample-Begrenzung - alle aktiven Kunden für echte Verteilung
    `;

    const [rows] = await bigquery.query(query);
    console.log(`📊 Risk distribution loaded: ${rows.length} active members`);

    // Log actual distribution counts for debugging
    const riskCounts = {
        critical: rows.filter(r => (r.churn_score_bias_corrected || r.churn_score_prozent) >= 70).length,
        high: rows.filter(r => (r.churn_score_bias_corrected || r.churn_score_prozent) >= 60 && (r.churn_score_bias_corrected || r.churn_score_prozent) < 70).length,
        medium: rows.filter(r => (r.churn_score_bias_corrected || r.churn_score_prozent) >= 40 && (r.churn_score_bias_corrected || r.churn_score_prozent) < 60).length,
        low: rows.filter(r => (r.churn_score_bias_corrected || r.churn_score_prozent) < 40).length
    };
    console.log('🎯 Actual risk distribution:', riskCounts);

    return rows.map(row => ({
        member_id: row.mitglied_id,
        membership_months: row.mitgliedschaft_dauer_monate || 0,
        churn_score: row.churn_score_bias_corrected || row.churn_score_prozent,
        churn_score_bias_corrected: row.churn_score_bias_corrected, // Für Frontend-Zugriff
        monthly_fee: row.aktueller_beitrag_eur || 0,
        age: row.alter_jahre || 0,
        days_inactive: row.tage_seit_letztem_checkin || 0,
        monthly_checkins: row.checkins_pro_monat || 0,
        risk_level: row.risk_level
    }));
}

// 3. Churn by Segments Analysis - For radar chart
async function getChurnBySegmentsData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH member_segments AS (
            SELECT 
                mitglied_id,
                churn_score_bias_corrected,
                aktueller_beitrag_eur,
                alter_jahre,
                mitgliedschaft_dauer_monate,
                tage_seit_letztem_checkin,
                checkins_pro_monat,
                CASE 
                    WHEN aktueller_beitrag_eur >= 100 THEN 'Premium'
                    WHEN aktueller_beitrag_eur >= 50 THEN 'Standard'
                    ELSE 'Basis'
                END as fee_segment,
                CASE 
                    WHEN alter_jahre <= 25 THEN 'Jung'
                    WHEN alter_jahre <= 45 THEN 'Mittel'
                    ELSE 'Senior'
                END as age_segment,
                CASE 
                    WHEN mitgliedschaft_dauer_monate <= 6 THEN 'Neu'
                    WHEN mitgliedschaft_dauer_monate <= 24 THEN 'Standard'
                    ELSE 'Veteran'
                END as tenure_segment
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE gekuendigt = 0
                AND vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) <= '2025-04-30'
        )
        SELECT 
            fee_segment as segment,
            'Fee' as segment_type,
            AVG(churn_score_bias_corrected) as avg_churn_score,
            AVG(checkins_pro_monat) as avg_engagement,
            AVG(aktueller_beitrag_eur) as avg_value,
            COUNT(*) as member_count
        FROM member_segments
        GROUP BY fee_segment
        
        UNION ALL
        
        SELECT 
            age_segment as segment,
            'Age' as segment_type,
            AVG(churn_score_bias_corrected) as avg_churn_score,
            AVG(checkins_pro_monat) as avg_engagement,
            AVG(aktueller_beitrag_eur) as avg_value,
            COUNT(*) as member_count
        FROM member_segments
        GROUP BY age_segment
        
        UNION ALL
        
        SELECT 
            tenure_segment as segment,
            'Tenure' as segment_type,
            AVG(churn_score_bias_corrected) as avg_churn_score,
            AVG(checkins_pro_monat) as avg_engagement,
            AVG(aktueller_beitrag_eur) as avg_value,
            COUNT(*) as member_count
        FROM member_segments
        GROUP BY tenure_segment
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        segment: row.segment,
        segment_type: row.segment_type,
        avg_churn_risk: Math.round(row.avg_churn_score),
        avg_engagement: Math.round(row.avg_engagement * 10) / 10,
        avg_value: Math.round(row.avg_value),
        member_count: row.member_count
    }));
}

// 4. Monthly Trends Analysis - For composed chart  
async function getMonthlyTrendsData(dataset: string) {
    const bigquery = createBigQueryClient();
    // First, let's debug the churn data separately
    const debugChurnQuery = `
        SELECT 
            DATE_TRUNC(DATE(kuendigungsdatum), MONTH) as month,
            COUNT(*) as churned_count,
            MIN(kuendigungsdatum) as first_churn,
            MAX(kuendigungsdatum) as last_churn
        FROM \`${getBigQueryTable(dataset)}\`
        WHERE gekuendigt = 1 
            AND kuendigungsdatum IS NOT NULL
        GROUP BY month
        ORDER BY month DESC
        LIMIT 10
    `;

    console.log('🔍 Debug: Checking churn by month...');
    const [debugChurnRows] = await bigquery.query(debugChurnQuery);
    console.log('📊 Churn by month:', debugChurnRows);

    const query = `
        WITH all_months AS (
            -- Get all months with any activity
            SELECT DISTINCT month_date 
            FROM (
                SELECT DATE_TRUNC(DATE(vertragsbeginn), MONTH) as month_date
                FROM \`${getBigQueryTable(dataset)}\`
                WHERE vertragsbeginn IS NOT NULL
                    AND DATE(vertragsbeginn) >= '2020-01-01'
                    AND DATE(vertragsbeginn) <= '2025-04-30'
                
                UNION DISTINCT
                
                SELECT DATE_TRUNC(DATE(kuendigungsdatum), MONTH) as month_date
                FROM \`${getBigQueryTable(dataset)}\`
                WHERE gekuendigt = 1 
                    AND kuendigungsdatum IS NOT NULL
                    AND DATE(kuendigungsdatum) >= '2026-01-01'
                    AND DATE(kuendigungsdatum) <= '2028-12-31'
            )
        ),
        new_members_by_month AS (
            SELECT 
                DATE_TRUNC(DATE(vertragsbeginn), MONTH) as month_date,
                COUNT(*) as new_members,
                AVG(churn_score_bias_corrected) as avg_risk_score
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2020-01-01'
                AND DATE(vertragsbeginn) <= '2025-04-30'
                AND churn_score_bias_corrected IS NOT NULL
            GROUP BY month_date
        ),
        churned_by_month AS (
            SELECT 
                DATE_TRUNC(DATE(kuendigungsdatum), MONTH) as month_date,
                COUNT(*) as churned_members
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE gekuendigt = 1 
                AND kuendigungsdatum IS NOT NULL
                AND DATE(kuendigungsdatum) >= '2026-01-01'
                AND DATE(kuendigungsdatum) <= '2028-12-31'
            GROUP BY month_date
        )
        SELECT 
            am.month_date,
            COALESCE(nm.new_members, 0) as new_members,
            COALESCE(cm.churned_members, 0) as churned_members,
            ROUND(COALESCE(nm.avg_risk_score, 0), 1) as avg_risk_score,
            COALESCE(nm.new_members, 0) - COALESCE(cm.churned_members, 0) as net_growth
        FROM all_months am
        LEFT JOIN new_members_by_month nm ON am.month_date = nm.month_date
        LEFT JOIN churned_by_month cm ON am.month_date = cm.month_date
        ORDER BY am.month_date
    `;

    const [rows] = await bigquery.query(query);

    console.log(`✅ Monthly trends: ${rows.length} months found`);
    console.log('🔍 Sample with churned data:', rows.filter(r => r.churned_members > 0).slice(0, 3));

    return rows.map(row => {
        let monthLabel = 'Unbekannt';
        if (row.month_date) {
            try {
                const date = new Date(row.month_date.value || row.month_date);
                if (!isNaN(date.getTime())) {
                    monthLabel = date.toLocaleDateString('de-DE', { year: 'numeric', month: 'short' });
                }
            } catch {
                console.warn('Date parsing error for month:', row.month_date);
            }
        }

        return {
            month: monthLabel,
            new_members: row.new_members,
            churned_members: row.churned_members,
            avg_risk_score: row.avg_risk_score,
            net_growth: row.net_growth
        };
    });
}

// 5. Engagement vs Churn Analysis
async function getEngagementVsChurnData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        SELECT 
            ROUND(checkins_pro_monat, 0) as monthly_checkins,
            AVG(churn_score_bias_corrected) as avg_churn_score,
            COUNT(*) as member_count,
            AVG(aktueller_beitrag_eur) as avg_revenue
        FROM \`${getBigQueryTable(dataset)}\`
        WHERE gekuendigt = 0
            AND checkins_pro_monat IS NOT NULL
            AND churn_score_bias_corrected IS NOT NULL
            AND DATE(vertragsbeginn) <= '2025-04-30'
        GROUP BY monthly_checkins
        HAVING member_count >= 5  -- Only include meaningful groups
        ORDER BY monthly_checkins
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        monthly_checkins: row.monthly_checkins,
        avg_churn_score: Math.round(row.avg_churn_score * 10) / 10,
        member_count: row.member_count,
        avg_revenue: Math.round(row.avg_revenue)
    }));
}
