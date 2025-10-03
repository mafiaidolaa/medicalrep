// Advanced Security Headers and CSP Configuration
import { NextRequest, NextResponse } from 'next/server';

interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXSS: boolean;
  enableContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  isDevelopment: boolean;
}

export class SecurityHeaders {
  private config: SecurityConfig;

  constructor(isDevelopment = false) {
    this.config = {
      enableCSP: true,
      enableHSTS: !isDevelopment,
      enableXSS: true,
      enableContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      isDevelopment
    };
  }

  // Content Security Policy
  private generateCSP(): string {
    const nonce = this.generateNonce();
    
    // Development CSP (more permissive)
    if (this.config.isDevelopment) {
      return [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        "font-src 'self' fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob:",
        "connect-src 'self' ws: wss: https:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "manifest-src 'self'",
        "upgrade-insecure-requests"
      ].join('; ');
    }

    // Production CSP (strict)
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: https:",
      "media-src 'self'",
      "connect-src 'self' https:",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
      "upgrade-insecure-requests"
    ].join('; ');
  }

  // Permissions Policy (Feature Policy)
  private generatePermissionsPolicy(): string {
    return [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=()',
      'vibrate=()',
      'fullscreen=(self)',
      'payment=()'
    ].join(', ');
  }

  // Generate cryptographically secure nonce
  private generateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    // Fallback for environments without crypto.randomUUID
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Apply all security headers
  public applyHeaders(response: NextResponse, request: NextRequest): NextResponse {
    // Content Security Policy
    if (this.config.enableCSP) {
      response.headers.set('Content-Security-Policy', this.generateCSP());
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS && !this.config.isDevelopment) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Content-Type-Options
    if (this.config.enableContentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    response.headers.set('X-Frame-Options', 'DENY');

    // X-XSS-Protection
    if (this.config.enableXSS) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      response.headers.set('Permissions-Policy', this.generatePermissionsPolicy());
    }

    // Cross-Origin Policies
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // Server information hiding
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');

    // Cache control for sensitive endpoints
    if (this.isSensitiveEndpoint(request.nextUrl.pathname)) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, max-age=0'
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }

    return response;
  }

  // Check if endpoint contains sensitive data
  private isSensitiveEndpoint(pathname: string): boolean {
    const sensitivePatterns = [
      '/api/auth',
      '/api/user',
      '/api/admin',
      '/api/payment',
      '/api/personal',
      '/login',
      '/register',
      '/profile',
      '/settings'
    ];

    return sensitivePatterns.some(pattern => pathname.includes(pattern));
  }

  // Rate limiting headers
  public addRateLimitHeaders(
    response: NextResponse,
    limit: number,
    remaining: number,
    resetTime: number
  ): NextResponse {
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());

    if (remaining === 0) {
      response.headers.set('Retry-After', Math.ceil(resetTime - Date.now() / 1000).toString());
    }

    return response;
  }

  // Security event logging
  public logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    request: NextRequest;
  }) {
    const securityLog = {
      timestamp: new Date().toISOString(),
      type: event.type,
      severity: event.severity,
      ip: this.getClientIP(event.request),
      userAgent: event.request.headers.get('user-agent'),
      url: event.request.nextUrl.href,
      method: event.request.method,
      ...event.details
    };

    // Log to console in development
    if (this.config.isDevelopment) {
      console.warn('🔒 Security Event:', securityLog);
    }

    // In production, send to security monitoring service
    this.sendToSecurityMonitoring(securityLog);
  }

  // Extract client IP address
  private getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    return (
      cfConnectingIP ||
      forwardedFor?.split(',')[0]?.trim() ||
      realIP ||
      'unknown'
    );
  }

  // Send security events to monitoring service
  private sendToSecurityMonitoring(event: any) {
    try {
      // Send to your security monitoring service
      if (process.env.SECURITY_WEBHOOK_URL) {
        fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN || ''}`
          },
          body: JSON.stringify(event)
        }).catch(error => {
          console.error('Failed to send security event:', error);
        });
      }
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }
}

// Request validation utilities
export class RequestValidator {
  private static suspiciousPatterns = [
    // SQL Injection patterns
    /(union|select|insert|drop|delete|update|exec|script)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal patterns
    /\.\./g,
    /\.\.\\/g,
    // Command injection patterns
    /[;&|\`]/g,
  ];

  public static validateInput(input: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = [];

    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push('Pattern ' + (index + 1) + ' matched');
      }
    });

    return {
      isValid: threats.length === 0,
      threats
    };
  }

  public static sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}

// Rate limiting utility
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  public static check(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      const resetTime = now + windowMs;
      this.requests.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
  }
}

export default SecurityHeaders;