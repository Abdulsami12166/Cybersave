const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

let cachedServer = null;

async function bootstrap() {
  if (!cachedServer) {
    const expressApp = express();
    const { AppModule } = require('../dist/app.module');
    const { GlobalExceptionFilter } = require('../dist/common/filters/http-exception.filter');
    const { LoggingInterceptor } = require('../dist/common/interceptors/logging.interceptor');
    const { ValidationPipe } = require('@nestjs/common');

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  }
  return cachedServer;
}

module.exports = async (req, res) => {
  const server = await bootstrap();
  return server(req, res);
};
