import { Router } from 'express';
import { getRandomStatement } from '../controllers/statement.controller';
const router = Router();

router.get('/', getRandomStatement);

export default router;
