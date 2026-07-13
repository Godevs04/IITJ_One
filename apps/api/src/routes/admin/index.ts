import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { adminCors } from '../../middleware/cors';
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
import pushRouter from './push';
import auditRouter from './audit';
import suggestionsRouter from './suggestions';

const router = Router();

router.use(adminCors);
router.use(authRouter);

router.use(requireAuth);
router.use('/menu', menuRouter);
router.use('/notices', noticesRouter);
router.use('/transport', transportRouter);
router.use('/calendar', calendarRouter);
router.use('/portals', portalsRouter);
router.use('/apps', appsRouter);
router.use('/map', mapRouter);
router.use('/services', servicesRouter);
router.use('/emergency', emergencyRouter);
router.use('/about', aboutRouter);
router.use('/push', pushRouter);
router.use('/audit', auditRouter);
router.use('/suggestions', suggestionsRouter);

export default router;
