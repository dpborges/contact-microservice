import { logStart, logStop } from "../../../utils/trace.log";

const logTrace = true;

/**
   * Update current step status
   * @param process contains state of the process
   * @param step    step name (eg. 'step1')
   * @param success provides whether process step completed successful
   * @returns updatedProcess
   */
 export function setSagaSuccessFlag(process, successFlag: boolean) {
  const methodName = 'setSagaSuccessFlag'
  logTrace && logStart([methodName, 'process', 'successFlag'], arguments)

  let processCopy = { ...process };
  processCopy['sagaSuccessful'] = successFlag;  /* assign success status */

  logTrace && logStop(methodName, 'processCopy', processCopy)
  return processCopy;
}