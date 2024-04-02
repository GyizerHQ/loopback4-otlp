import {
    DiagLogLevel,
    Span,
    SpanAttributes,
    SpanKind,
    SpanStatusCode,
    Tracer
} from "@opentelemetry/api";
import { Instrumentation } from "@opentelemetry/instrumentation";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { NodeTracerConfig } from "@opentelemetry/node";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { BufferConfig } from "@opentelemetry/tracing";
import { REQUEST_ID_PROPERTY } from "./constants";
import { CompressionAlgorithm, OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base/build/src/platform/node/types";

export type TracingOptions = {
    enabled: boolean;
    serviceName: string;
    serviceVersion?: string;
    propagationFormat: PropagationFormat;
    tracerConfig: NodeTracerConfig;
    setRequestId: boolean;
    // //@deprecated
    //TODO: Add support for Jaeger, though Deprecated.

    // jaeger: {
    //     enabled: boolean;
    //     spanProcessor: {
    //         type: SpanProcessor;
    //         config?: BufferConfig;
    //     };
    // } & JaegerExporterConfig;
    otel:{
        enabled: boolean,
        spanProcessor: {
            type: SpanProcessor;
            config?: BufferConfig;
        };
    } & OTLPExporterNodeConfigBase,
    console: {
        enabled: boolean;
    };
    diagnostics: {
        enabled: boolean;
        logLevel: DiagLogLevel;
    };
    methodInvocations: MethodInvocationConfig;
    http: HttpInstrumentationConfig;
    instrumentations: Instrumentation[];
};

export type TracingConfig = DeepPartial<TracingOptions>;

export enum PropagationFormat {
    JAEGER = "jaeger",
    W3C = "w3c"
}

export enum SpanProcessor {
    SIMPLE = "simple",
    BATCH = "batch"
}




export type MethodInvocationConfig = {
    enabled?: boolean;
};

export type ServiceDetails = {
    name: string;
    version?: string;
};

export type TraceOptions = {
    operationName?: string;
    attributes?: SpanAttributes;
};

export interface ErrorWithRequestId extends Error {
    [REQUEST_ID_PROPERTY]?: string;
}

export { DiagLogLevel, SemanticAttributes, Span, SpanKind, SpanStatusCode, Tracer };

type DeepPartial<T> = Partial<T> | { [P in keyof T]?: DeepPartial<T[P]> };
