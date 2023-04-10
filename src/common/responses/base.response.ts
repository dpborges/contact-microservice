// The Standard response interface for commands using the request/reply pattern
// https://stateless.co/hal_specification.html

/* basic link  */
type Link = { href: string };

/* documentation link  */
type DocLink = { 
  name: string ;
  href: string;
  templated: boolean;
};

/* Type of relations; all relations are optional */
interface NamedLinks {
  self?: Link,
  next?: Link,
  find?: Link,
  /* create additional relations here ... */
  curies: Array<DocLink>,
  items?: Array<Link>  /* supports multiple links that shares same relation such as collection */
}

type ResponseAttrs = { 
  id?: number | string, 
  namedLinks?: NamedLinks,
  dataChanges?: DataChanges
}

interface DataChanges { 
    before: any, 
    after: any 
};


/* Base Response  */
class BaseResponse  {
  protected statusCode: number;
  protected id?:      string | number;
  protected _links:   NamedLinks;   /* object with named relations */
  protected dataChanges?: DataChanges;
  protected deletedData?: any;
  protected domain: string

  constructor(id?: string | number, namedLinks?:NamedLinks, dataChanges?: DataChanges ) {
    if (id)         { this.id = id }
    if (namedLinks) { this._links = namedLinks }
    if (dataChanges)    { this.dataChanges = dataChanges }
  }

  setId(id) {
    this.id = id
  }

  setStatusCode(code) {
    this.statusCode = code;
  }

  setNamedLinks(namedLinks) {
    this._links = namedLinks
  }
  setDataChanges(dataChanges: DataChanges) {
    this.dataChanges = dataChanges;
  }

  setDeletedData(deletedData: any) {
    this.deletedData = deletedData;
  }

  toString() {
    let returnObject: any = {};
    if (this.id) { returnObject.id = this.id; }
    if (this.domain) { returnObject.domain = this.domain; }
    if (this.dataChanges) { returnObject.dataChanges = this.dataChanges; }
  }

}

export { BaseResponse, DataChanges }
