# 文件存储服务开发文档 - 标准版本

## 服务概述

文件存储服务是微服务平台的资源管理核心，面向**100租户+10万用户**的企业级生产系统，负责文件上传、存储、访问控制、CDN加速、媒体处理等功能，为整个平台提供统一的文件管理能力。

### 🎯 标准版本定位
- **存储规模**: 支持100TB文件存储，10万用户文件管理
- **上传性能**: 支持大文件分片上传，并发上传优化 
- **存储方案**: MinIO对象存储 + PostgreSQL元数据
- **访问控制**: 细粒度权限控制，安全访问链接
- **部署方式**: Docker Compose + MinIO对象存储
- **服务优先级**: Week 3开发，复杂度⭐⭐⭐⭐ (10/12)
- **依赖服务**: 认证服务(3001) + 权限服务(3002) + 用户服务(3003)
- **内存分配**: 512MB (标准版本8GB总内存中的6.4%)

## 技术栈

### 后端技术
- **框架**: NestJS 10.x + TypeScript 5.x
- **数据库**: PostgreSQL 15+ (元数据) + Redis 7+ (缓存)
- **ORM**: Prisma ORM
- **文件存储**: MinIO (S3兼容，标准版本推荐) / AWS S3 / 本地存储
- **图片处理**: Sharp.js
- **视频处理**: FFmpeg
- **压缩**: Node.js zlib / 7zip
- **安全扫描**: ClamAV 防病毒

### 存储技术 (标准版本)
- **对象存储**: MinIO (自部署S3兼容存储)
- **CDN加速**: Nginx反向代理 + 缓存
- **缓存策略**: Redis + 浏览器缓存
- **备份策略**: 本地备份 + 定期归档
- **消息队列**: Redis Streams (替代Kafka)
- **部署方案**: Docker Compose (替代Kubernetes)

### 监控技术
- **日志**: Winston
- **指标**: Prometheus + Grafana
- **健康检查**: NestJS Health Check

## 核心功能模块

### 1. 文件元数据管理
```typescript
// 文件实体定义
interface FileEntity {
  id: string
  tenantId: string
  userId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  md5Hash: string
  sha256Hash: string
  storageProvider: 'local' | 's3' | 'oss' | 'cos'
  storagePath: string
  storageKey: string
  bucketName?: string
  isPublic: boolean
  downloadCount: number
  tags: string[]
  metadata: Record<string, any>
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted'
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// 文件版本管理
interface FileVersion {
  id: string
  fileId: string
  version: number
  size: number
  storageKey: string
  metadata: Record<string, any>
  createdAt: Date
}

// 文件分享链接
interface FileShare {
  id: string
  fileId: string
  shareToken: string
  password?: string
  expiresAt?: Date
  downloadLimit?: number
  downloadCount: number
  allowedIPs?: string[]
  createdBy: string
  createdAt: Date
}
```

### 2. 文件上传处理
```typescript
// 文件上传服务
interface FileUploadService {
  uploadSingle(file: Express.Multer.File, options: UploadOptions): Promise<FileEntity>
  uploadMultiple(files: Express.Multer.File[], options: UploadOptions): Promise<FileEntity[]>
  uploadByUrl(url: string, options: UploadOptions): Promise<FileEntity>
  uploadChunked(chunk: ChunkData, options: ChunkUploadOptions): Promise<ChunkUploadResult>
  resumableUpload(resumeToken: string, chunk: ChunkData): Promise<ChunkUploadResult>
  completeChunkedUpload(uploadId: string): Promise<FileEntity>
  cancelUpload(uploadId: string): Promise<void>
}

// 分片上传处理
interface ChunkUploadService {
  initializeUpload(metadata: FileMetadata): Promise<ChunkedUpload>
  uploadChunk(uploadId: string, chunkNumber: number, chunk: Buffer): Promise<ChunkResult>
  completeUpload(uploadId: string): Promise<FileEntity>
  abortUpload(uploadId: string): Promise<void>
  listParts(uploadId: string): Promise<UploadPart[]>
}

// 上传配置
interface UploadOptions {
  tenantId: string
  userId: string
  folder?: string
  isPublic?: boolean
  tags?: string[]
  expiresAt?: Date
  allowedMimeTypes?: string[]
  maxFileSize?: number
  autoProcessImages?: boolean
  generateThumbnails?: boolean
  scanForVirus?: boolean
}
```

