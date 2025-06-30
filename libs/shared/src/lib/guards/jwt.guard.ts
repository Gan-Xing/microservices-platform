/**
 * JWT认证守卫 - 基于统一认证标准化
 * 支持访问令牌和刷新令牌验证
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { StandardJWTPayload } from '../interfaces/jwt-payload.interface';
import { AUTH_CONSTANTS } from '../constants/api.constants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // 检查是否为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('访问令牌缺失');
    }

    try {
      const payload = await this.jwtService.verifyAsync<StandardJWTPayload>(token);
      
      // 验证令牌基本信息
      this.validateTokenPayload(payload);
      
      // 将用户信息添加到请求对象
      request['user'] = payload;
      request['tenantId'] = payload.tenantId;
      
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('访问令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('访问令牌无效');
      }
      throw new UnauthorizedException('访问令牌验证失败');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers[AUTH_CONSTANTS.JWT_HEADER.toLowerCase()];
    if (!authorization || typeof authorization !== 'string') {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === AUTH_CONSTANTS.JWT_PREFIX ? token : undefined;
  }

  private validateTokenPayload(payload: StandardJWTPayload): void {
    // 验证必需字段
    if (!payload.sub || !payload.tenantId || !payload.sessionId) {
      throw new UnauthorizedException('访问令牌格式无效');
    }

    // 验证签发者
    if (payload.iss !== 'platform-auth-service') {
      throw new UnauthorizedException('访问令牌签发者无效');
    }

    // 验证受众
    if (!payload.aud || !payload.aud.includes('api-gateway')) {
      throw new UnauthorizedException('访问令牌受众无效');
    }
  }
}