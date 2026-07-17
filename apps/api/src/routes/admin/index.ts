import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { adminCors } from '../../middleware/cors';
import { requireMongoForAdminWrites } from '../../middleware/requireMongoWrite';
import authRouter from './auth';
import menuRouter from './menu';
import noticesRouter from './notices';
import transportRouter from './transport';
import calendarRouter from './calendar';
import portalsRouter from './portals';
import appsRouter from './apps';
import mapRouter from './map';
import servicesRouter from './services';
import emergencyRouter from './emergency';
import aboutRouter from './about';
import laundryRouter from './laundry';
import wifiRouter from './wifi';
import erickshawRouter from './erickshaw';
import mealWindowsRouter from './mealWindows';
import holidaysRouter from './holidays';
import transportAlertsRouter from './transportAlerts';
import temporaryTransportScheduleRouter from './temporaryTransportSchedule';
import transportScheduleExceptionsRouter from './transportScheduleExceptions';
import pushRouter from './push';
import auditRouter from './audit';
import suggestionsRouter from './suggestions';
import uploadsRouter from './uploads';
import adminsRouter from './admins';
import analyticsRouter from './analytics';

const router = Router();

router.use(adminCors);
// Admin JSON is authenticated/sensitive — never let a browser or proxy cache it.
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
router.use(authRouter);

router.use(requireAuth);
router.use(requireMongoForAdminWrites);
router.get('/me', (req: AuthRequest, res: Response) => {
  const admin = req.admin;
  if (!admin) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
});
router.use('/uploads', uploadsRouter);
router.use('/menu', menuRouter);
router.use('/notices', noticesRouter);
// More-specific mount registered before '/transport' as a defensive convention —
// doesn't rely on transportRouter's fallthrough behavior for sub-paths.
router.use('/transport/temporary', transportScheduleExceptionsRouter);
router.use('/transport', transportRouter);
router.use('/calendar', calendarRouter);
router.use('/portals', portalsRouter);
router.use('/apps', appsRouter);
router.use('/map', mapRouter);
router.use('/services', servicesRouter);
router.use('/emergency', emergencyRouter);
router.use('/about', aboutRouter);
router.use('/laundry', laundryRouter);
router.use('/wifi', wifiRouter);
router.use('/erickshaw', erickshawRouter);
router.use('/mealWindows', mealWindowsRouter);
router.use('/holidays', holidaysRouter);
router.use('/transportAlerts', transportAlertsRouter);
router.use('/temporaryTransportSchedule', temporaryTransportScheduleRouter);
router.use('/push', pushRouter);
router.use('/audit', auditRouter);
router.use('/suggestions', suggestionsRouter);
router.use('/admins', adminsRouter);
router.use('/analytics', analyticsRouter);

export default router;
