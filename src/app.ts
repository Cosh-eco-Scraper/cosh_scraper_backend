import express from 'express';
import llmRoutes from './routes/llm.routes'; // Assuming you have a llm.routes.ts file
import { errorHandler } from './middlewares/errorHandler';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import storeRoutes from './routes/store.routes';
import cors from 'cors';


const app = express();
app.use(cors({ origin: '*' })); // Allow any origin
app.use(express.json());

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/stores', storeRoutes);
app.use('/api/llm', llmRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
