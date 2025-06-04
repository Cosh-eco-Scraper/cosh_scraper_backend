import RabbitMQMiddleware from '../middlewares/rabbitMQ';

(async () => {
  await RabbitMQMiddleware.receiveMessages();
})();
