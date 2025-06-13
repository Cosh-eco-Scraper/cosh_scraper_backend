import amqp from 'amqplib';
import { Buffer } from 'buffer';

export const variables = {
  queue: 'scraper_updates',
  connectionUrl: 'amqp://guest:guest@localhost:5672',
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

export async function receiveMessages(onMessage?: (msg: string) => void) {
  try {
    const connection = await amqp.connect(variables.connectionUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(variables.queue, { durable: true });

    await channel.consume(
      variables.queue,
      (msg) => {
        if (msg !== null) {
          const messageContent = msg.content.toString();
          if (onMessage) {
            onMessage(messageContent);
          }
          channel.ack(msg);
        }
      },
      { noAck: false },
    );
  } catch (error) {
    console.error('Error receiving messages:', error);
  }
}

const RabbitMQMiddleware = {
  variables,
  sendMessage,
  receiveMessages,
};

export default RabbitMQMiddleware;
