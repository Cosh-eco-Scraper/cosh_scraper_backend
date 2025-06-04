var amqp = require('amqplib/callback_api');
import { Buffer } from 'buffer';

export const variables = {
  queue: 'scraper_updates',
  connectionUrl: 'amqp://localhost:15672',
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
    }, 500); // eslint-disable-line no-undef
    /* eslint-enable */
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

export async function receiveMessages() {
  amqp.connect(variables.connectionUrl, function (error0: any, connection: any) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1: any, channel: any) {
      if (error1) {
        throw error1;
      }

      channel.assertQueue(variables.queue, {
        durable: false,
      });

      console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', variables.queue);

      channel.consume(
        variables.queue,
        function (msg: any) {
          console.log(' [x] Received %s', msg.content.toString());
        },
        {
          noAck: true,
        },
      );
    });
  });
}

const RabbitMQMiddleware = {
  variables,
  sendMessage,
  receiveMessages,
};

export default RabbitMQMiddleware;