### 3. 多存储后端支持
```typescript
// 存储提供商接口
interface StorageProvider {
  upload(key: string, file: Buffer | Stream, options: StorageOptions): Promise<StorageResult>
  download(key: string): Promise<Buffer>
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  getMetadata(key: string): Promise<StorageMetadata>
  listObjects(prefix: string, options?: ListOptions): Promise<StorageObject[]>
}

// AWS S3 实现
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private s3: AWS.S3

  constructor(private config: S3Config) {
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    })
  }

  async upload(key: string, file: Buffer | Stream, options: StorageOptions): Promise<StorageResult> {
    const uploadParams = {
      Bucket: options.bucket,
      Key: key,
      Body: file,
      ContentType: options.contentType,
      ServerSideEncryption: 'AES256',
      Metadata: options.metadata
    }

    if (options.isPublic) {
      uploadParams['ACL'] = 'public-read'
    }

    const result = await this.s3.upload(uploadParams).promise()
    
    return {
      key: result.Key,
      url: result.Location,
      etag: result.ETag,
      versionId: result.VersionId
    }
  }

  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.config.bucket,
      Key: key,
      Expires: expiresIn
    })
  }
}

// 阿里云OSS实现
@Injectable()
export class OSSStorageProvider implements StorageProvider {
  private client: OSS

  constructor(private config: OSSConfig) {
    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket
    })
  }

  // OSS specific implementation
}

// 本地存储实现
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private config: LocalStorageConfig) {}
  
  // Local filesystem implementation
}
```

### 4. 媒体处理服务
```typescript
// 图片处理服务
interface ImageProcessingService {
  generateThumbnails(fileId: string, sizes: ImageSize[]): Promise<FileEntity[]>
  resizeImage(fileId: string, width: number, height: number, options?: ResizeOptions): Promise<FileEntity>
  cropImage(fileId: string, x: number, y: number, width: number, height: number): Promise<FileEntity>
  rotateImage(fileId: string, degrees: number): Promise<FileEntity>
  convertFormat(fileId: string, format: 'jpeg' | 'png' | 'webp' | 'avif'): Promise<FileEntity>
  addWatermark(fileId: string, watermarkId: string, options: WatermarkOptions): Promise<FileEntity>
  optimizeImage(fileId: string, quality?: number): Promise<FileEntity>
}

// 视频处理服务
interface VideoProcessingService {
  generateThumbnail(fileId: string, timestamp: number): Promise<FileEntity>
  extractFrames(fileId: string, intervals: number[]): Promise<FileEntity[]>
  transcodeVideo(fileId: string, format: VideoFormat, quality: VideoQuality): Promise<FileEntity>
  compressVideo(fileId: string, options: CompressionOptions): Promise<FileEntity>
  addSubtitles(fileId: string, subtitleFileId: string): Promise<FileEntity>
  getVideoInfo(fileId: string): Promise<VideoMetadata>
}

// 文档处理服务
interface DocumentProcessingService {
  convertToPdf(fileId: string): Promise<FileEntity>
  generatePreview(fileId: string, pages?: number[]): Promise<FileEntity[]>
  extractText(fileId: string): Promise<string>
  splitDocument(fileId: string, pageRanges: PageRange[]): Promise<FileEntity[]>
  mergeDocuments(fileIds: string[]): Promise<FileEntity>
  addWatermark(fileId: string, watermarkText: string, options: WatermarkOptions): Promise<FileEntity>
}
```

