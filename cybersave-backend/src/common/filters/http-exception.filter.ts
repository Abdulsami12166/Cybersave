import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      exception instanceof HttpException
        ? typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exception.message
          : exceptionResponse || exception.message
        : 'Internal server error';

    const errorDetails =
      exception instanceof Error ? exception.stack : JSON.stringify(exception);

    // Log the error using Winston via the Logger
    this.logger.error(
      `${request.method} ${request.url} Status: ${status} - Error: ${message} - Stack: ${errorDetails}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}
