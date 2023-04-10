/**
 * Enums defining standard client error messages
 */

/* Specified in setReason */
export enum ClientErrorReasons {
  IncorrectSyntax  = 'Incorrect Syntax',
  UnexpectedResponse = 'Unexpected Response',
  TooLarge   = 'Size to large',
  InvalidRequest    = 'Request Invalid',
  KeysNotInDatabase  = 'Keys provided not found in database',
  DuplicateEntry     = 'Duplicate Entry'
}

/* Specified in setLongMessage. Provide explanation, solution, or link for more info  */
export enum ClientErrorDetail {
  TryAgainLater  = 'Try again later. If persists, report problem to site adminstrator.',
}