### 5. 安全与访问控制
```typescript
// 文件权限管理
interface FilePermission {
  id: string
  fileId: string
  userId?: string
  roleId?: string
  tenantId: string
  permissions: ('read' | 'write' | 'delete' | 'share')[]
  expiresAt?: Date
  createdAt: Date
}

// 访问控制服务
interface AccessControlService {
  checkPermission(userId: string, fileId: string, permission: string): Promise<boolean>
  grantPermission(fileId: string, userId: string, permissions: string[]): Promise<FilePermission>
  revokePermission(fileId: string, userId: string): Promise<void>
  listUserFiles(userId: string, tenantId: string, options?: ListOptions): Promise<FileEntity[]>
  createShareLink(fileId: string, options: ShareOptions): Promise<FileShare>
  validateShareLink(shareToken: string, password?: string): Promise<FileShare>
}

// 病毒扫描服务
interface VirusScanService {
  scanFile(fileId: string): Promise<ScanResult>
  quarantineFile(fileId: string, reason: string): Promise<void>
  restoreFile(fileId: string): Promise<void>
  updateVirusDatabase(): Promise<void>
}

// 扫描结果
interface ScanResult {
  fileId: string
  isClean: boolean
  threats: VirusThreat[]
  scanDate: Date
  scanEngine: string
  engineVersion: string
}
```

## 数据库设计

### PostgreSQL 表结构
```sql
-- 文件主表
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  md5_hash CHAR(32) NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  bucket_name VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'ready',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  INDEX idx_files_tenant_user (tenant_id, user_id),
  INDEX idx_files_hash (md5_hash, sha256_hash),
  INDEX idx_files_status (status, created_at),
  INDEX idx_files_expires (expires_at) WHERE expires_at IS NOT NULL,
  INDEX idx_files_tags USING GIN (tags),
  UNIQUE (tenant_id, md5_hash, sha256_hash)
);

-- 文件版本表
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_versions_file (file_id, version),
  UNIQUE (file_id, version)
);

-- 文件权限表
CREATE TABLE file_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID,
  role_id UUID,
  tenant_id UUID NOT NULL,
  permissions VARCHAR(50)[] NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_permissions_file (file_id),
  INDEX idx_permissions_user (user_id, tenant_id),
  INDEX idx_permissions_expires (expires_at) WHERE expires_at IS NOT NULL
);

-- 文件分享表
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  expires_at TIMESTAMP,
  download_limit INTEGER,
  download_count INTEGER DEFAULT 0,
  allowed_ips TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_shares_token (share_token),
  INDEX idx_shares_file (file_id),
  INDEX idx_shares_expires (expires_at) WHERE expires_at IS NOT NULL
);

-- 分片上传表
CREATE TABLE chunked_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id VARCHAR(255) NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  total_size BIGINT NOT NULL,
  chunk_size INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER DEFAULT 0,
  storage_provider VARCHAR(50) NOT NULL,
  storage_key TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_uploads_user (user_id, tenant_id),
  INDEX idx_uploads_status (status, expires_at)
);

-- 上传分片记录表
CREATE TABLE upload_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES chunked_uploads(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  etag VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_chunks_upload (upload_id, chunk_number),
  UNIQUE (upload_id, chunk_number)
);

-- 病毒扫描结果表
CREATE TABLE virus_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  is_clean BOOLEAN NOT NULL,
  threats JSONB DEFAULT '[]',
  scan_date TIMESTAMP DEFAULT NOW(),
  scan_engine VARCHAR(100) NOT NULL,
  engine_version VARCHAR(50) NOT NULL,
  
  INDEX idx_scan_file (file_id),
  INDEX idx_scan_date (scan_date),
  INDEX idx_scan_threats (is_clean)
);

-- 文件处理任务表
CREATE TABLE file_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL,
  job_data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_jobs_file (file_id),
  INDEX idx_jobs_status (status, created_at),
  INDEX idx_jobs_type (job_type, status)
);
```

### Redis 数据结构
```typescript
// 上传进度缓存
interface RedisUploadCache {
  'upload:progress:{uploadId}': {
    totalChunks: number
    uploadedChunks: number
    totalSize: number
    uploadedSize: number
    lastActivity: number
  }
  
  // 下载限制
  'download:limit:{userId}:{date}': number  // 每日下载次数
  'download:bandwidth:{userId}': number     // 带宽使用量
  
  // 文件缓存
  'file:metadata:{fileId}': FileEntity      // 文件元数据缓存
  'file:permissions:{userId}:{fileId}': string[]  // 权限缓存
  
  // 分享链接缓存
  'share:token:{shareToken}': FileShare     // 分享链接信息
  
  // 处理任务队列
  'processing:queue': ProcessingJob[]       // 文件处理任务队列
}
```

