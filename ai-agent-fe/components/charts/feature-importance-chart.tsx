'use client';

import * as React from 'react';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Brain, TrendingUp, BarChart3 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  featureDictionary,
  getCategoryColor,
  getRiskDirectionIcon,
  type FeatureMetadata
} from '@/lib/feature-dictionary';

// Invented feature weights for the chart. These are not measured SHAP values.
const featureImportanceData = [
  {
    id: 'tage_seit_letztem_checkin',
    globalImportance: 0.35,
    averageImpact: 0.25,
    category: 'activity'
  },
  {
    id: 'checkins_pro_monat',
    globalImportance: 0.25,
    averageImpact: -0.20,
    category: 'activity'
  },
  {
    id: 'aktueller_beitrag_eur',
    globalImportance: 0.15,
    averageImpact: 0.10,
    category: 'financial'
  },
  {
    id: 'engagement_score',
    globalImportance: 0.10,
    averageImpact: -0.07,
    category: 'engagement'
  },
  {
    id: 'durchschn_aufenthalt_min',
    globalImportance: 0.07,
    averageImpact: -0.05,
    category: 'behavioral'
  },
  {
    id: 'alter_jahre',
    globalImportance: 0.05,
    averageImpact: 0.02,
    category: 'demographic'
  },
  {
    id: 'zahlweise',
    globalImportance: 0.03,
    averageImpact: 0.01,
    category: 'financial'
  }
];

