const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('resource-inventory.js','utf8'),schema=JSON.parse(fs.readFileSync('resource-inventory-table-definition.json','utf8'));
function fixture(entries=[],distributions=[],operations=[]){
 const calls=[],metadata=JSON.parse(JSON.stringify(schema.tables));let fail=false;
 const context=vm.createContext({window:{LPC_RESOURCE_CONFIG:{serviceUrl:'https://example.test/FeatureServer'}},document:{getElementById:()=>null},resourceRows:distributions,resourceHistoryState:'ready',resourceDraftItems:[],activeResourceItems:[],workflowMode:'resource',resourceSaving:false,operatorName:'Test',crypto:require('node:crypto').webcrypto,URLSearchParams,console,validateResourceItems:items=>{if(!items.length)throw Error('Add at least one resource')},getAgolToken:async()=> 'token',resourceMetadata:async url=>{if(fail)throw Error('Inventory unavailable');return url.endsWith('FeatureServer')?{tables:[{id:1,name:'Resource_Inventory'},{id:2,name:'Resource_Operations'}]}:metadata[Number(url.slice(-1))-1]},resourceQuery:async(url,token,params)=>{calls.push({url,params});if(fail)throw Error('Inventory unavailable');return {features:(url.endsWith('/1')?entries:operations).map(attributes=>({attributes}))}},loadResourceHistory:async()=>{}});
 vm.runInContext(source,context);return {api:context.window.LPCInventory,context,calls,fail:()=>{fail=true},metadata};
}
const stock=(id,name,unit,quantity,location='Warehouse')=>({entry_id:id,inventory_id:id,record_type:'stock',resource_type:'Supplies',resource_name:name,unit,quantity,location});
const dist=(id,preset,quantity,incident='')=>({distribution_id:id,preset_id:preset,quantity,incident});
test('inventory counts starting supply and receipts, and only linked confirmed distributions once',()=>{
 const f=fixture(),s=stock('RINV-water','Water','case',100),receipt={entry_id:'receipt-1',inventory_id:s.inventory_id,record_type:'receipt',quantity:50};
 const rows=f.api.balances([s,receipt,receipt],[dist('a',s.inventory_id,20),dist('a',s.inventory_id,20),dist('b',s.inventory_id,10,'ROP-test'),dist('old','water-case',900)]);
 assert.equal(rows.length,1);assert.equal(rows[0].supplied,150);assert.equal(rows[0].issued,30);assert.equal(rows[0].remaining,120);assert.equal(rows[0].percent,80);
});
test('inventory keeps locations, units and operation consumption separate without hiding overdraw',()=>{
 const f=fixture(),entries=[stock('RINV-a','Water','case',100,'East'),stock('RINV-b','Water','case',40,'West'),stock('RINV-c','Water','gallon',10,'East')];
 const rows=f.api.balances(entries,[dist('a','RINV-a',30,'ROP-flood'),dist('b','RINV-a',20,'ROP-fire'),dist('c','RINV-b',45)]);
 assert.equal(rows[0].remaining,50);assert.equal(rows[1].remaining,-5);assert.equal(rows[2].remaining,10);
});
test('zero starting stock has a finite remaining percentage',()=>{
 const f=fixture();assert.equal(f.api.balances([stock('RINV-zero','Water','case',0)],[])[0].percent,0);
});
test('shared inventory discovers exact tables and refreshes stock from GIS',async()=>{
 const f=fixture([stock('RINV-a','Water','case',100)]);await f.api.refresh();assert(f.api.enabled());assert.equal(f.calls.length,2);assert.equal(f.api.describe({preset_id:'RINV-a'}).location,'Warehouse');
});
test('insufficient stock rejects distribution, including quantities combined within a batch',async()=>{
 const f=fixture([stock('RINV-a','Water','case',5)],[dist('prior','RINV-a',2)]);await f.api.refresh();await assert.rejects(f.api.checkStock([{preset:'RINV-a',quantity:4}]),/Not enough supply/);
 await assert.rejects(f.api.checkStock([{preset:'RINV-a',quantity:2},{preset:'RINV-a',quantity:2}]),/Not enough supply/);
 await f.api.checkStock([{preset:'RINV-a',quantity:3}]);
});
test('closed operations cannot consume inventory; routine county assistance can',async()=>{
 const f=fixture([stock('RINV-a','Water','case',20)],[],[{operation_id:'ROP-test',status:'Closed'}]);await f.api.refresh();
 await assert.rejects(f.api.checkStock([{preset:'RINV-a',quantity:1,operationId:'ROP-test'}]),/closed or unavailable/);
 await f.api.checkStock([{preset:'RINV-a',quantity:1,operationId:''}]);
});
test('failed refresh or history read blocks stock writes instead of treating stale data as available',async()=>{
 const f=fixture([stock('RINV-a','Water','case',20)]);await f.api.refresh();f.fail();await assert.rejects(f.api.checkStock([{preset:'RINV-a',quantity:1}]),/could not be verified/);
 const h=fixture([stock('RINV-a','Water','case',20)]);await h.api.refresh();h.context.resourceHistoryState='error';await assert.rejects(h.api.checkStock([{preset:'RINV-a',quantity:1}]),/could not be verified/);
});
test('schema errors keep legacy entry available rather than enabling broken shared inventory',async()=>{
 const f=fixture();f.metadata[0]={...f.metadata[0],fields:f.metadata[0].fields.filter(f=>f.name!=='location')};await f.api.refresh();assert.equal(f.api.enabled(),false);
});
test('separate private service roots resolve actual table IDs without reading the distribution service',async()=>{
 const f=fixture(),base='https://example.test',config={serviceUrl:base+'/Distributions/FeatureServer',inventoryTableUrl:base+'/Inventory/FeatureServer',operationsTableUrl:base+'/Operations/FeatureServer'};
 f.context.window.LPC_RESOURCE_CONFIG=config;const reads=[];
 f.context.resourceMetadata=async url=>{reads.push(url);if(url===config.inventoryTableUrl)return {tables:[{id:7,name:'Resource_Inventory'}]};if(url===config.operationsTableUrl)return {tables:[{id:12,name:'Resource_Operations'}]};if(url===config.inventoryTableUrl+'/7')return {...f.metadata[0],fields:f.metadata[0].fields.map(field=>field.type==='esriFieldTypeOID'?{...field,name:'FID'}:field)};if(url===config.operationsTableUrl+'/12')return f.metadata[1];throw Error('Unexpected metadata URL: '+url)};
 await f.api.refresh();assert(f.api.enabled());assert.deepEqual(f.calls.map(c=>c.url),[config.inventoryTableUrl+'/7',config.operationsTableUrl+'/12']);assert(!reads.includes(config.serviceUrl));assert.equal(f.calls[0].params.orderByFields,'FID ASC');
});
test('separate service permits a sole CSV table with a different published name',async()=>{
 const f=fixture();f.context.window.LPC_RESOURCE_CONFIG={inventoryTableUrl:'https://example.test/Stock/FeatureServer/',operationsTableUrl:'https://example.test/Ops/FeatureServer'};
 f.context.resourceMetadata=async url=>url.endsWith('FeatureServer')?{tables:[{id:0,name:'Published_CSV'}]}:url.includes('/Stock/')?f.metadata[0]:f.metadata[1];
 await f.api.refresh();assert(f.api.enabled());assert.deepEqual(f.calls.map(c=>c.url),['https://example.test/Stock/FeatureServer/0','https://example.test/Ops/FeatureServer/0']);
});
test('ambiguous separate services and spatial layers do not guess an inventory table',async()=>{
 for(const service of [{tables:[{id:0,name:'OtherA'},{id:1,name:'OtherB'}]},{layers:[{id:0,name:'Resource_Inventory'}],tables:[]}]){
  const f=fixture();f.context.window.LPC_RESOURCE_CONFIG={inventoryTableUrl:'https://example.test/Stock/FeatureServer',operationsTableUrl:'https://example.test/Ops/FeatureServer'};f.context.resourceMetadata=async()=>service;
  await f.api.refresh();assert.equal(f.api.enabled(),false);assert.equal(f.calls.length,0);
 }
});
test('inventory allows identifying a person before choosing resources, but save still needs a selection',async()=>{
 const f=fixture([stock('RINV-a','Water','case',20)]);await f.api.refresh();assert.doesNotThrow(()=>f.api.validateSelection({allowEmpty:true}));assert.throws(()=>f.api.validateSelection(),/at least one resource/);
});
test('last saved resources and amounts restore on this device without storing recipient data',async()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const f=fixture([stock('RINV-a','Water','case',20)]);f.context.window.localStorage=storage;await f.api.refresh();
 f.api.remember([{preset:'RINV-a',quantity:'3',phone:'PRIVATE',address:'PRIVATE',name:'PRIVATE'}]);
 assert.equal([...store.values()][0],'[["RINV-a",3]]');
 const next=fixture([stock('RINV-a','Water','case',20)]);next.context.window.localStorage=storage;await next.api.refresh();next.api.validateSelection();assert.equal(next.context.resourceDraftItems.length,1);assert.equal(next.context.resourceDraftItems[0].quantity,3);
 // Polling does not discard a remembered selection.
 await next.api.refresh();next.api.validateSelection();assert.equal(next.context.resourceDraftItems[0].preset,'RINV-a');
});
test('stored selections ignore removed resources and invalid quantities',async()=>{
 const f=fixture([stock('RINV-a','Water','case',20)]);f.context.window.localStorage={getItem:()=>JSON.stringify([['removed',4],['RINV-a',-3],['RINV-a',2]])};await f.api.refresh();f.api.validateSelection();assert.equal(f.context.resourceDraftItems.length,1);assert.equal(f.context.resourceDraftItems[0].quantity,2);
});
test('unavailable device storage does not block distribution defaults between recipients',async()=>{
 const f=fixture([stock('RINV-a','Water','case',20)]);Object.defineProperty(f.context.window,'localStorage',{get(){throw Error('Storage blocked')}});await f.api.refresh();assert.doesNotThrow(()=>f.api.remember([{preset:'RINV-a',quantity:2}]));f.api.validateSelection();assert.equal(f.context.resourceDraftItems[0].quantity,2);
});
function setupFixture(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,open:false,dataset:{},attrs:{},showModal(){this.open=true},close(){this.open=false},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}});return nodes.get(id)};
 const calls=[],context=vm.createContext({$:get,state:{operation:'',operations:[{operation_id:'ROP-test',status:'Open'}]},resourceSaving:false,pending:null,syncDraft:()=>calls.push('sync'),render:()=>calls.push('render'),renderResourceHistory:()=>calls.push('history')});
 vm.runInContext(source.slice(source.indexOf(' function setConfiguration('),source.indexOf(' function syncDraft(')),context);
 return {get,calls,context,run:s=>vm.runInContext(s,context)};
}
test('operation and county setup open independently, with only one visible at a time',()=>{
 const f=setupFixture();f.run("setConfiguration(true,'operations')");assert.equal(f.get('riOperationConfig').hidden,false);assert.equal(f.get('resourceInventoryConfig').hidden,true);assert.equal(f.get('riOperationSetup').attrs['aria-expanded'],'true');
 f.run("setConfiguration(true,'county')");assert.equal(f.get('riOperationConfig').hidden,true);assert.equal(f.get('resourceInventoryConfig').hidden,false);assert.equal(f.get('riOperationSetup').attrs['aria-expanded'],'false');
 f.run("setConfiguration(false,'county')");assert.equal(f.get('resourceInventoryConfig').hidden,true);assert.equal(f.get('riCountySetup').focused,true);
});
test('selecting an operation collapses setup, syncs recipient choices, and filters activity',()=>{
 const f=setupFixture();f.run("setConfiguration(true,'operations');chooseOperation('ROP-test')");assert.equal(f.context.state.operation,'ROP-test');assert.equal(f.get('riOperationConfig').hidden,true);assert.deepEqual(f.calls,['sync','render','history']);
 f.run("chooseOperation('')");assert.equal(f.context.state.operation,'');
 f.run("chooseOperation('missing')");assert.equal(f.context.state.operation,'');assert.equal(f.calls.length,6);
});
test('operation selection cannot change a distribution while its save is unresolved',()=>{
 const f=setupFixture();f.context.resourceSaving=true;f.run("chooseOperation('ROP-test')");assert.equal(f.context.state.operation,'');
 f.context.resourceSaving=false;f.get('resourceForm')._pendingResource={};f.run("chooseOperation('ROP-test')");assert.equal(f.context.state.operation,'');assert.equal(f.calls.length,0);
});
test('county setup guides one action at a time and resets after completion',()=>{
 const f=setupFixture();f.run("setCountyAction('stock')");assert.equal(f.get('riAddStock').hidden,false);assert.equal(f.get('riReceiveStock').hidden,true);
 f.run("setCountyAction('receipt')");assert.equal(f.get('riAddStock').hidden,true);assert.equal(f.get('riReceiveStock').hidden,false);assert.equal(f.get('riManagementDialog').dataset.page,'receipt');
 f.run('setCountyAction(null)');assert.equal(f.get('riAddStock').hidden,true);assert.equal(f.get('riReceiveStock').hidden,true);
});
test('active countywide activity combines open operations and routine assistance, excluding closed and unknown operations',async()=>{
 const records=[dist('open-a','RINV-a',1,'ROP-a'),dist('open-b','RINV-a',2,'ROP-b'),dist('routine','RINV-a',3),dist('closed','RINV-a',4,'ROP-closed'),dist('legacy','RINV-a',5,'Old incident')];
 const f=fixture([stock('RINV-a','Water','case',100)],records,[{operation_id:'ROP-a',status:'Open'},{operation_id:'ROP-b',status:'Open'},{operation_id:'ROP-closed',status:'Closed'}]);await f.api.refresh();
 assert.deepEqual(Array.from(f.api.filterRows(records),r=>r.distribution_id),['open-a','open-b','routine']);
 // Historical closed-operation distributions still reduce physical supply.
 assert.equal(f.api.balances([stock('RINV-a','Water','case',100)],records)[0].remaining,85);
});
test('countywide open + closed includes historical activity and can return to open-only reporting',async()=>{
 const records=[dist('open','RINV-a',1,'ROP-a'),dist('closed','RINV-a',2,'ROP-b'),dist('legacy','RINV-a',3,'Missing operation'),dist('routine','RINV-a',4)];
 const f=fixture([],records,[{operation_id:'ROP-a',status:'Open'},{operation_id:'ROP-b',status:'Closed'}]);await f.api.refresh();f.api.setActivityScope('all');assert.equal(f.api.filterRows(records).length,4);
 f.api.setActivityScope('open');assert.deepEqual(Array.from(f.api.filterRows(records),r=>r.distribution_id),['open','routine']);
});
test('a selected closed operation shows only its own activity regardless of countywide scope',()=>{
 const f=setupFixture();Object.assign(f.context.state,{ready:true,activityScope:'open',location:'',resource:'',operations:[{operation_id:'ROP-closed',status:'Closed'}]});f.context.allStocks=()=>[];
 f.run(source.slice(source.indexOf(' function filterRows('),source.indexOf(' function describe(')));
 f.run("chooseOperation('ROP-closed')");f.context.rows=[dist('closed','RINV-a',1,'ROP-closed'),dist('other','RINV-a',2,'ROP-other')];
 assert.deepEqual(Array.from(f.run('filterRows(rows)'),r=>r.distribution_id),['closed']);f.run("chooseOperation('')");assert.equal(f.context.state.activityScope,'open');
});
function addRevisionBuilder(f){vm.runInContext(source.slice(source.indexOf(' function revisionRow('),source.indexOf(' function openSupplyEditor(')),f.context);return (stock,mode,fields,entries)=>{f.context.testStock=stock;f.context.testMode=mode;f.context.testFields=fields;f.context.testEntries=entries;return vm.runInContext('revisionRow(testStock,testMode,testFields,testEntries)',f.context)}}
test('editing supply details appends a new current version without changing original rows or double counting prior receipts',()=>{
 const f=fixture(),entries=[{...stock('RINV-a','Water','case',100),recorded_at:1},{entry_id:'receipt',inventory_id:'RINV-a',record_type:'receipt',quantity:50,recorded_at:2}],issues=[dist('issued','RINV-a',30)];
 const before=JSON.stringify(entries),current=f.api.balances(entries,issues)[0],build=addRevisionBuilder(f);
 const revision=build(current,'revise',{resource_name:'Bottled water',resource_type:'Water',location:'North station',notes:'Corrected location'},entries),result=f.api.balances([...entries,revision],issues)[0];
 assert.equal(JSON.stringify(entries),before);assert.equal(revision.record_type,'stock_update');assert.equal(revision.quantity,0);assert.equal(result.supplied,150);assert.equal(result.remaining,120);assert.equal(result.resource_name,'Bottled water');assert.equal(result.location,'North station');assert.equal(result.versionId,revision.entry_id);
});
test('updating physical supply appends a corrected snapshot and later receipts add only once',()=>{
 const f=fixture(),entries=[{...stock('RINV-a','Water','case',100),recorded_at:1},{entry_id:'receipt',inventory_id:'RINV-a',record_type:'receipt',quantity:20,recorded_at:2}],issues=[dist('issued','RINV-a',25)];
 const current=f.api.balances(entries,issues)[0],revision=addRevisionBuilder(f)(current,'count',{quantity:60,notes:'Physical count'},entries);
 assert.equal(revision.quantity,85);assert.equal(f.api.balances([...entries,revision],issues)[0].remaining,60);
 const later={entry_id:'later',inventory_id:'RINV-a',record_type:'receipt',quantity:10,recorded_at:revision.recorded_at+1};assert.equal(f.api.balances([later,...entries,revision,revision],issues)[0].remaining,70);
});
test('deactivation and reactivation append versions, retain stock balances, and preserve distribution history',()=>{
 const f=fixture(),entries=[stock('RINV-a','Water','case',100)],issues=[dist('issued','RINV-a',25)],build=addRevisionBuilder(f),first=f.api.balances(entries,issues)[0];
 const inactive=build(first,'deactivate',{notes:'Not available'},entries),off=f.api.balances([...entries,inactive],issues)[0];assert.equal(off.active,false);assert.equal(off.remaining,75);
 const active=build(off,'activate',{notes:'Available again'},[...entries,inactive]),on=f.api.balances([...entries,inactive,active],issues)[0];assert.equal(on.active,true);assert.equal(on.remaining,75);assert.equal(entries[0].record_type,'stock');assert.equal(issues.length,1);
});
test('inactive supplies cannot be distributed or restored as last-used selections',async()=>{
 const entries=[stock('RINV-a','Water','case',100),{entry_id:'off',inventory_id:'RINV-a',record_type:'stock_inactive',quantity:100,recorded_at:1,resource_name:'Water',resource_type:'Supplies',unit:'case',location:'Warehouse'}];
 const f=fixture(entries);f.context.window.localStorage={getItem:()=>JSON.stringify([['RINV-a',2]])};await f.api.refresh();assert.throws(()=>f.api.validateSelection(),/at least one resource/);await assert.rejects(f.api.checkStock([{preset:'RINV-a',quantity:1}]),/inactive/);
});
test('revision retries reuse the confirmed entry ID and never append a second update after a lost response',async()=>{
 const f=fixture(),original=stock('RINV-a','Water','case',100),build=addRevisionBuilder(f),stored=[],fields={stock:{value:'RINV-a'},name:{value:'Updated water'},type:{value:'Water'},location:{value:'North'},notes:{value:'Corrected name'}};
 const form={elements:{namedItem:n=>fields[n]},querySelectorAll:()=>Object.values(fields),reset(){},dataset:{}};
 Object.assign(f.context,{pending:null,state:{entries:[original],tables:{stock:{url:'https://example.test/FeatureServer/1'}}},$:()=>({hidden:false}),refresh:async()=>{},loadResourceHistory:async()=>{},usable:()=>true,allStocks:()=>f.api.balances([original],[]),setCountyAction(){},setConfiguration(){},syncDraft(){},render(){},form});
 f.context.resourceQuery=async()=>({features:stored.map(attributes=>({attributes}))});let writes=0;
 f.context.edit=async(kind,row,update)=>{assert.equal(kind,'stock');assert.equal(update,undefined);writes++;stored.push({...row});throw Error('Lost response')};
 vm.runInContext(source.slice(source.indexOf(' async function saveEntry('),source.indexOf(' function mount(section)')),f.context);
 await assert.rejects(vm.runInContext("saveEntry(form,'revise')",f.context),/Lost response/);const id=f.context.pending.row.entry_id;fields.name.value='Should not overwrite pending revision';
 const result=await vm.runInContext("saveEntry(form,'revise')",f.context);assert.equal(writes,1);assert.equal(result.entry_id,id);assert.equal(stored[0].resource_name,'Updated water');assert.equal(f.context.pending,null);
});
test('supply editor actions replace the list and return to the list after completion',()=>{
 const f=setupFixture();for(const mode of ['revise','count','deactivate','activate']){f.run(`setCountyAction('${mode}')`);assert.equal(f.get('riSupplyEditor').hidden,false);assert.equal(f.get('riSupplyLists').hidden,true);assert.equal(f.get('riAddStock').hidden,true);assert.equal(f.get('riReceiveStock').hidden,true)}
 f.run('setCountyAction(null)');assert.equal(f.get('riSupplyEditor').hidden,true);assert.equal(f.get('riSupplyLists').hidden,false);
});
test('metadata and status revisions do not discard receipts written before or after the revision',()=>{
 const f=fixture(),entries=[{...stock('RINV-a','Water','case',100),recorded_at:1}],current=f.api.balances(entries,[])[0],revision=addRevisionBuilder(f)(current,'revise',{resource_name:'Water cases',resource_type:'Water',location:'North',notes:''},entries);
 const concurrent={entry_id:'concurrent',inventory_id:'RINV-a',record_type:'receipt',quantity:40,recorded_at:revision.recorded_at-1};assert.equal(f.api.balances([...entries,concurrent,revision],[])[0].supplied,140);
});
test('historical distributions retain the storage location in effect when they were recorded',async()=>{
 const entries=[{...stock('RINV-a','Water','case',100),recorded_at:10},{entry_id:'revision',inventory_id:'RINV-a',record_type:'stock_update',quantity:0,recorded_at:20,resource_type:'Supplies',resource_name:'Water',unit:'case',location:'North station'}];
 const f=fixture(entries);await f.api.refresh();assert.equal(f.api.describe({preset_id:'RINV-a',recorded_at:15}).location,'Warehouse');assert.equal(f.api.describe({preset_id:'RINV-a',recorded_at:25}).location,'North station');
});
test('resource setup opens in a modal and closing it restores the launch control without a write',()=>{
 const f=setupFixture();f.run("setConfiguration(true,'county')");assert.equal(f.get('riManagementDialog').open,true);assert.equal(f.get('riManagementDialog').dataset.page,'county');
 f.run("setCountyAction('revise')");assert.equal(f.get('riManagementDialog').dataset.page,'revise');assert.equal(f.get('riDialogTitle').textContent,'Edit supply details');
 f.run("setConfiguration(false,'county')");assert.equal(f.get('riManagementDialog').open,false);assert.equal(f.get('riCountySetup').focused,true);assert.equal(f.calls.length,0);
});
test('an unconfirmed operation creation resumes its frozen form after closing and reopening the popup',()=>{
 const f=setupFixture(),pending={kind:'operations',row:{operation_id:'ROP-pending'}};f.context.pending=pending;
 f.run("setConfiguration(true,'operations')");assert.equal(f.get('riManagementDialog').dataset.page,'new-operation');assert.equal(f.get('riNewOperation').hidden,false);
 f.run("setConfiguration(false,'operations');setConfiguration(true,'operations')");assert.equal(f.context.pending,pending);assert.equal(f.get('riNewOperation').hidden,false);assert.equal(f.get('riManagementDialog').open,true);
});


test('zero distribution preserves stock and is remembered across reloads for testing',async()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const f=fixture([stock('RINV-a','Water','case',0)]);f.context.window.localStorage=storage;await f.api.refresh();
 await f.api.checkStock([{preset:'RINV-a',quantity:0}]);f.api.remember([{preset:'RINV-a',quantity:0}]);
 const next=fixture([stock('RINV-a','Water','case',0)]);next.context.window.localStorage=storage;await next.api.refresh();next.api.validateSelection();
 assert.equal(next.context.resourceDraftItems[0].quantity,0);
 const balance=next.api.balances([stock('RINV-a','Water','case',10)],[dist('test','RINV-a',0)])[0];assert.equal(balance.issued,0);assert.equal(balance.remaining,10);
});
