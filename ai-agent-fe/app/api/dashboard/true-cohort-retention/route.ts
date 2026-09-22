import { NextResponse } from 'next/server';
import { createBigQueryClient, getBigQueryTable, getMemberDataset } from '@/lib/config/google-cloud';
export async function GET() {
    try {
        console.log('🔍 Starting TRUE cohort retention analysis from BigQuery...');

        const bigquery = createBigQueryClient();
        const actualDataset = await getMemberDataset(bigquery);

        // 1. True Cohort Retention Analysis
        console.log('🔍 Fetching TRUE cohort retention data...');
        const cohortRetention = await getTrueCohortRetentionData(actualDataset);
        console.log(`✅ True cohort data loaded: ${cohortRetention.length} cohorts`);
        
        // 2. Revenue Cohort Analysis  
        console.log('🔍 Fetching revenue cohort data...');
        const revenueCohorts = await getRevenueCohortData(actualDataset);
        console.log(`✅ Revenue cohort data loaded: ${revenueCohorts.length} cohorts`);
        
        // 3. Cohort Summary Stats
        console.log('🔍 Calculating cohort summary statistics...');
        const cohortSummary = await getCohortSummaryStats(actualDataset);
        console.log(`✅ Cohort summary loaded`);
        
        // 4. Acquisition Quality Analysis
        console.log('🔍 Analyzing acquisition quality by cohort...');
        const acquisitionQuality = await getAcquisitionQualityData(actualDataset);
        console.log(`✅ Acquisition quality loaded: ${acquisitionQuality.length} cohorts`);

        return NextResponse.json({
            success: true,
            data: {
                cohort_retention: cohortRetention,
                revenue_cohorts: revenueCohorts,
                cohort_summary: cohortSummary,
                acquisition_quality: acquisitionQuality
            },
            source: 'bigquery_true_cohort_analytics',
            timestamp: new Date().toISOString(),
            metadata: {
                description: 'True cohort retention analysis showing actual customer retention rates',
                data_sources: ['mitglieder table with real customer journey data'],
                chart_types: ['cohort_heatmap', 'revenue_cohort', 'summary_stats', 'acquisition_quality'],
                note: 'This shows REAL retention rates, not risk percentages'
            }
        });

    } catch (error) {
        console.error('❌ Error fetching true cohort retention analytics:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch true cohort retention analytics',
                message: error instanceof Error ? error.message : 'Unknown error',
                source: 'bigquery_error'
            },
            { status: 500 }
        );
    }
}

// 1. TRUE Cohort Retention Analysis - Real retention rates
async function getTrueCohortRetentionData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH cohort_users AS (
            SELECT 
                mitglied_id,
                DATE_TRUNC(DATE(vertragsbeginn), MONTH) as cohort_month,
                vertragsbeginn,
                gekuendigt,
                kuendigungsdatum,
                aktueller_beitrag_eur,
                -- Calculate lifecycle status for each month after joining
                CASE 
                    WHEN gekuendigt = 0 THEN 'active'
                    WHEN gekuendigt = 1 AND kuendigungsdatum IS NOT NULL THEN 'churned'
                    ELSE 'unknown'
                END as lifecycle_status,
                -- Calculate months from join to churn (if churned)
                CASE 
                    WHEN gekuendigt = 1 AND kuendigungsdatum IS NOT NULL THEN 
                        DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH)
                    ELSE NULL
                END as months_to_churn
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2023-06-01'  -- Start from June 2023
                AND DATE(vertragsbeginn) <= '2024-12-31'  -- End in 2024 for sufficient follow-up
        ),
        cohort_retention_calculation AS (
            SELECT 
                cohort_month,
                COUNT(*) as cohort_size,
                -- Month 0: All customers start (100%)
                COUNT(*) as m0_active,
                -- Month 1: Still active after 1 month (never churned OR churned after month 1)
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 1) THEN 1 END) as m1_active,
                -- Month 2: Still active after 2 months  
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 2) THEN 1 END) as m2_active,
                -- Month 3: Still active after 3 months
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 3) THEN 1 END) as m3_active,
                -- Month 6: Still active after 6 months
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 6) THEN 1 END) as m6_active,
                -- Month 12: Still active after 12 months
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 12) THEN 1 END) as m12_active,
                -- Month 18: Still active after 18 months (for older cohorts)
                COUNT(CASE WHEN lifecycle_status = 'active' OR (lifecycle_status = 'churned' AND months_to_churn > 18) THEN 1 END) as m18_active
            FROM cohort_users
            GROUP BY cohort_month
            HAVING cohort_size >= 10  -- Only include meaningful cohorts
        )
        SELECT 
            cohort_month,
            cohort_size,
            -- Calculate actual retention rates (percentage still active)
            ROUND(m0_active * 100.0 / cohort_size, 1) as M0,  -- Always 100%
            ROUND(m1_active * 100.0 / cohort_size, 1) as M1,
            ROUND(m2_active * 100.0 / cohort_size, 1) as M2,
            ROUND(m3_active * 100.0 / cohort_size, 1) as M3,
            ROUND(m6_active * 100.0 / cohort_size, 1) as M6,
            ROUND(m12_active * 100.0 / cohort_size, 1) as M12,
            ROUND(m18_active * 100.0 / cohort_size, 1) as M18
        FROM cohort_retention_calculation
        ORDER BY cohort_month DESC
        LIMIT 15
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        cohort: row.cohort_month ? new Date(row.cohort_month.value || row.cohort_month).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' }) : 'Unbekannt',
        total: row.cohort_size,
        M0: row.M0,   // Always 100%
        M1: row.M1,   // Retention after 1 month
        M2: row.M2,   // Retention after 2 months
        M3: row.M3,   // Retention after 3 months
        M6: row.M6,   // Retention after 6 months
        M12: row.M12, // Retention after 12 months
        M18: row.M18  // Retention after 18 months
    }));
}

