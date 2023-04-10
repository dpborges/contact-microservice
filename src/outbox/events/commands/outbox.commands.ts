export enum OutboxCommands {
  publishUnpublishedEvents = 'command.outbox.publish_unpublished_events',  /* reads unpublished events in outbox and publish to ESB */
  updateStatus = 'command.outbox.update_status',
}
