import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomStrategy } from '@nestjs/microservices';
import { NatsJetStreamServer } from '@nestjs-plugins/nestjs-nats-jetstream-transport';

// **********************************************************************
// Connection Options
// ----------------------------------------------------------------------
// servers: lists the nats servers to connect to 
// name:    is the connnection name; its used by the connect() method
// ----------------------------------------------------------------------
// Consumer Options
// ----------------------------------------------------------------------
// deliverGroup: this analogous to a queue group in Core Nats. The queue group is
//               used to distribute messages to one of the members in a queue group.
//               It simulates a round robin distribution, which enables you to 
//               horizontally scale.
// durable: a consumer is considered durable when an explicit name is set for this field.
//          Durables will remain even with periods of inactivity unless the 
//          InactiveThreshold is set explicity.  
// deliverTo: not sure what its used for. IN documenation its typically left empty.          
// manualAck: The default is auto-acknowledgement for most clients, but manual
//          ack provides more control. For example don't acknowledge unless message was 
//          successfully processed.
// ----------------------------------------------------------------------
// Stream config
// ----------------------------------------------------------------------
// name:    a stream is a messsage store. Here we name the stream 'mystream'.
//          Streams can consume many subjects. For the 'mystream' stream , 
//          we consume follow the subjects  order.*
// subjects: The subjects consumed by the named stream         
// **********************************************************************

// I believe This config is used in the hybrid microservice/rest instance.

const Port = 3001;
const NatsPort = 4222;

async function bootstrap() {

  const options: CustomStrategy = {
    strategy: new NatsJetStreamServer({
      connectionOptions: {
        servers: `localhost:${NatsPort}`,
        name: 'orders-listener',
      },
      consumerOptions: {
        deliverGroup: 'orders-group',
        durable: 'orders-durable',
        deliverTo: 'orders-messages',  /* not sure if needed */
        manualAck: true,
      },
      streamConfig: {
        name: 'orders-stream',
        subjects: ['contact.*'],
      },
    }),
  };

  // hybrid microservice and web application
  const app = await NestFactory.create(AppModule);
  const microService = app.connectMicroservice(options);
  microService.listen();
  await app.listen(Port);
  console.log(`Sample-orders Microservice Instance Started on port ${Port}`);
  console.log(`Sample-orders connected to Nats server on port ${NatsPort}`)
}
bootstrap();