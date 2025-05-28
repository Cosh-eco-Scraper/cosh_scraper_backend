import { NextFunction, Request, Response } from 'express';
import StatementService from '../services/statement.service';

export const getRandomStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statement = await StatementService.getRandomStatement();
    res.json(statement);
  } catch (err) {
    next(err);
  }
};

const StatementController = {
  getRandomStatement,
};
export default StatementController;
