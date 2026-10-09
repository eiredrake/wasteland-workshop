export type TourScreen='catalog'|'collections'|'shopping'|'warehouse'|'actions'|'builds'|'history'|'timer'|'settings'
export type TourCondition='blueprint-selected'|'collection-selected'|'membership'|'queued'
export type GuidedTourStep={id:string;title:string;body:string;screen?:TourScreen;target?:string;mode:'explanation'|'action';condition?:TourCondition;blueprintContext?:boolean}
export type GuidedTourDefinition={id:string;title:string;description:string;steps:GuidedTourStep[]}
const step=(id:string,title:string,body:string,screen?:TourScreen,target?:string,condition?:TourCondition,blueprintContext=false):GuidedTourStep=>({id,title,body,screen,target,mode:condition?'action':'explanation',condition,blueprintContext})
const tour=(id:string,title:string,description:string,steps:GuidedTourStep[]):GuidedTourDefinition=>({id,title,description,steps})
export const guidedTours:GuidedTourDefinition[]=[
 tour('intro-blueprints','Getting Started: Blueprints','Find a Blueprint, organize it in a collection, and prepare work.',[
 step('welcome','Welcome to Wasteland Workshop!',"Wasteland Workshop helps you organize your Blueprints, calculate crafting costs, manage resources, and keep track of what you're making. Let's start with the basics: finding a Blueprint, adding it to your collection, and putting it in your Work Queue."),
 step('catalog','The Blueprint Catalog',"This is the master catalog of available Blueprints. You can browse everything here, even Blueprints your character hasn't acquired. Let's find something to make.",'catalog','blueprint-search'),
 step('search','Search and Filter','Use the search box to find a Blueprint by name or other searchable information. You can also use the available sorting controls to narrow the list. Select a Blueprint to see its details.','catalog','blueprint-catalog','blueprint-selected'),
 step('details','Understanding a Blueprint',"Here you'll find the Blueprint's crafting requirements, materials, Mind, time, and estimated production cost. You'll also find information about what the finished item does and any requirements for using it.",'catalog','blueprint-details',undefined,true),
 step('collections','Your Blueprint Collections','The master catalog contains all available Blueprints. Collections let you organize the Blueprints that matter to you. For example, you might create a collection for your character, another for your settlement, or one for Blueprints you’re planning to acquire.','collections','collections'),
 step('create','Create Your First Collection','Give your collection a name and create it. This gives you a place to organize the Blueprints you want to track. If you already have a suitable active collection, use it instead of creating a duplicate.','collections','collection-create','collection-selected'),
 step('membership','Add Blueprints to Your Collection',"Now let's add a Blueprint to your collection. Adding a Blueprint to a collection doesn't change the master catalog. It simply lets you track that Blueprint as part of your own collection. Tap Not Acquired to mark To Acquire; tap again for Acquired. Choose the status that reflects your actual access.",'catalog','blueprint-membership','membership',true),
 step('build','Ready to Make Something?','When you’re ready to craft an item, use Build. This creates a separate Activity for that job; the Blueprint stays in your collection. IMPORTANT: an empty queue starts this Activity immediately when you click Build. With existing pending work it goes to the end. Click only if you want a real Activity, or Skip Step to learn without adding one.','catalog','blueprint-build','queued',true),
 step('queue','Your Work Queue','The Work Queue organizes upcoming crafting jobs. Each Activity captures its own costs and settings. Only one Activity may be Working. Prepare several jobs without starting them by using Add to Queue; pause active work explicitly before switching. The next Activity never starts automatically.','builds','work-queue'),
 step('finish',"You're Ready to Go!",'You’ve explored how to find a Blueprint, organize a collection, track access, and prepare a crafting job. Any steps you skipped remain available in the real app. You can explore the other tours anytime from Help → Guided Tours.')]),
 tour('blueprint-collections','Blueprint Collections','Organize and track Blueprint access.',[
 step('purpose','Your collections','Collections organize character, settlement or acquisition plans. They do not alter the master catalog.','collections','collections'),
 step('create','Create and name','Use Add Collection, enter a name and save. Existing collections can be used without creating another.','collections','collection-create'),
 step('active','Choose the active collection','Select an active collection here. Workshop displays its Blueprints; catalog status controls update this active collection.','collections','collections'),
 step('access','Acquired or To Acquire','In the Blueprint Catalog, select a Blueprint and use its status badge. Untracked → To Acquire → Acquired → Untracked. Only mark Acquired if you have access. Workshop also supports To Sell.','catalog','blueprint-catalog'),
 step('remove','Remove associations','Changing a Blueprint to Untracked removes its association, not the master Blueprint. Deleting a whole collection uses an X with a confirmation.','collections','collections')]),
 tour('shopping-lists','Shopping Lists','Plan needed resources separately from inventory.',[
 step('lists','Create and name a list','Use Add List and name it. Select an active list; rename or export individual lists and manage several plans.','shopping','shopping-lists'),
 step('resources','Add resources','Use the searchable resource picker, choose a concrete resource and set its quantity. Blueprint components can also be sent to a list from Blueprint Details.','shopping','shopping-resources'),
 step('tracking','Needed and acquired','Tap a status badge to switch Needed/Acquired. Estimates total unrounded values, then round up to whole credits. Unknown values remain identified.','shopping','shopping-lists'),
 step('removal','Remove and manage','Use X to remove a resource with confirmation. Blueprints to Acquire reflects your active collection: marking Acquired updates that collection. Shopping Lists never automatically update Warehouse inventory.','shopping','shopping-lists')]),
 tour('warehouse','Warehouse','Track owned inventory, lots, dates and credits.',[
 step('purpose','What you own','Warehouse tracks inventory only when you update it. Shopping Lists and completed work do not automatically add or consume inventory.','warehouse','warehouse'),
 step('add','Add an item or resource','Choose a resource or item, enter a quantity and expiration date, then Add to Warehouse. Currency does not expire.','warehouse','warehouse-add'),
 step('lots','Quantities and lots','Matching items with matching expiration dates merge. Different dates stay separate. Edit On hand or use −/+ to change quantity by one. Zero and X remove the lot immediately, without a confirmation.','warehouse','warehouse-inventory'),
 step('expiry','Expiration and filters','Green means good, yellow expiring, grey expired. Settings controls warning days. Expiration, Type and Sort filters work independently; undated old inventory needs a date to count toward crafting.','warehouse','warehouse-filters'),
 step('credits','Credits','Set, add or subtract credits explicitly. Credit amounts display rounded up to whole credits; changing inventory quantities does not change this balance.','warehouse','warehouse-credits')]),
 tour('actions','Actions','Prepare non-Blueprint work.',[
 step('catalog','Actions and Blueprints','Actions cover gathering, healing, repair and other non-Blueprint activities. Browse or search the catalog and select one.','actions','actions'),
 step('details','Requirements and costs','Details show rules, prerequisites, tools, facilities, duration, Mind, inputs, outputs and effects. Read the relevant restrictions before acting in game.','actions','actions'),
 step('queue','Configure and add','In Work Queue, expand Add to Queue and select Action. Choose an action and any required options, quantities or session ID. Add to Queue creates a real Activity; optional requirements/details are expandable. It does not spend character resources or change Warehouse.','builds','queue-entry')]),
 tour('work-queue','Work Queue','Manage planned and active activities.',[
 step('add','Add an Activity','Expand Add to Queue and select Blueprint or Action. Required Action choices stay above the orange Add to Queue button. The tour itself will not add work.','builds','queue-entry'),
 step('states','Activity states','Enqueued means planned; Working means active; Paused preserves remaining time. The top/active Activity shows the compact timer. Click it to start or pause.','builds','work-queue'),
 step('order','Order and switching','Working Activities cannot move or be deleted: pause first. Move other pending Activities with Move Up/Down. Start / Resume can move an Activity to the top, but is blocked while another is Working.','builds','work-queue'),
 step('details','Per-Activity settings','Expand Details for the captured recipe or Action, costs and outputs. Notes & Overrides edits this Activity only. Timer Settings opens the full Timer page.','builds','work-queue'),
 step('complete','Completion','A timer reaching zero completes the Activity and moves it into Work History. The next Activity does not automatically start. Alarms require a visible, awake app.','builds','work-queue')]),
 tour('work-history','Work History','Review completed snapshots and notes.',[
 step('history','Completed work','Completed Activities appear here. Expand a record to see captured costs, requirements and outputs.','history','work-history'),
 step('snapshot','Historical snapshots','Records retain their original Blueprint/Action and economic settings; later catalog updates or global overrides do not rewrite them. Recorded values are read-only.','history','work-history'),
 step('notes','Notes and removal','Details & Notes lets you edit historical notes. X removes a history record after confirmation; bulk delete confirms the selected group. Nothing changes inventory automatically.','history','work-history')]),
 tour('craft-timer','Timer','Understand remaining time and active work.',[
 step('timer','Your current timer','This page shows selected or current active work. No timer? Add or select an Activity in Work Queue first. This explanation does not start a real Activity.','timer','timer'),
 step('pause','Start, pause and resume','The status control starts or pauses eligible work. Only one Activity can be Working; pause it explicitly before starting another. Remaining time uses elapsed time, including when backgrounded.','timer','timer'),
 step('adjust','Adjust minutes','Use −/+ for direct minute adjustments on Working or Paused Activities. Completed or not-yet-started Activities cannot be adjusted. Certain interrupted Actions require a full restart, exposed in queue Details.','timer','timer'),
 step('alarm','Completion alarms','Sound and vibration use Settings preferences. Test Alarm checks browser/device support. Keep the app visible and the screen awake: locked or suspended browsers cannot reliably alert you.','settings','alarm-settings')]),
 tour('timer-settings','Timer Settings','Adjust duration and test alarm preferences.',[
 step('open','One Timer page','Timer Settings and compact-timer long press open the same full Timer page for that Activity. There is no separate adjustment prompt.','builds','work-queue'),
 step('minutes','Direct adjustments','Use −/+ on the Timer page; changes apply immediately. There is no Apply or Cancel. Back to Work Queue returns without undoing adjustments. The running timer keeps running while you inspect it.','timer','timer'),
 step('preferences','Sound and vibration','In Settings, independently enable Alarm Sound and Vibration. These preferences save when changed. Test Alarm uses current preferences and reports device/browser results.','settings','alarm-settings'),
 step('limits','Mobile limitations','A future PWA alone cannot guarantee locked/background alarms. A native wrapper can later schedule local OS notifications without a server. Current alarms need the app active.','settings','alarm-settings')]),
 tour('application-settings','Application Settings & Overrides','Customize preferences and protect data.',[
 step('preferences','Preferences','Settings includes read/unread controls, backup/restore, expiration warning days and timer alarms. Mark All Read affects current Blueprints, not future new ones.','settings','settings'),
 step('economics','Economics','Mind, time, Resolve, card cost and resource defaults drive estimates. Keep precise rates; final credit amounts round up. Markup applies to unrounded production cost.','settings','economics-settings'),
 step('override','Save and reset','Enter a price override and Save Settings to use it going forward. Reset restores the application default. Individual Activity overrides are separate; historical snapshots remain fixed.','settings','economics-settings'),
 step('backup','Portable data','Export All Data protects collections, lists, inventory, queue/history, preferences and tour progress. Import validates a file and asks before replacement. Older backups preserve your existing tour progress and suppress a surprise introduction.','settings','backup-settings')])
]
export const findTour=(id:string)=>guidedTours.find(tour=>tour.id===id)

export function confirmedAction(step:GuidedTourStep,baseline:string,signal:string):boolean {
 if(step.mode!=='action'||!signal||signal===baseline)return false
 if(step.condition==='queued'){
  const before=new Set<string>(JSON.parse(baseline||'[]'))
  return (JSON.parse(signal) as string[]).some(id=>!before.has(id))
 }
 return true
}
