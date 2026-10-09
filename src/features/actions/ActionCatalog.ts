import type { ActionDefinition } from './Action'
// Verified against the bundled Juno item's mechanics; not inferred acquisition defaults.
export const actionCatalog: ActionDefinition[] = [{
 id:'vaguely-trustworthy-map-set',version:1,name:'Explore with Vaguely Trustworthy Map Set',category:'Gathering',
 description:'Explore the game site using a Vaguely Trustworthy Map Set to obtain a Forage card.',
 rules:{source:'Project Juno',version:'Catalog generated 2026-10-06',reference:'Blueprint #4800; item #4370; Item Mechanics'},
 prerequisites:[],tools:['Vaguely Trustworthy Map Set'],facilities:['Access to the game site'],verified:true,
 options:[{id:'explore',name:'Explore',mind:5,resolve:0,minutes:30,requirements:['Explore the game site for 30 minutes; then spend 5 Mind.'],inputs:[],
 equipmentUses:[{itemId:4370,name:'Vaguely Trustworthy Map Set',quantity:1}],outputs:[{name:'Forage card',quantity:1}],effects:[],fields:[]}]
}]

const rules=(page:number)=>({source:"Dystopia Rising Live Player's Guide",version:'2.3.2026',reference:'Page '+page})
const option=(id:string,name:string,mind:number,minutes:number):import('./Action').ActionOption=>({id,name,mind,minutes,resolve:0,requirements:[],inputs:[],equipmentUses:[],outputs:[],effects:[],fields:[]})
function action(id:string,name:string,skill:string,page:number,options:import('./Action').ActionOption[],targetType='Self'):ActionDefinition{return {id,version:id==='basic-medical-healing'?2:1,name,skill,category:skill.includes('Medical')?'Medical':skill.includes('Agricultural')?'Gathering':skill.includes('Devoted')?'Recovery':'Repair',description:name,rules:rules(page),prerequisites:[skill],tools:[],facilities:[],verified:true,targetType,options}}
const repair=option('repair','Repair',1,10)
repair.effects=['Restore damaged equipment to functionality; armor returns to full Armor Points.']
repair.requirements=['Valid targets: weapons, shields, armor, Engineered Spaces.','Cannot repair limited-use items, Gizmos or Necrology-crafted items.','Engineered Spaces: half the role-play in the crafting area, half at the installed location.','Interruptions restart the timer.']
repair.interruptionRestarts=true
function gather(id:string,name:string,mind:number,herb:string,choices?:string[]):import('./Action').ActionOption {
 const result=option(id,name,mind,10)
 result.outputs=[{name:herb,quantity:1}];result.outputField='herb';result.interruptionRestarts=true
 result.fields=[{id:'quantity',label:'Herbs in this gathering',type:'quantity',required:true,min:1,max:6},choices?{id:'herb',label:'Selected herb',type:'select',required:true,choices:choices.map(value=>({value,label:value}))}:{id:'herb',label:'Selected herb (same throughout session)',type:'text',required:true}]
 result.adjustments=[{field:'quantity',baseline:1,mind,minutes:10,outputQuantity:1}]
 result.sessionConstraints={maxMinutes:60,maxMind:mind*6,maxRepetitions:6,sameField:'herb',unitsField:'quantity',description:'Up to 60 minutes / '+(mind*6)+' Mind / 6 herbs; same herb throughout the session.'}
 result.requirements=['Farming Zone.','Any interruption restarts the timer for the entire gathering. Queue the total gathering as one Activity.']
 return result
}
const basic=gather('basic-herb','Gather Basic Herb',5,'Basic Herb',['Basic Herb'])
const uncommon=gather('uncommon-herb','Gather Uncommon Herb',10,'Uncommon Herb',['Uncommon Herb'])
const forage=option('foraging-card','Produce Foraging Card',0,20);forage.resolve=1;forage.outputs=[{name:'Foraging Card',quantity:1}];forage.interruptionRestarts=true;forage.requirements=['Wasteland.','Collect each Foraging Card individually; interruptions restart its timer.']
const rare=gather('rare-herb','Gather Rare Herb',15,'Rare Herb',['Rare Herb'])
const named=gather('named-herb','Gather in-season Named Herb',15,'Named Herb');named.requirements.push('Selected Named Herb must be in season; verify local season availability.')
const meditation=option('meditate','Restore Mind',0,20);meditation.effects=['Restore 5 Mind'];meditation.requirements=['Devoted lineage.','Full Engagement Role-Play focused on your chosen faith or cause.','Cannot use other skills while meditating.']
const fracture={...structuredClone(meditation),id:'meditate-fracture',name:'Restore Mind and remove Fracture',resolve:1,effects:['Restore 5 Mind','Remove 1 Fracture from self']}
const heal=option('heal','Healing',1,10);heal.fields=[{id:'additionalMind',label:'Additional Mind (1 Mind included)',type:'quantity',min:0,max:9}];heal.adjustments=[{field:'additionalMind',baseline:0,mind:1,effectTemplate:'Restore {value} Body.',effectMultiplier:10,effectOffset:10}];heal.effects=[];heal.requirements=['1 Mind restores 10 Body, up to 10 Mind for 100 Body.','Treatment always takes 10 minutes, regardless of Mind spent.']
const assess=option('assess','Assess Wounds',0,1);assess.effects=['Ask the willing Target how wounded they are on a scale of 1 to 100.'];assess.requirements=['Willing character. Informational assessment, not healing.']
const mangle=option('mangle','Treat Mangle',5,10);mangle.fields=[{id:'limbs',label:'Affected limbs',type:'quantity',required:true,min:1,max:Number.MAX_SAFE_INTEGER}];mangle.adjustments=[{field:'limbs',baseline:1,mind:5,minutes:2,effectTemplate:'Remove Mangle from {value} affected limb(s).'}]
const augment=option('augment','Augment First Aid',10,10);augment.effects=['For six hours, the Target’s next five First Aid uses restore 10 Body instead of 5.','Does not grant uses; if fewer than five remain, only those uses benefit.'];augment.requirements=['Target has First Aid.','Full Engagement Role-Play outside combat.']
const checkup=option('checkup','Medical Checkup',0,10);checkup.effects=['Learn lineage, current Diseases and stages, current/maximum Body and current/maximum Infection Pool.'];checkup.requirements=['Consenting character.','Item-specific time reductions require their own rules; additional plot-kit information may require Mind or Lores.']
actionCatalog.push(
 action('basic-artisan-repair','Repair Equipment','Basic Artisan',46,[repair],'Object'),
 action('basic-agricultural','Basic Agricultural','Basic Agricultural',46,[basic]),
 action('proficient-agricultural','Proficient Agricultural','Proficient Agricultural',48,[uncommon,forage]),
 action('master-agricultural','Master Agricultural','Master Agricultural',51,[rare,named]),
 action('devoted-meditation','Devoted Meditation','Devoted lineage',25,[meditation,fracture]),
 action('basic-medical-healing','Basic Medical — Healing','Basic Medical',48,[heal],'Self or another character'),
 action('basic-medical-assessment','Basic Medical — Assess Wounds','Basic Medical',48,[assess],'Willing character'),
 action('proficient-medical-mangle','Proficient Medical — Treat Mangle','Proficient Medical',50,[mangle],'Self or another character'),
 action('master-medical-first-aid','Master Medical — Augment First Aid','Master Medical',53,[augment],'Character with First Aid'),
 action('master-medical-checkup','Master Medical — Medical Checkup','Master Medical',53,[checkup],'Consenting character'))
// Output and access confirmed by the project owner; no invented mine consumables.
const mineOptions=([{id:'basic-scrap',name:'Basic Scrap',mind:5,itemId:3866},{id:'uncommon-scrap',name:'Uncommon Scrap',mind:10,itemId:3867},{id:'rare-scrap',name:'Rare Scrap',mind:15,itemId:3868}]).map(scrap=>({ ...option(scrap.id,'Gather '+scrap.name,scrap.mind,10),outputs:[{itemId:scrap.itemId,name:scrap.name,quantity:1}] }))
actionCatalog.push({id:'helscape-mine',version:1,name:'Helscape Mine',description:'Spend 10 minutes at the Helscape Mine to obtain one scrap of the selected tier.',category:'Gathering',skill:'Basic Foraging',rules:{source:'Existing project information and project owner clarification',version:'Confirmed 2026-10-08',reference:'Helscape Mine: time, Mind, output and access clarification'},prerequisites:['Basic Foraging'],tools:[],facilities:['Helscape Mine'],verified:true,targetType:'Self',options:mineOptions})
export const pendingActionVerification=[
 'Disease Remission: requirements must come from the specific disease procedure.',
 'Skill Assistants: the assistant regains 2 Mind; linked multi-participant Activities remain future work.'
]
