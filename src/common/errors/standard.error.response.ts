// The Standard response interface is used by commands using the request/reply pattern
export interface StandardErrorResponse  {
  statusCode:   number;
  message:      string;
}