import { Router } from 'express';

import { addTypeToStore, removeTypeFromStore } from '../controllers/storeType.Controller';

const router = Router();

router.post('/', addTypeToStore);
router.delete('/', removeTypeFromStore);
export default router;
