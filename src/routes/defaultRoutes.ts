import { Router } from 'express';
import {
    getHelloWorld
} from '../controllers/defaultController';

const router = Router();

router.get('/', getHelloWorld);

export default router;