import { Router } from 'express';
import { updateLocation } from '../controllers/location.controller';
const router = Router();

router.put('/:locationId', updateLocation);

export default router;
