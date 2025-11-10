import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../lib/responseUtils.js";
import { CustomError } from "../lib/customErrors.js";

interface MongoError extends Error {
  code?: number;
  keyValue?: { [key: string]: any };
}

interface MulterError extends Error {
  code?: string;
}

/**
 * Global error handler middleware
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const globalErrorHandler = (
  err: Error | CustomError | MongoError | MulterError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  // Log error details (in production, use proper logging service)
  console.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  // Handle custom errors
  if (err instanceof CustomError) {
    return errorResponse(res, err.message, err.statusCode, err.errors || null);
  }

  // Handle validation errors (e.g., from express-validator)
  if (err.name === "ValidationError" && 'errors' in err) {
    return errorResponse(res, "Validation Error", 400, (err as any).errors);
  }

  // Handle MongoDB duplicate key error
  if ('code' in err && err.code === 11000) {
    const mongoErr = err as MongoError;
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : 'field';
    return errorResponse(res, `${field} already exists`, 409);
  }

  // Handle MongoDB cast error
  if (err.name === "CastError") {
    return errorResponse(res, "Invalid ID format", 400);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return errorResponse(res, "Token expired", 401);
  }

  // Handle multer errors (file upload)
  if ('code' in err && err.code === "LIMIT_FILE_SIZE") {
    return errorResponse(res, "File size too large", 400);
  }

  // Handle SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && "body" in err) {
    return errorResponse(res, "Invalid JSON format", 400);
  }

  // Default error response
  const statusCode = 'statusCode' in err ? (err as CustomError).statusCode || 500 : 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong!"
      : err.message;

  return errorResponse(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === "development" ? err.stack : null
  );
};

/**
 * 404 Not Found handler middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): Response => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass them to error handler
 * @param fn - Async function to wrap
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};