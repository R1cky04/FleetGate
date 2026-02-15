import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.url;

      this.metricsService.observeHttpRequest(
        req.method,
        path,
        res.statusCode,
        durationSeconds,
      );
    });

    next();
  }
}
