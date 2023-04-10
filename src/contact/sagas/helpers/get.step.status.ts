// Get the success status for a particular step from the saga process object
export function getStepStatus(process) {
  const processKeys = Object.keys(process);
  /* extract keys that start with step */
  const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
  /* create object with all the steps/success */
  let stepStatus = {}
  stepKeys.forEach((key) => stepStatus[key] = {
    name: process[key].name,
    success: process[key].success
  })
  return stepStatus;
}