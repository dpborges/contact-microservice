// *****************************************************************
// Decorator that wraps the EventPattern decorator with a custom 
// decorator that is more explicit as to the intent of the decorator,
// in this case, listening for an event.
// ****************************************************************
import { EventPattern } from '@nestjs/microservices';

export const ListenForEvent = (eventName) => EventPattern(eventName);