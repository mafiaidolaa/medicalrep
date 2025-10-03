/**
 * نظام معالجة الأخطاء الاحترافي
 * يمكن استخدامه تدريجياً بدون تعطيل الكود الحالي
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} غير موجود`, 404, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'غير مصرح') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'ليس لديك صلاحية') {
    super(message, 403, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, false, details);
  }
}

export class StockError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}