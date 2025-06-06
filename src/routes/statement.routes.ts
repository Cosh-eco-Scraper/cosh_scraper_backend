import { Router } from 'express';
import {
  getAllStatements,
  getRandomStatement,
  getStatementById,
} from '../controllers/statement.controller';
const router = Router();

router.get('/', getAllStatements);

router.get('/random', getRandomStatement);

router.get('/:id', getStatementById);

export default router;
