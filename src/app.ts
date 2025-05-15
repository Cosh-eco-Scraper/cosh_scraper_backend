import express from 'express';
import defaultRoutes from './routes/defaultRoutes';
import {errorHandler} from './middlewares/errorHandler';


import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';

const app = express();

app.use(express.json());

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/default', defaultRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;