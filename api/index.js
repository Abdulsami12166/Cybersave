const path = require('path');
const express = require('express');

let cachedServer = null;
let initError = null;

async function bootstrap() {
  if (cachedServer) return cachedServer;
  if (initError) throw initError;

  try {
    const { NestFactory } = require('@nestjs/core');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    const helmet = require('helmet');
    const compression = require('compression');
    const { ValidationPipe } = require('@nestjs/common');

    const expressApp = express();

    // Resolve paths relative to __dirname
    const appModulePath = path.join(__dirname, '../dist/app.module');
    const filterPath = path.join(__dirname, '../dist/common/filters/http-exception.filter');
    const interceptorPath = path.join(__dirname, '../dist/common/interceptors/logging.interceptor');

    const { AppModule } = require(appModulePath);
    const { GlobalExceptionFilter } = require(filterPath);
    const { LoggingInterceptor } = require(interceptorPath);

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
  } catch (err) {
    initError = err;
    console.error('Failed to initialize Nest serverless instance:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    return res.status(204).end();
  }

  try {
    const server = await bootstrap();
    return server(req, res);
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Serverless initialization error',
      error: err?.message || String(err),
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};
