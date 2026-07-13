import cors from 'cors';
import { config } from '../config';

/** Public campus routes — open CORS (mobile apps, Expo, any client). */
export const publicCors = cors();

/** Admin panel routes — restrict to configured origins (Expo :6001 + admin :3000). */
export const adminCors = cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, mobile native) with no Origin header
    if (!origin) {
      callback(null, true);
      return;
    }
    if (config.corsOrigin.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});
