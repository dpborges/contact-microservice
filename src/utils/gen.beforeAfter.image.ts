import * as R from 'ramda';
// const ramda = require('ramda');
import { logStart, logStop } from './trace.log';


/* Generate a before and after image for a given update request aggregate. */
export function genBeforeAndAfterImage(updateRequest, aggregateEntities): any { 
  const funcName = "genBeforeAndAfterImage";
  logStart([funcName, 'updateRequest', 'aggregateEntities'], arguments)
  
  // console.log("    parm: updateRequest:", updateRequest)    
  // console.log("    parm: updateRequest:", updateRequest)    

  /**
   * Constructs a before and after image for a given update request aggregate.
   * This utility uses the update request to represent the 'after image' 
   * and traverses the aggregateEntities to find the data elements
   * before the update to create teh 'before image.
   */ 

  // ENTRY POINT
   /* This function traverses the entities in the aggregateEntities Object the
      generate the before and after images. */
  function getBeforeAndAfterUpdates(updateRequest, aggregateEntities) {
    /* create an array of the values(entities) in the aggregateObject */
    const entityObjectArray = R.values(aggregateEntities);

    /* map over entityObjectArray to create an array of before images  */
    const beforeImagesArray  = entityObjectArray.map(
      (entityObject) => {
        // console.log("updateRequest ", updateRequest);
        let updateImage = null;
        // console.log("mapped entity object before ", entityObject);
        let beforeImage = buildBeforeImageFromObject(updateRequest, entityObject);
        // console.log("mapped entity object after ", entityObject);
        return beforeImage;
      } 
    )
   
    /* merge all update image objects into one flat update image object */
    const beforeUpdateObject = beforeImagesArray.reduce( 
        (object1, object2) => R.mergeRight(object1, object2), {} 
    )

    /* construct  */
    const beforeAndAfterChanges = {
      before: beforeUpdateObject,
      after:  updateRequest
    }

    logStop(funcName, "beforeAndAfterChanges", beforeAndAfterChanges);
    return beforeAndAfterChanges;
  }

  // ==========================================================================

  /* Build a before image by pulling the data elements from original object before they 
    were updated. This function views one at at time */
  function buildBeforeImageFromObject(updateRequest, originalObject) {

    function getKeysFromUpdateRequest(updateRequest): Array<string> {
      /* excludes id property */
      const keysFromUpdateRequest = Object.keys(updateRequest);
      // console.log("keysFromUpdateRequest ",keysFromUpdateRequest )
      return keysFromUpdateRequest
    }
    function getKeysFromOriginalObject(originalObject): Array<string> {
      /* excludes id property */
      const keysFromOriginalObject = Object.keys(originalObject);
      // console.log("keysFromOriginalObject ",keysFromOriginalObject )
      return keysFromOriginalObject
    }
    function getCommonKeys(updateKeys, originalObjectKeys) {
      const commonKeys = updateKeys.filter((updateProp) => originalObjectKeys.includes(updateProp));
      // console.log("commonKeys ", commonKeys)
      return commonKeys;
    }
    function buildUpdateRequestImage(commonKeys, originalObject) {
      let tempObject = {};
      commonKeys.forEach((prop) => {
        if (originalObject[prop]) {
          tempObject[prop] = originalObject[prop]
        }
      });
      return tempObject;
    }

    // main logic
    let keysWithUpdates        = getKeysFromUpdateRequest(updateRequest);
    let keysFromOriginalObject = getKeysFromOriginalObject(originalObject);
    let commonKeys             = getCommonKeys(keysWithUpdates, keysFromOriginalObject);
    let beforeUpdateImage      = buildUpdateRequestImage(commonKeys, originalObject);
    
    // console.log("beforeUpdateImage ", beforeUpdateImage);

    return beforeUpdateImage;
  } // end of outer function

  const dataChanges = getBeforeAndAfterUpdates(updateRequest, aggregateEntities);
  console.log("DATA CHANGES")
  console.log(JSON.stringify(dataChanges))
  return dataChanges;

} // end of test1


