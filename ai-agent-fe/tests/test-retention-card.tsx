// Test file to verify RetentionPlanCard fixes
import React from 'react';
import { RetentionPlanCard } from '../components/retention/RetentionPlanCard';

// Test case 1: Complete plan data
const completePlanData = {
  plan_id: "test-plan-123",
  template: {
    name: "Premium Retention Plan",
    description: "Comprehensive retention strategy for high-value customers"
  },
  target: {
    type: "individual",
    id: "12345",
    info: {
      customer_count: 1
    }
  },
  parameters: {
    budget: 1000,
    duration_weeks: 12
  },
  financial_projections: {
    roi_percentage: 25.5,
    total_investment: 1000,
    revenue_impact: 2500,
    expected_retained_customers: 1,
    net_benefit: 1500
  },
  success_metrics: {
    expected_retention_rate: 0.90,
    break_even_weeks: 6
  },
  recommendations: [
    {
      type: 'personal_contact',
      title: 'Personal Account Manager',
      description: 'Dedicated support and regular check-ins',
      success_rate: 0.85,
      total_cost: 300,
      affected_customers: 1,
      note: 'High priority customer'
    }
  ],
  timeline: [
    {
      week: 1,
      action: 'Initial contact and assessment',
      customers_affected: 1,
      investment: 100
    }
  ]
};

// Test case 2: Minimal plan data (should not crash)
const minimalPlanData = {
  plan_id: "minimal-plan-456",
  template: {
    name: "Basic Plan",
    description: "Simple retention approach"
  },
  target: {
    type: "individual",
    id: "67890",
    info: {}
  },
  parameters: {},
  financial_projections: {},
  success_metrics: {},
  recommendations: [],
  timeline: []
};

// Test case 3: Empty/undefined plan data (should not crash)
const emptyPlanData = {};

function TestRetentionCard() {
  return (
    <div className="space-y-6 p-6">
      <h1>RetentionPlanCard Tests</h1>

      <div>
        <h2>Test 1: Complete Plan Data</h2>
        <RetentionPlanCard planData={completePlanData} />
      </div>

      <div>
        <h2>Test 2: Minimal Plan Data</h2>
        <RetentionPlanCard planData={minimalPlanData} />
      </div>

      <div>
        <h2>Test 3: Empty Plan Data (should not crash)</h2>
        <RetentionPlanCard planData={emptyPlanData} />
      </div>
    </div>
  );
}

export default TestRetentionCard;