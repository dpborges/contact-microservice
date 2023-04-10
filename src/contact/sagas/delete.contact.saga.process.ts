const deleteContactProcess = {
  rollbackTriggered: false,
  sagaSuccessful: true,
  sagaFailureReason: '',
  step1: { name: 'loadAggregate',         success: false },
  step2: { name: 'deleteAggregate',       success: false },
  step3: { name: 'generateContactDeletedEvent',  success: false },
  step4: { name: 'createOutboxInstance',  success: false },
  step5: { name: 'saveOutboxInstance',    success: false },
  step6: { name: 'triggerOutbox',         success: false },
  step7: { name: 'generateDeletedData',   success: false }
}

export {
  deleteContactProcess
}