## API 设计

### RESTful API 端点
```typescript
// 文件上传 API
@Controller('files')
export class FileController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: UploadOptionsDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.uploadSingle(file, {
      ...options,
      tenantId: req.tenantId,
      userId: req.user.id
    })
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() options: UploadOptionsDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.uploadMultiple(files, {
      ...options,
      tenantId: req.tenantId,
      userId: req.user.id
    })
  }

  @Post('upload/chunked/init')
  async initChunkedUpload(@Body() metadata: ChunkedUploadInitDto) {
    return this.chunkService.initializeUpload(metadata)
  }

  @Post('upload/chunked/:uploadId/chunk/:chunkNumber')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @Param('uploadId') uploadId: string,
    @Param('chunkNumber') chunkNumber: number,
    @UploadedFile() chunk: Express.Multer.File
  ) {
    return this.chunkService.uploadChunk(uploadId, chunkNumber, chunk.buffer)
  }

  @Post('upload/chunked/:uploadId/complete')
  async completeChunkedUpload(@Param('uploadId') uploadId: string) {
    return this.chunkService.completeUpload(uploadId)
  }

  @Delete('upload/chunked/:uploadId')
  async abortChunkedUpload(@Param('uploadId') uploadId: string) {
    return this.chunkService.abortUpload(uploadId)
  }
}

// 文件管理 API
@Controller('files')
export class FileManagementController {
  @Get()
  async listFiles(@Query() query: ListFilesDto, @Req() req: AuthenticatedRequest) {
    return this.fileService.listUserFiles(req.user.id, req.tenantId, query)
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    return this.fileService.getFileById(id)
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const downloadUrl = await this.fileService.getDownloadUrl(id)
    res.redirect(downloadUrl)
  }

  @Get(':id/stream')
  async streamFile(@Param('id') id: string, @Res() res: Response) {
    const stream = await this.fileService.getFileStream(id)
    stream.pipe(res)
  }

  @Put(':id')
  async updateFile(@Param('id') id: string, @Body() updateData: UpdateFileDto) {
    return this.fileService.updateFile(id, updateData)
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return this.fileService.deleteFile(id)
  }

  @Post(':id/copy')
  async copyFile(@Param('id') id: string, @Body() options: CopyFileDto) {
    return this.fileService.copyFile(id, options)
  }

  @Post(':id/move')
  async moveFile(@Param('id') id: string, @Body() options: MoveFileDto) {
    return this.fileService.moveFile(id, options)
  }
}

// 文件分享 API
@Controller('shares')
export class FileShareController {
  @Post()
  async createShare(@Body() shareData: CreateShareDto, @Req() req: AuthenticatedRequest) {
    return this.shareService.createShareLink(shareData.fileId, {
      ...shareData,
      createdBy: req.user.id
    })
  }

  @Get(':token')
  async getShareInfo(@Param('token') token: string, @Body() password?: string) {
    return this.shareService.validateShareLink(token, password)
  }

  @Get(':token/download')
  async downloadSharedFile(@Param('token') token: string, @Body() password?: string) {
    const share = await this.shareService.validateShareLink(token, password)
    return this.fileService.getDownloadUrl(share.fileId)
  }

  @Delete(':id')
  async deleteShare(@Param('id') id: string) {
    return this.shareService.deleteShare(id)
  }
}

// 媒体处理 API
@Controller('media')
export class MediaProcessingController {
  @Post('images/:id/thumbnails')
  async generateThumbnails(@Param('id') id: string, @Body() sizes: ImageSize[]) {
    return this.imageService.generateThumbnails(id, sizes)
  }

  @Post('images/:id/resize')
  async resizeImage(@Param('id') id: string, @Body() options: ResizeImageDto) {
    return this.imageService.resizeImage(id, options.width, options.height, options)
  }

  @Post('images/:id/convert')
  async convertImage(@Param('id') id: string, @Body() options: ConvertImageDto) {
    return this.imageService.convertFormat(id, options.format)
  }

  @Post('videos/:id/thumbnail')
  async generateVideoThumbnail(@Param('id') id: string, @Body() options: VideoThumbnailDto) {
    return this.videoService.generateThumbnail(id, options.timestamp)
  }

  @Post('videos/:id/transcode')
  async transcodeVideo(@Param('id') id: string, @Body() options: TranscodeVideoDto) {
    return this.videoService.transcodeVideo(id, options.format, options.quality)
  }

  @Post('documents/:id/convert')
  async convertDocument(@Param('id') id: string, @Body() options: ConvertDocumentDto) {
    return this.documentService.convertToPdf(id)
  }
}
```

