import { Request, Response } from 'express';
import { LLMService } from '../services/llm.service';

export async function sendPrompt(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    const response = await LLMService.sendPrompt(prompt);
    res.json({ response });
  } catch {
    res.status(500).json({ error: 'An error occurred while processing the request.' });
    return;
  }
}

export async function descriptionCheck(req: Request, res: Response) {
  try {
    const { description } = req.body;
    const response = await LLMService.descriptionCheck(description);
    res.json({ response });
    return;
  } catch {
    res.status(500).json({ error: 'An error occurred while processing the request.' });
    return;
  }
}
