import { Router } from 'express';
import healthRouter from './health';
import syncRouter from './sync';
import homeRouter from './home';
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
import suggestionsRouter from './suggestions';

const router = Router();

router.use('/health', healthRouter);
router.use('/sync', syncRouter);
router.use('/home', homeRouter);
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
router.use('/suggestions', suggestionsRouter);

export default router;
