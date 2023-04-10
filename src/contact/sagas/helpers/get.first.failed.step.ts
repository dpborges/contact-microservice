/**
   * Returns the first failed step found in the saga process object
   * @param process 
   */
export function getFirstFailedStep(process) {
  /* extract process keys */
  const processKeys = Object.keys(process);
  /* extract keys that start with step */
  const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
  
  let firstFailedStep = '';
  let firstFailedName = '';
  let foundFirstFailure = false;
  stepKeys.forEach((key) =>  {
    if (process[key].success === false && !foundFirstFailure) {
      firstFailedStep = key;
      firstFailedName = process[key].name;
      foundFirstFailure = true;
    }
  });
  const firstFailure = { step: firstFailedStep, name: firstFailedName}; 
  return firstFailure;
}