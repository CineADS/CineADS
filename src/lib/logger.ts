type LogLevel = "info" | "warn" | "error" | "debug";

const LOG_PREFIX = "[Hub]";

function formatArgs(level: LogLevel, ...args: unknown[]) {
  return [`${LOG_PREFIX} [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  info: (...args: unknown[]) => console.log(...formatArgs("info", ...args)),
  warn: (...args: unknown[]) => console.warn(...formatArgs("warn", ...args)),
  error: (...args: unknown[]) => console.error(...formatArgs("error", ...args)),
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.debug(...formatArgs("debug", ...args));
  },
};
