import { Request, Response, NextFunction } from 'express';
import StatementService from '../services/statement.service';

export const getRandomStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statement = await StatementService.getRandomStatement();
    res.json(statement);
  } catch (err) {
    next(err);
  }
};

export const getStatementById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(404).json({ message: 'Statement not found' });
    }

    const statement = await StatementService.getStatementById(parseInt(id));
    res.json(statement);
  } catch (err) {
    next(err);
  }
};

export const getAllStatements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statements = await StatementService.getAllStatements();
    res.json(statements);
  } catch (err) {
    next(err);
  }
};

const StatementController = {
  getRandomStatement,
  getStatementById,
  getAllStatements,
};
export default StatementController;
