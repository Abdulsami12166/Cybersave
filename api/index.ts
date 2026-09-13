import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';

let cachedServer: any = null;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();

    let AppModule: any;
    try {
      AppModule = require('../dist/app.module').AppModule;
    } catch (e1) {
      try {
        AppModule = require(path.join(process.cwd(), 'dist', 'app.module')).AppModule;
      } catch (e2) {
        AppModule = require('./dist/app.module').AppModule;
      }
    }

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
  const matchedPath = 
    (req.headers['x-matched-path'] as string) || 
    (req.headers['x-forwarded-uri'] as string) || 
    (req.headers['x-vercel-matched-path'] as string) ||
    req.url;

  const urlToCheck = (matchedPath || req.url || '/').split('?')[0];

  if (urlToCheck === '/' || urlToCheck === '/api' || urlToCheck === '/health' || urlToCheck === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'CyberSave Production Backend (Vercel Serverless)',
      commit: 'd09ded6c1316a6e17d6a33a34d23354169a5733c',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  if (matchedPath && (req.url === '/api' || req.url === '/api/' || req.url?.startsWith('/api?') || req.url?.startsWith('/api/index'))) {
    const queryPart = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = matchedPath.includes('?') ? matchedPath : `${matchedPath}${queryPart}`;
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    return res.status(204).end();
  }

  try {
    const server = await bootstrap();
    return new Promise<void>((resolve, reject) => {
      res.on('finish', () => resolve());
      res.on('close', () => resolve());
      res.on('error', (err) => reject(err));
      server(req, res);
    });
  } catch (err: any) {
    console.error('Serverless bootstrap error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        statusCode: 500,
        message: 'Serverless Application Boot Error',
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      });
    }
  }
}
