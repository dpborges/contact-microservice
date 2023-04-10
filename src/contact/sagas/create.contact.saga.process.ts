const createContactProcess = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { name: 'createAggregate',       success: false },
  step2: { name: 'saveAggregate',         success: false },
  step3: { name: 'generateCreatedEvent',  success: false },
  step4: { name: 'createdOutboxInstance', success: false },
  step5: { name: 'saveOutbox',            success: false },
  step6: { name: 'triggerOutbox',         success: false }
}

export {
  createContactProcess
}