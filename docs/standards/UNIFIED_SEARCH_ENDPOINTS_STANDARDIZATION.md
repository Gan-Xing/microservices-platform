# 统一搜索端点标准化技术方案

## 📋 概述

本方案旨在解决企业级微服务平台中各服务搜索功能不一致的问题，通过制定统一的搜索端点标准、参数规范和响应格式，提升API的一致性和开发效率。

## 🎯 目标

### 主要目标
- 统一各服务的搜索端点格式和参数规范
- 重构用户管理服务中混乱的3种搜索模式
- 标准化其他服务的搜索功能实现
- 提供统一的搜索结果格式和分页支持

### 性能目标
- 搜索响应时间 < 200ms (P95)
- 支持10,000+结果的分页查询
- 缓存命中率 > 80%
- 并发搜索能力 > 500 QPS

## 🔍 现状分析

### 当前问题识别

#### 1. 用户管理服务 (3003) - 搜索模式混乱
```typescript
// 问题：3种不同的搜索模式造成混乱
❌ GET /api/v1/users/search (简单搜索)
❌ POST /api/v1/users/search (动态条件搜索) 
❌ POST /api/v1/users/query (复杂查询构建器)
❌ POST /api/v1/users/filters/save (保存查询过滤器)
❌ GET /api/v1/users/filters (获取保存的过滤器)
```

#### 2. 其他服务搜索端点不一致
```typescript
// 文件存储服务 (3006)
❌ GET /api/v1/files/search - 简单搜索

// 审计服务 (3008) 
❌ GET /api/v1/audit/search - 搜索审计记录
❌ POST /api/v1/audit/search/advanced - 高级搜索

// 监控服务 (3007)
❌ GET /api/v1/monitoring/logs/search - 搜索日志
```

#### 3. 搜索功能缺失问题
- 缺乏统一的分页参数标准
- 响应格式不一致 
- 缺乏统一的排序和过滤规范
- 搜索结果高亮功能不统一

## 🎯 统一搜索端点标准

### 标准化设计原则

#### 1. 三层搜索模式
```typescript
// Level 1: 简单搜索 (GET请求，适用于简单关键词搜索)
GET /{resource}?q={keyword}&filter[field]={value}&page={page}&limit={limit}

// Level 2: 结构化搜索 (POST请求，适用于多条件组合搜索)  
POST /{resource}/search

// Level 3: 高级搜索 (POST请求，适用于复杂业务逻辑搜索)
POST /{resource}/search/advanced
```

#### 2. RESTful路径设计
```typescript
// 资源搜索端点标准
GET    /api/v1/{resource}                    # 列表查询（带搜索参数）
POST   /api/v1/{resource}/search             # 结构化搜索  
POST   /api/v1/{resource}/search/advanced    # 高级搜索
GET    /api/v1/{resource}/search/suggestions # 搜索建议
POST   /api/v1/{resource}/export             # 搜索结果导出
```

### 统一参数规范

#### 1. 简单搜索参数 (GET)
```typescript
interface SimpleSearchParams {
  // 关键词搜索
  q?: string                    // 搜索关键词
  
  // 分页参数
  page?: number                 // 页码，默认1
  limit?: number                // 每页数量，默认20，最大100
  offset?: number               // 偏移量 (可选，与page二选一)
  
  // 排序参数
  sort?: string                 // 排序字段，如 'createdAt'
  order?: 'asc' | 'desc'       // 排序方向，默认'desc'
  
  // 过滤参数 (使用filter前缀)
  'filter[field]'?: any         // 字段过滤，如 filter[status]=active
  'filter[dateFrom]'?: string   // 日期范围过滤
  'filter[dateTo]'?: string     // 日期范围过滤
  
  // 其他参数
  highlight?: boolean           // 是否高亮搜索关键词，默认false
  include?: string[]            // 包含的关联资源
  fields?: string[]             // 返回的字段列表
}

// 示例URL
GET /api/v1/users?q=张三&filter[status]=active&page=1&limit=20&sort=createdAt&order=desc
```

#### 2. 结构化搜索参数 (POST)
```typescript
interface StructuredSearchRequest {
  // 搜索条件
  conditions?: SearchCondition[]  // 搜索条件数组
  logic?: 'AND' | 'OR'           // 条件组合逻辑，默认AND
  
  // 分页和排序
  pagination?: PaginationParams   // 分页参数
  sort?: SortParams[]            // 排序参数数组
  
  // 高级选项
  highlight?: HighlightOptions   // 高亮配置
  aggregations?: AggregationRequest[] // 聚合查询
  include?: string[]             // 包含的关联资源
  fields?: string[]              // 返回的字段列表
}

interface SearchCondition {
  field: string                  // 搜索字段
  operator: SearchOperator       // 操作符
  value: any                     // 搜索值
  boost?: number                 // 权重加成 (1.0-10.0)
}

type SearchOperator = 
  | 'equals'        // 等于
  | 'not_equals'    // 不等于
  | 'contains'      // 包含
  | 'not_contains'  // 不包含
  | 'starts_with'   // 开始于
  | 'ends_with'     // 结束于
  | 'in'           // 在列表中
  | 'not_in'       // 不在列表中
  | 'greater_than' // 大于
  | 'less_than'    // 小于
  | 'between'      // 在范围内
  | 'is_null'      // 为空
  | 'is_not_null'  // 不为空
  | 'regex'        // 正则匹配

// 示例请求体
POST /api/v1/users/search
{
  "conditions": [
    {
      "field": "firstName",
      "operator": "contains", 
      "value": "张",
      "boost": 2.0
    },
    {
      "field": "status",
      "operator": "in",
      "value": ["active", "pending"]
    },
    {
      "field": "createdAt",
      "operator": "between",
      "value": ["2024-01-01", "2024-12-31"]
    }
  ],
  "logic": "AND",
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "sort": [
    {"field": "lastLoginAt", "order": "desc"},
    {"field": "firstName", "order": "asc"}
  ],
  "highlight": {
    "enabled": true,
    "fields": ["firstName", "lastName", "email"]
  }
}
```

