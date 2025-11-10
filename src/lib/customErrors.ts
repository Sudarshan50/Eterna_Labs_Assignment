/**
 * Custom error classes for better error handling
 */

/**
 * Base custom error class
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: any[];

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends CustomError {
  public override errors: any[];

  constructor(message: string = "Validation Error", errors: any[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends CustomError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends CustomError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401);
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends CustomError {
  constructor(message: string = "Access forbidden") {
    super(message, 403);
  }
}

/**
 * Bad request error class
 */
export class BadRequestError extends CustomError {
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends CustomError {
  constructor(message: string = "Resource conflict") {
    super(message, 409);
  }
}

/**
 * Internal server error class
 */
export class InternalServerError extends CustomError {
  constructor(message: string = "Internal server error") {
    super(message, 500);
  }
}