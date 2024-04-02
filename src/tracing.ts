import { context, diag, DiagConsoleLogger, Span, trace, Tracer } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { InstrumentationOption, registerInstrumentations } from "@opentelemetry/instrumentation";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { Resource } from "@opentelemetry/resources";
import { ResourceAttributes } from "@opentelemetry/semantic-conventions";
import debugFactory from "debug";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_TRACING_OPTIONS } from "./constants";
import { SpanProcessor, TracingConfig, TracingOptions } from "./types";
import { mergeTracingConfig } from "./utils";
import { BatchSpanProcessor, ConsoleSpanExporter, NodeTracerProvider, SimpleSpanProcessor, SpanExporter } from "@opentelemetry/sdk-trace-node";

const debug = debugFactory("loopback:tracing:init");

const { SERVICE_NAME, SERVICE_VERSION, SERVICE_INSTANCE_ID } = ResourceAttributes;

const exporters: SpanExporter[] = [];
let tracerProvider: NodeTracerProvider | undefined;


export let tracer: Tracer;
export let tracingOptions: TracingOptions = DEFAULT_TRACING_OPTIONS;

export function initializeTracing(config: TracingConfig = {}) {
    tracingOptions = mergeTracingConfig(config);

    const options = tracingOptions;

    if (options.enabled) {
        const resource = new Resource({
            [SERVICE_NAME]: options.serviceName,
            [SERVICE_INSTANCE_ID]: uuidv4(),
            ...(options.serviceVersion && { [SERVICE_VERSION]: options.serviceVersion })
        });

        tracerProvider = new NodeTracerProvider({ ...options.tracerConfig, resource });

        if (options.otel.enabled) {
            const OtlpExporter = new OTLPTraceExporter(options.otel);

            if (options.otel.spanProcessor.type === SpanProcessor.SIMPLE) {
                tracerProvider.addSpanProcessor(new SimpleSpanProcessor(OtlpExporter));
            } else if (options.otel.spanProcessor.type === SpanProcessor.BATCH) {
                tracerProvider.addSpanProcessor(
                    new BatchSpanProcessor(OtlpExporter, options.otel.spanProcessor.config)
                );
            } else {
                throw Error(
                    `Invalid OTLP span processor type: ${options.otel.spanProcessor.type}`
                );
            }

            exporters.push(OtlpExporter);
        }

        if (options.console.enabled) {
            const consoleExporter = new ConsoleSpanExporter();
            tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleExporter));
            exporters.push(consoleExporter);
        }

        if (options.diagnostics.enabled) {
            diag.setLogger(new DiagConsoleLogger(), options.diagnostics.logLevel);
        }

        //TODO: Add support to add propagation through config.

        registerInstrumentations({
            tracerProvider,
            instrumentations: [...defaultInstrumentations(options), ...options.instrumentations]
        });

        tracer = trace.getTracer(options.serviceName, options.serviceVersion);

        debug("Initialized tracing");
    }
}

export function init(config: TracingConfig = {}) {
    return initializeTracing(config);
}

export async function shutdownTracing() {
    const shutdowns: Promise<void>[] = [];

    if (tracerProvider) {
        shutdowns.push(tracerProvider.shutdown());
    }

    exporters.forEach(exporter => shutdowns.push(
        exporter.shutdown()
    ));

    await Promise.all(shutdowns);
}

export function getActiveSpan(): Span {
    return trace.getSpan(context.active()) ?? tracer.startSpan("ThisIsName");
}

function defaultInstrumentations(config: TracingOptions): InstrumentationOption[] {
    const { http } = config;

    const instrumentations: InstrumentationOption[] = [];

    if (http.enabled) {
        instrumentations.push(new HttpInstrumentation(http));
    }

    return instrumentations;
}
