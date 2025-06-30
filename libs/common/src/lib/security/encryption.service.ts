/**
 * 加密服务 - 企业级数据加密
 * 支持AES、RSA、哈希等多种加密算法
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  /**
   * AES-256-GCM 加密
   */
  encrypt(text: string, secretKey?: string): {
    encrypted: string;
    iv: string;
    tag: string;
    key?: string;
  } {
    try {
      const key = secretKey ? Buffer.from(secretKey, 'hex') : crypto.randomBytes(this.keyLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('platform-encryption'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        key: secretKey ? undefined : key.toString('hex'),
      };
    } catch (error) {
      this.logger.error('加密失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * AES-256-GCM 解密
   */
  decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
  }, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
      decipher.setAAD(Buffer.from('platform-encryption'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('解密失败:', error);
      throw new Error('数据解密失败');
    }
  }

  /**
   * 生成密钥对 (RSA-2048)
   */
  generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      return { publicKey, privateKey };
    } catch (error) {
      this.logger.error('密钥对生成失败:', error);
      throw new Error('密钥对生成失败');
    }
  }

  /**
   * RSA 公钥加密
   */
  rsaEncrypt(text: string, publicKey: string): string {
    try {
      const buffer = Buffer.from(text, 'utf8');
      const encrypted = crypto.publicEncrypt(publicKey, buffer);
      return encrypted.toString('base64');
    } catch (error) {
      this.logger.error('RSA加密失败:', error);
      throw new Error('RSA加密失败');
    }
  }

  /**
   * RSA 私钥解密
   */
  rsaDecrypt(encryptedText: string, privateKey: string): string {
    try {
      const buffer = Buffer.from(encryptedText, 'base64');
      const decrypted = crypto.privateDecrypt(privateKey, buffer);
      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('RSA解密失败:', error);
      throw new Error('RSA解密失败');
    }
  }

  /**
   * 生成哈希值 (SHA-256)
   */
  hash(text: string, salt?: string): string {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(text);
      if (salt) {
        hash.update(salt);
      }
      return hash.digest('hex');
    } catch (error) {
      this.logger.error('哈希生成失败:', error);
      throw new Error('哈希生成失败');
    }
  }

  /**
   * 生成HMAC (SHA-256)
   */
  hmac(text: string, secret: string): string {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(text);
      return hmac.digest('hex');
    } catch (error) {
      this.logger.error('HMAC生成失败:', error);
      throw new Error('HMAC生成失败');
    }
  }

  /**
   * 验证HMAC
   */
  verifyHmac(text: string, secret: string, signature: string): boolean {
    try {
      const expectedSignature = this.hmac(text, secret);
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch (error) {
      this.logger.error('HMAC验证失败:', error);
      return false;
    }
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成随机数字
   */
  generateRandomNumber(min: number = 100000, max: number = 999999): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成UUID
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * 密码加密 (bcrypt)
   */
  async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      this.logger.error('密码加密失败:', error);
      throw new Error('密码加密失败');
    }
  }

  /**
   * 密码验证 (bcrypt)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error('密码验证失败:', error);
      return false;
    }
  }

  /**
   * 生成JWT密钥对
   */
  generateJWTKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    return this.generateKeyPair();
  }

  /**
   * 生成API密钥
   */
  generateApiKey(): string {
    const prefix = 'pk_'; // platform key
    const randomPart = this.generateRandomString(32);
    const timestamp = Date.now().toString(36);
    return `${prefix}${timestamp}_${randomPart}`;
  }

  /**
   * 生成会话ID
   */
  generateSessionId(): string {
    const prefix = 'sess_';
    const randomPart = this.generateRandomString(24);
    const timestamp = Date.now().toString(36);
    return `${prefix}${timestamp}_${randomPart}`;
  }

  /**
   * 数据脱敏
   */
  maskSensitiveData(data: string, type: 'email' | 'phone' | 'id' | 'custom' = 'custom'): string {
    if (!data) return data;

    switch (type) {
      case 'email':
        return data.replace(/(.{2}).+(.{2}@.+)/, '$1***$2');
      case 'phone':
        return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      case 'id':
        return data.replace(/(.{4}).+(.{4})/, '$1******$2');
      default:
        const visibleLength = Math.max(2, Math.floor(data.length * 0.3));
        const maskedLength = data.length - visibleLength * 2;
        return data.substring(0, visibleLength) + '*'.repeat(maskedLength) + data.substring(data.length - visibleLength);
    }
  }
}