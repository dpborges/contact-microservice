// The Standard response interface for commands using the request/reply pattern
// Official doc   https://stateless.co/hal_specification.html 
// Other examples https://www.mscharhag.com/api-design/hypermedia-rest

import { BaseResponse } from '../../common/responses/base.response';

export class DeleteContactResponse extends BaseResponse {

  constructor(deletedData) {
    super();
    this.setDeletedData(deletedData)
  }
  
}