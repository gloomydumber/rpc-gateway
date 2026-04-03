import pinoHttp from 'pino-http';
import { logger } from '../../../../infrastructure/logger/index.js';

export const requestLogger = (pinoHttp as unknown as typeof pinoHttp.default)({ logger });
