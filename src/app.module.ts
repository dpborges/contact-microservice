import { UpdateContactSaga } from './contact/sagas/update.contact.saga';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './db-providers/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NatsJetStreamTransport } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { CustomNatsClient } from './custom.nats.client.service';
import { contactRepositories } from './contact/repos/contact.repositories';
// import { ContactService } from './contact/contact.service';
// import { ContactAggregate } from './contact/aggregate-types/contact.aggregate';
// import { ContactSaveService } from './contact/contact.save.service';
import { OutboxService } from './outbox/outbox.service';
import { DomainChangeEventPublisher } from './outbox/domainchange.event.publisher';
import { ConfigModule } from '@nestjs/config';
import { DomainChangeEventFactory } from './contact/services/domain.change.event.factory';
import { DomainChangeEventManager } from './outbox/domainchange.event.manager';
import { ContactService } from './contact/services/contact.service';
import { CreateContactSaga, DeleteContactSaga } from './contact/sagas';
import { ContactAggregateService } from './contact/services/contact.aggregate.service';
import { CreateContactTransaction, DeleteContactTransaction } from './contact/transactions';
import { ContactQueryService } from './contact/dbqueries/services/contact.query.service';
import { outboxRepositories } from './outbox/repos/outbox.repositories';
// import { SaveOutboxTransaction } from './outbox/transactions/save.outbox.transaction';


@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`
    }),
    NatsJetStreamTransport.register({
      connectionOptions: {
        servers: 'localhost:4222',
        name: 'myservice-publisher',
      },
    }),
  ],
  controllers: [AppController],
  providers: [
      ...contactRepositories,
      ...outboxRepositories,
      AppService,
      NatsJetStreamClient, 
      CustomNatsClient,
      // ContactAggregate,
      // ContactService,
      // ContactSaveService,
      OutboxService,
      DomainChangeEventFactory,
      DomainChangeEventPublisher,
      DomainChangeEventManager,
      ContactService,
      CreateContactSaga,
      ContactAggregateService,
      CreateContactTransaction,
      ContactQueryService,
      UpdateContactSaga,
      DeleteContactTransaction,
      DeleteContactSaga
      // SaveOutboxTransaction
  ],
})
export class AppModule {}