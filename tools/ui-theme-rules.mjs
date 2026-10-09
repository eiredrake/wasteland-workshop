const attribute=(node,name)=>node.attributes.find(a=>a.type==='JSXAttribute'&&a.name.name===name)
const literal=a=>a?.value?.value
export const uiRules={rules:{'canonical-controls':{meta:{type:'problem',schema:[],messages:{search:'Use SearchInput for ordinary filtering; SearchablePicker remains valid for selection.',back:'Use BackButton for destination navigation.',remove:'Use RemoveBadge with an accessible action label for individual removals.',confirm:'Use the themed ConfirmationDialog for application record deletion.'}},create(context){const file=context.filename.replaceAll('\\','/');return {
 JSXOpeningElement(node){if(node.name.type!=='JSXIdentifier')return;const name=node.name.name;
 if(name==='input'&&literal(attribute(node,'type'))==='search'&&!file.endsWith('/SearchInput/SearchInput.tsx'))context.report({node,messageId:'search'});
 if(name==='button'&&!file.includes('/BackButton/')){const children=node.parent.children; if(children.some(c=>c.type==='JSXText'&&/^\s*(?:←\s*)?Back(?: to|\s*$)/.test(c.value)))context.report({node,messageId:'back'});}
 if(name==='button'&&!/\/(?:RemoveBadge|SearchInput|Toast)\//.test(file)&&node.parent.children.some(c=>c.type==='JSXText'&&/^\s*[X×]\s*$/.test(c.value)))context.report({node,messageId:'remove'});
 },
 CallExpression(node){if(node.callee.type==='MemberExpression'&&node.callee.object.name==='window'&&node.callee.property.name==='confirm')context.report({node,messageId:'confirm'});}
}}}}}
