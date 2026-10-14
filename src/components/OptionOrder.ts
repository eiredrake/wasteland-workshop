const collator=new Intl.Collator('en',{sensitivity:'base',numeric:true,ignorePunctuation:true})
// Sort a copy so catalog order, saved selections, and action defaults stay unchanged.
export function alphabeticalOptions<T>(options:readonly T[],label:(option:T)=>string):T[]{
 return [...options].sort((a,b)=>collator.compare(label(a).trim(),label(b).trim()))
}
