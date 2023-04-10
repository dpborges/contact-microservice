/**
 * Logs the inputs to a function or method
 * @param argNames - [methodName, argName1, argName2, ..]
 * @param args     - standard 'arguments' parm
 */
export function logStart(argNames, args: IArguments) {
 console.log('==========================================')
 console.log('>>>> INSIDE', argNames[0])
 let i = 1;
 for (const singleArg of args) {
    let argValue = singleArg;
    if (typeof argValue === "object") {
      argValue = JSON.stringify(argValue, null, 2)
    }
    console.log(`INPUT PARM: ${argNames[i]}`);
    console.log(`      ${argValue}`);
    i++;
 }
}

/**
 * Logs the return values for a given function or method
 * @param funcName - function(or method ) name
 * @param returnName
 * @param returnValue
 */
export function logStop(funcName, returnName, returnValue) 
{
  if (typeof returnValue === "object") {
    returnValue = JSON.stringify(returnValue, null, 2)
  }
  console.log('------------------------------------------')
  console.log('END OF ', funcName);
  console.log(`OUTPUT PARM: ${returnName}`)
  console.log(`       ${returnValue}`)
  console.log('------------------------------------------')
}

/* used when getting circular reference errors in input parm */
export function logStartVal(methodName:string, valName: string, value: any) {
  console.log('==========================================')
  console.log('>>>> INSIDE', methodName)
  console.log(`INPUT PARM: ${valName}`);
  console.log(`      ${value}`)
}
  