/* Generate a before and after image for a given update request aggregate. */
function genBeforeAndAfterImage2(updateRequest, aggregateEntities): any { 
  console.log(">>> INSIDE genBeforeAndAfterImage2")   

  /**
   * Constructs a before and after image for a given update request aggregate.
   * This utility uses the update request to represent the 'after image' 
   * and traverses the aggregateEntities to find the data elements
   * before the update to create teh 'before image.
   */ 

  // ENTRY POINT
   /* This function traverses the entities in the aggregateEntities Object the
      generate the before and after images. */
  function getBeforeAndAfterUpdates(updateRequest, aggregateEntities) {
    /* create an array of the values(entities) in the aggregateObject */
    const entityObjectArray = R.values(aggregateEntities);

    /* map over entityObjectArray to create an array of before images  */
    const beforeImagesArray  = entityObjectArray.map(
      (entityObject) => {
        // console.log("updateRequest ", updateRequest);
        let updateImage = null;
        // console.log("mapped entity object before ", entityObject);
        let beforeImage = buildBeforeImageFromObject(updateRequest, entityObject);
        // console.log("mapped entity object after ", entityObject);
        return beforeImage;
      } 
    )
   
    /* merge all update image objects into one flat update image object */
    const beforeUpdateObject = beforeImagesArray.reduce( 
        (object1, object2) => R.mergeRight(object1, object2), {} 
    )

    /* construct  */
    const beforeAndAfterChanges = {
      before: beforeUpdateObject,
      after:  updateRequest
    }
    console.log(">>>> INSIDE GEN DATACHANGES ", beforeAndAfterChanges)
    return beforeAndAfterChanges;
  }

  // ==========================================================================

  /* Build a before image by pulling the data elements from original object before they 
    were updated. This function views one at at time */
  function buildBeforeImageFromObject(updateRequest, originalObject) {
    console.log(">>> INSIDE genBeforeAvndAfterImage2")  
    function getKeysFromUpdateRequest(updateRequest): Array<string> {
      /* excludes id property */
      const keysFromUpdateRequest = Object.keys(updateRequest);
      // console.log("keysFromUpdateRequest ",keysFromUpdateRequest )
      return keysFromUpdateRequest
    }
    function getKeysFromOriginalObject(originalObject): Array<string> {
      /* excludes id property */
      const keysFromOriginalObject = Object.keys(originalObject);
      // console.log("keysFromOriginalObject ",keysFromOriginalObject )
      return keysFromOriginalObject
    }
    function getCommonKeys(updateKeys, originalObjectKeys) {
      const commonKeys = updateKeys.filter((updateProp) => originalObjectKeys.includes(updateProp));
      // console.log("commonKeys ", commonKeys)
      return commonKeys;
    }
    function buildUpdateRequestImage(commonKeys, originalObject) {
      let tempObject = {};
      commonKeys.forEach((prop) => {
        if (originalObject[prop]) {
          tempObject[prop] = originalObject[prop]
        }
      });
      return tempObject;
    }

    // main logic
    let keysWithUpdates        = getKeysFromUpdateRequest(updateRequest);
    let keysFromOriginalObject = getKeysFromOriginalObject(originalObject);
    let commonKeys             = getCommonKeys(keysWithUpdates, keysFromOriginalObject);
    let beforeUpdateImage      = buildUpdateRequestImage(commonKeys, originalObject);
    
    // console.log("beforeUpdateImage ", beforeUpdateImage);

    return beforeUpdateImage;
  } // end of outer function

  // const dataChanges = getBeforeAndAfterUpdates(updateRequest, aggregateEntities);
  // return dataChanges;

} // end of test1

// ==========================================================================

// SAMPLE USAGE; Pass in updateRequest and aggregateObject and get before and after images
// const updateRequest = { id: 1, a: 'a', b: 'b', c: 'c', d: 'd' };
// const aggregateObject = {
//   objectA: { id: 1, a: 'x', b: 'y' },
//   objectB: { id: 1, c: 'z' },
//   objectC: { id: 1, d: 'f' } 
// }
// console.log("INVOKING genBeforeAndAfterImage")
// const beforeAfterUpdates = genBeforeAndAfterImage(updateRequest, aggregateObject);
// console.log("beforeAfterUpdates ")
// console.log(beforeAfterUpdates)