import express from 'express';
import defaultRoutes from './routes/defaultRoutes';
import {errorHandler} from './middlewares/errorHandler';

const app = express();

app.use(express.json());

// Routes
app.use('/api/default', defaultRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;