## 存储策略配置

### 多存储后端配置
```typescript
// 存储配置接口
interface StorageConfiguration {
  default: string  // 默认存储后端
  backends: {
    local?: LocalStorageConfig
    s3?: S3StorageConfig
    oss?: OSSStorageConfig
    cos?: COSStorageConfig
  }
  rules: StorageRule[]  // 存储规则
}

// 存储规则
interface StorageRule {
  name: string
  conditions: {
    mimeType?: string[]
    size?: { min?: number, max?: number }
    tenantId?: string[]
    userRole?: string[]
  }
  backend: string
  options?: {
    encryption?: boolean
    compression?: boolean
    replication?: boolean
    ttl?: number
  }
}

// 示例配置
const storageConfig: StorageConfiguration = {
  default: 's3',
  backends: {
    local: {
      path: '/var/lib/file-storage',
      maxSize: '10GB'
    },
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-east-1',
      bucket: 'my-app-files'
    },
    oss: {
      accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
      region: 'oss-cn-hangzhou',
      bucket: 'my-app-files'
    }
  },
  rules: [
    {
      name: 'large-videos',
      conditions: {
        mimeType: ['video/*'],
        size: { min: 100 * 1024 * 1024 } // > 100MB
      },
      backend: 'oss',
      options: {
        compression: true,
        replication: true
      }
    },
    {
      name: 'temporary-files',
      conditions: {
        size: { max: 10 * 1024 * 1024 } // < 10MB
      },
      backend: 'local',
      options: {
        ttl: 24 * 60 * 60 // 24小时过期
      }
    }
  ]
}
```

## 📋 项目规划 (标准版本)

### 开发里程碑

**Week 3 开发计划** (文件存储服务优先级: 10/12)

#### 里程碑 1: 基础架构 (Week 3.1-3.2)
- ✅ PostgreSQL表结构设计
- ✅ MinIO对象存储集成
- ✅ 基础CRUD API开发
- ✅ 文件上传下载功能
- 目标：基础文件管理功能可用

#### 里程碑 2: 高级功能 (Week 3.3-3.4)
- 🔄 分片上传支持
- 🔄 权限控制集成
- 🔄 媒体处理功能
- 🔄 安全扫描集成
- 目标：企业级功能完备

#### 里程碑 3: 集成测试 (Week 3.5-3.6)
- 🔄 与认证服务集成
- 🔄 与权限服务集成
- 🔄 性能测试和优化
- 🔄 监控告警配置
- 目标：生产就绪

#### 里程碑 4: 部署上线 (Week 3.7)
- 🔄 Docker Compose配置
- 🔄 环境变量配置
- 🔄 备份策略实施
- 🔄 文档完善
- 目标：生产环境部署

### 内存分配策略

**标准版本总内存预算: 8GB**

| 组件 | 内存分配 | 占比 | 说明 |
|------|---------|------|------|
| 文件存储服务 | 512MB | 6.4% | 基础运行内存 |
| MinIO对象存储 | 512MB | 6.4% | 对象存储引擎 |
| PostgreSQL共享 | 2GB | 25% | 所有服务共享数据库 |
| Redis共享 | 512MB | 6.4% | 缓存和会话存储 |
| Nginx代理 | 128MB | 1.6% | 静态文件服务 |
| 其他服务 | 4.3GB | 54.2% | 剩余11个微服务 |

