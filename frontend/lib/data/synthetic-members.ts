/** Invented records for static UI examples. These are not customer data or model results. */
export const syntheticMembers = [
  { id: 'SYN-001', active: true, score: 0.80, monthlyFee: 50, payment: 'F' },
  { id: 'SYN-002', active: true, score: 0.60, monthlyFee: 40, payment: '1M' },
  { id: 'SYN-003', active: true, score: 0.65, monthlyFee: 60, payment: '1M' },
  { id: 'SYN-004', active: true, score: 0.68, monthlyFee: 50, payment: 'F' },
  { id: 'SYN-005', active: true, score: 0.40, monthlyFee: 30, payment: '1M' },
  { id: 'SYN-006', active: true, score: 0.45, monthlyFee: 50, payment: '1M' },
  { id: 'SYN-007', active: true, score: 0.50, monthlyFee: 60, payment: '3M' },
  { id: 'SYN-008', active: true, score: 0.10, monthlyFee: 30, payment: '3M' },
  { id: 'SYN-009', active: true, score: 0.20, monthlyFee: 40, payment: '1T' },
  { id: 'SYN-010', active: true, score: 0.30, monthlyFee: 50, payment: '24M' },
  { id: 'SYN-011', active: false, score: 0.90, monthlyFee: 40, payment: '1M' },
  { id: 'SYN-012', active: false, score: 0.70, monthlyFee: 50, payment: 'F' },
] as const;

export const syntheticActiveMembers = syntheticMembers.filter(member => member.active);
export const syntheticAtRiskMembers = syntheticActiveMembers.filter(member => member.score >= 0.6);
export const syntheticFixtureSource = 'synthetic_fixture' as const;
export const syntheticFixtureTimestamp = '2026-04-30T12:00:00Z';

export const syntheticRiskDistribution = {
  KRITISCH: syntheticActiveMembers.filter(member => member.score >= 0.7).length,
  HOCH: syntheticActiveMembers.filter(member => member.score >= 0.6 && member.score < 0.7).length,
  MITTEL: syntheticActiveMembers.filter(member => member.score >= 0.4 && member.score < 0.6).length,
  NIEDRIG: syntheticActiveMembers.filter(member => member.score < 0.4).length,
};

export const syntheticChurnRate = (syntheticMembers.length - syntheticActiveMembers.length) / syntheticMembers.length * 100;
export const syntheticAverageRisk = syntheticActiveMembers.reduce((sum, member) => sum + member.score, 0) / syntheticActiveMembers.length;
export const syntheticRevenueAtRisk = syntheticAtRiskMembers.reduce((sum, member) => sum + member.monthlyFee, 0);
