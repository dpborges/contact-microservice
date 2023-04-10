import { logStart, logStartVal, logStop } from "src/utils/trace.log";

const logTrace = false;

export function isStepsSuccessful(steps, process) {
  const functionName = 'isStepsSuccessful';
  logTrace &&  logStartVal(functionName, 'steps', steps)
  // logTrace &&  logStartVal(functionName, 'process', JSON.stringify(process))

  /* Check that all steps in the steps array are defined in the process */
  let foundAllSteps = true;
  let stepNotFound = '';
  const processProperties = Object.keys(process);
  steps.forEach(step => {
    const found = processProperties.find(prop => prop === step)
    if (!found) { 
      foundAllSteps = false;
      stepNotFound  = step;
    }
  })

  /* log error if one of the steps is steps array is not defined in the process */
  if (!foundAllSteps) {
    console.log(`ERROR: did not find step '${stepNotFound}' in the process defintion `  )
    return false;
  }

  /* define predicate function */
  let isStepSuccessful = (stepSuccess) => stepSuccess; /* predicate function */

  /* check if all steps in steps array  were successful */
  let successFlagsArray = steps.map(step => process[step].success)
  let stepsSuccessful = successFlagsArray.every(isStepSuccessful);

  logTrace && logStop(functionName, 'stepsSuccessful', stepsSuccessful)
  return stepsSuccessful;
}