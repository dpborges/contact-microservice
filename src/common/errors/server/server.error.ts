import { StandardErrorResponse } from "../standard.error.response";
import { BaseError } from "../base.error";
import { ClientErrorDetail } from "../client/client.error.reasons";

/**
 * Generates Standard Server Error Message to send back as error response. The base 
 * class has additional methods to append reason and/or solution to the message text.
 * The base class constructor takes a statusErrorCode as a parameter, which in turn
 * calls setErrorProperties() to set the message text based on error Code. Subclasses,
 * like this one, are required to implement the setErrorProperties() method.
 * For sample usage, see switch statment below:
 * @Constructor
 * @para {number} statusCode - used to generate the error object
 */
export class ServerError extends BaseError {

  constructor(statusCodeOrMessage: string | number ) {
    super(statusCodeOrMessage);
  }

  /* Defines error properties associated to the statusCode. This method will 
     be called by BaseError class when user sets the status code. */
  setErrorProperties(statusCode: number) {
    switch (statusCode) {
      case 500:
        this.setStatusCode(500);
        this.setMessage("Internal Server Error");
        break;
      default:
    }
  }

}



