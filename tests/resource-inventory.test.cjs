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
