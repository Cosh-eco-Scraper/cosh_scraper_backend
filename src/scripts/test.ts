import RabbitMQMiddleware from '../middlewares/rabbitMQ';

(async () => {
  await RabbitMQMiddleware.sendMessage('an other one');
})();
