import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = process.env.LOG_DIR || 'logs';

const transportConsole = new winston.transports.Console({ level: process.env.LOG_LEVEL || 'info' });

const transportRotate = new DailyRotateFile({
  filename: `${logDir}/application-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: process.env.LOG_LEVEL || 'info',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const base = { timestamp, level, message };
      return JSON.stringify(Object.assign(base, { meta }));
    })
  ),
  transports: [transportConsole, transportRotate],
  exitOnError: false,
});

export default logger;
