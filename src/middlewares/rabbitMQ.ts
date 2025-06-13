import amqp from 'amqplib';
import { Buffer } from 'buffer';

export const variables = {
  queue: 'scraper_updates',
  connectionUrl: process.env.RABBIT_CONNECTION_URL || '',
};

export async function sendMessage(message: string) {
  try {
    const connection = await amqp.connect(variables.connectionUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(variables.queue, { durable: true });
    channel.sendToQueue(variables.queue, Buffer.from(message));

    console.log('Message sent:', message);

    /* eslint-disable */
    setTimeout(() => {
      channel.close();
      connection.close();
    }, 500);
    /* eslint-enable */
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

const RabbitMQMiddleware = {
  variables,
  sendMessage,
};

export default RabbitMQMiddleware;
