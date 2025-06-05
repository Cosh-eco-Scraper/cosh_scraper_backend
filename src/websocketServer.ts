import { WebSocketServer, WebSocket } from 'ws';
import RabbitMQMiddleware from './middlewares/rabbitMQ';

const PORT = process.env.WS_PORT || 3002;
const wss = new WebSocketServer({ port: Number(PORT) });

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

console.log(`WebSocket server running on port ${PORT}`);
