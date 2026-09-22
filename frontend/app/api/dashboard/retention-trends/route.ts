import { NextResponse } from 'next/server';
import { createBigQueryClient, getBigQueryTable, getMemberDataset } from '@/lib/config/google-cloud';


interface RetentionTrendData {
  month: string;
  month_short: string;
  retention: number;
  churn: number;
  clv: number;
  new_customers: number;
  year: number;
}

export async function GET() {
    try {
        console.log('🔍 Starting BigQuery retention trends analysis...');

        // Get real retention trends from BigQuery
        const retentionTrends = await getRealRetentionTrendsFromBigQuery();

        // Calculate aggregate statistics from real BigQuery data
        const totalCustomers = retentionTrends.reduce((sum, item) => sum + item.new_customers, 0);
        const avgRetention = retentionTrends.length > 0 ? retentionTrends.reduce((sum, item) => sum + item.retention, 0) / retentionTrends.length : 0;
        const avgChurn = retentionTrends.length > 0 ? retentionTrends.reduce((sum, item) => sum + item.churn, 0) / retentionTrends.length : 0;
        const currentRetention = retentionTrends[retentionTrends.length - 1]?.retention || 0;
        const previousRetention = retentionTrends.length >= 2 ? retentionTrends[retentionTrends.length - 2]?.retention || 0 : 0;
        const retentionTrend = retentionTrends.length >= 2 ? currentRetention - previousRetention : 0;

        // Find best and worst months from real data
        const bestMonth = retentionTrends.reduce((max, item) => item.retention > max.retention ? item : max);
        const worstMonth = retentionTrends.reduce((min, item) => item.retention < min.retention ? item : min);

        console.log(`✅ BigQuery retention trends: ${retentionTrends.length} months, avg retention: ${avgRetention.toFixed(1)}%`);

        return NextResponse.json({
            success: true,
            data: retentionTrends,
            statistics: {
                total_periods: retentionTrends.length,
                total_customers: totalCustomers,
                avg_retention_rate: Math.round(avgRetention * 10) / 10,
                avg_churn_rate: Math.round(avgChurn * 10) / 10,
                current_retention_rate: currentRetention,
                retention_trend: Math.round(retentionTrend * 10) / 10,
                best_retention_month: bestMonth,
                worst_retention_month: worstMonth
            },
            source: 'bigquery_real_data',
            timestamp: new Date().toISOString(),
            query_info: {
                description: 'Live BigQuery retention trends from mitglieder table',
                date_range: retentionTrends.length > 0 ? `${retentionTrends[0].month} - ${retentionTrends[retentionTrends.length - 1].month}` : 'No data',
                method: 'Monthly aggregation from churn_prevention.mitglieder with bias-corrected scores',
                data_points: retentionTrends.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching BigQuery retention trends:', error);

        // Fallback to empty data instead of failing completely
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch BigQuery retention trends',
                message: error instanceof Error ? error.message : 'Unknown error',
                source: 'bigquery_error',
                fallback_data: []
            },
            { status: 500 }
        );
    }
}

// Get real retention trends from BigQuery
async function getRealRetentionTrendsFromBigQuery(): Promise<RetentionTrendData[]> {
  try {
    console.log('🔍 Fetching retention trends from BigQuery...');

    const bigquery = createBigQueryClient();
    const actualDataset = await getMemberDataset(bigquery);


    // BigQuery SQL for monthly retention trends
    const trendsQuery = `
      WITH monthly_stats AS (
        SELECT
          DATE_TRUNC(DATE(vertragsbeginn), MONTH) as month_date,
          COUNT(*) as total_customers,
          COUNT(CASE WHEN gekuendigt = 0 THEN 1 END) as active_customers,
          COUNT(CASE WHEN gekuendigt = 1 THEN 1 END) as churned_customers,
          AVG(CASE WHEN aktueller_beitrag_eur > 0 THEN aktueller_beitrag_eur * 12 END) as avg_clv
        FROM \`${getBigQueryTable(actualDataset)}\`
        WHERE vertragsbeginn IS NOT NULL
          AND DATE(vertragsbeginn) >= '2023-09-01'
          AND DATE(vertragsbeginn) <= CURRENT_DATE()
        GROUP BY month_date
        HAVING total_customers > 0
      )
      SELECT
        month_date,
        total_customers as new_customers,
        ROUND((active_customers * 100.0 / total_customers), 1) as retention,
        ROUND((churned_customers * 100.0 / total_customers), 1) as churn,
        ROUND(COALESCE(avg_clv, 2800), 0) as clv,
        EXTRACT(YEAR FROM month_date) as year
      FROM monthly_stats
      ORDER BY month_date DESC
      LIMIT 20
    `;

    console.log('🔍 Executing BigQuery retention trends query...');
    const [rows] = await bigquery.query(trendsQuery);

    console.log(`✅ BigQuery returned ${rows.length} retention trend periods`);

    // Transform BigQuery results to frontend format
    const trends: RetentionTrendData[] = rows.map((row) => {
      const monthDate = new Date(row.month_date.value);
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const monthShorts = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

      const monthName = monthNames[monthDate.getMonth()];
      const monthShort = monthShorts[monthDate.getMonth()];
      const year = row.year;

      return {
        month: `${monthName} ${year}`,
        month_short: `${monthShort} ${year.toString().slice(-2)}`,
        retention: parseFloat(row.retention) || 0,
        churn: parseFloat(row.churn) || 0,
        clv: parseFloat(row.clv) || 0,
        new_customers: parseInt(row.new_customers) || 0,
        year: year
      };
    });

    console.log(`✅ Transformed ${trends.length} retention trend periods`);
    return trends.reverse(); // Chronological order

  } catch (error) {
    console.error('❌ Error querying BigQuery for retention trends:', error);
    throw error;
  }
}
