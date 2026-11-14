/** Minimal logging port so the application layer never depends on a logging framework. */
export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
