import { Router } from 'express';
import { updateOpeningHours } from '../controllers/openinghours.controller';
const router = Router();

router.put('/:openingHoursId', updateOpeningHours);

export default router;
