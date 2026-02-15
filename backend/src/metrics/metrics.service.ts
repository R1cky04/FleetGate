import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestDuration: Histogram<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });
  }

  observeHttpRequest(method: string, path: string, status: number, durationSeconds: number) {
    this.httpRequestDuration.observe(
      {
        method,
        path,
        status: status.toString(),
      },
      durationSeconds,
    );
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
