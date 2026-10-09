export type ActionField = { id:string; label:string; required?:boolean } & (
  {type:'select';choices:{value:string;label:string}[]} | {type:'resource';itemIds?:number[]} |
  {type:'quantity';min:number;max:number} | {type:'text';target?:boolean})
export type ActionItem = {itemId?:number;name:string;quantity:number}
export type SessionConstraints = {maxMinutes?:number;maxMind?:number;maxRepetitions?:number;sameField?:string;unitsField?:string;description:string}
export type ActionOption = {
 id:string;name:string;mind:number;resolve:number;minutes:number;requirements:string[];
 inputs:ActionItem[];equipmentUses:ActionItem[];outputs:ActionItem[];effects:string[];fields:ActionField[];
 interruptionRestarts?:boolean; adjustments?:{field:string;baseline:number;mind?:number;minutes?:number;outputQuantity?:number;effectTemplate?:string;effectMultiplier?:number;effectOffset?:number}[]; outputField?:string;
 sessionConstraints?:SessionConstraints
}
export type ActionDefinition = {
 id:string;version:number;name:string;description:string;category:string;skill?:string;
 rules:{source:string;version:string;reference:string};prerequisites:string[];tools:string[];facilities:string[];
 options:ActionOption[];verified:boolean;targetType?:string
}
export type ActionConfiguration = Record<string,string|number>
export type ActionExecution = {
 definition:ActionDefinition;option:ActionOption;configuration:ActionConfiguration;target?:string;sessionId?:string
}
