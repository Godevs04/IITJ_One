import { AsyncLocalStorage } from 'async_hooks';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
type LogFormat = 'json' | 'pretty';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function resolveLevel(raw: string | undefined): LogLevel {
  const value = (raw ?? 'info').toLowerCase();
  if (value in LEVEL_ORDER) return value as LogLevel;
  return 'info';
}

let currentLevel = resolveLevel(process.env.LOG_LEVEL);
let currentFormat: LogFormat = process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty';

export function setLogLevel(level: string | undefined): void {
  currentLevel = resolveLevel(level);
}

export function setLogFormat(format: LogFormat): void {
  currentFormat = format;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

/**
 * Correlation context (Phase 6 structured logging) — requestIdMiddleware
 * seeds this once per HTTP request; any log call anywhere in that request's
 * call stack (route handlers, store functions, socket handlers triggered
 * from it) automatically includes requestId/correlationId without every
 * function needing to accept and thread through a context parameter.
 */
export interface LogContext {
  requestId?: string;
  correlationId?: string;
  tripId?: string;
  vehicleId?: string;
  sessionId?: string;
}

const contextStorage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return contextStorage.run(context, fn);
}

/** Merge additional fields (e.g. tripId once it's known) into the *current* async context, if one is active. */
export function updateLogContext(patch: Partial<LogContext>): void {
  const existing = contextStorage.getStore();
  if (existing) Object.assign(existing, patch);
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const context = contextStorage.getStore();
  const merged = { ...context, ...meta };
  const hasMerged = Object.keys(merged).length > 0;

  if (currentFormat === 'json') {
    const record = {
      timestamp: new Date().toISOString(),
      severity: level,
      message,
      ...merged,
    };
    const line = JSON.stringify(record);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    return;
  }

  const line = hasMerged ? `[${level}] ${message} ${JSON.stringify(merged)}` : `[${level}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
