import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { CustomNatsClient } from './custom.nats.client.service';
import { Repository } from 'typeorm';
import { Injectable, Inject} from '@nestjs/common';
import { PubAck } from 'nats';
import { Observable } from 'rxjs';
import { Subjects } from './contact/events/domainChanges';
import { RpcException } from '@nestjs/microservices';
import { RepoToken } from './db-providers/repo.token.enum';
import { Contact } from './contact/entities/contact.entity';
import { UpdateEventStatusCmdPayload } from './outbox/events/commands';
import { OutboxCommands } from './outbox/events/commands';
import { logStart, logStop } from './utils/trace.log'

const logTrace = true;

@Injectable()
export class AppService {
  constructor(
    // private client: NatsJetStreamClient,
    private customNatsClient: CustomNatsClient,
    // private domainMgtService: DomainMgtService,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}

  /* This method would be on the event consumer. The consumer should update the event status
     to pending when receiving the event and then set to completed when sucessfully 
     processed event on server side */
  async updateEventStatus(outboxId: number, status: string) {
    const methodName = 'updateEventStatus';
    logTrace && logStart([methodName, 'outboxId', 'status'], arguments)

    const commandPayload: UpdateEventStatusCmdPayload = { outboxId, status }
    const commandResult = await this.customNatsClient.sendCommand(
      OutboxCommands.updateStatus, commandPayload
    );

    logTrace && logStop(methodName, 'commandResult', commandResult)
  }

  
  // async createContact(): Promise<any> {
  //   // throw new RpcException('ERROR: Unexected exception on Create Order')
  //   /* Construct OrderCreatedEvent body */
  
  //   // SAMPLE CREATE - The save below will create a new entity, even though 
  //   // I specified the id. 
  //   const contact: Contact = this.contactRepository.create({
  //     accountId: 1010,
  //     email: "joe.bono@gmail.com",
  //     firstName: 'Joe',
  //     lastName: 'Bono',
  //     mobilePhone: '6464301661',
  //     contactSourceId: 1
  //   })
  //   const  savedContactEntity = await this.contactRepository.save(contact);
  //   return savedContactEntity;
  // }

  // updateOrder(): string {
  //   this.client
  //     .emit<OrderUpdatedEvent>(ORDER_UPDATED, { id: 1, quantity: 10 })
  //     .subscribe();
  //   return 'order updated';
  // }

  // deleteOrder(): string {
  //   this.client
  //     .emit<OrderDeleteEvent>(ORDER_DELETED, { id: 1 })
  //     .subscribe((pubAck) => {
  //       console.log(pubAck);
  //     });
  //   return 'order deleted';
  // }

  // request - response
  // accumulate(payload: number[]): Observable<PubAck> {
  //   const pattern = { cmd: 'sum' };
  //   return this.client.send<number[]>(pattern, payload);
  // }
}