#### 3. 高级搜索参数 (POST)
```typescript
interface AdvancedSearchRequest {
  // 复杂查询构建器
  query?: QueryBuilder           // ElasticSearch风格的查询构建器
  
  // 业务逻辑搜索
  business_rules?: BusinessRule[] // 业务规则数组
  
  // 机器学习搜索
  ml_search?: MLSearchOptions    // ML驱动的搜索选项
  
  // 地理位置搜索
  geo_search?: GeoSearchOptions  // 地理位置搜索
  
  // 时序搜索
  time_series?: TimeSeriesOptions // 时序数据搜索
  
  // 基础参数继承
  pagination?: PaginationParams
  sort?: SortParams[]
  highlight?: HighlightOptions
  aggregations?: AggregationRequest[]
}

interface QueryBuilder {
  bool?: {
    must?: QueryClause[]         // 必须匹配
    should?: QueryClause[]       // 应该匹配  
    must_not?: QueryClause[]     // 必须不匹配
    filter?: QueryClause[]       // 过滤条件
  }
}

interface BusinessRule {
  rule_type: string              // 业务规则类型
  conditions: Record<string, any> // 规则条件
  weight?: number                // 规则权重
}
```

### 统一响应格式

#### 1. 标准搜索响应
```typescript
interface SearchResponse<T> {
  success: boolean               // 请求成功标识
  message?: string               // 响应消息
  data: {
    items: T[]                   // 搜索结果数组
    pagination: PaginationMeta   // 分页元数据
    aggregations?: Record<string, any> // 聚合结果
    suggestions?: string[]       // 搜索建议
    debug?: SearchDebugInfo      // 调试信息 (开发模式)
  }
  meta: {
    query_time: number           // 查询耗时 (毫秒)
    total_hits: number           // 总命中数
    cache_hit?: boolean          // 是否缓存命中
    search_id?: string           // 搜索会话ID
    search_type: 'simple' | 'structured' | 'advanced' // 搜索类型
  }
}

interface PaginationMeta {
  current_page: number           // 当前页码
  per_page: number               // 每页数量
  total: number                  // 总记录数
  total_pages: number            // 总页数
  has_next: boolean              // 是否有下一页
  has_prev: boolean              // 是否有上一页
  next_page?: string             // 下一页URL
  prev_page?: string             // 上一页URL
}

interface SearchDebugInfo {
  executed_query: string         // 执行的SQL/查询
  index_used: string[]           // 使用的索引
  execution_plan: any            // 执行计划
  cache_info: CacheInfo          // 缓存信息
}
```

#### 2. 错误响应格式
```typescript
interface SearchErrorResponse {
  success: false
  error: {
    code: string                 // 错误代码
    message: string              // 错误消息
    details?: any                // 错误详情
    field_errors?: FieldError[]  // 字段级错误
  }
  meta: {
    request_id: string           // 请求ID
    timestamp: string            // 时间戳
  }
}

interface FieldError {
  field: string                  // 错误字段
  code: string                   // 错误代码
  message: string                // 错误消息
}

// 常见搜索错误代码
enum SearchErrorCodes {
  INVALID_SEARCH_PARAMS = 'INVALID_SEARCH_PARAMS',
  SEARCH_TIMEOUT = 'SEARCH_TIMEOUT', 
  SEARCH_INDEX_ERROR = 'SEARCH_INDEX_ERROR',
  SEARCH_LIMIT_EXCEEDED = 'SEARCH_LIMIT_EXCEEDED',
  INVALID_SEARCH_FIELD = 'INVALID_SEARCH_FIELD',
  INVALID_SEARCH_OPERATOR = 'INVALID_SEARCH_OPERATOR'
}
```

## 🔧 各服务搜索功能重构方案

### 1. 用户管理服务 (3003) 重构

#### 现状与重构对比
```typescript
// ❌ 重构前 - 3种混乱的搜索模式
GET  /api/v1/users/search              // 简单搜索
POST /api/v1/users/search              // 动态条件搜索  
POST /api/v1/users/query               // 复杂查询构建器
POST /api/v1/users/filters/save        // 保存查询过滤器
GET  /api/v1/users/filters             // 获取保存的过滤器

// ✅ 重构后 - 标准化搜索端点
GET  /api/v1/users                     // 简单搜索 (带参数)
POST /api/v1/users/search              // 结构化搜索
POST /api/v1/users/search/advanced     // 高级搜索
GET  /api/v1/users/search/suggestions  // 搜索建议
POST /api/v1/users/export              // 导出搜索结果
```

