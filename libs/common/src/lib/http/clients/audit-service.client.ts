/**
 * 审计服务客户端
 * 提供审计日志记录、查询等功能
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { ServiceClientBase } from '../service-client.base';

// 审计事件接口
export interface AuditEvent {
  id?: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  serviceId: string;
  eventType: string;
  resource: string;
  resourceId?: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  timestamp?: string;
  sourceIp?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
  beforeData?: any;
  afterData?: any;
}

// 批量审计事件请求
export interface BatchAuditRequest {
  events: AuditEvent[];
}

// 审计事件查询条件
export interface AuditSearchCriteria {
  tenantId?: string;
  userId?: string;
  serviceId?: string;
  eventType?: string;
  resource?: string;
  action?: string;
  outcome?: 'success' | 'failure' | 'partial';
  startDate?: string;
  endDate?: string;
  sourceIp?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 审计事件查询结果
export interface AuditSearchResult {
  events: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  aggregations?: {
    eventTypes: Record<string, number>;
    resources: Record<string, number>;
    outcomes: Record<string, number>;
    services: Record<string, number>;
  };
}

// 审计统计请求
export interface AuditStatsRequest {
  tenantId?: string;
  userId?: string;
  serviceId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'hour' | 'month';
}

// 审计统计结果
export interface AuditStatsResult {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  uniqueUsers: number;
  uniqueResources: number;
  timeline: Array<{
    timestamp: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
  topUsers: Array<{
    userId: string;
    eventCount: number;
    lastActivity: string;
  }>;
  topResources: Array<{
    resource: string;
    eventCount: number;
    lastAccessed: string;
  }>;
  riskEvents: Array<{
    eventId: string;
    riskScore: number;
    riskReason: string;
    timestamp: string;
  }>;
}

// 审计导出请求
export interface AuditExportRequest {
  tenantId?: string;
  userId?: string;
  serviceId?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  format: 'csv' | 'json' | 'xlsx';
  includeMetadata?: boolean;
  includeDataChanges?: boolean;
}

// 审计导出结果
export interface AuditExportResult {
  exportId: string;
  downloadUrl: string;
  fileSize: number;
  recordCount: number;
  expiresAt: string;
  status: 'processing' | 'completed' | 'failed';
}

// 合规报告请求
export interface ComplianceReportRequest {
  tenantId: string;
  reportType: 'gdpr' | 'hipaa' | 'sox' | 'custom';
  startDate: string;
  endDate: string;
  includeUserData?: boolean;
  includeDataChanges?: boolean;
  format?: 'pdf' | 'html' | 'json';
}

// 合规报告结果
export interface ComplianceReportResult {
  reportId: string;
  reportType: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  summary: {
    totalEvents: number;
    dataAccessEvents: number;
    dataModificationEvents: number;
    loginEvents: number;
    failedEvents: number;
    complianceScore: number;
  };
  findings: Array<{
    type: 'violation' | 'warning' | 'info';
    description: string;
    recommendation: string;
    eventIds: string[];
  }>;
}

@Injectable()
export class AuditServiceClient extends ServiceClientBase {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    super(httpService, configService, {
      serviceName: 'audit-service',
    });
  }

  /**
   * 记录单个审计事件
   */
  logEvent(event: AuditEvent): Observable<{ eventId: string }> {
    return this.post<{ eventId: string }>('/internal/events', event);
  }

  /**
   * 批量记录审计事件
   */
  logEventsBatch(request: BatchAuditRequest): Observable<{
    successful: number;
    failed: number;
    eventIds: string[];
  }> {
    return this.post<{
      successful: number;
      failed: number;
      eventIds: string[];
    }>('/internal/events/batch', request);
  }

  /**
   * 查询审计事件
   */
  searchEvents(criteria: AuditSearchCriteria): Observable<AuditSearchResult> {
    return this.post<AuditSearchResult>('/internal/events/search', criteria);
  }

  /**
   * 根据ID获取审计事件
   */
  getEventById(eventId: string): Observable<AuditEvent> {
    return this.get<AuditEvent>(`/internal/events/${eventId}`);
  }

  /**
   * 获取用户审计日志
   */
  getUserAuditLogs(
    userId: string,
    tenantId: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
  ): Observable<AuditSearchResult> {
    return this.get<AuditSearchResult>(`/internal/users/${userId}/audit-logs`, {
      tenantId,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  /**
   * 获取资源审计日志
   */
  getResourceAuditLogs(
    resource: string,
    resourceId: string,
    tenantId?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
  ): Observable<AuditSearchResult> {
    return this.get<AuditSearchResult>(`/internal/resources/${resource}/${resourceId}/audit-logs`, {
      tenantId,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  /**
   * 获取审计统计信息
   */
  getAuditStats(request: AuditStatsRequest): Observable<AuditStatsResult> {
    return this.post<AuditStatsResult>('/internal/stats', request);
  }

  /**
   * 获取实时审计指标
   */
  getRealtimeMetrics(tenantId?: string): Observable<{
    eventsPerMinute: number;
    failureRate: number;
    topUsers: Array<{
      userId: string;
      eventCount: number;
    }>;
    recentEvents: AuditEvent[];
    systemHealth: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number;
      throughput: number;
    };
  }> {
    return this.get<{
      eventsPerMinute: number;
      failureRate: number;
      topUsers: Array<{
        userId: string;
        eventCount: number;
      }>;
      recentEvents: AuditEvent[];
      systemHealth: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        latency: number;
        throughput: number;
      };
    }>('/internal/metrics/realtime', { tenantId });
  }

  /**
   * 导出审计数据
   */
  exportAuditData(request: AuditExportRequest): Observable<AuditExportResult> {
    return this.post<AuditExportResult>('/internal/export', request);
  }

  /**
   * 获取导出状态
   */
  getExportStatus(exportId: string): Observable<AuditExportResult> {
    return this.get<AuditExportResult>(`/internal/export/${exportId}/status`);
  }

  /**
   * 生成合规报告
   */
  generateComplianceReport(request: ComplianceReportRequest): Observable<ComplianceReportResult> {
    return this.post<ComplianceReportResult>('/internal/compliance/reports', request);
  }

  /**
   * 获取合规报告状态
   */
  getComplianceReportStatus(reportId: string): Observable<ComplianceReportResult> {
    return this.get<ComplianceReportResult>(`/internal/compliance/reports/${reportId}`);
  }

  /**
   * 删除过期审计数据
   */
  purgeExpiredData(tenantId: string, retentionDays: number): Observable<{
    deletedCount: number;
    oldestRemainingEvent: string;
  }> {
    return this.post<{
      deletedCount: number;
      oldestRemainingEvent: string;
    }>('/internal/purge', { tenantId, retentionDays });
  }

  /**
   * 检查审计完整性
   */
  checkIntegrity(tenantId?: string, startDate?: string, endDate?: string): Observable<{
    isIntact: boolean;
    missingEvents: number;
    corruptedEvents: number;
    lastChecked: string;
    recommendations: string[];
  }> {
    return this.post<{
      isIntact: boolean;
      missingEvents: number;
      corruptedEvents: number;
      lastChecked: string;
      recommendations: string[];
    }>('/internal/integrity-check', { tenantId, startDate, endDate });
  }

  /**
   * 设置审计告警规则
   */
  setAlertRule(rule: {
    name: string;
    tenantId?: string;
    conditions: {
      eventType?: string;
      resource?: string;
      failureThreshold?: number;
      timeWindow?: number;
    };
    actions: {
      email?: string[];
      webhook?: string;
      slack?: string;
    };
  }): Observable<{ ruleId: string }> {
    return this.post<{ ruleId: string }>('/internal/alerts/rules', rule);
  }

  /**
   * 触发审计告警测试
   */
  testAlert(ruleId: string): Observable<{
    sent: boolean;
    recipients: string[];
    error?: string;
  }> {
    return this.post<{
      sent: boolean;
      recipients: string[];
      error?: string;
    }>(`/internal/alerts/rules/${ruleId}/test`, {});
  }
}