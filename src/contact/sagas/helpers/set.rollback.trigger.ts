/**
 * Set rollbackTrigger true. Optional you can pass second boolean parm 
 * to set false
 * @param process contains state of the process
 * @param value   defaults to true, but can optionally pass in false.
 * @returns updatedProcess
 */
export function setRollbackTrigger(process, value=true) {
  let processCopy = { ...process };
  processCopy['rollbackTriggered'] = value;   
  return processCopy;
}