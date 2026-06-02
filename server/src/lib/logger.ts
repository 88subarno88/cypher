import winston from "winston";
const { combine, timestamp, printf, colorize, errors } = winston.format;

// CREATE THE LOGGER:
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
  format: combine(
    errors({ stack: true }),
    timestamp(),
    printf(
      ({ level, message, timestamp, ...meta }) =>
        `${timestamp} [${level}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ""
        }`,
    ),
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        printf(
          ({ level, message, timestamp, ...meta }) =>
            `${timestamp} [${level}] ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ""
            }`,
        ),
      ),
    }),
  ],
});
