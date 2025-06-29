# 健康检查端点实施指南

## 📋 概述

本文档提供了为缓存服务(3011)和消息队列服务(3010)添加缺失健康检查端点的完整实施方案。

## 🎯 问题分析

### 当前状况
- **缺失服务**: 缓存服务(cache-service, port 3011) 和 消息队列服务(message-queue-service, port 3010)
- **缺失端点**: GET /api/v1/cache/health 和 GET /api/v1/mq/health
- **对比状况**: 其他10个服务都已有标准健康检查端点

### 影响评估
- **生产环境**: 无法有效监控这两个关键服务的健康状态
- **监控盲区**: 监控服务(3007)无法获取完整的平台健康数据
- **运维困难**: 故障排查和预警机制不完整

## 🏗️ 实施方案

### 1. 缓存服务健康检查实现

#### 端点设计
```
GET /api/v1/cache/health   - 综合健康检查
GET /api/v1/cache/ping     - Redis连接性检查  
GET /api/v1/cache/status   - 详细服务状态
```

#### 核心功能
- **Redis连接检查**: 执行基本的读写操作验证
- **数据库连接**: 验证PostgreSQL元数据库连接
- **内存监控**: 检查应用内存使用情况
- **依赖服务**: 检查认证服务和监控服务可用性
- **性能指标**: 缓存命中率、响应时间、操作速率

#### 健康检查内容
```typescript
{
  "status": "healthy|unhealthy|degraded",
  "timestamp": "2024-01-01T10:00:00Z",
  "service": "cache-service",
  "version": "1.0.0",
  "uptime": 86400,
  "responseTime": 15,
  "checks": {
    "redis": "healthy",
    "database": "healthy", 
    "memory": "healthy",
    "dependencies": "healthy"
  },
  "metrics": {
    "cache": {
      "hitRate": 0.85,
      "totalKeys": 50000,
      "memoryUsage": 150,
      "operationsPerSecond": 1200
    },
    "system": {
      "memory": {
        "used": 180,
        "total": 256,
        "usage": 70
      }
    }
  }
}
```

#### 阈值配置
- **内存警告**: 200MB (78%内存使用率)
- **响应时间**: < 50ms
- **Redis延迟**: < 5ms
- **依赖服务超时**: 3秒

### 2. 消息队列服务健康检查实现

#### 端点设计
```
GET /api/v1/mq/health   - 综合健康检查
GET /api/v1/mq/ping     - Redis连接性检查
GET /api/v1/mq/status   - 详细服务状态
```

#### 核心功能
- **Redis Streams检查**: 测试消息流的读写操作
- **队列状态监控**: 检查所有活跃队列的健康状态
- **消费者监控**: 验证消费者组的心跳和处理状态
- **数据库连接**: PostgreSQL元数据连接验证
- **内存监控**: 应用内存使用情况
- **依赖服务**: 用户服务、审计服务、通知服务可用性

#### 健康检查内容
```typescript
{
  "status": "healthy|unhealthy|degraded",
  "timestamp": "2024-01-01T10:00:00Z", 
  "service": "message-queue-service",
  "version": "1.0.0",
  "uptime": 86400,
  "responseTime": 25,
  "checks": {
    "redisStreams": "healthy",
    "database": "healthy",
    "queues": "healthy", 
    "consumers": "healthy",
    "memory": "healthy",
    "dependencies": "healthy"
  },
  "metrics": {
    "messageQueue": {
      "totalQueues": 12,
      "totalMessages": 500000,
      "pendingMessages": 50,
      "processingRate": 800,
      "errorRate": 0.01,
      "averageLatency": 15
    },
    "consumers": {
      "activeConsumers": 5,
      "totalLag": 100
    }
  }
}
```

#### 阈值配置
- **内存警告**: 400MB (51%内存使用率)
- **消费者心跳**: 60秒超时
- **队列延迟**: < 100ms处理时间
- **错误率**: < 1%
- **依赖服务超时**: 3秒

## 🔍 具体检查项目

### 缓存服务检查项
1. **Redis基础检查**
   ```typescript
   // 测试基本读写操作
   const testKey = 'health:check:' + Date.now();
   await redis.set(testKey, 'test', 'EX', 10);
   const value = await redis.get(testKey);
   await redis.del(testKey);
   ```

2. **连接池状态**
   ```typescript
   // 检查连接池健康度
   const info = await redis.info('clients');
   const connectedClients = parseInt(info.connected_clients);
   if (connectedClients > 100) {
     throw new Error('Too many connections');
   }
   ```

3. **内存使用检查**
   ```typescript
   const memory = process.memoryUsage();
   const memoryUsageMB = memory.heapUsed / 1024 / 1024;
   if (memoryUsageMB > 200) {
     throw new Error(`High memory usage: ${memoryUsageMB}MB`);
   }
   ```

### 消息队列服务检查项
1. **Redis Streams测试**
   ```typescript
   // 测试stream写入和读取
   const testStream = 'health:check:stream:' + Date.now();
   const messageId = await redis.xadd(testStream, '*', 'test', 'data');
   const messages = await redis.xrange(testStream, '-', '+');
   await redis.del(testStream);
   ```

2. **消费者状态检查**
   ```typescript
   // 检查消费者心跳
   const unhealthyConsumers = activeConsumers.filter(consumer => {
     const timeSinceLastHeartbeat = Date.now() - consumer.lastHeartbeat;
     return timeSinceLastHeartbeat > 60000; // 60秒超时
   });
   ```

3. **队列积压检查**
   ```typescript
   // 检查队列积压情况
   for (const queue of activeQueues) {
     const streamInfo = await redis.xinfo('STREAM', queue.name);
     if (streamInfo.length > 10000) { // 积压过多
       throw new Error(`Queue ${queue.name} has too many pending messages`);
     }
   }
   ```

