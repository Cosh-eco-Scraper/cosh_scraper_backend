import { Router } from 'express';

import {
  getAllStatements,
  getRandomStatement,
  getStatementById,
} from '../controllers/statement.controller';
const router = Router();

router.get('/', getAllStatements);
router.get('/:id', getStatementById);
router.get('/random', getRandomStatement);

export default router;
