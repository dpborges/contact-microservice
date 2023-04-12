import { Inject, Injectable } from '@nestjs/common';
import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { PubAck } from 'nats';
import { Observable } from 'rxjs';
import { Subjects } from './contact/events/domainChanges';

@Injectable()
export class CustomNatsClient {
  
  constructor(
    private natsClient: NatsJetStreamClient
  ) {}

  /* Sends a command (aka request) and subscribes to the reply. */
  sendCommand<T>(command: string, payload: T): Promise<any> {
    return new Promise((resolve, reject) => {
      // const cmdPattern = { cmd: command };
      this.natsClient.send<T>(command, payload)
      .subscribe(
        (data) => { 
          resolve(data)
          if (!data) {
            reject(`ERROR:Did not receive response from command:${command} with payload:${payload}`)
          }
        },
        (err) => {
          console.log(`ERROR FROM SEND COMMAND command:${command} payload:${payload}`);
          console.log(`ERROR ${err}`)
          console.log("Possible reason is there is no listener for command")
        }
      );
    })
  } 
    
  /* Publishes an event. PubAck is the response returned by the JetStream server 
     when a message is added to a stream. */
  publishEvent<T>(subject: string, event: T ) :Promise<any> {
    return new Promise((resolve, reject) => {
      this.natsClient
        .emit<T>(subject, event)
        .subscribe((pubAck) => {
          resolve(`Event ${event} acknowledged <${pubAck}>`)
          if (!pubAck) {
            reject(`ERROR:Did not get acknowledgement that subject:${subject} event:${Event} was added to JetStream  `)
          }
        },
        (err) => {
          console.log(`ERROR FROM PUBLISH EVENT subject:${subject} event:${Event} `)
          console.log(`ERROR ${err}`)
        });
      return 'C - order created';
    })
  }
}
