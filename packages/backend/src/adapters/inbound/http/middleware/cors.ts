import cors from 'cors';
import { config } from '../../../../config/index.js';

export const corsMiddleware = cors({
  origin: config.corsOrigin,
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
});
