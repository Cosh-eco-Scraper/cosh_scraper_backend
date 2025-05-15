import {Request, Response, NextFunction} from 'express';

export async function getHelloWorld(req: Request, res: Response, next: NextFunction) {
    try {
        res.json("Hello World");
    } catch (error) {
        next(error);
    }
}