import { Router } from 'express';
import { sendPrompt } from '../controllers/llm.controller';

const router = Router();

router.post('/', sendPrompt);

export default router;
