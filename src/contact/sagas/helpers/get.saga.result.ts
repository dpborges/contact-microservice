import { getFirstFailedStep } from "./get.first.failed.step";
/**
 * Intended to be called at end of the saga process, before returning response.
 * Returns the updated process status indicating whether rollback was triggered.
 * If rollback was triggered it updates first step that failed.
 * @param process 
 * @param processName
 * @returns updatedProcess
 */
export function getSagaResult(process, processName = ''): any {
  type FirstFailure = { step: string, name: string };
  let updatedProcess = { ...process }
  let firstFailure: FirstFailure = getFirstFailedStep(updatedProcess);
  let failureOccurred = firstFailure.step ? true : false;
  if (failureOccurred || process.rollbackTriggered) {
    updatedProcess.sagaSuccessful = false;
    let { step, name } = firstFailure;
    updatedProcess.sagaFailureReason = `Process ${processName} failed at ${step}: ${name}`
  }
  return updatedProcess;
}