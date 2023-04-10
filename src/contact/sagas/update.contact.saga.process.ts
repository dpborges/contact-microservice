const updateContactProcess = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { name: 'loadAggregate',         success: false },
  step2: { name: 'generateBeforeAndAfterImages', success: false },
  step3: { name: 'applyUpdates',          success: false },
  step4: { name: 'saveAggregate',         success: false },
  step5: { name: 'generateContactUpdatedEvent',  success: false },
  step6: { name: 'createOutboxInstance',         success: false },
  step7: { name: 'saveOutboxInstance',         success: false },
  step8: { name: 'triggerOutbox',         success: false }
}

export {
  updateContactProcess
}