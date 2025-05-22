import { Router } from 'express';
import { descrtiptionCheck, sendPrompt } from '../controllers/llm.controller';

const router = Router();

router.post('/', sendPrompt);
router.post('/greenwash', descrtiptionCheck);

export default router;