// 2. Revenue Cohort Analysis - Track revenue retention alongside customer retention
async function getRevenueCohortData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH cohort_revenue AS (
            SELECT 
                DATE_TRUNC(DATE(vertragsbeginn), MONTH) as cohort_month,
                COUNT(*) as cohort_size,
                SUM(aktueller_beitrag_eur) as total_revenue_m0,
                -- Revenue from customers still active after N months
                SUM(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 1)
                    THEN aktueller_beitrag_eur 
                END) as revenue_m1,
                SUM(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 3)
                    THEN aktueller_beitrag_eur 
                END) as revenue_m3,
                SUM(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 6)
                    THEN aktueller_beitrag_eur 
                END) as revenue_m6,
                SUM(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 12)
                    THEN aktueller_beitrag_eur 
                END) as revenue_m12,
                AVG(aktueller_beitrag_eur) as avg_revenue_per_customer
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2023-06-01'
                AND DATE(vertragsbeginn) <= '2024-12-31'
                AND aktueller_beitrag_eur > 0
            GROUP BY cohort_month
            HAVING cohort_size >= 10
        )
        SELECT 
            cohort_month,
            cohort_size,
            ROUND(avg_revenue_per_customer, 2) as avg_customer_value,
            ROUND(total_revenue_m0, 2) as initial_revenue,
            -- Revenue retention rates
            ROUND(COALESCE(revenue_m1, 0) * 100.0 / NULLIF(total_revenue_m0, 0), 1) as revenue_retention_m1,
            ROUND(COALESCE(revenue_m3, 0) * 100.0 / NULLIF(total_revenue_m0, 0), 1) as revenue_retention_m3,
            ROUND(COALESCE(revenue_m6, 0) * 100.0 / NULLIF(total_revenue_m0, 0), 1) as revenue_retention_m6,
            ROUND(COALESCE(revenue_m12, 0) * 100.0 / NULLIF(total_revenue_m0, 0), 1) as revenue_retention_m12
        FROM cohort_revenue
        ORDER BY cohort_month DESC
        LIMIT 12
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        cohort: row.cohort_month ? new Date(row.cohort_month.value || row.cohort_month).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' }) : 'Unbekannt',
        total: row.cohort_size,
        avg_customer_value: row.avg_customer_value,
        initial_revenue: row.initial_revenue,
        revenue_retention_m1: row.revenue_retention_m1 || 0,
        revenue_retention_m3: row.revenue_retention_m3 || 0,
        revenue_retention_m6: row.revenue_retention_m6 || 0,
        revenue_retention_m12: row.revenue_retention_m12 || 0
    }));
}