### 风险评估

#### 技术风险 🔴
- **大文件上传处理**: 分片上传复杂性，内存占用控制
- **存储性能**: MinIO在单机环境下的性能表现
- **缓解措施**: 使用流式处理，限制单文件大小，实施文件压缩

#### 依赖风险 🟡
- **认证服务依赖**: 文件权限控制依赖认证服务
- **权限服务依赖**: 细粒度访问控制依赖RBAC服务
- **缓解措施**: 实现降级模式，本地权限缓存

#### 集成风险 🟡
- **MinIO集成复杂性**: S3兼容API的配置和调试
- **媒体处理性能**: Sharp/FFmpeg在容器环境的资源消耗
- **缓解措施**: 详细的集成测试，性能基准测试

#### 运维风险 🟢
- **存储空间管理**: 100TB存储空间的监控和清理
- **备份恢复**: 大文件备份策略的可靠性
- **缓解措施**: 自动化清理任务，增量备份策略

### 服务间交互设计

#### 依赖关系图
```
文件存储服务 (3006)
    ↓ 用户身份验证
认证授权服务 (3001)
    ↓ 权限检查
权限管理服务 (3002)
    ↓ 用户信息
用户管理服务 (3003)
    ↓ 审计日志
日志审计服务 (3008)
    ↓ 任务调度
任务调度服务 (3009)
```

#### 内部API接口设计

**服务间认证**: 使用X-Service-Token头部
```typescript
// 内部服务调用示例
headers: {
  'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
  'X-Tenant-ID': tenantId,
  'X-User-ID': userId
}
```

**核心内部端点**:
- `POST /internal/files/validate` - 验证文件权限
- `GET /internal/files/{id}/metadata` - 获取文件元数据
- `POST /internal/files/{id}/audit` - 记录访问日志
- `GET /internal/files/usage/{tenantId}` - 获取租户存储使用量

## 部署方案

### Docker Compose 配置 (标准版本)

```yaml
# docker-compose.yml
version: '3.8'

services:
  file-storage-service:
    build:
      context: ./file-storage-service
      dockerfile: Dockerfile
    container_name: file-storage-service
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://platform_user:platform_pass@postgres:5432/platform_db
      - REDIS_URL=redis://redis:6379
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_ENDPOINT=minio:9000
      - MAX_FILE_SIZE=100MB
      - ALLOWED_MIME_TYPES=image/*,video/*,application/pdf,text/*
    volumes:
      - file_storage_data:/app/storage
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
      - minio
    networks:
      - platform-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MinIO对象存储 (标准版本)
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    networks:
      - platform-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # Nginx文件服务代理
  nginx:
    image: nginx:alpine
    container_name: nginx-file-proxy
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - file_storage_data:/var/www/files:ro
    depends_on:
      - file-storage-service
    networks:
      - platform-network

volumes:
  file_storage_data:
    driver: local
  minio_data:
    driver: local

networks:
  platform-network:
    external: true
```

