/* eslint no-unused-vars: ['error', { ignoreRestSiblings: true, argsIgnorePattern: "^_" }] */
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
  SimpleSpanProcessor,
  SpanProcessor,
  ReadableSpan,
  Span,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Context } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
  headers: {
    Authorization: "Aasdfas",
  },
});

const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'platform',
  }),
});

provider.addSpanProcessor(
  new BatchSpanProcessor(exporter, {
    // The maximum queue size. After the size is reached spans are dropped.
    maxQueueSize: 100,
    // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
    maxExportBatchSize: 10,
    // The interval between two consecutive exports
    scheduledDelayMillis: 500,
    // How long the export can run before it is cancelled
    exportTimeoutMillis: 30000,
  }),
);

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

class SpanTagger implements SpanProcessor {
  onStart(span: Span, _context: Context): void {
    span.setAttribute('environment', "localtest");
  }
  onEnd(_span: ReadableSpan): void {
    // No op
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

// Add this span processor to tag all collected spans
provider.addSpanProcessor(new SpanTagger());

provider.register({
  // Changing default contextManager to use ZoneContextManager - supports asynchronous operations - optional
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      // load custom configuration for xml-http-request instrumentation
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: [/.+/g],
      },
      // load custom configuration for fetch instrumentation
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [/.+/g],
      },
    }),
  ],
});