#### 实现示例
```typescript
// UserController 重构
@Controller('api/v1/users')
export class UserController {
  
  // Level 1: 简单搜索 (GET) - 兼容原有功能
  @Get()
  @ApiOperation({ summary: '用户列表查询 / 简单搜索' })
  async findUsers(@Query() query: SimpleSearchParamsDto): Promise<SearchResponse<User>> {
    return this.userService.searchUsers({
      type: 'simple',
      params: query
    });
  }
  
  // Level 2: 结构化搜索 (POST)
  @Post('search')
  @ApiOperation({ summary: '结构化搜索用户' })
  async searchUsers(@Body() request: StructuredSearchRequestDto): Promise<SearchResponse<User>> {
    return this.userService.searchUsers({
      type: 'structured', 
      params: request
    });
  }
  
  // Level 3: 高级搜索 (POST) 
  @Post('search/advanced')
  @ApiOperation({ summary: '高级搜索用户' })
  async advancedSearchUsers(@Body() request: AdvancedSearchRequestDto): Promise<SearchResponse<User>> {
    return this.userService.searchUsers({
      type: 'advanced',
      params: request
    });
  }
  
  // 搜索建议
  @Get('search/suggestions')
  @ApiOperation({ summary: '获取搜索建议' })
  async getSearchSuggestions(@Query('q') query: string): Promise<{ suggestions: string[] }> {
    return this.userService.getSearchSuggestions(query);
  }
  
  // 导出搜索结果
  @Post('export')
  @ApiOperation({ summary: '导出搜索结果' })
  async exportSearchResults(@Body() request: StructuredSearchRequestDto): Promise<{ export_url: string }> {
    return this.userService.exportSearchResults(request);
  }
}
```

#### PostgreSQL全文搜索优化
```sql
-- 用户表搜索索引优化
CREATE INDEX idx_users_fulltext_search ON users.users 
  USING gin(to_tsvector('simple', first_name || ' ' || last_name || ' ' || email));

-- 复合索引优化  
CREATE INDEX idx_users_search_composite ON users.users(tenant_id, status, created_at DESC);
CREATE INDEX idx_users_email_search ON users.users(tenant_id, email) WHERE status = 'active';

-- 搜索性能视图
CREATE MATERIALIZED VIEW users.user_search_index AS
SELECT 
  id,
  tenant_id,
  email,
  first_name,
  last_name,
  status,
  created_at,
  last_login_at,
  to_tsvector('simple', first_name || ' ' || last_name || ' ' || email) as search_vector
FROM users.users 
WHERE status != 'deleted';

-- 定期刷新搜索索引
CREATE OR REPLACE FUNCTION refresh_user_search_index()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY users.user_search_index;
END;
$$ LANGUAGE plpgsql;
```

### 2. 审计服务 (3008) 重构

#### 重构前后对比
```typescript
// ❌ 重构前
GET  /api/v1/audit/search              // 搜索审计记录
POST /api/v1/audit/search/advanced     // 高级搜索

// ✅ 重构后
GET  /api/v1/audit                     // 简单搜索
POST /api/v1/audit/search              // 结构化搜索
POST /api/v1/audit/search/advanced     // 高级搜索
GET  /api/v1/audit/search/suggestions  // 搜索建议
POST /api/v1/audit/export              // 导出审计数据
```

#### 审计专用搜索功能
```typescript
// 审计事件时序搜索  
POST /api/v1/audit/search/timeline
{
  "time_range": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z",
    "interval": "1d"  // 时间间隔: 1h, 1d, 1w
  },
  "conditions": [
    {
      "field": "event_type",
      "operator": "equals",
      "value": "user_login"
    }
  ],
  "aggregations": [
    {
      "type": "date_histogram", 
      "field": "timestamp",
      "interval": "1d"
    },
    {
      "type": "terms",
      "field": "source_ip", 
      "size": 10
    }
  ]
}

// 审计事件关联搜索
POST /api/v1/audit/search/related
{
  "root_event_id": "event_123",
  "relation_types": ["caused_by", "resulted_in"],
  "max_depth": 3,
  "time_window": "1h"
}
```

### 3. 文件存储服务 (3006) 重构

#### 重构方案
```typescript
// ❌ 重构前
GET /api/v1/files/search               // 搜索文件

// ✅ 重构后
GET  /api/v1/files                     // 简单搜索
POST /api/v1/files/search              // 结构化搜索  
POST /api/v1/files/search/advanced     // 高级搜索
GET  /api/v1/files/search/suggestions  // 搜索建议
POST /api/v1/files/export              // 导出文件列表
```

