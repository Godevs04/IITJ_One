import { Router } from 'express';
import publicRoutes from './public';
import adminRoutes from './admin';

const router = Router();

router.use('/', publicRoutes);
router.use('/admin', adminRoutes);

export default router;
