import { Response } from "express";

/**
 * Utility functions for standardized API responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  timestamp: string;
}

/**
 * Send success response
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 */
export const successResponse = <T = any>(
  res: Response,
  data: T | null = null,
  message: string = "Success",
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send error response
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param errors - Additional error details
 */
export const errorResponse = (
  res: Response,
  message: string = "Internal Server Error",
  statusCode: number = 500,
  errors: any = null
): Response<ApiResponse> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send validation error response
 * @param res - Express response object
 * @param validationErrors - Array of validation errors
 * @param message - Error message
 */
export const validationErrorResponse = (
  res: Response,
  validationErrors: any[],
  message: string = "Validation Error"
): Response<ApiResponse> => {
  return res.status(400).json({
    success: false,
    message,
    errors: validationErrors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send not found response
 * @param res - Express response object
 * @param message - Not found message
 */
export const notFoundResponse = (
  res: Response,
  message: string = "Resource not found"
): Response<ApiResponse> => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send unauthorized response
 * @param res - Express response object
 * @param message - Unauthorized message
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = "Unauthorized access"
): Response<ApiResponse> => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send forbidden response
 * @param res - Express response object
 * @param message - Forbidden message
 */
export const forbiddenResponse = (
  res: Response,
  message: string = "Access forbidden"
): Response<ApiResponse> => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
  });
};