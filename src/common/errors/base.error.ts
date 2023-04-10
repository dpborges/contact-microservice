import { StandardErrorResponse } from "./standard.error.response";

/**
 * Base class used to generate Error Message to send back as an error response. 
 * To use it, define your own classification of errors by extending from this class
 * and overriding the setError Properties. This method will set the various 
 * error properties based on the error number.
 */ 
export class BaseError {

  statusCode:  number;
  message:     string;  /* generic message like 'Bad Request' */
  reason:      string;  /* uses Reasons enum to provide a reason for the bad request */
  longMessage: string;  /* elaborate on reason, provide  solution, or a link to documentation */

  /* if a constructor parm not provided, use setter methods to set properties */
  constructor(statusCodeOrMessage: string | number ) {
    if (typeof statusCodeOrMessage === "string" ) {
      this.message = statusCodeOrMessage || '';
    } else if (typeof statusCodeOrMessage === "number") {
      const statusCode = statusCodeOrMessage;
      this.setErrorProperties(statusCode); /* expects this method to be defined in subclass */
    } 
  }
 
  /* This method can be overriden in subclass and the status code would return 
     a predefined error object based on the given code */
  setStatusCode(code: number) {
    this.statusCode = code;
  }

  /**
   * Provides a generic message. Default values can be provided in error subclass for 
   * given status code.
   * @param msg 
   */
  setMessage(msg: string) {
    this.message = msg;
  }

  /** Appends to message property a more specific reason for the generic error 
   *  provided in message property. This should be called after message has been set.
   *  Note that this method returns this, which allows you to chain a the 
   *  setLongMessage() method. 
   */
  setReason(reason: string) {
    this.message = `${this.message}: ${reason}`;
    return this;
  }
  
  /**
   * appends to message to provide an explanation, solution, or link of external 
   * documentation available. This is typically called after setReason  
   */
  setLongMessage(longMsg: string)  {
    this.message = `${this.message} - ${longMsg}`;
  }

  /**
   * Returns statusCode and message, where message is concatention of message, reason, 
   * and longMessage.
   * @returns 
   */
  toString(): StandardErrorResponse {
    let errorResponse: StandardErrorResponse;
    if (this.statusCode) { errorResponse.statusCode = this.statusCode;  } 
    if (this.message) { errorResponse.message = this.message;  } 
    return errorResponse;
  }

  /**
   * This sets error message based and error number; Should be implemented in 
   * ClientError or ServerError subclass
   * @param statusCode 
   */
  setErrorProperties(statusCode: number) { };
 
}