// Chart-Konfiguration mit kategorie-basierten Farben
const chartConfig = {
  globalImportance: {
    label: 'Feature Importance',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

interface FeatureDetailsSheetProps {
  feature: typeof featureImportanceData[0] & { metadata: FeatureMetadata };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function FeatureDetailsSheet({ feature, isOpen, onOpenChange }: FeatureDetailsSheetProps) {
  const impactDirection = feature.averageImpact > 0 ? 'increases' : 'decreases';
  const impactColor = feature.averageImpact > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {feature.metadata.label}
          </SheetTitle>
          <SheetDescription>
            Synthetisches Feature-Beispiel • Kategorie: {feature.metadata.category}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Importance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground">Global Importance</div>
              <div className="text-2xl font-bold">{feature.globalImportance.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">Magnitude (|SHAP|)</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm text-muted-foreground">Average Impact</div>
              <div className={`text-2xl font-bold ${impactColor}`}>
                {feature.averageImpact > 0 ? '+' : ''}{feature.averageImpact.toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground">Direction (SHAP)</div>
            </div>
          </div>

          {/* Risk Direction Indicator */}
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getRiskDirectionIcon(feature.metadata.riskDirection)}</span>
              <span className="font-medium">Churn-Risiko Verhalten</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Dieses Feature <span className={impactColor}>{impactDirection}</span> das Churn-Risiko im Durchschnitt.
              {feature.metadata.unit && ` Gemessen in: ${feature.metadata.unit}`}
            </div>
          </div>

          {/* Business Description */}
          <div>
            <h4 className="font-medium mb-2">Was bedeutet das?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.metadata.description}
            </p>
          </div>

          {/* Actionable Insights */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Empfohlene Maßnahmen
            </h4>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                {feature.metadata.businessAction}
              </p>
            </div>
          </div>

          {/* Category Badge */}
          <div>
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: getCategoryColor(feature.metadata.category) }}
            >
              {feature.metadata.category} Feature
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function FeatureImportanceChart() {
  const [selectedFeature, setSelectedFeature] = React.useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Enrichiere Daten mit Metadata
  const enrichedData = featureImportanceData.map(feature => ({
    ...feature,
    metadata: featureDictionary[feature.id],
    displayLabel: featureDictionary[feature.id]?.label || feature.id
  })).filter(feature => feature.metadata); // Nur Features mit Dictionary-Eintrag

  const handleBarClick = (featureId: string) => {
    setSelectedFeature(featureId);
    setSheetOpen(true);
  };

  const selectedFeatureData = selectedFeature
    ? enrichedData.find(f => f.id === selectedFeature)
    : null;

  return (
    <>
      <Card className="group">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                ML Feature-Importance
              </CardTitle>
              <CardDescription>
                Synthetische Feature-Gewichte zur Darstellung. Keine gemessene Modellgüte.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart
              data={enrichedData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
              barCategoryGap="10%"
            >
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(value) => value.toFixed(2)}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayLabel"
                width={140}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <ChartTooltip
                cursor={{ fill: 'transparent' }}
                content={
                  <ChartTooltipContent
                    className="bg-background/95 backdrop-blur-md border shadow-xl rounded-xl p-4 max-w-[320px]"
                    labelFormatter={(value) => (
                      <div className="flex items-center gap-2 font-medium mb-3">
                        <Brain className="h-4 w-4 text-primary" />
                        {value}
                      </div>
                    )}
                    formatter={(value, name, props) => {
                      const feature = props.payload as FeatureDetailsSheetProps['feature'] | undefined;
                      const impact = feature?.averageImpact || 0;
                      const impactText = impact > 0 ? `+${impact.toFixed(3)}` : impact.toFixed(3);
                      const impactColor = impact > 0 ? 'text-red-600' : 'text-green-600';
                      const metadata = feature?.metadata;

                      return [
                        <div key="feature-details" className="space-y-3">
                          {/* SHAP Values */}
                          <div className="space-y-1">
                            <div className="font-mono font-semibold">
                              Importance: {Number(value).toFixed(3)}
                            </div>
                            <div className={`text-xs ${impactColor}`}>
                              Avg. Impact: {impactText}
                            </div>
                          </div>

                          {/* Composition Details */}
                          {metadata?.composition && (
                            <div className="border-t pt-2 space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">
                                Feature Zusammensetzung:
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Quelle:</span>
                                  <span className="font-medium">{metadata.composition.source}</span>
                                </div>
                                {metadata.composition.calculation && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Berechnung:</span>
                                    <code className="bg-muted/50 px-2 py-1 rounded text-xs font-mono">
                                      {metadata.composition.calculation}
                                    </code>
                                  </div>
                                )}
                                {metadata.composition.components && (
                                  <div className="space-y-1">
                                    <span className="text-muted-foreground">Komponenten:</span>
                                    <ul className="text-xs space-y-0.5 ml-2">
                                      {metadata.composition.components.map((component, idx) => (
                                        <li key={idx} className="flex items-start gap-1">
                                          <span className="text-muted-foreground">•</span>
                                          <span>{component}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">System:</span>
                                  <span className="font-medium">{metadata.composition.dataSource}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>,
                        null
                      ];
                    }}
                  />
                }
              />
              <Bar
                dataKey="globalImportance"
                radius={[0, 4, 4, 0]}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={(_, index) => setHoveredFeature(enrichedData[index]?.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                {enrichedData.map((entry, index) => {
                  const isHovered = hoveredFeature === entry.id;
                  const baseColor = getCategoryColor(entry.metadata.category);

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={baseColor}
                      opacity={isHovered ? 0.8 : 1}
                      stroke={isHovered ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={isHovered ? 2 : 0}
                      onClick={() => handleBarClick(entry.id)}
                      className="transition-all duration-300"
                      style={{
                        filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : ''
                      }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>

          {/* Legend/Instructions */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Klicken Sie auf einen Balken für detaillierte Analysen und Business-Empfehlungen
            </p>
          </div>
        </CardContent>

        <CardFooter className="pt-6">
          <div className="w-full space-y-2">
            {/* Footer content removed */}
          </div>
        </CardFooter>
      </Card>

      {/* Feature Details Sheet */}
      {selectedFeatureData && (
        <FeatureDetailsSheet
          feature={selectedFeatureData}
          isOpen={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  );
}