### Nginx 配置
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream file_storage {
        server file-storage-service:3006;
    }
    
    # 文件直接访问
    server {
        listen 80;
        
        # 静态文件服务
        location /files/ {
            alias /var/www/files/;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }
        
        # API代理
        location /api/ {
            proxy_pass http://file_storage;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 大文件上传配置
            client_max_body_size 100M;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
        }
    }
}
```

## 监控告警

### 关键指标
```typescript
// Prometheus 指标定义
const metrics = {
  // 文件上传指标
  filesUploaded: new promClient.Counter({
    name: 'files_uploaded_total',
    help: 'Total number of files uploaded',
    labelNames: ['tenant_id', 'storage_backend', 'mime_type']
  }),
  
  // 文件大小指标
  uploadSize: new promClient.Histogram({
    name: 'file_upload_size_bytes',
    help: 'File upload size distribution',
    labelNames: ['storage_backend'],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600] // 1KB to 100MB
  }),
  
  // 处理时间指标
  processingDuration: new promClient.Histogram({
    name: 'file_processing_duration_seconds',
    help: 'File processing duration',
    labelNames: ['operation', 'mime_type'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
  }),
  
  // 存储使用量
  storageUsage: new promClient.Gauge({
    name: 'storage_usage_bytes',
    help: 'Current storage usage',
    labelNames: ['tenant_id', 'storage_backend']
  }),
  
  // 下载统计
  downloads: new promClient.Counter({
    name: 'file_downloads_total',
    help: 'Total number of file downloads',
    labelNames: ['tenant_id', 'access_type'] // direct, shared
  })
}
```

### 告警规则
```yaml
# prometheus-alerts.yml
groups:
- name: file-storage-service
  rules:
  - alert: HighUploadFailureRate
    expr: rate(files_uploaded_total{status="failed"}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High file upload failure rate"
      description: "Upload failure rate is {{ $value }} for {{ $labels.storage_backend }}"

  - alert: StorageQuotaExceeded
    expr: storage_usage_bytes / storage_quota_bytes > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Storage quota nearly exceeded"
      description: "Tenant {{ $labels.tenant_id }} is using {{ $value | humanizePercentage }} of storage quota"

  - alert: SlowFileProcessing
    expr: histogram_quantile(0.95, rate(file_processing_duration_seconds_bucket[5m])) > 60
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "File processing too slow"
      description: "95th percentile processing time is {{ $value }}s for {{ $labels.operation }}"

  - alert: VirusScanFailure
    expr: increase(virus_scan_failures_total[1h]) > 10
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "Multiple virus scan failures"
      description: "{{ $value }} virus scan failures in the last hour"
```

## 开发指南

### 本地开发环境
```bash
# 1. 克隆项目
git clone <repository-url>
cd file-storage-service

# 2. 安装依赖
npm install

# 3. 启动依赖服务
docker-compose up -d postgres redis minio

# 4. 数据库迁移
npx prisma migrate dev

# 5. 启动开发服务器
npm run start:dev

# 6. 运行测试
npm run test
npm run test:e2e
```

### 环境变量配置
```bash
# .env.development
DATABASE_URL="postgresql://user:pass@localhost:5432/file_storage_db"
REDIS_URL="redis://localhost:6379"

# 存储配置
STORAGE_DEFAULT_BACKEND="local"
STORAGE_LOCAL_PATH="/tmp/file-storage"

# AWS S3 配置
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket"

# 文件限制
MAX_FILE_SIZE="100MB"
ALLOWED_MIME_TYPES="image/*,video/*,application/pdf"

# 安全配置
ENABLE_VIRUS_SCAN="true"
ENABLE_FILE_ENCRYPTION="true"

# CDN配置
CDN_DOMAIN="https://cdn.yourdomain.com"
CDN_ENABLED="true"
```

### Docker Compose集成配置

```yaml
# 标准版本核心配置
services:
  file-storage-service:
    # 服务发现: 使用服务名 file-storage-service:3006
    networks:
      - platform-network
    depends_on:
      - postgres      # 共享PostgreSQL实例
      - redis         # 共享Redis实例
      - minio         # 专用MinIO实例
    # 健康检查集成
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
```

### 监控集成 (Prometheus + Grafana)

```typescript
// 关键业务指标
const fileStorageMetrics = {
  // 存储使用量指标
  storageUsed: new Gauge({
    name: 'file_storage_used_bytes',
    help: 'Total storage used by tenant',
    labelNames: ['tenant_id']
  }),
  
  // 上传性能指标
  uploadLatency: new Histogram({
    name: 'file_upload_duration_seconds',
    help: 'File upload duration',
    labelNames: ['file_size_range', 'storage_backend']
  }),
  
  // 服务可用性指标
  serviceHealth: new Gauge({
    name: 'file_storage_service_up',
    help: 'File storage service availability'
  })
}
```

这个文件存储服务将为整个微服务平台提供强大的文件管理能力，支持多种存储后端、媒体处理、安全扫描等企业级功能，完全符合标准版本的技术选型和性能要求。