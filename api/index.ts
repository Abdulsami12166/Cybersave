import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';

let cachedServer: any = null;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    expressApp.use(express.json({ limit: '50mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    });

    app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
    app.use(compression());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false,
        transform: true,
        forbidNonWhitelisted: false,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();

    // Fallback middleware to ensure unmatched requests never hang in serverless
    expressApp.use((req: Request, res: Response) => {
      if (!res.headersSent) {
        res.status(404).json({
          statusCode: 404,
          message: `Cannot ${req.method} ${req.url}`,
          error: 'Not Found',
          timestamp: new Date().toISOString(),
        });
      }
    });

    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  // Restore original request path if Vercel internal rewrite changed req.url to /api
  const matchedPath = 
    (req.headers['x-matched-path'] as string) || 
    (req.headers['x-forwarded-uri'] as string) || 
    (req.headers['x-vercel-matched-path'] as string);

  if (matchedPath && (req.url === '/api' || req.url === '/api/' || req.url?.startsWith('/api?') || req.url?.startsWith('/api/index'))) {
    const queryPart = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = matchedPath.includes('?') ? matchedPath : `${matchedPath}${queryPart}`;
  }

  const cleanUrl = (req.url || '/').split('?')[0];
  if (cleanUrl === '/' || cleanUrl === '/health' || cleanUrl === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'CyberSave Production Backend (Vercel Serverless)',
      commit: 'd09ded6c1316a6e17d6a33a34d23354169a5733c',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    return res.status(204).end();
  }

  try {
    const server = await bootstrap();
    return server(req, res);
  } catch (err: any) {
    console.error('Serverless bootstrap error:', err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Serverless Application Boot Error',
      error: err?.message || String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