// 3. Cohort Summary Statistics
async function getCohortSummaryStats(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH cohort_stats AS (
            SELECT 
                COUNT(DISTINCT DATE_TRUNC(DATE(vertragsbeginn), MONTH)) as total_cohorts,
                AVG(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 3)
                    THEN 1 ELSE 0 
                END) as avg_3month_retention,
                AVG(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 12)
                    THEN 1 ELSE 0 
                END) as avg_12month_retention,
                AVG(aktueller_beitrag_eur) as avg_customer_value,
                COUNT(*) as total_customers_analyzed
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2023-06-01'
                AND DATE(vertragsbeginn) <= '2024-12-31'
                AND aktueller_beitrag_eur > 0
        )
        SELECT 
            total_cohorts,
            ROUND(avg_3month_retention * 100, 1) as avg_3month_retention_pct,
            ROUND(avg_12month_retention * 100, 1) as avg_12month_retention_pct,
            ROUND(avg_customer_value, 2) as avg_customer_value,
            total_customers_analyzed
        FROM cohort_stats
    `;

    const [rows] = await bigquery.query(query);
    const row = rows[0];
    return {
        total_cohorts: row.total_cohorts,
        avg_3month_retention: row.avg_3month_retention_pct,
        avg_12month_retention: row.avg_12month_retention_pct,
        avg_customer_value: row.avg_customer_value,
        total_customers: row.total_customers_analyzed,
        analysis_period: '2023-06-01 bis 2024-12-31'
    };
}

// 4. Acquisition Quality Analysis - Which cohorts perform better
async function getAcquisitionQualityData(dataset: string) {
    const bigquery = createBigQueryClient();
    const query = `
        WITH cohort_quality AS (
            SELECT 
                DATE_TRUNC(DATE(vertragsbeginn), MONTH) as cohort_month,
                COUNT(*) as cohort_size,
                AVG(aktueller_beitrag_eur) as avg_revenue,
                -- Calculate 6-month retention rate
                AVG(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 6)
                    THEN 1 ELSE 0 
                END) as retention_6m,
                -- Calculate 12-month retention rate  
                AVG(CASE 
                    WHEN gekuendigt = 0 OR 
                         (gekuendigt = 1 AND kuendigungsdatum IS NOT NULL AND 
                          DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH) > 12)
                    THEN 1 ELSE 0 
                END) as retention_12m,
                -- Calculate customer lifetime value (LTV estimate)
                AVG(aktueller_beitrag_eur) * AVG(CASE 
                    WHEN gekuendigt = 0 THEN 24  -- Assume 24 months for active customers
                    WHEN gekuendigt = 1 AND kuendigungsdatum IS NOT NULL THEN 
                        GREATEST(1, DATE_DIFF(DATE(kuendigungsdatum), DATE(vertragsbeginn), MONTH))
                    ELSE 12
                END) as estimated_ltv
            FROM \`${getBigQueryTable(dataset)}\`
            WHERE vertragsbeginn IS NOT NULL
                AND DATE(vertragsbeginn) >= '2023-06-01'
                AND DATE(vertragsbeginn) <= '2024-06-30'  -- Only cohorts with 12+ months of data
                AND aktueller_beitrag_eur > 0
            GROUP BY cohort_month
            HAVING cohort_size >= 10
        )
        SELECT 
            cohort_month,
            cohort_size,
            ROUND(avg_revenue, 2) as avg_monthly_revenue,
            ROUND(retention_6m * 100, 1) as retention_6m_pct,
            ROUND(retention_12m * 100, 1) as retention_12m_pct,
            ROUND(estimated_ltv, 2) as estimated_ltv,
            -- Quality score: combination of retention and revenue
            ROUND((retention_6m * 0.4 + retention_12m * 0.4 + (avg_revenue / 100) * 0.2) * 100, 1) as quality_score
        FROM cohort_quality
        ORDER BY cohort_month
    `;

    const [rows] = await bigquery.query(query);
    return rows.map(row => ({
        cohort: row.cohort_month ? new Date(row.cohort_month.value || row.cohort_month).toLocaleDateString('de-DE', { year: 'numeric', month: 'short' }) : 'Unbekannt',
        cohort_size: row.cohort_size,
        avg_monthly_revenue: row.avg_monthly_revenue,
        retention_6m: row.retention_6m_pct,
        retention_12m: row.retention_12m_pct,
        estimated_ltv: row.estimated_ltv,
        quality_score: row.quality_score
    }));
}
