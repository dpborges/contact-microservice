import { ContactCreatedEvent } from '../../contact/events/domainChanges/contact-created-event';
import { Subjects } from '../../contact/events/domainChanges';

export interface SubjectAndPayload {
  subject: string,
  payload: ContactCreatedEvent
}