import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { app } from './app';
import RabbitMQMiddleware from './middlewares/rabbitMQ';

const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcastToClients(message: string) {
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

RabbitMQMiddleware.receiveMessages((msg: string) => {
  broadcastToClients(msg);
});

// Start HTTP & WebSocket server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`WebSocket running on port ${PORT}`);
});