#### 文件专用搜索功能
```typescript
// 文件内容全文搜索
POST /api/v1/files/search/content
{
  "query": "合同条款",
  "file_types": ["pdf", "docx", "txt"],
  "size_range": {
    "min": "1KB",
    "max": "10MB" 
  },
  "date_range": {
    "from": "2024-01-01",
    "to": "2024-12-31"
  }
}

// 文件相似性搜索
POST /api/v1/files/search/similar
{
  "reference_file_id": "file_123",
  "similarity_threshold": 0.8,
  "search_criteria": ["name", "content", "metadata"]
}

// 重复文件检测
POST /api/v1/files/search/duplicates  
{
  "detection_method": "hash", // hash, content, metadata
  "folder_scope": ["folder1", "folder2"],
  "min_file_size": "1KB"
}
```

### 4. 监控服务 (3007) 重构

#### 重构方案
```typescript
// ❌ 重构前  
GET /api/v1/monitoring/logs/search     // 搜索日志

// ✅ 重构后
GET  /api/v1/monitoring/logs           // 简单搜索
POST /api/v1/monitoring/logs/search    // 结构化搜索
POST /api/v1/monitoring/logs/search/advanced // 高级搜索
GET  /api/v1/monitoring/logs/search/suggestions // 搜索建议
POST /api/v1/monitoring/logs/export    // 导出日志
```

#### 监控专用搜索功能
```typescript
// 实时日志流搜索
GET /api/v1/monitoring/logs/stream?q=ERROR&follow=true

// 日志模式识别搜索
POST /api/v1/monitoring/logs/search/patterns
{
  "time_range": {
    "from": "2024-01-01T00:00:00Z", 
    "to": "2024-01-31T23:59:59Z"
  },
  "pattern_types": ["error_spike", "anomaly", "trend"],
  "services": ["user-service", "auth-service"]
}

// 跨服务链路日志搜索
POST /api/v1/monitoring/logs/search/trace
{
  "trace_id": "trace_123",
  "include_services": ["all"],
  "time_window": "1h"
}
```

## 🔧 技术实现方案

### 1. 统一搜索服务层

#### SearchService 基础架构
```typescript
// 统一搜索服务接口
interface ISearchService<T> {
  simpleSearch(params: SimpleSearchParams): Promise<SearchResponse<T>>
  structuredSearch(request: StructuredSearchRequest): Promise<SearchResponse<T>>
  advancedSearch(request: AdvancedSearchRequest): Promise<SearchResponse<T>>
  getSearchSuggestions(query: string): Promise<string[]>
  exportSearchResults(request: SearchRequest): Promise<{ export_url: string }>
}

// 抽象搜索服务实现
@Injectable()
export abstract class BaseSearchService<T> implements ISearchService<T> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly cacheService: CacheService,
    protected readonly auditService: AuditService
  ) {}

  async simpleSearch(params: SimpleSearchParams): Promise<SearchResponse<T>> {
    const cacheKey = this.generateCacheKey('simple', params);
    
    // 尝试缓存获取
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, meta: { ...cached.meta, cache_hit: true } };
    }

    const startTime = Date.now();
    
    // 构建查询
    const queryBuilder = this.buildSimpleQuery(params);
    
    // 执行查询
    const [items, total] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount()
    ]);

    const result = this.formatSearchResponse(items, total, params, Date.now() - startTime, 'simple');
    
    // 缓存结果
    await this.cacheService.set(cacheKey, result, 300); // 5分钟缓存
    
    // 记录搜索审计
    await this.auditService.logSearchEvent({
      search_type: 'simple',
      search_params: params,
      result_count: total,
      execution_time: Date.now() - startTime
    });

    return result;
  }

  async structuredSearch(request: StructuredSearchRequest): Promise<SearchResponse<T>> {
    const startTime = Date.now();
    
    // 验证搜索条件
    this.validateSearchConditions(request.conditions);
    
    // 构建复杂查询
    const queryBuilder = this.buildStructuredQuery(request);
    
    // 执行查询和聚合
    const [items, total, aggregations] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
      this.executeAggregations(request.aggregations, queryBuilder)
    ]);

    return this.formatSearchResponse(
      items, 
      total, 
      request, 
      Date.now() - startTime, 
      'structured',
      aggregations
    );
  }

  protected abstract buildSimpleQuery(params: SimpleSearchParams): SelectQueryBuilder<T>
  protected abstract buildStructuredQuery(request: StructuredSearchRequest): SelectQueryBuilder<T>
  protected abstract validateSearchConditions(conditions: SearchCondition[]): void
  protected abstract executeAggregations(aggregations: AggregationRequest[], queryBuilder: SelectQueryBuilder<T>): Promise<any>
}
```

