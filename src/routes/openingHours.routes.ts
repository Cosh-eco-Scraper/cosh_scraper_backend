import { Router} from 'express';
import { updateOpeningHours } from '../controllers/openinghours.controller';
const router = Router();

router.put('/:openingHourId', updateOpeningHours);

export default router;
