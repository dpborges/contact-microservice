import { StandardErrorResponse } from "../standard.error.response";
import { BaseError } from "../base.error";
import { ClientErrorDetail } from "./client.error.reasons";

/**
 * Generates Standard Client Error Message to send back as error response. The base 
 * class has additional methods to append reason and/or solution to the message text.
 * The base class constructor takes a statusErrorCode as a parameter, which in turn
 * calls setErrorProperties() to set the message text based on error Code. Subclasses,
 * like this one, are required to implement the setErrorProperties() method.
 * Sample Usage:
 *   let someError = new ClientError(400);
 *   someError.setReason(ClientErrorReasons.IncorrectSyntax)
 *            .setLongMessage("check you have open and close brackets")
 *   let someError = new ClientError(500);
 *   console.log(someError)
 * @Constructor
 * @para {number} statusCode - used to generate the error object
 */
export class ClientError extends BaseError {

  constructor(statusCodeOrMessage: string | number ) {
    super(statusCodeOrMessage);
  }

  /* Defines error properties associated to the statusCode. This method will 
     be called by BaseError class when user sets the status code. */
  setErrorProperties(statusCode: number) {
    switch (statusCode) {
      case 400:
        this.setStatusCode(400);
        this.setMessage("Bad Request");
        break;
      case 404:
        this.setStatusCode(404);
        this.setMessage("Resource Not Found");
        break;
      case 409:
        this.setStatusCode(409);
        this.setMessage("Conflict");
        break;
      default:
    }
  }

}



