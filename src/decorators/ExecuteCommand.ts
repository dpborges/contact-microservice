// *****************************************************************
// Decorator that wraps the MessaagePattern decorator with a custom 
// decorator that considers the request/reply message pattern analogous 
// to a command, hence names it as such.
// ****************************************************************
import { MessagePattern } from '@nestjs/microservices';

export const ExecuteCommand = (command) => MessagePattern(command);