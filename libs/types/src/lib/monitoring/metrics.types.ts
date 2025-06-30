/**
 * 监控指标类型定义
 * 支持Prometheus指标和自定义业务指标
 */

export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  labels?: Record<string, string>;
  value: number;
  timestamp: string;
  unit?: string;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface MetricQuery {
  metric: string;
  labels?: Record<string, string>;
  startTime: string;
  endTime: string;
  step?: string;
  aggregation?: MetricAggregation;
}

export enum MetricAggregation {
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  RATE = 'rate',
  INCREASE = 'increase',
  PERCENTILE_50 = 'percentile_50',
  PERCENTILE_95 = 'percentile_95',
  PERCENTILE_99 = 'percentile_99',
}

export interface MetricSeries {
  metric: string;
  labels: Record<string, string>;
  values: MetricValue[];
}

export interface MetricValue {
  timestamp: string;
  value: number;
}

export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  timestamp: string;
}

export interface CPUMetrics {
  usage: number; // percentage
  loadAverage: number[];
  cores: number;
}

export interface MemoryMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usage: number; // percentage
}

export interface DiskMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usage: number; // percentage
  readOps: number;
  writeOps: number;
  readBytes: number;
  writeBytes: number;
}

export interface NetworkMetrics {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  errors: number;
  drops: number;
}

export interface ApplicationMetrics {
  http: HTTPMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  queue: QueueMetrics;
  business: BusinessMetrics;
  timestamp: string;
}

export interface HTTPMetrics {
  requestsTotal: number;
  requestsPerSecond: number;
  responseTime: ResponseTimeMetrics;
  statusCodes: Record<string, number>;
  errorRate: number;
  activeConnections: number;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface DatabaseMetrics {
  connections: ConnectionMetrics;
  queries: QueryMetrics;
  transactions: TransactionMetrics;
  locks: LockMetrics;
}

export interface ConnectionMetrics {
  active: number;
  idle: number;
  total: number;
  maxConnections: number;
  connectionErrors: number;
}

export interface QueryMetrics {
  total: number;
  successful: number;
  failed: number;
  averageTime: number;
  slowQueries: number;
}

export interface TransactionMetrics {
  active: number;
  committed: number;
  rolledBack: number;
  deadlocks: number;
}

export interface LockMetrics {
  waiting: number;
  acquired: number;
  timeouts: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
  memoryUsage: number;
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retries: number;
  averageProcessingTime: number;
}

export interface BusinessMetrics {
  activeUsers: number;
  newRegistrations: number;
  totalUsers: number;
  revenue: number;
  orders: number;
  conversion: number;
  churn: number;
  customMetrics: Record<string, number>;
}

export interface MetricAlert {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  description?: string;
  runbook?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  aggregation?: MetricAggregation;
  duration?: string; // e.g., "5m", "1h"
  evaluationInterval?: string;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  FIRING = 'firing',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  panels: DashboardPanel[];
  variables?: DashboardVariable[];
  timeRange: TimeRange;
  refreshInterval?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: PanelType;
  queries: MetricQuery[];
  visualization: PanelVisualization;
  position: PanelPosition;
  options?: Record<string, any>;
}

export enum PanelType {
  GRAPH = 'graph',
  SINGLE_STAT = 'singlestat',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  PIE_CHART = 'pie',
  BAR_CHART = 'bar',
  GAUGE = 'gauge',
  TEXT = 'text',
}

export interface PanelVisualization {
  type: PanelType;
  options: Record<string, any>;
  thresholds?: Threshold[];
  colors?: string[];
  yAxes?: YAxis[];
}

export interface Threshold {
  value: number;
  color: string;
  operator: 'gt' | 'lt';
}

export interface YAxis {
  label: string;
  min?: number;
  max?: number;
  unit?: string;
}

export interface PanelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardVariable {
  name: string;
  type: 'query' | 'constant' | 'interval' | 'datasource';
  query?: string;
  options?: string[];
  value?: string;
  multiValue?: boolean;
}

export interface TimeRange {
  from: string;
  to: string;
}