## 🔗 监控系统集成

### 1. 与监控服务集成
```typescript
// 监控服务(3007)将调用这些健康检查端点
const healthEndpoints = [
  'http://cache-service:3011/api/v1/cache/health',
  'http://message-queue-service:3010/api/v1/mq/health'
];

// 定期健康检查
setInterval(async () => {
  for (const endpoint of healthEndpoints) {
    const response = await fetch(endpoint);
    const healthData = await response.json();
    await this.metricsService.recordHealthCheck(healthData);
  }
}, 30000); // 每30秒检查一次
```

### 2. Prometheus指标导出
```typescript
// 健康检查指标
export const healthMetrics = {
  serviceHealth: new Gauge({
    name: 'service_health_status',
    help: 'Service health status (1=healthy, 0=unhealthy)',
    labelNames: ['service', 'check_type']
  }),
  
  healthCheckDuration: new Histogram({
    name: 'health_check_duration_seconds',
    help: 'Health check response time',
    labelNames: ['service']
  }),
  
  dependencyStatus: new Gauge({
    name: 'dependency_health_status', 
    help: 'Dependency health status',
    labelNames: ['service', 'dependency']
  })
};
```

### 3. 告警规则配置
```yaml
# 健康检查告警规则
groups:
  - name: health-checks
    rules:
      - alert: CacheServiceUnhealthy
        expr: service_health_status{service="cache-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "缓存服务健康检查失败"
          description: "缓存服务(3011)健康检查持续失败超过1分钟"
          
      - alert: MessageQueueServiceUnhealthy
        expr: service_health_status{service="message-queue-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "消息队列服务健康检查失败"
          description: "消息队列服务(3010)健康检查持续失败超过1分钟"
          
      - alert: HealthCheckResponseSlow
        expr: health_check_duration_seconds > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "健康检查响应时间过长"
          description: "健康检查响应时间超过100ms持续2分钟"
```

## 🚀 部署实施步骤

### 第一阶段：代码实现
1. **缓存服务实现**
   - 创建 `CacheHealthController`
   - 实现健康检查逻辑
   - 添加依赖注入配置
   - 编写单元测试

2. **消息队列服务实现**
   - 创建 `MessageQueueHealthController`
   - 实现健康检查逻辑
   - 添加Redis Streams测试
   - 编写单元测试

### 第二阶段：集成测试
1. **端点测试**
   ```bash
   # 缓存服务健康检查
   curl http://localhost:3011/api/v1/cache/health
   curl http://localhost:3011/api/v1/cache/ping
   curl http://localhost:3011/api/v1/cache/status
   
   # 消息队列服务健康检查
   curl http://localhost:3010/api/v1/mq/health
   curl http://localhost:3010/api/v1/mq/ping
   curl http://localhost:3010/api/v1/mq/status
   ```

2. **监控集成测试**
   - 验证监控服务能正常调用健康检查端点
   - 确认Prometheus指标正常导出
   - 测试告警规则触发

### 第三阶段：生产部署
1. **Docker Compose更新**
   ```yaml
   cache-service:
     healthcheck:
       test: ["CMD", "curl", "-f", "http://localhost:3011/api/v1/cache/health"]
       interval: 30s
       timeout: 10s
       retries: 3
       start_period: 40s
   
   message-queue-service:
     healthcheck:
       test: ["CMD", "curl", "-f", "http://localhost:3010/api/v1/mq/health"]
       interval: 30s
       timeout: 10s
       retries: 3
       start_period: 40s
   ```

2. **负载均衡器配置**
   - 配置健康检查端点作为负载均衡器健康探针
   - 设置故障转移和自动恢复策略

## 📊 验收标准

### 功能验收
- [ ] 缓存服务健康检查端点正常响应
- [ ] 消息队列服务健康检查端点正常响应
- [ ] 所有检查项目能正确识别健康/不健康状态
- [ ] 响应格式与其他服务保持一致
- [ ] 依赖服务检查不影响自身健康状态

### 性能验收
- [ ] 健康检查响应时间 < 100ms
- [ ] 内存开销 < 5MB
- [ ] 不影响服务正常功能性能
- [ ] 支持高频率调用(每30秒)

### 监控验收
- [ ] 监控服务能正常收集健康数据
- [ ] Prometheus指标正确导出
- [ ] 告警规则能正确触发
- [ ] 日志记录清晰完整

## 🔧 运维指南

### 故障排查
1. **健康检查失败时**
   ```bash
   # 检查服务日志
   docker logs cache-service
   docker logs message-queue-service
   
   # 检查Redis连接
   docker exec -it redis redis-cli ping
   
   # 检查数据库连接
   docker exec -it postgres psql -U platform -d platform -c "SELECT 1;"
   ```

2. **依赖服务不可用时**
   - 健康检查会记录警告但不影响自身状态
   - 查看服务日志确认依赖服务状态
   - 必要时重启相关服务

### 配置调优
1. **阈值调整**
   - 根据实际负载调整内存阈值
   - 优化健康检查频率
   - 调整超时配置

2. **告警优化**
   - 基于历史数据调整告警阈值
   - 优化告警频率避免告警风暴
   - 配置告警静默时间

## ✅ 总结

通过实施本方案，缓存服务和消息队列服务将具备：

1. **完整的健康监控能力**: 覆盖所有关键组件和依赖
2. **标准化的健康检查接口**: 与其他10个服务保持一致
3. **生产级的监控集成**: 完整的指标收集和告警配置
4. **高可用性保障**: 及时发现和处理服务异常

这将使整个微服务平台的健康监控体系更加完善，为生产环境的稳定运行提供有力保障。