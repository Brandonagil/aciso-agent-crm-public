/**
 * Design Token Usage Examples
 * Demonstrates how to use the new design token system
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  businessColors, 
  statusColors, 
  getRiskColor, 
  getStatusVariant,
  spacing,
  typography
} from '@/lib/design-tokens';

export function TokenUsageExamples() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Design Token Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Status Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Status Colors</h3>
            <div className="flex gap-3 flex-wrap">
              <Badge 
                variant={getStatusVariant('success')}
                style={{ backgroundColor: statusColors.success, color: 'white' }}
              >
                Success
              </Badge>
              <Badge 
                variant={getStatusVariant('warning')}
                style={{ backgroundColor: statusColors.warning, color: 'white' }}
              >
                Warning
              </Badge>
              <Badge 
                variant={getStatusVariant('danger')}
                style={{ backgroundColor: statusColors.danger, color: 'white' }}
              >
                Danger
              </Badge>
              <Badge 
                variant={getStatusVariant('info')}
                style={{ backgroundColor: statusColors.info, color: 'white' }}
              >
                Info
              </Badge>
            </div>
          </div>

          {/* Business Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">CRM Business Colors</h3>
            <div className="flex gap-3 flex-wrap">
              <div 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: businessColors.retention }}
              >
                Retention
              </div>
              <div 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: businessColors.churn }}
              >
                Churn
              </div>
              <div 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: businessColors.highRisk }}
              >
                High Risk
              </div>
              <div 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: businessColors.mediumRisk }}
              >
                Medium Risk
              </div>
              <div 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: businessColors.lowRisk }}
              >
                Low Risk
              </div>
            </div>
          </div>

          {/* Risk Level Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Risk Level Mapping</h3>
            <div className="flex gap-3 flex-wrap">
              {(['KRITISCH', 'HOCH', 'ERHÖHT', 'MODERAT', 'NIEDRIG'] as const).map((level) => (
                <Badge 
                  key={level}
                  style={{ 
                    backgroundColor: getRiskColor(level),
                    color: 'white' 
                  }}
                >
                  {level}
                </Badge>
              ))}
            </div>
          </div>

          {/* Spacing Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Spacing Scale</h3>
            <div className="space-y-2">
              {Object.entries(spacing).map(([size, value]) => (
                <div key={size} className="flex items-center gap-4">
                  <span className="text-sm font-mono w-16">{size}:</span>
                  <div 
                    className="bg-blue-200 h-4"
                    style={{ width: value }}
                  />
                  <span className="text-xs text-gray-500">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Examples */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Typography Scale</h3>
            <div className="space-y-2">
              {Object.entries(typography.size).map(([size, value]) => (
                <div key={size} className="flex items-center gap-4">
                  <span className="text-sm font-mono w-16">{size}:</span>
                  <span style={{ fontSize: value }}>
                    Sample text at {size} size
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CSS Custom Properties Usage */}
          <div>
            <h3 className="text-lg font-semibold mb-3">CSS Custom Properties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg text-white"
                style={{ 
                  backgroundColor: 'var(--color-success)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                Using CSS Custom Properties directly
              </div>
              <div 
                className="p-4 rounded-lg text-white"
                style={{ 
                  backgroundColor: 'var(--color-churn)',
                  padding: 'var(--spacing-lg)',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                Multiple tokens combined
              </div>
            </div>
          </div>

          {/* Integration Example */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Real Component Integration</h3>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-4">
                Example of how to integrate design tokens into existing components:
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// In your component:
import { businessColors, getRiskColor } from '@/lib/design-tokens';

// For React inline styles:
style={{ backgroundColor: businessColors.retention }}

// For CSS custom properties:
style={{ backgroundColor: 'var(--color-retention)' }}

// For dynamic risk colors:
style={{ color: getRiskColor(customer.riskLevel) }}`}
              </pre>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}