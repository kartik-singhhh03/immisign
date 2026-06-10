export type HealthStatus = 'healthy' | 'warning' | 'error';

export type IntegrationHealthResult = {
  integration: string;
  status: HealthStatus;
  message: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  details?: Record<string, unknown>;
};

export type ProductionReadinessResult = {
  score: number;
  maxScore: number;
  percentage: number;
  checks: IntegrationHealthResult[];
};
