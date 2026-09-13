const path = require('path');

let cachedServer = null;

async function getNestServer() {
  if (cachedServer) return cachedServer;

  const { NestFactory } = require('@nestjs/core');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const express = require('express');
  const helmet = require('helmet');
  const compression = require('compression');
  const { ValidationPipe } = require('@nestjs/common');

  const expressApp = express();
  const { AppModule } = require(path.join(__dirname, '../dist/app.module'));
  const { GlobalExceptionFilter } = require(path.join(__dirname, '../dist/common/filters/http-exception.filter'));
  const { LoggingInterceptor } = require(path.join(__dirname, '../dist/common/interceptors/logging.interceptor'));

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

  app.use(helmet({ contentSecurityPolicy: false }));
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
  cachedServer = expressApp;
  return cachedServer;
}

module.exports = async (req, res) => {
  // 1. Instant response for root & health check
  const cleanUrl = (req.url || '/').split('?')[0];
  if (cleanUrl === '/' || cleanUrl === '/health' || cleanUrl === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      service: 'CyberSave Production Backend (Vercel Serverless)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  // 2. Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    return res.status(204).end();
  }

  // 3. Forward to NestJS
  try {
    const server = await getNestServer();
    return server(req, res);
  } catch (err) {
    console.error('Serverless execution error:', err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Serverless Application Boot Error',
      error: err?.message || String(err),
      timestamp: new Date().toISOString(),
    });
  }
};
