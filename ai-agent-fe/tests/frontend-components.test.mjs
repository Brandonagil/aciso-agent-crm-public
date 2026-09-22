import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Use the installed compiler to render the real TSX components without a server.
const root = new URL('../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const base = fileURLToPath(new URL(specifier.slice(2), root));
      const path = [base, `${base}.ts`, `${base}.tsx`].find(path => existsSync(path) && statSync(path).isFile());
      assert.ok(path, `Unresolved local import: ${specifier}`);
      return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.tsx')) {
      const source = ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const { Calendar } = await import('../components/ui/calendar.tsx');
const { RetentionPlanCard } = await import('../components/retention/RetentionPlanCard.tsx');
const { createDataInteraction, hoverStates } = await import('../lib/styles/interactive-effects.ts');
const { createPremiumCard } = await import('../lib/styles/premium-effects.ts');
const { churnAnalysisSummary, churnReasons, actualChurnReasons, riskSegmentation, retentionTrends } = await import('../lib/data/churn-data.ts');
const { getGoogleCloudProjectId, getBigQueryTable, getMemberDataset } = await import('../lib/config/google-cloud.ts');

test('DayPicker 9 renders navigation and a selected day with the configured classes', () => {
  const date = new Date(2026, 8, 22);
  const html = renderToStaticMarkup(React.createElement(Calendar, {
    mode: 'single', selected: date, defaultMonth: date,
  }));
  assert.match(html, /Go to the Previous Month/);
  assert.match(html, /Go to the Next Month/);
  assert.match(html, /September 2026/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /size-8 p-0 font-normal/);
  assert.doesNotMatch(html, /IconLeft|IconRight/);
});

test('empty and partial retention plans render without missing-value crashes', () => {
  for (const planData of [{}, { parameters: {}, recommendations: [], timeline: [] }]) {
    const html = renderToStaticMarkup(React.createElement(RetentionPlanCard, { planData }));
    assert.match(html, /Retention Plan/);
    assert.doesNotMatch(html, /NaN|undefined/);
  }
});

test('card, chart and table interactions use their corresponding hover styles', () => {
  for (const [type, key] of [['card', 'kpiCard'], ['chart', 'chart'], ['table', 'dataRow']]) {
    assert.equal(createDataInteraction(type, { entrance: false }), hoverStates[key]);
    assert.equal(createDataInteraction(type, { hover: false, entrance: false }), '');
  }
});

test('premium cards select a context level and retain the documented fallback', () => {
  assert.match(createPremiumCard('churn', 'high'), /from-red-50/);
  assert.match(createPremiumCard('performance', 'excellent'), /from-emerald-50/);
  assert.match(createPremiumCard('revenue', 'stable'), /from-slate-50/);
  assert.match(createPremiumCard('churn', 'unknown'), /from-slate-50/);
});

test('synthetic dashboard counts and revenue agree across cards and segments', () => {
  const summary = churnAnalysisSummary;
  assert.equal(summary.source, 'synthetic_fixture');
  assert.equal(summary.total_customers, 12);
  assert.equal(summary.active_customers, 10);
  assert.equal(summary.total_at_risk, 4);
  assert.equal(summary.total_revenue_at_risk, 200);
  assert.equal(Object.values(summary.risk_distribution).reduce((sum, count) => sum + count, 0), summary.active_customers);
  assert.equal(riskSegmentation.reduce((sum, segment) => sum + segment.count, 0), summary.active_customers);
  assert.equal(Object.values(summary.zahlweise_risk_analysis).reduce((sum, group) => sum + group.revenue_at_risk, 0), summary.total_revenue_at_risk);
  assert.equal(churnReasons.reduce((sum, reason) => sum + reason.count, 0), summary.total_at_risk);
  assert.equal(actualChurnReasons.reduce((sum, reason) => sum + reason.count, 0), summary.total_customers - summary.active_customers);
  assert.equal(retentionTrends.at(-1).retention, summary.retention_score);
});

test('BigQuery configuration accepts owned resources and rejects SQL identifier injection without a cloud call', async () => {
  const keys = ['GOOGLE_CLOUD_PROJECT', 'BQ_PROJECT_ID', 'BQ_DATASET_ID'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.GOOGLE_CLOUD_PROJECT = 'example-project';
    process.env.BQ_PROJECT_ID = 'example-query-project';
    process.env.BQ_DATASET_ID = 'synthetic_members';
    assert.equal(getGoogleCloudProjectId(), 'example-query-project');
    assert.equal(getBigQueryTable('synthetic_members'), 'example-query-project.synthetic_members.mitglieder');
    assert.equal(await getMemberDataset({ getDatasets: () => assert.fail('Configured dataset must not trigger discovery') }), 'synthetic_members');
    assert.throws(() => getBigQueryTable('members`; DROP TABLE members; --'), /identifier is invalid/);
    assert.throws(() => getBigQueryTable('members', 'rows`'), /identifier is invalid/);
    delete process.env.BQ_PROJECT_ID;
    delete process.env.BQ_DATASET_ID;
    assert.equal(getGoogleCloudProjectId(), 'example-project');
    assert.equal(await getMemberDataset({ getDatasets: async () => [[{ id: 'other' }, { id: 'sample_churn' }]] }), 'sample_churn');
    await assert.rejects(getMemberDataset({ getDatasets: async () => [[]] }), /No BigQuery datasets found/);
    process.env.GOOGLE_CLOUD_PROJECT = 'project`';
    assert.throws(() => getBigQueryTable('members'), /project ID is invalid/);
    delete process.env.GOOGLE_CLOUD_PROJECT;
    assert.throws(() => getGoogleCloudProjectId(), /Set BQ_PROJECT_ID or GOOGLE_CLOUD_PROJECT/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
