import express from 'express';
import llmRoutes from './routes/llm.routes';
import { errorHandler } from './middlewares/errorHandler';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import storeRoutes from './routes/store.routes';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' })); // Allow any origin
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  swaggerDocument.host = 'localhost:' + process.env.PORT;
} else {
  swaggerDocument.host = `${process.env.HOST}`;
}

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/stores', storeRoutes);
app.use('/api/llm', llmRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export { app };
