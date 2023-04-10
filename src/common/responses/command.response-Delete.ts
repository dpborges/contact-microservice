// The Standard response interface is used by commands using the request/reply pattern
type Relation = 'self' | 'tbd';

type Link = { 
  href: string,
  rel: Relation
}

/* Interface for Response used when creating a resource */
export interface CreateEntityResponse  {
  id: number | string;
  link: Link;
}

/* Implementation of CreateEntityResponse */
export class CreateContactResponse implements CreateEntityResponse {
  id: string | number;
  link: Link;

  constructor(aggregateRootId) {
    this.id = aggregateRootId;
    this.link = { href: `http://contact/${aggregateRootId}`, rel: "self" }
  }
}