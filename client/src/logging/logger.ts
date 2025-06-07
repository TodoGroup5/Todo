import { redactPII } from "./piiFilter";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LoggerConfig {
  /** URL to POST frotend logs to. */
  logServerUrl?: string;
  /** Whether to also write logs to server console. Default = true. */
  logToConsoleInAPI?: boolean;
}

interface LogPayload {
  level: LogLevel;
  message: string;
  metadata?: any;
  timestamp: string;
}

export class Logger {
  private config: Required<LoggerConfig>;
  private isBrowser: boolean;

  constructor(config?: LoggerConfig) {
    this.config = {
      logServerUrl: config?.logServerUrl ?? "",
      logToConsoleInAPI: config?.logToConsoleInAPI ?? true,
    };

    this.isBrowser =
      typeof window !== "undefined" && typeof window.fetch === "function";
  }

  public debug(message: string, metadata?: any) {
    this._send("DEBUG", message, metadata);
  }

  public info(message: string, metadata?: any) {
    this._send("INFO", message, metadata);
  }

  public warn(message: string, metadata?: any) {
    this._send("WARN", message, metadata);
  }

  public error(message: string, metadata?: any) {
    this._send("ERROR", message, metadata);
  }

  private _send(level: LogLevel, rawMessage: string, rawMetadata?: any) {
    const message = rawMessage;

    let metadata: any;
    if (rawMetadata !== undefined) {
      try {
        metadata = redactPII(rawMetadata);
      } catch (err) {
        metadata = { redactionError: "Could not redact metadata" };
      }
    }

    const payload: LogPayload = {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (this.isBrowser) {
      if (!this.config.logServerUrl) {
        console.warn(
          "[Logger] No logServerUrl configured; dropping log:",
          payload
        );
        return;
      }

      fetch(this.config.logServerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn("[Logger] Failed to send log to server:", err, payload);
      });
    } else {
      if (this.config.logToConsoleInAPI) {
        console.log(JSON.stringify(payload));
      }
    }
  }

  public setConfig(config: LoggerConfig) {
    this.config = {
      logServerUrl: config.logServerUrl ?? this.config.logServerUrl,
      logToConsoleInAPI:
        config.logToConsoleInAPI ?? this.config.logToConsoleInAPI,
    };
  }
}