#### UserSearchService 具体实现
```typescript
@Injectable()
export class UserSearchService extends BaseSearchService<User> {
  
  protected buildSimpleQuery(params: SimpleSearchParams): SelectQueryBuilder<User> {
    const qb = this.repository.createQueryBuilder('user');
    
    // 租户隔离
    qb.where('user.tenantId = :tenantId', { tenantId: params.tenantId });
    
    // 关键词搜索
    if (params.q) {
      qb.andWhere(`
        to_tsvector('simple', user.firstName || ' ' || user.lastName || ' ' || user.email) 
        @@ plainto_tsquery('simple', :query)
      `, { query: params.q });
    }
    
    // 状态过滤
    if (params['filter[status]']) {
      qb.andWhere('user.status = :status', { status: params['filter[status]'] });
    }
    
    // 日期范围过滤
    if (params['filter[dateFrom]']) {
      qb.andWhere('user.createdAt >= :dateFrom', { dateFrom: params['filter[dateFrom]'] });
    }
    if (params['filter[dateTo]']) {
      qb.andWhere('user.createdAt <= :dateTo', { dateTo: params['filter[dateTo]'] });
    }
    
    // 排序
    const sortField = params.sort || 'createdAt';
    const sortOrder = params.order || 'DESC';
    qb.orderBy(`user.${sortField}`, sortOrder);
    
    // 分页
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100); // 最大100条
    qb.skip((page - 1) * limit).take(limit);
    
    return qb;
  }
  
  protected buildStructuredQuery(request: StructuredSearchRequest): SelectQueryBuilder<User> {
    const qb = this.repository.createQueryBuilder('user');
    
    // 构建WHERE条件
    this.applySearchConditions(qb, request.conditions, request.logic);
    
    // 应用排序
    this.applySorting(qb, request.sort);
    
    // 应用分页
    this.applyPagination(qb, request.pagination);
    
    // 应用字段选择
    if (request.fields?.length) {
      const selectedFields = request.fields.map(field => `user.${field}`);
      qb.select(selectedFields);
    }
    
    return qb;
  }
  
  private applySearchConditions(
    qb: SelectQueryBuilder<User>, 
    conditions: SearchCondition[], 
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    if (!conditions?.length) return;
    
    const whereConditions = conditions.map((condition, index) => {
      const paramKey = `param_${index}`;
      return this.buildWhereClause(condition, paramKey);
    });
    
    const combinedWhere = whereConditions.join(` ${logic} `);
    qb.andWhere(`(${combinedWhere})`);
    
    // 设置参数
    conditions.forEach((condition, index) => {
      const paramKey = `param_${index}`;
      qb.setParameter(paramKey, this.formatParameterValue(condition));
    });
  }
  
  private buildWhereClause(condition: SearchCondition, paramKey: string): string {
    const field = `user.${condition.field}`;
    
    switch (condition.operator) {
      case 'equals':
        return `${field} = :${paramKey}`;
      case 'not_equals':
        return `${field} != :${paramKey}`;
      case 'contains':
        return `${field} ILIKE :${paramKey}`;
      case 'not_contains':
        return `${field} NOT ILIKE :${paramKey}`;
      case 'starts_with':
        return `${field} ILIKE :${paramKey}`;
      case 'ends_with':
        return `${field} ILIKE :${paramKey}`;
      case 'in':
        return `${field} IN (:...${paramKey})`;
      case 'not_in':
        return `${field} NOT IN (:...${paramKey})`;
      case 'greater_than':
        return `${field} > :${paramKey}`;
      case 'less_than':
        return `${field} < :${paramKey}`;
      case 'between':
        return `${field} BETWEEN :${paramKey}_start AND :${paramKey}_end`;
      case 'is_null':
        return `${field} IS NULL`;
      case 'is_not_null':
        return `${field} IS NOT NULL`;
      case 'regex':
        return `${field} ~ :${paramKey}`;
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }
  }
  
  private formatParameterValue(condition: SearchCondition): any {
    switch (condition.operator) {
      case 'contains':
      case 'not_contains':
        return `%${condition.value}%`;
      case 'starts_with':
        return `${condition.value}%`;
      case 'ends_with':
        return `%${condition.value}`;
      case 'between':
        return {
          [`${condition.field}_start`]: condition.value[0],
          [`${condition.field}_end`]: condition.value[1]
        };
      default:
        return condition.value;
    }
  }
  
  protected validateSearchConditions(conditions: SearchCondition[]): void {
    const allowedFields = ['firstName', 'lastName', 'email', 'status', 'createdAt', 'lastLoginAt'];
    const allowedOperators = Object.values(SearchOperator);
    
    for (const condition of conditions) {
      if (!allowedFields.includes(condition.field)) {
        throw new BadRequestException(`Invalid search field: ${condition.field}`);
      }
      
      if (!allowedOperators.includes(condition.operator)) {
        throw new BadRequestException(`Invalid search operator: ${condition.operator}`);
      }
      
      // 特定字段的值验证
      if (condition.field === 'status' && condition.operator === 'equals') {
        const validStatuses = ['active', 'inactive', 'suspended', 'deleted'];
        if (!validStatuses.includes(condition.value)) {
          throw new BadRequestException(`Invalid status value: ${condition.value}`);
        }
      }
    }
  }
  
  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    const suggestions = await this.repository
      .createQueryBuilder('user')
      .select([
        'user.firstName',
        'user.lastName', 
        'user.email'
      ])
      .where(`
        user.firstName ILIKE :query 
        OR user.lastName ILIKE :query 
        OR user.email ILIKE :query
      `, { query: `${query}%` })
      .limit(10)
      .getMany();
    
    // 提取建议词
    const suggestionSet = new Set<string>();
    suggestions.forEach(user => {
      if (user.firstName?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestionSet.add(user.firstName);
      }
      if (user.lastName?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestionSet.add(user.lastName);
      }
      if (user.email?.toLowerCase().startsWith(query.toLowerCase())) {
        suggestionSet.add(user.email);
      }
    });
    
    return Array.from(suggestionSet).slice(0, 10);
  }
}
```

