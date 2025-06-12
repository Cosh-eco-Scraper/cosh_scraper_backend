import express from 'express';
import llmRoutes from './routes/llm.routes';
import { errorHandler } from './middlewares/errorHandler';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import storeRoutes from './routes/store.routes';
import brandRoutes from './routes/brand.routes';
import locationRoutes from './routes/location.routes';
import openingHoursRoutes from './routes/openingHours.routes';
import storeBrandsRoutes from './routes/storeBrands.routes';
import statementRoutes from './routes/statement.routes';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' })); // Allow any origin
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next(); // IMPORTANT: Don't forget to call next() to pass control to subsequent middleware/routes
});

if (process.env.NODE_ENV === 'development') {
  swaggerDocument.host = 'localhost:' + process.env.PORT;
} else {
  swaggerDocument.host = `${process.env.HOST}`;
}

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/stores', storeRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/openinghours', openingHoursRoutes);
app.use('/api/storebrands', storeBrandsRoutes);
app.use('/api/statements', statementRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export { app };
