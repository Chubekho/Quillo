import winston from 'winston';
import CloudWatchTransport from 'winston-cloudwatch';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format:
    process.env.NODE_ENV === 'production'
      ? combine(timestamp(), json())
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
  transports: [new winston.transports.Console()],
  // Production: thêm transport gửi lên CloudWatch hoặc file
});

if (process.env.NODE_ENV === 'production') {
  const serviceName = process.env.SERVICE_NAME ?? 'api'; // 'api' hoặc 'worker'
  logger.add(new CloudWatchTransport({
    logGroupName: `/quillo/${serviceName}`,
    logStreamName: () => new Date().toISOString().split('T')[0], // stream theo ngày
    awsRegion: process.env.AWS_REGION ?? 'ap-southeast-1',
    messageFormatter: ({ level, message, ...meta }) =>
      JSON.stringify({ level, message, ...meta }),
    retentionInDays: 30,
  }));
}
