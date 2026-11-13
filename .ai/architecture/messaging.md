# RabbitMQ

Filas:

concursos.processamento
concursos.notificacao
concursos.dlq

Todo consumidor deve:

- usar retry exponencial
- enviar para DLQ após 3 falhas