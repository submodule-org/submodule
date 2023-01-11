import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { envDetector, hostDetector, osDetector, processDetector } from "@opentelemetry/resources"
import { dockerCGroupV1Detector } from "@opentelemetry/resource-detector-docker"

export async function init(config: {
  appName: string,
  appVersion?: string,
  oltpUrl?: string
}) {

  const resource = Resource.default()
    .merge(await envDetector.detect())
    .merge(await hostDetector.detect())
    .merge(await osDetector.detect())
    .merge(await processDetector.detect())
    .merge(await dockerCGroupV1Detector.detect())
    .merge(new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.appName,
      [SemanticResourceAttributes.SERVICE_VERSION]: config.appVersion,
    })
  );
  
  const provider = new NodeTracerProvider({
    resource,
  });

  process.env.DEBUG && (() => {
    const exporter = new ConsoleSpanExporter();
    const processor = new SimpleSpanProcessor(exporter);
    provider.addSpanProcessor(processor);
  }) ()
  
  const jaegerExporter = new OTLPTraceExporter({
    url: config.oltpUrl,
    headers: {},
  })
  const jaegerProcessor = new SimpleSpanProcessor(jaegerExporter)

  provider.addSpanProcessor(jaegerProcessor)

  provider.register();
}

