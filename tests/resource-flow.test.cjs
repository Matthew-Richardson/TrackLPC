// Run: node --test tests/resource-flow.test.cjs
// Isolated workflow tests with a simulated DOM and ArcGIS API; no live personal data.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),resource=fs.readFileSync('resource.js','utf8');
function fixture(){
 const elements=new Map();let context;
 class Element{
  constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.children=[];this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  set innerHTML(s){for(const m of s.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element())}
  get innerHTML(){return ''} append(x){this.children.push(x);if(!this.value&&x.value)this.value=x.value} replaceChildren(){this.children=[]}
  querySelectorAll(){return []} reportValidity(){return true} scrollIntoView(){} focus(){this.focused=true}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 const doc={getElementById:get,createElement:()=>new Element(),querySelector:()=>get('heading'),querySelectorAll:()=>[],body:{dataset:{}}};
 const calls=[];
 context=vm.createContext({console,document:doc,window:{LPC_RESOURCE_CONFIG:{tableUrl:''},LPCLiveScanner:{stop(){},pause(){},start(){calls.push('scanner')}}},crypto:require('node:crypto').webcrypto,URL,Blob,URLSearchParams,Date,setTimeout,clearTimeout,requestAnimationFrame:f=>f(),titleCase:s=>s,escapeHTML:s=>s,csvCell:s=>String(s),map:{invalidateSize(){}},wedge:{setTarget:x=>calls.push(x)},syncWorkflowButtons(){},closeCardModal(){},loadCardRegistry(){},switchTab(){},refreshAll(){},resetModal(){},closeModal(){get('modal').classList.remove('open')},updateCounts(){},renderTable(){},selLayer:{clearLayers(){}},clearInterval(){}});
 vm.runInContext(`let workflowMode='scan',checkpointZoneConfirmed=true,selZone={id:7,name:'TEST-7',incident:'Exercise'},selZoneId=7,selGeom={},parsedDL=null,operatorName='Test operator',manualAddressTimer=null,addressCheckSequence=0,pData=[],aData=[],logData=[],currentInsideRows=[];`,context);
 vm.runInContext(resource,context);
 const run=s=>vm.runInContext(s,context);
 const loadFunction=(name,next)=>run(html.slice(html.indexOf('function '+name+'('),html.indexOf('function '+next+'(')));
 return {context,get,run,calls,loadFunction};
}
test('all scripts parse, map tab and confirmation markup are absent',()=>{
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 new vm.Script(resource);assert(!html.includes('data-mode="map"'));assert(!html.includes('id="scanZoneWrap"'));assert(html.includes('id="zoneScanBtn"'));
});
test('selecting Resource stays on map; explicit launch starts Resource scanner',()=>{
 const f=fixture();f.loadFunction('setWorkflowMode','openModal');f.loadFunction('openModal','closeModal');
 f.run("setWorkflowMode('resource')");assert(!f.get('modal').classList.contains('open'));assert.equal(f.get('zoneScanBtn').textContent,'Distribute resources');
 f.run('openModal()');assert(f.get('modal').classList.contains('open'));assert.equal(f.get('heading').textContent,'Resource — aid distribution');assert(f.calls.includes('scanner'));
 f.run("setWorkflowMode('scan')");assert(!f.get('modal').classList.contains('open'));assert.equal(f.get('zoneScanBtn').textContent,'Check in');
});
test('item selection comes before scanning and supports custom items and multiple quantities',async()=>{
 const f=fixture();f.run("workflowMode='resource';setupResourceSelection()");
 assert.equal(f.run('resourceDraftItems.length'),1);
 f.get('resourceAddItem').onclick();assert.equal(f.run('resourceDraftItems.length'),2);
 const key=f.run('resourceDraftItems[1].key');
 const preset=f.get('resourceItem'+key+'Preset');preset.value='custom';preset.onchange();
 for(const [field,value] of [['Type','Shelter'],['Name','Cot'],['Unit','each'],['Quantity','3']]){const input=f.get('resourceItem'+key+field);input.value=value;input.oninput()}
 assert(f.run('beginResourceScan()'));assert.equal(f.run('activeResourceItems[1].quantity'),'3');assert.match(f.get('resourceScanSummary').textContent,/3 each Cot/);
 f.run("parsedDL={scanType:'Card',cardId:'LPC-TEST'}");
 for(const [id,val] of [['s1fn','Jane'],['s1ln','Test'],['ai','10 Test St']])f.get(id).value=val;
 await f.run('prepareResourceRecipient()');assert(f.get('resourceSave').disabled);assert.equal(f.get('resourceSave').textContent,'Save 2 items');
 f.run('resetResourceForm()');assert.equal(f.run('resourceDraftItems.length'),2);assert.equal(f.run('activeResourceItems.length'),2);
});
test('empty, incomplete, and zero-quantity selections block the scanner',()=>{
 const f=fixture();f.run("setupResourceSelection();resourceDraftItems=[]");assert.equal(f.run('beginResourceScan()'),false);
 f.run("resourceDraftItems=[newResourceDraft('custom')]");assert.equal(f.run('beginResourceScan()'),false);
 f.run("resourceDraftItems=[{...newResourceDraft(),quantity:0}]");assert.equal(f.run('beginResourceScan()'),false);
 assert(!f.calls.includes('scanner'));
});
test('GIS payload validates quantity and dates and links the shared card',()=>{
 const f=fixture();f.run(`globalThis.fields={id:'test',type:'Water',name:'Case',quantity:'2',unit:'case',date:'2026-10-27T12:00',through:'',phone:'',preset:'water-case',operator:'Test',notes:''}`);
 const a=f.run("resourceAttributes({firstName:'Jane',lastName:'Test',fullAddress:'10 Test St',scanType:'Card'},selZone,fields,'LPC-SHARED')");
 assert.equal(a.card_id,'LPC-SHARED');assert.equal(a.quantity,2);assert.equal(a.zone_id,'7');assert.equal(a.covers_through,null);assert(!('license_num' in a));assert(!('direction' in a));
 assert.throws(()=>f.run("resourceAttributes({},selZone,{...fields,quantity:'0'},'')"),/greater than zero/);
 assert.throws(()=>f.run("resourceAttributes({},selZone,{...fields,through:'2026-10-26T12:00'},'')"),/after the distribution/);
});
function preparedSave(){
 const f=fixture();f.run("window.LPC_RESOURCE_CONFIG.tableUrl='https://example.test/Resource/FeatureServer/0';workflowMode='resource';parsedDL={firstName:'Jane',lastName:'Test',fullAddress:'10 Test St',scanType:'DL'};activeResourceItems=[{...newResourceDraft(),quantity:2},newResourceDraft('food-box')]");
 Object.entries({resourceDate:'2026-10-27T12:00',resourceThrough:'',resourcePhone:'',resourceNotes:''}).forEach(([id,value])=>f.get(id).value=value);
 f.context.getAgolToken=async()=> 'test-token';
 f.context.testMetadata=JSON.parse(fs.readFileSync('resource-table-definition.json','utf8')).tables[0];
 f.run('resourceMetadata=async()=>testMetadata');return f;
}
test('one scan saves multiple items in a batch and creates one shared custom card',async()=>{
 const f=preparedSave();let cardCalls=0;const payloads=[];
 f.context.ensurePersonCard=async input=>{cardCalls++;assert.equal(input.fn,'Jane');return {card:{cardId:'LPC-SHARED',fn:'Jane'},created:true}};
 f.context.fetch=async(url,opts)=>{
  assert(url.startsWith('https://example.test/Resource/'));
  if(url.endsWith('/applyEdits')){
   assert.equal(opts.body.get('rollbackOnFailure'),'true');const adds=JSON.parse(opts.body.get('adds'));payloads.push(...adds);
   return {ok:true,json:async()=>({addResults:adds.map(()=>({success:true}))})};
  }
  return {ok:true,json:async()=>({features:[]})};
 };
 await f.run('saveResourceDistribution({preventDefault(){}})');
 assert.equal(cardCalls,1);assert.equal(payloads.length,2);assert.equal(payloads[0].attributes.quantity,2);
 assert(payloads.every(f=>f.attributes.card_id==='LPC-SHARED'));assert.notEqual(payloads[0].attributes.distribution_id,payloads[1].attributes.distribution_id);
 const schema=JSON.parse(fs.readFileSync('resource-table-definition.json','utf8')).tables[0].fields.filter(f=>f.name!=='OBJECTID').map(f=>f.name).sort();
 for(const feature of payloads)assert.deepEqual(Object.keys(feature.attributes).sort(),schema);
 assert.match(f.get('resourceCardReady').textContent,/Custom card created: LPC-SHARED/);
 assert.equal(f.get('resourceCardResult').hidden,false);assert(f.get('resourceSave').disabled);assert(!f.get('resourceNextPerson').disabled);
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.equal(cardCalls,1);assert.equal(payloads.length,2);
 let printed=false;f.context.printCard=()=>{printed=true};f.get('resourceCardPrint').onclick();assert(printed);assert.equal(f.context.window._lastCard.cardId,'LPC-SHARED');
});
test('uncertain partial batch retry saves only missing items and reuses the card',async()=>{
 const f=preparedSave();let cardCalls=0;const saved=new Set(),batches=[];
 f.context.ensurePersonCard=async()=>{cardCalls++;return {card:{cardId:'LPC-SHARED'},created:false}};
 f.context.fetch=async(url,opts)=>{
  if(url.endsWith('/applyEdits')){
   const adds=JSON.parse(opts.body.get('adds'));batches.push(adds);
   if(batches.length===1){saved.add(adds[0].attributes.distribution_id);throw Error('response lost')}
   adds.forEach(a=>saved.add(a.attributes.distribution_id));return {ok:true,json:async()=>({addResults:adds.map(()=>({success:true}))})};
  }
  if(opts.body.get('outFields')==='distribution_id')return {ok:true,json:async()=>({features:[...saved].map(id=>({attributes:{distribution_id:id}}))})};
  return {ok:true,json:async()=>({features:[]})};
 };
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.match(f.get('resourceStatus').textContent,/not confirmed/);assert(f.get('resourceNextPerson').disabled);
 // Changes while a retry is pending must not change the frozen transaction.
 f.run("activeResourceItems=[newResourceDraft('blanket')]");
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.match(f.get('resourceStatus').textContent,/Saved 2 items/);
 assert.equal(batches.length,2);assert.equal(batches[0].length,2);assert.equal(batches[1].length,1);assert.equal(saved.size,2);
 assert.equal(batches[1][0].attributes.distribution_id,batches[0][1].attributes.distribution_id);
 assert.match(f.get('resourceCardReady').textContent,/Existing custom card ready/);assert.equal(cardCalls,2);
});
test('invalid dates can be corrected without freezing or saving a card',async()=>{
 const f=preparedSave();f.get('resourceDate').value='invalid';let called=false;f.context.ensurePersonCard=async()=>{called=true};
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.match(f.get('resourceStatus').textContent,/valid distribution dates/);assert(!called);assert(!f.get('resourceForm')._pendingResource);
});

function metadataFixture(){return JSON.parse(fs.readFileSync('resource-table-definition.json','utf8')).tables[0]}
test('private service discovery authenticates and resolves its actual table ID',async()=>{
 const f=fixture(),base='https://example.test/Resource/FeatureServer',urls=[];
 f.run(`window.LPC_RESOURCE_CONFIG={serviceUrl:'${base}',tableUrl:''}`);
 f.context.getAgolToken=async()=> 'private-token';
 f.context.fetch=async(url,opts)=>{urls.push(url);assert.equal(opts.body.get('token'),'private-token');return {ok:true,json:async()=>url===base?{tables:[{id:3,name:'LPCOEM_Resource'}]}:metadataFixture()}};
 assert.equal(await f.run('resolveResourceURL()'),base+'/3');
 assert.equal(await f.run('resolveResourceURL()'),base+'/3');assert.equal(urls.length,2);
});
test('schema errors are actionable and metadata failures can be retried',async()=>{
 const f=fixture(),base='https://example.test/Resource/FeatureServer';let wrong=true;
 f.run(`window.LPC_RESOURCE_CONFIG={tableUrl:'${base}/5'}`);f.context.getAgolToken=async()=> 'token';
 f.context.fetch=async()=>({ok:true,json:async()=>{const m=metadataFixture();if(wrong)m.fields.find(x=>x.name==='quantity').type='esriFieldTypeString';return m}});
 await assert.rejects(f.run('resolveResourceURL()'),/quantity \(Double\)/);
 wrong=false;assert.equal(await f.run('resolveResourceURL()'),base+'/5');
});
test('ambiguous service tables require an explicit URL and never guess a table ID',async()=>{
 const f=fixture(),base='https://example.test/Resource/FeatureServer';
 f.run(`window.LPC_RESOURCE_CONFIG={serviceUrl:'${base}'}`);f.context.getAgolToken=async()=> 'token';
 f.context.fetch=async()=>({ok:true,json:async()=>({tables:[{id:1,name:'A'},{id:2,name:'B'}]})});
 await assert.rejects(f.run('resolveResourceURL()'),/exact tableUrl/);
});

test('Resource accepts alternate system ID names and metadata property variants',()=>{
 const f=fixture();
 for(const [fieldName,property] of [['FID','objectIdField'],['ObjectId','objectIdFieldName'],['fid',null]]){
  const metadata=metadataFixture();metadata.fields.find(x=>x.type==='esriFieldTypeOID').name=fieldName;
  delete metadata.objectIdField;if(property)metadata[property]=fieldName;
  f.context.alternateMetadata=metadata;assert.equal(f.run('validateResourceTable(alternateMetadata)'),fieldName);
 }
 const metadata=metadataFixture();metadata.fields=metadata.fields.filter(x=>x.type!=='esriFieldTypeOID');
 f.context.alternateMetadata=metadata;assert.throws(()=>f.run('validateResourceTable(alternateMetadata)'),/valid Object ID field/);
});
test('history uses the discovered system ID for stable pagination ordering',async()=>{
 const f=fixture(),base='https://example.test/Resource/FeatureServer/3',orders=[];
 f.run(`window.LPC_RESOURCE_CONFIG={tableUrl:'${base}'}`);f.context.getAgolToken=async()=> 'token';
 f.context.fetch=async(url,opts)=>{
  if(url===base){const metadata=metadataFixture();delete metadata.objectIdField;metadata.fields.find(x=>x.type==='esriFieldTypeOID').name='FID';return {ok:true,json:async()=>metadata}}
  assert.equal(url,base+'/query');orders.push(opts.body.get('orderByFields'));
  return {ok:true,json:async()=>({features:[]})};
 };
 await f.run('loadResourceHistory()');assert.deepEqual(orders,['distributed_at DESC,FID DESC']);
 assert.match(f.get('resourceHistoryStatus').textContent,/0 resource item records/);
});