### 2. 缓存策略

#### 搜索结果缓存
```typescript
@Injectable()
export class SearchCacheService {
  private readonly defaultTTL = 300; // 5分钟
  private readonly popularQueryTTL = 3600; // 1小时
  
  constructor(private readonly cacheService: CacheService) {}
  
  async getSearchResult<T>(cacheKey: string): Promise<SearchResponse<T> | null> {
    return this.cacheService.get(cacheKey);
  }
  
  async setSearchResult<T>(
    cacheKey: string, 
    result: SearchResponse<T>, 
    ttl?: number
  ): Promise<void> {
    const finalTTL = ttl || this.calculateTTL(cacheKey, result);
    await this.cacheService.set(cacheKey, result, finalTTL);
  }
  
  private calculateTTL<T>(cacheKey: string, result: SearchResponse<T>): number {
    // 基于查询复杂度和结果数量动态调整TTL
    const isComplexQuery = cacheKey.includes('advanced') || cacheKey.includes('aggregations');
    const hasLargeResultSet = result.data.items.length > 50;
    const isPopularQuery = this.isPopularQuery(cacheKey);
    
    if (isPopularQuery) return this.popularQueryTTL;
    if (isComplexQuery) return this.defaultTTL * 2; // 复杂查询缓存更久
    if (hasLargeResultSet) return this.defaultTTL / 2; // 大结果集缓存更短
    
    return this.defaultTTL;
  }
  
  private isPopularQuery(cacheKey: string): boolean {
    // 基于查询频率判断是否为热门查询
    // 这里可以集成Redis HyperLogLog来统计查询频率
    return false; // 简化实现
  }
  
  generateCacheKey(
    service: string,
    searchType: 'simple' | 'structured' | 'advanced',
    params: any
  ): string {
    const paramsHash = this.hashParams(params);
    return `search:${service}:${searchType}:${paramsHash}`;
  }
  
  private hashParams(params: any): string {
    // 使用crypto创建参数hash
    const crypto = require('crypto');
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(paramString).digest('hex');
  }
}
```

### 3. 搜索分析与优化

#### 搜索性能监控
```typescript
@Injectable()
export class SearchAnalyticsService {
  private readonly searchMetrics = new Prometheus.Histogram({
    name: 'search_duration_seconds',
    help: 'Search query execution time',
    labelNames: ['service', 'search_type', 'tenant_id'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
  });
  
  private readonly searchCounter = new Prometheus.Counter({
    name: 'search_requests_total',
    help: 'Total number of search requests',
    labelNames: ['service', 'search_type', 'status']
  });
  
  recordSearchMetrics(
    service: string,
    searchType: string,
    duration: number,
    status: 'success' | 'error',
    tenantId?: string
  ): void {
    this.searchMetrics.observe(
      { service, search_type: searchType, tenant_id: tenantId || 'unknown' },
      duration / 1000
    );
    
    this.searchCounter.inc({
      service,
      search_type: searchType, 
      status
    });
  }
  
  async getSearchAnalytics(service: string, timeRange: string): Promise<SearchAnalytics> {
    // 查询搜索分析数据
    const analytics = await this.queryPrometheus(`
      rate(search_requests_total{service="${service}"}[${timeRange}])
    `);
    
    return {
      total_searches: analytics.total_searches,
      avg_response_time: analytics.avg_response_time,
      error_rate: analytics.error_rate,
      popular_queries: await this.getPopularQueries(service),
      slow_queries: await this.getSlowQueries(service)
    };
  }
}

interface SearchAnalytics {
  total_searches: number
  avg_response_time: number
  error_rate: number
  popular_queries: PopularQuery[]
  slow_queries: SlowQuery[]
}
```

## 📊 性能优化建议

### 1. 数据库优化

#### PostgreSQL搜索优化
```sql
-- 1. 全文搜索索引
CREATE INDEX CONCURRENTLY idx_users_fts 
ON users.users USING gin(to_tsvector('simple', first_name || ' ' || last_name || ' ' || email));

-- 2. 复合索引优化
CREATE INDEX CONCURRENTLY idx_users_search_composite 
ON users.users(tenant_id, status, created_at DESC) 
WHERE status != 'deleted';

-- 3. 部分索引优化
CREATE INDEX CONCURRENTLY idx_users_active_email 
ON users.users(tenant_id, email) 
WHERE status = 'active';

-- 4. 表达式索引
CREATE INDEX CONCURRENTLY idx_users_email_domain 
ON users.users((split_part(email, '@', 2)));

-- 5. 搜索结果物化视图
CREATE MATERIALIZED VIEW users.user_search_summary AS
SELECT 
  tenant_id,
  status,
  COUNT(*) as user_count,
  DATE_TRUNC('day', created_at) as date_created
FROM users.users 
WHERE status != 'deleted'
GROUP BY tenant_id, status, DATE_TRUNC('day', created_at);

-- 定期刷新
SELECT cron.schedule('refresh-user-search', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY users.user_search_summary;');
```

