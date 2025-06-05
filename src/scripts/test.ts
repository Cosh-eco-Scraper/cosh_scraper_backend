import RabbitMQMiddleware from '../middlewares/rabbitMQ';

(async () => {
  await RabbitMQMiddleware.sendMessage('testende');
})();
