import { Router } from 'express';

import { GetAllTypes } from '../controllers/type.controller';

const router = Router();

router.get('/', GetAllTypes);

export default router;