#### 查询优化技巧
```typescript
// 1. 查询批处理
async batchSearch(queries: SearchQuery[]): Promise<SearchResponse[]> {
  // 将多个查询合并为一个复杂查询，减少数据库往返
  const batchQuery = this.buildBatchQuery(queries);
  const results = await this.repository.query(batchQuery);
  return this.parseBatchResults(results, queries);
}

// 2. 预加载关联数据
async searchWithRelations(params: SearchParams): Promise<SearchResponse<User>> {
  const qb = this.repository.createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'role')
    .leftJoinAndSelect('user.tenant', 'tenant')
    .where(/* 搜索条件 */);
    
  return qb.getMany();
}

// 3. 分页游标优化
async cursorBasedPagination(cursor?: string, limit: number = 20): Promise<CursorPaginatedResult<User>> {
  const qb = this.repository.createQueryBuilder('user');
  
  if (cursor) {
    const decodedCursor = this.decodeCursor(cursor);
    qb.where('user.id > :cursor', { cursor: decodedCursor.id });
  }
  
  const items = await qb
    .orderBy('user.id', 'ASC')
    .limit(limit + 1) // 多取一条判断是否有下一页
    .getMany();
    
  const hasNext = items.length > limit;
  if (hasNext) items.pop();
  
  const nextCursor = hasNext ? this.encodeCursor(items[items.length - 1]) : null;
  
  return { items, nextCursor, hasNext };
}
```

### 2. 缓存优化策略

#### 多层缓存架构
```typescript
@Injectable()
export class MultiLevelCacheService {
  constructor(
    private readonly redisCache: RedisService,      // L1: Redis缓存
    private readonly memoryCache: NodeCache,        // L2: 内存缓存
    private readonly cdnCache: CDNService           // L3: CDN缓存
  ) {}
  
  async get<T>(key: string): Promise<T | null> {
    // L2: 内存缓存 (最快)
    let result = this.memoryCache.get<T>(key);
    if (result) {
      this.recordCacheHit('memory', key);
      return result;
    }
    
    // L1: Redis缓存
    result = await this.redisCache.get<T>(key);
    if (result) {
      this.memoryCache.set(key, result, 60); // 写入内存缓存1分钟
      this.recordCacheHit('redis', key);
      return result;
    }
    
    // L3: CDN缓存 (用于静态搜索结果)
    if (this.isStaticSearchResult(key)) {
      result = await this.cdnCache.get<T>(key);
      if (result) {
        this.redisCache.set(key, result, 300);
        this.memoryCache.set(key, result, 60);
        this.recordCacheHit('cdn', key);
        return result;
      }
    }
    
    return null;
  }
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // 写入所有层级缓存
    await Promise.all([
      this.redisCache.set(key, value, ttl),
      this.memoryCache.set(key, value, Math.min(ttl, 300)), // 内存缓存最多5分钟
      this.isStaticSearchResult(key) ? this.cdnCache.set(key, value, ttl * 2) : Promise.resolve()
    ]);
  }
}
```

### 3. 搜索建议优化

#### 智能搜索建议
```typescript
@Injectable()
export class SearchSuggestionService {
  private readonly suggestionTrie = new Trie(); // 前缀树
  
  async generateSuggestions(query: string, service: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // 1. 前缀匹配建议
    const prefixSuggestions = this.suggestionTrie.search(query, 5);
    suggestions.push(...prefixSuggestions);
    
    // 2. 拼写纠错建议
    const spellCheckSuggestions = await this.getSpellCheckSuggestions(query);
    suggestions.push(...spellCheckSuggestions);
    
    // 3. 历史热门搜索
    const popularSuggestions = await this.getPopularSearchSuggestions(service, query);
    suggestions.push(...popularSuggestions);
    
    // 4. 相关搜索建议
    const relatedSuggestions = await this.getRelatedSearchSuggestions(query);
    suggestions.push(...relatedSuggestions);
    
    // 去重和排序
    return this.deduplicateAndRank(suggestions, query);
  }
  
  private async getSpellCheckSuggestions(query: string): Promise<string[]> {
    // 使用编辑距离算法进行拼写纠错
    const dictionary = await this.getSearchDictionary();
    return dictionary
      .filter(word => this.editDistance(query, word) <= 2)
      .sort((a, b) => this.editDistance(query, a) - this.editDistance(query, b))
      .slice(0, 3);
  }
  
  private editDistance(str1: string, str2: string): number {
    // Levenshtein距离算法实现
    const dp = Array(str1.length + 1).fill(null).map(() => Array(str2.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) dp[i][0] = i;
    for (let j = 0; j <= str2.length; j++) dp[0][j] = j;
    
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    
    return dp[str1.length][str2.length];
  }
}
```

## 🔄 迁移实施计划

### Phase 1: 基础设施准备 (Week 1)

#### 1.1 统一搜索接口定义
- [ ] 定义统一的搜索参数DTOs
- [ ] 创建搜索响应格式接口
- [ ] 建立搜索错误码标准
- [ ] 设计缓存键命名规范

