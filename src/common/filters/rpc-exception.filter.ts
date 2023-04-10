import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    console.log(">> Uncaught Exception");
    const theError = exception.getError();
    const ctx = host.switchToRpc()
    const data = ctx.getData();
    console.log(`    Error : ${theError}`);
    console.log(`    Data : ${JSON.stringify(data)}`);

    return throwError(() => exception.getError());
  }
}