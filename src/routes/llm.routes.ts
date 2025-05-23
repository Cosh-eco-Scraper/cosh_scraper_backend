import { Router } from 'express';
import { descriptionCheck, sendPrompt } from '../controllers/llm.controller';

const router = Router();

router.post('/', sendPrompt);
router.post('/greenwash', descriptionCheck);

export default router;