#### 1.2 基础服务实现
- [ ] 实现BaseSearchService抽象类
- [ ] 开发SearchCacheService缓存服务
- [ ] 创建SearchAnalyticsService分析服务
- [ ] 集成Prometheus搜索指标监控

### Phase 2: 用户服务重构 (Week 1-2)

#### 2.1 API端点重构
- [ ] 重构GET /api/v1/users端点支持简单搜索
- [ ] 新增POST /api/v1/users/search结构化搜索
- [ ] 新增POST /api/v1/users/search/advanced高级搜索
- [ ] 实现GET /api/v1/users/search/suggestions搜索建议
- [ ] 移除废弃的搜索端点

#### 2.2 数据库优化
- [ ] 创建全文搜索索引
- [ ] 优化复合索引设计
- [ ] 建立搜索结果物化视图
- [ ] 设置定期索引维护任务

#### 2.3 测试验证
- [ ] 单元测试覆盖所有搜索功能
- [ ] API集成测试
- [ ] 性能压力测试
- [ ] 缓存功能测试

### Phase 3: 其他服务标准化 (Week 2-3)

#### 3.1 审计服务搜索重构
- [ ] 重构审计事件搜索API
- [ ] 实现时序搜索功能
- [ ] 添加关联事件搜索
- [ ] 优化审计日志查询性能

#### 3.2 文件服务搜索重构
- [ ] 重构文件搜索API
- [ ] 实现文件内容全文搜索
- [ ] 添加文件相似性搜索
- [ ] 实现重复文件检测

#### 3.3 监控服务搜索重构
- [ ] 重构日志搜索API
- [ ] 实现实时日志流搜索
- [ ] 添加日志模式识别
- [ ] 实现跨服务链路搜索

### Phase 4: 性能优化与监控 (Week 3-4)

#### 4.1 缓存优化
- [ ] 部署多层缓存架构
- [ ] 实现智能缓存策略
- [ ] 优化缓存键管理
- [ ] 监控缓存命中率

#### 4.2 性能监控
- [ ] 部署搜索性能监控
- [ ] 建立性能告警规则
- [ ] 创建搜索分析面板
- [ ] 实现慢查询优化

#### 4.3 文档与培训
- [ ] 编写API使用文档
- [ ] 创建最佳实践指南
- [ ] 团队培训搜索API使用
- [ ] 建立问题排查手册

### Phase 5: 验收与上线 (Week 4)

#### 5.1 全面测试
- [ ] 端到端功能测试
- [ ] 性能压力测试
- [ ] 兼容性测试
- [ ] 安全测试

#### 5.2 生产部署
- [ ] 分批次灰度发布
- [ ] 生产环境监控
- [ ] 用户反馈收集
- [ ] 问题快速响应

## 📈 成功指标

### 技术指标
- **API一致性**: 100%服务遵循统一搜索标准
- **响应时间**: P95搜索响应时间 < 200ms
- **缓存命中率**: > 80%
- **搜索准确性**: 相关结果比例 > 95%

### 业务指标  
- **开发效率**: 搜索功能开发时间减少60%
- **API使用**: 搜索API调用量提升40%
- **用户满意度**: 搜索功能满意度 > 4.5/5
- **错误率**: 搜索API错误率 < 0.1%

### 运维指标
- **监控覆盖**: 100%搜索端点监控覆盖
- **告警及时**: 性能异常告警 < 5分钟
- **问题恢复**: 搜索故障恢复时间 < 15分钟
- **资源使用**: 搜索功能资源占用 < 20%

## 🔧 风险评估与应对

### 高风险项
1. **数据库性能影响**: 搜索索引可能影响写入性能
   - **应对**: 异步索引更新，读写分离
   
2. **缓存一致性问题**: 多层缓存可能导致数据不一致
   - **应对**: 实现缓存失效机制，版本控制

3. **向后兼容性**: API变更可能影响现有客户端
   - **应对**: 保留旧端点，渐进式迁移

### 中风险项
1. **搜索结果质量**: 统一化可能降低特定场景搜索质量
   - **应对**: 提供定制化搜索选项
   
2. **性能回归**: 统一实现可能不如专门优化
   - **应对**: 基准测试，性能监控

### 低风险项
1. **学习成本**: 开发团队需要适应新API
   - **应对**: 详细文档，培训支持
   
2. **维护复杂度**: 统一框架增加维护复杂度
   - **应对**: 完善测试覆盖，文档化

## 📋 总结

本技术方案通过制定统一的搜索端点标准，解决了企业级微服务平台中搜索功能不一致的核心问题。方案采用三层搜索模式设计，支持从简单关键词搜索到复杂业务逻辑搜索的全场景需求。

**核心价值:**
- **一致性**: 统一的API设计提升开发效率
- **可扩展性**: 标准化架构支持业务快速发展  
- **高性能**: 多层缓存和数据库优化确保性能
- **易用性**: 统一的参数格式降低学习成本

**实施关键:**
- 渐进式迁移，确保向后兼容
- 性能监控，及时发现问题
- 充分测试，保证功能质量
- 文档完善，支持团队使用

通过4周的分阶段实施，该方案将建立企业级搜索功能标准，为平台的长期发展奠定坚实基础。