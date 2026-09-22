import { NextResponse } from 'next/server';
import { createBigQueryClient, getBigQueryTable, getMemberDataset } from '@/lib/config/google-cloud';
export async function GET() {
    try {
        console.log('🔍 Starting churn data debug...');

        const bigquery = createBigQueryClient();
        const actualDataset = await getMemberDataset(bigquery);

        // Query 1: Basic churn stats
        const basicQuery = `
            SELECT 
                COUNT(*) as total_members,
                COUNT(CASE WHEN gekuendigt = 1 THEN 1 END) as total_churned,
                COUNT(CASE WHEN gekuendigt = 0 THEN 1 END) as total_active,
                COUNT(CASE WHEN kuendigungsdatum IS NOT NULL THEN 1 END) as with_churn_date
            FROM \`${getBigQueryTable(actualDataset)}\`
        `;

        const [basicRows] = await bigquery.query(basicQuery);
        console.log('📊 Basic stats:', basicRows[0]);

        // Query 2: Sample churned members
        const sampleQuery = `
            SELECT 
                mitglied_id,
                gekuendigt,
                kuendigungsdatum,
                vertragsbeginn,
                DATE(kuendigungsdatum) as churn_date_parsed
            FROM \`${getBigQueryTable(actualDataset)}\`
            WHERE gekuendigt = 1 
                AND kuendigungsdatum IS NOT NULL
            ORDER BY kuendigungsdatum DESC
            LIMIT 10
        `;

        const [sampleRows] = await bigquery.query(sampleQuery);
        console.log('📊 Sample churned members:', sampleRows);

        // Query 3: Churn by year/month
        const monthlyQuery = `
            SELECT 
                EXTRACT(YEAR FROM DATE(kuendigungsdatum)) as year,
                EXTRACT(MONTH FROM DATE(kuendigungsdatum)) as month,
                COUNT(*) as churned_count,
                MIN(kuendigungsdatum) as first_churn,
                MAX(kuendigungsdatum) as last_churn
            FROM \`${getBigQueryTable(actualDataset)}\`
            WHERE gekuendigt = 1 
                AND kuendigungsdatum IS NOT NULL
            GROUP BY year, month
            ORDER BY year DESC, month DESC
            LIMIT 20
        `;

        const [monthlyRows] = await bigquery.query(monthlyQuery);
        console.log('📊 Churn by month:', monthlyRows);

        // Query 4: Specific 2024-2025 range
        const rangeQuery = `
            SELECT 
                DATE_TRUNC(DATE(kuendigungsdatum), MONTH) as month,
                COUNT(*) as churned_count
            FROM \`${getBigQueryTable(actualDataset)}\`
            WHERE gekuendigt = 1 
                AND kuendigungsdatum IS NOT NULL
                AND DATE(kuendigungsdatum) >= '2024-01-01'
                AND DATE(kuendigungsdatum) <= '2025-04-30'
            GROUP BY month
            ORDER BY month
        `;

        const [rangeRows] = await bigquery.query(rangeQuery);
        console.log('📊 2024-2025 range:', rangeRows);

        return NextResponse.json({
            success: true,
            debug_data: {
                dataset: actualDataset,
                basic_stats: basicRows[0],
                sample_churned: sampleRows,
                monthly_breakdown: monthlyRows,
                range_2024_2025: rangeRows
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in churn debug:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to debug churn data',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
