// Run: node --test tests/resource-flow.test.cjs
// Isolated workflow tests with a simulated DOM and ArcGIS API; no live personal data.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),resource=fs.readFileSync('resource.js','utf8');
function fixture(){
 const elements=new Map();let context;
 class Element{
  addEventListener(name,fn){(this.listeners??={})[name]=fn}
  constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.children=[];this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  set innerHTML(s){for(const m of s.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element())}
  get innerHTML(){return ''} append(x){this.children.push(x);if(!this.value&&x.value)this.value=x.value} replaceChildren(...nodes){this.children=nodes} appendChild(node){this.children.push(node);return node} setAttribute(name,value){this[name]=value}
  querySelectorAll(){return []} reportValidity(){return true} scrollIntoView(){} focus(){this.focused=true}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 // The Enter button replaced resourceManual; absent elements must return null.
 const doc={getElementById:id=>id==='resourceManual'?null:get(id),createElement:()=>new Element(),createDocumentFragment:()=>new Element(),querySelector:()=>get('heading'),querySelectorAll:()=>[],body:{dataset:{}}};
 const calls=[];
 context=vm.createContext({console,document:doc,window:{LPC_RESOURCE_CONFIG:{tableUrl:''},LPCLiveScanner:{stop(){},pause(){},start(){calls.push('scanner')}}},crypto:require('node:crypto').webcrypto,URL,Blob,URLSearchParams,Date,setTimeout,clearTimeout,requestAnimationFrame:f=>f(),titleCase:s=>s,escapeHTML:s=>s,csvCell:s=>String(s),map:{invalidateSize(){}},wedge:{setTarget:x=>calls.push(x)},syncWorkflowButtons(){},closeCardModal(){},loadCardRegistry(){},fetchLog:async()=>{},switchTab(){},refreshAll(){},setInterval:()=>1,LOG_URL:'https://example.test/checkpoint',computeCurrentInside:()=>[],renderLog(){},renderTableHeader(headers){get('dth').headers=headers},makeElement(tag,options){const node=new Element();node.textContent=options?.text??'';return node},resetModal(){},closeModal(){get('modal').classList.remove('open')},updateCounts(){},renderTable(){},selLayer:{clearLayers(){}},clearInterval(){}});
 vm.runInContext(`let workflowMode='scan',checkpointZoneConfirmed=true,selZone={id:7,name:'TEST-7',incident:'Exercise'},selZoneId=7,selGeom={},parsedDL=null,operatorName='Test operator',manualAddressTimer=null,addressCheckSequence=0,pData=[],aData=[],logData=[],currentInsideRows=[],activeTab='parcels',logTimer=null;`,context);
 vm.runInContext(resource,context);
 const run=s=>vm.runInContext(s,context);
 const loadFunction=(name,next)=>{let start=html.indexOf('function '+name+'(');if(html.slice(start-6,start)==='async ')start-=6;run(html.slice(start,html.indexOf('function '+next+'(')))};
 return {context,get,run,calls,loadFunction};
}
test('all scripts parse, map tab and confirmation markup are absent',()=>{
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 new vm.Script(resource);assert(!html.includes('data-mode="map"'));assert(!html.includes('id="scanZoneWrap"'));assert(html.includes('id="zoneScanBtn"'));
});
test('selecting Resource waits for explicit scanner launch',()=>{
 const f=fixture();f.loadFunction('setWorkflowMode','openModal');f.loadFunction('openModal','closeModal');
 f.run("setWorkflowMode('resource')");assert(!f.get('modal').classList.contains('open'));assert.equal(f.get('zoneScanBtn').textContent,'Scan / Enter');
 f.run('openModal()');assert(f.get('modal').classList.contains('open'));assert.equal(f.get('heading').textContent,'Resource Tracker');assert(f.calls.includes('scanner'));
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
test('empty and incomplete selections block the scanner; explicit zero is accepted',()=>{
 const f=fixture();f.run("setupResourceSelection();resourceDraftItems=[]");assert.equal(f.run('beginResourceScan()'),false);
 f.run("resourceDraftItems=[newResourceDraft('custom')]");assert.equal(f.run('beginResourceScan()'),false);
 assert(!f.calls.includes('scanner'));
 f.run("resourceDraftItems=[{...newResourceDraft(),quantity:0}]");assert.equal(f.run('beginResourceScan()'),true);
});
test('GIS payload validates quantity and dates and links the shared card',()=>{
 const f=fixture();f.run(`globalThis.fields={id:'test',type:'Water',name:'Case',quantity:'2',unit:'case',date:'2026-10-27T12:00',through:'',phone:'',preset:'water-case',operator:'Test',notes:''}`);
 const a=f.run("resourceAttributes({firstName:'Jane',lastName:'Test',fullAddress:'10 Test St',scanType:'Card'},selZone,fields,'LPC-SHARED')");
 assert.equal(a.card_id,'LPC-SHARED');assert.equal(a.quantity,2);assert.equal(a.zone_id,'7');assert.equal(a.covers_through,null);assert(!('license_num' in a));assert(!('direction' in a));
 assert.equal(f.run("resourceAttributes({},selZone,{...fields,quantity:'0'},'')").quantity,0);
 for(const quantity of ['','-1','NaN'])assert.throws(()=>f.run(`resourceAttributes({},selZone,{...fields,quantity:${JSON.stringify(quantity)}},'')`),/zero or greater/);
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
 assert.equal(cardCalls,1);assert.equal(payloads.length,2);assert.equal(payloads[0].attributes.quantity,2);assert.equal(payloads[0].attributes.zone_id,'');assert.equal(payloads[0].attributes.zone_name,'');
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

test('Resource Activity loads and renders distributions without an open scanner modal',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log';window.LPC_RESOURCE_CONFIG={tableUrl:'https://example.test/Resource/FeatureServer/3'}");
 const get=f.context.document.getElementById;f.context.document.getElementById=id=>['resourceHistoryStatus','resourceHistory'].includes(id)?null:get(id);
 f.context.getAgolToken=async()=> 'token';f.context.fetch=async(url)=>({ok:true,json:async()=>url.endsWith('/3')?metadataFixture():{features:[{attributes:{name:'Jane',resource_name:'Water',quantity:2,unit:'case',address:'10 Test',distributed_at:1,zone_id:'7'}}]}});
 await f.run('loadResourceHistory()');assert.equal(f.get('tlc').textContent,'1');assert.equal(f.get('dt').style.display,'');assert.equal(f.get('activityFilters').style.display,'none');
 assert(f.get('dth').headers.includes('Resource'));assert.equal(f.get('dtb').children[0].children.length,1);
 const row=f.get('dtb').children[0].children[0];assert.equal(row.children[1].textContent,'Jane');assert.equal(row.children[3].textContent,2);
 f.get('tsr').value='does not match';f.run('renderResourceActivity()');assert.match(f.get('emp').textContent,/No distributions match/);
});
test('Activity polling and CSV export use Resource data in Resource mode',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log'");let loads=0,exports=0,queries=0;
 f.context.loadResourceHistory=async()=>{loads++};f.context.fetch=async()=>{queries++;throw Error('Checkpoint must not be queried')};f.context.exportResourceHistory=()=>{exports++};
 const start=html.indexOf('async function fetchLog()'),end=html.indexOf('// ---- CHECKPOINT MODAL',start);f.run(html.slice(start,end));
 await f.run('fetchLog()');assert.equal(loads,1);assert.equal(queries,0);
 f.loadFunction('doExport','setLoading');f.run('doExport()');assert.equal(exports,1);
});
test('failed Resource history is shown as an error instead of an empty Activity view',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log';window.LPC_RESOURCE_CONFIG={tableUrl:'https://example.test/Resource/FeatureServer/3'}");
 f.context.resourceMetadata=async()=>metadataFixture();f.context.getAgolToken=async()=> 'token';f.context.fetch=async()=>({ok:true,json:async()=>({error:{message:'Access denied'}})});
 await f.run('loadResourceHistory()');assert.match(f.get('emp').textContent,/Could not load distributions: Access denied/);assert.equal(f.get('dt').style.display,'none');
});
test('touch map scrolling is the default and panning is an explicit toggle',()=>{
 const f=fixture();let dragging=false,zoom=false;
 f.context.matchMedia=()=>({matches:true});f.context.map.dragging={enable(){dragging=true},disable(){dragging=false}};f.context.map.touchZoom={enable(){zoom=true},disable(){zoom=false}};f.context.map.scrollWheelZoom={disable(){}};
 f.run('syncMobileMapInteraction()');assert(!dragging&&!zoom);assert.equal(f.get('map').dataset.pageScroll,'true');
 f.run('toggleMobileMapPan()');assert(dragging&&zoom);assert.equal(f.get('mapPanToggle').textContent,'Scroll page');
 f.run('toggleMobileMapPan()');assert(!dragging&&!zoom);assert.equal(f.get('mapPanToggle').textContent,'Move map');
});

test('Resource scanning and saving require no evacuation zone',async()=>{
 const f=preparedSave();f.loadFunction('openModal','closeModal');
 f.run("selZone=null;selZoneId=null;checkpointZoneConfirmed=false;openModal()");
 assert(f.get('modal').classList.contains('open'));assert.equal(f.get('zoneScanBtn').disabled,false);
 f.run("parsedDL={firstName:'Jane',lastName:'Test',fullAddress:'10 Test',scanType:'DL'}");
 let adds=[];f.context.ensurePersonCard=async()=>({card:{cardId:'LPC-SHARED'},created:true});
 f.context.fetch=async(url,options)=>{if(url.endsWith('/applyEdits')){adds=JSON.parse(options.body.get('adds'));return {ok:true,json:async()=>({addResults:adds.map(()=>({success:true}))})}}return {ok:true,json:async()=>({features:[]})}};
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.equal(adds.length,1);assert.equal(adds[0].attributes.zone_id,'');assert.match(f.get('resourceStatus').textContent,/Saved 1 item/);
});
test('Resource history includes prior zoned records and filters by resource type',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log';selZone=null;window.LPC_RESOURCE_CONFIG={tableUrl:'https://example.test/Resource/FeatureServer/3'}");
 f.context.resourceMetadata=async()=>metadataFixture();f.context.getAgolToken=async()=> 'token';
 f.context.fetch=async(url,options)=>{assert.equal(options.body.get('where'),'1=1');return {ok:true,json:async()=>({features:[{attributes:{name:'Jane',resource_name:'Water case',resource_type:'Water',quantity:1,unit:'case',zone_id:'7'}},{attributes:{name:'John',resource_name:'Food box',resource_type:'Food',quantity:1,unit:'box',zone_id:''}}]})}};
 await f.run('loadResourceHistory()');assert.equal(f.get('tlc').textContent,'2');assert.equal(f.get('dtb').children[0].children.length,2);
 f.get('resourceActivityType').value='Water';f.run('renderResourceActivity()');assert.equal(f.get('dtb').children[0].children.length,1);assert.equal(f.get('dtb').children[0].children[0].children[1].textContent,'Jane');
});

test('zone catalog loads from Esri FeatureLayer without a group getBounds method',()=>{
 const f=fixture();f.context.zoneLabelLayer={clearLayers(){}};let fits=0,extended=0;
 f.context.map.fitBounds=()=>fits++;
 const layer={feature:{properties:{OBJECTID:7,zonename:'TEST-7'}},getBounds:()=>({getCenter:()=>[37,-108]})};
 f.context.evacLayer={eachFeature:fn=>fn(layer)};
 f.context.L={latLngBounds:()=>({extend(){extended++},isValid:()=>extended>0}),divIcon:x=>x,marker:()=>({addTo(){}})};
 f.run('let zones=[],zoneLabelLayer=globalThis.zoneLabelLayer;selZoneId=null;selLayer={clearLayers(){},addData(){}};');
 const start=html.indexOf('function rebuildZoneCatalog('),end=html.indexOf("evacLayer.once('load'",start);
 f.run(html.slice(start,end));f.run('rebuildZoneCatalog({fit:true})');
 assert.equal(fits,1);assert.equal(extended,1);assert.equal(f.run('zones.length'),1);
 assert.equal(f.get('zs').children.length,2);
 f.run("workflowMode='resource';rebuildZoneCatalog()");assert.equal(f.get('zoneScanBtn').disabled,false);
});

test('real Check-in form resets, opens, verifies typed addresses, and advances to IN/OUT',async()=>{
 const f=fixture();
 // Resolve only actual HTML IDs: do not invent missing controls for this path.
 const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
 f.context.document.getElementById=id=>ids.has(id)?f.get(id):null;
 f.run('let lastCheck=null,selectedDir=null,scanMarker=null;');
 f.loadFunction('resetModal','startNextCheckpointScan');f.loadFunction('openModal','closeModal');
 f.loadFunction('doCheck','showS1');f.loadFunction('showS1','overrideZoneCheck');f.loadFunction('goStep2','pickDir');
 f.context.map.removeLayer=()=>{};f.context.GEOCODE_URL='https://example.test/geocode';f.context.pip=()=>true;
 f.context.L={circleMarker:()=>({addTo(){return this}})};f.context.renderKeyValueRows=()=>{};
 f.context.fetch=async()=>({json:async()=>({candidates:[{location:{x:-108,y:37},attributes:{Match_addr:'10 Test St',Score:100}}]})});
 f.run('openModal()');assert(f.get('modal').classList.contains('open'));
 assert.equal(f.get('manualAddressEnter').hidden,true);
 f.get('s1fn').value='Jane';f.get('s1ln').value='Test';f.get('ai').value='10 Test St';
 await f.run('doCheck()');assert.equal(f.get('s1').style.display,'none');assert.equal(f.get('s2').style.display,'');
 assert.equal(f.run('parsedDL.scanType'),'Manual');
 f.run('resetModal({resumeScanner:false})');assert.equal(f.get('s1').style.display,'');assert.equal(f.get('s2').style.display,'none');
 // Outside-zone addresses stay at step 1 for review instead of proceeding.
 f.context.pip=()=>false;f.get('ai').value='20 Outside St';await f.run('doCheck()');
 assert.equal(f.get('s2').style.display,'none');assert.equal(f.get('zoneOverrideBtn').style.display,'');
 assert.equal(f.get('modal').dataset.addressReview,'true');assert.equal(f.get('ss').textContent,'');
 f.run(html.slice(html.indexOf('const manualAddressInput='),html.indexOf('// ---- STEP 2 ----')));
 f.get('ai').listeners.input();assert.equal(f.get('modal').dataset.addressReview,'false');assert.equal(f.get('zoneOverrideBtn').style.display,'none');
});


test('typed addresses wait for explicit Enter and work in both Check-in and Resource',async()=>{
 for(const mode of ['scan','resource']){
  const f=fixture();let submitted=0;
  f.run("workflowMode='"+mode+"';let lastCheck=null;");
  f.context.doCheck=async()=>{submitted++};f.context.hideS1ResolutionActions=()=>{};
  f.run(html.slice(html.indexOf('const manualAddressInput='),html.indexOf('// ---- STEP 2 ----')));
  f.get('ai').value='10 Test St';f.get('ai').listeners.input();
  assert.equal(submitted,0);assert.equal(f.get('manualAddressEnter').hidden,false);
  assert.equal(f.get('ai').listeners.blur,undefined);
  await f.get('manualAddressEnter').listeners.click();assert.equal(submitted,1);
  f.get('ai').listeners.keydown({key:'Enter',preventDefault(){}});await Promise.resolve();assert.equal(submitted,2);
  f.get('ai').value='';f.get('ai').listeners.input();assert.equal(f.get('manualAddressEnter').hidden,true);
 }
});

test('adding a resource collapses earlier items, keeps their values, and permits reopening',()=>{
 const f=fixture();f.run('setupResourceSelection()');
 const first=f.run('resourceDraftItems[0].key');
 f.get('resourceItem'+first+'Quantity').value='3';f.get('resourceItem'+first+'Quantity').oninput();
 f.get('resourceAddItem').onclick();
 let rows=f.get('resourceItemRows').children;assert.equal(rows[0].open,false);assert.equal(rows[1].open,true);
 assert.equal(f.get('resourceItem'+first+'Summary').textContent,'3 case Bottled water case');
 rows[0].open=true;rows[0].ontoggle();f.run('renderResourceDraftItems()');
 assert.equal(f.get('resourceItemRows').children[0].open,true);assert.equal(f.get('resourceItem'+first+'Quantity').value,'3');
 f.get('resourceAddItem').onclick();rows=f.get('resourceItemRows').children;
 assert.deepEqual(rows.map(row=>row.open),[false,false,true]);
});
test('incomplete collapsed resources reopen for correction before scanning',()=>{
 const f=fixture();f.run('setupResourceSelection()');const key=f.run('resourceDraftItems[0].key');
 const quantity=f.get('resourceItem'+key+'Quantity');quantity.value='-1';quantity.oninput();f.get('resourceAddItem').onclick();
 assert.equal(f.get('resourceItemRows').children[0].open,false);
 assert.equal(f.run('beginResourceScan()'),false);assert.equal(f.get('resourceItemRows').children[0].open,true);
 assert.match(f.get('resourceSelectionStatus').textContent,/zero or greater/);
});

test('opening a registry card previews it without starting a print job',async()=>{
 const f=fixture();let shown=null,prints=0;
 f.context.resetCardModal=()=>{};f.context.switchCardView=()=>{};
 f.context.showCardPreview=async card=>{shown=card};f.context.printCard=async()=>{prints++};
 f.run(html.slice(html.indexOf('async function viewRegistryCard('),html.indexOf('async function generateCard(')));
 f.context.card={fn:'Jane',ln:'Example',addr:'10 Test St',phone:'',reason:'',cardId:'LPC-TEST'};
 await f.run('viewRegistryCard(card)');assert.equal(shown.cardId,'LPC-TEST');assert.equal(prints,0);
});
test('full-screen display uses the rendered card image without printing or changing the card',()=>{
 const f=fixture();let opened=0;
 f.get('cardPrintPreview').width=638;f.get('cardPrintPreview').height=1013;
 f.get('cardPrintPreview').toDataURL=()=> 'data:image/png;base64,TEST';
 f.get('cardDisplay').showModal=()=>{opened++;f.get('cardDisplay').open=true};
 f.run(html.slice(html.indexOf('function openCardDisplay('),html.indexOf('async function viewRegistryCard(')));
 f.run("openCardDisplay('cardPrintPreview')");assert.equal(opened,1);
 assert.equal(f.get('cardDisplayImage').src,'data:image/png;base64,TEST');
 f.run("openCardDisplay('cardPrintPreview')");assert.equal(opened,1);
});

test('SAR dialogs use the visible keyboard viewport and reset after dismissal',()=>{
 const sar=fs.readFileSync('sar.js','utf8');new vm.Script(sar);
 const properties={},root={clientHeight:667,dataset:{},style:{setProperty:(key,value)=>properties[key]=value}};
 const viewport={height:340,offsetTop:70,addEventListener(){}};
 const context=vm.createContext({window:{visualViewport:viewport,innerHeight:667,addEventListener(){}},document:{documentElement:root,activeElement:{matches:()=>true},addEventListener(){}},requestAnimationFrame(){}});
 vm.runInContext(sar.slice(sar.indexOf('let viewportFrame=null;'),sar.indexOf("window.addEventListener('pagehide'")),context);
 assert.equal(properties['--sar-viewport-height'],'340px');assert.equal(properties['--sar-viewport-top'],'70px');assert.equal(root.dataset.sarKeyboard,'true');
 viewport.height=667;viewport.offsetTop=0;vm.runInContext('syncSARViewport()',context);
 assert.equal(properties['--sar-viewport-height'],'667px');assert.equal(properties['--sar-viewport-top'],'0px');assert.equal(root.dataset.sarKeyboard,'false');
});


test('the previous check-in confirmation appears once when preparing the next scan',()=>{
 const f=fixture();f.run('let lastCheck=null,selectedDir=null;');f.loadFunction('resetModal','startNextCheckpointScan');
 f.run("resetModal({resumeScanner:false,statusText:'Saved IN — Jane Example'})");
 assert.equal(f.get('ss').textContent,'Saved IN — Jane Example');
 assert(!f.get('wedgeStatusCP').textContent.includes('Saved IN'));
 assert.equal(f.get('modal').dataset.addressReview,'false');
});

function sarFlowFixture(){
 const f=fixture(),sar=fs.readFileSync('sar.js','utf8');
 const m={member_id:'SAR-MEM-test',name:'Jane Example',division:'Ground',status:'Active'},evt={event_id:'SAR-EVT-test',status:'Open'};
 f.context.state={tab:'events',preview:true,members:[m],memberId:m.member_id,direction:'',loading:false,attendanceReady:true,busy:false,pending:null};
 f.context.$=f.get;f.context.member=()=>f.context.state.members.find(x=>x.member_id===f.context.state.memberId);f.context.event=()=>evt;
 f.context.enabled=()=>true;f.context.currentMap=()=>new Map();f.context.setScanTarget=()=>{};f.context.stopCamera=()=>{};f.context.feedback=()=>{};f.context.openCheck=()=>{};f.context.loadAttendance=async()=>{};
 f.get('sarEventDetail').querySelector=()=>null;f.get('sarSelectedEventTools').querySelector=()=>null;f.get('sarCheckModal').contains=()=>false;f.context.startCheckCamera=()=>{};
 f.context.document.body.dataset.system='sar';
 f.run(sar.slice(sar.indexOf('function updatePicked('),sar.indexOf('function renderMembers(')));
 return {...f,sar,m,evt};
}
test('SAR direction selection requires an explicit Save and respects current attendance',()=>{
 const f=sarFlowFixture();let writes=0;f.context.record=()=>writes++;
 f.run("setCheckStep('review')");assert.equal(f.get('sarCheckModal').dataset.step,'review');assert.equal(f.get('sarSaveAttendance').disabled,true);
 f.run("pickDirection('IN')");assert.equal(writes,0);assert.equal(f.get('sarSaveAttendance').disabled,false);assert.equal(f.context.state.direction,'IN');
 f.run("pickDirection('OUT')");assert.equal(f.context.state.direction,'IN');assert.equal(writes,0);
 f.context.currentMap=()=>new Map([[f.m.member_id,{direction:'IN'}]]);f.run('updatePicked()');
 assert.equal(f.context.state.direction,'');assert.equal(f.get('sarInBtn').disabled,true);assert.equal(f.get('sarOutBtn').disabled,false);assert.equal(f.get('sarSaveAttendance').disabled,true);
 f.run("pickDirection('OUT')");assert.equal(f.get('sarSaveAttendance').disabled,false);assert.equal(writes,0);
});
test('SAR scanning advances to review without saving; next member resets direction and notes',async()=>{
 const f=sarFlowFixture();let writes=0;f.context.record=()=>writes++;
 f.run(f.sar.slice(f.sar.indexOf('async function scan(raw)'),f.sar.indexOf('async function record(direction)')));
 f.context.raw=JSON.stringify({t:'sar-member',id:f.m.member_id});
 await f.run('scan(raw)');assert.equal(f.get('sarCheckModal').dataset.step,'review');assert.equal(f.get('sarSaveAttendance').disabled,true);assert.equal(writes,0);
 f.run("pickDirection('IN')");f.get('sarAttendanceNotes').value='Unsaved note';f.run('resetCheckin()');
 assert.equal(f.get('sarCheckModal').dataset.step,'identify');assert.equal(f.context.state.direction,'');assert.equal(f.get('sarAttendanceNotes').value,'');assert.equal(f.get('sarReviewStep').hidden,true);
});

test('SAR event-configuration feedback stays visible outside the check-in popup',()=>{
 const f=fixture(),sar=fs.readFileSync('sar.js','utf8');f.context.$=f.get;
 f.run(sar.slice(sar.indexOf('function feedback('),sar.indexOf('function sql(')));
 f.run("feedback('Check out remaining members first.',true)");assert.equal(f.get('sarEventFeedback').textContent,'Check out remaining members first.');
 f.get('sarCheckModal').classList.add('open');f.run("feedback('Attendance saved.')");assert.equal(f.get('sarFeedback').textContent,'Attendance saved.');
});

test('SAR opening check-in requests the camera once and review never restarts it',()=>{
 const f=sarFlowFixture();let requests=0;
 f.context.toggleCamera=()=>{requests++};f.get('sarCheckModal').querySelector=()=>f.get('closeButton');
 f.run('let cameraStream=null;');
 f.run(f.sar.slice(f.sar.indexOf('function startCheckCamera('),f.sar.indexOf('function closeForms(')));
 f.run('openCheck()');assert.equal(requests,1);assert.equal(f.get('sarCheckModal').dataset.step,'identify');
 f.run('openCheck()');assert.equal(requests,1);
 f.run("setCheckStep('review');startCheckCamera()");assert.equal(requests,1);
 f.get('sarCheckModal').classList.remove('open');f.run('startCheckCamera()');assert.equal(requests,1);
});
test('closing a SAR event collapses its configuration and closed-event history',async()=>{
 const f=sarFlowFixture();f.context.state.events=[f.evt];f.context.render=()=>{};
 f.get('sarEventConfig').open=true;f.get('sarClosedEvents').open=true;
 f.run(f.sar.slice(f.sar.indexOf('async function toggleEvent('),f.sar.indexOf('function openMember(')));
 await f.run('toggleEvent()');assert.equal(f.context.state.events[0].status,'Closed');
 assert.equal(f.get('sarEventConfig').open,false);assert.equal(f.get('sarClosedEvents').open,false);
});


test('SAR configuration minimizes when an event is selected and stays open only when requested',()=>{
 const f=sarFlowFixture();
 f.run(f.sar.slice(f.sar.indexOf('function syncEventConfiguration('),f.sar.indexOf('function eventButtons(')));
 f.get('sarEventConfig').open=true;f.run('syncEventConfiguration()');assert.equal(f.get('sarEventConfig').open,false);
 f.get('sarEventConfig').open=true;f.run('syncEventConfiguration()');assert.equal(f.get('sarEventConfig').open,true);
 f.context.event=()=>({event_id:'SAR-EVT-another'});f.run('syncEventConfiguration()');assert.equal(f.get('sarEventConfig').open,false);
 f.context.event=()=>null;f.run('syncEventConfiguration()');assert.equal(f.get('sarEventConfig').open,true);
});

// Exercise the actual Zebra HID keyboard listener, rather than calling camera handlers.
function zebraFixture(target='checkpoint'){
 let now=1000,nextTimer=0,listener;const timers=new Map(),calls=[],elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',className:''});return elements.get(id)};
 const input={tagName:'INPUT',type:'text',value:'Existing '};
 const context=vm.createContext({console,Date:{now:()=>now},document:{activeElement:input,getElementById:get,addEventListener:(type,fn)=>{if(type==='keydown')listener=fn}},setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,at:now+delay});return nextTimer},clearTimeout:id=>timers.delete(id),window:{SAR:{scan:async raw=>calls.push(['sar',raw])},LPCLiveScanner:{pause:()=>calls.push(['camera-pause'])}},applyCheckpointDL:async p=>calls.push(['checkpoint-dl',p]),beginIncomingCardScan:()=>calls.push(['card-reset']),populateCustomCardFromDL:p=>calls.push(['card-dl',p]),advanceCardAfterScan:t=>calls.push(['card-advance',t]),resetModal:()=>calls.push(['checkpoint-reset']),getApprovedCard:async q=>{calls.push(['registry',q.id]);return {firstName:'Test',lastName:'Member',fullAddress:'10 Test St',phone:'5551234567',reason:'Exercise'}},showParsed:()=>{},titleCase:s=>s,doCheck:async options=>calls.push(['checkpoint-review',options])});
 vm.runInContext(html.slice(html.indexOf('function parseAAMVA('),html.indexOf('function buildAddrString(')),context);
 vm.runInContext(html.slice(html.indexOf('const wedge=(function(){'),html.indexOf('// ---- CUSTOM CARD MODAL ----')),context);
 vm.runInContext(`wedge.setTarget(${JSON.stringify(target)})`,context);
 function key(key,gap=5){now+=gap;let prevented=false;listener({key,preventDefault(){prevented=true},stopPropagation(){}});if(!prevented&&key.length===1)input.value+=key;return prevented}
 async function finish(){now+=1000;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn()}for(let i=0;i<12;i++)await Promise.resolve()}
 return {calls,input,get,key,finish,run:s=>vm.runInContext(s,context),async scan(raw,suffix='Enter'){for(const c of raw)key(c==='\n'?'Enter':c==='\t'?'Tab':c);if(suffix)key(suffix);await finish()}};
}
const zebraDL='X@\nANSI 636020090002DL00410288ZA03290015\nDAQTEST123\nDCSMEMBER\nDACTEST\nDADPERSON\nDAG10 TEST ST\nDAIDURANGO\nDAJCO\nDAK813010000\n';
for(const target of ['checkpoint','card'])for(const suffix of ['Enter','Tab','']){
 test(`Zebra ${target}: multiline prefixed DL with ${suffix||'idle'} terminator`,async()=>{
  const f=zebraFixture(target);await f.scan(zebraDL,suffix);const result=f.calls.find(c=>c[0]===(target==='card'?'card-dl':'checkpoint-dl'));
  assert(result);assert.equal(result[1].firstName,'TEST');assert.equal(result[1].lastName,'MEMBER');assert.equal(result[1].street,'10 TEST ST');assert.equal(f.input.value,'Existing ');
  assert.equal(f.calls.filter(c=>c[0]===result[0]).length,1);
 });
 test(`Zebra ${target}: prefixed approved LPC QR with ${suffix||'idle'} terminator`,async()=>{
  const f=zebraFixture(target);await f.scan('P01'+JSON.stringify({t:'card',id:'LPC-TEST-12345'}),suffix);
  assert(f.calls.some(c=>c[0]==='registry'));assert(f.calls.some(c=>c[0]===(target==='card'?'card-advance':'checkpoint-review')));assert.equal(f.input.value,'Existing ');
  assert.equal(f.get(target==='card'?'caddr':'ai').value,'10 Test St');
 });
}
for(const suffix of ['Enter','Tab',''])test(`Zebra SAR member QR routes with ${suffix||'idle'} terminator`,async()=>{
 const f=zebraFixture('sar'),raw=JSON.stringify({t:'sar-member',id:'SAR-MEM-test-12345678'});await f.scan('P01'+raw,suffix);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'sar');assert.equal(f.calls[0][1],raw);assert.equal(f.input.value,'Existing ');
});
test('Zebra target changes discard unfinished scans and closed workflows ignore scans',async()=>{
 const f=zebraFixture();for(const c of zebraDL.slice(0,30))f.key(c);f.run('wedge.setTarget(null)');await f.finish();assert.equal(f.calls.length,0);
 await f.scan(zebraDL);assert.equal(f.calls.length,0);
 f.run("wedge.setTarget('card')");f.input.value='Existing ';await f.scan(zebraDL);assert(f.calls.some(c=>c[0]==='card-dl'));assert(!f.calls.some(c=>c[0]==='checkpoint-dl'));
});
test('Zebra listener preserves ordinary typing and Enter/Tab behavior',async()=>{
 const f=zebraFixture();for(const c of 'Jane')assert.equal(f.key(c,120),false);assert.equal(f.key('Enter',120),false);assert.equal(f.key('Tab',120),false);await f.finish();assert.equal(f.input.value,'Existing Jane');assert.equal(f.calls.length,0);
});
test('Zebra route arms on Resource/Checkpoint launch and clears on closing',()=>{
 const f=fixture();f.loadFunction('openModal','closeModal');f.run(html.slice(html.indexOf('function closeModal('),html.indexOf('let manualAddressTimer=')));
 f.run("workflowMode='resource';setupResourceSelection();openModal()");assert(f.calls.includes('checkpoint'));
 f.run('closeModal()');assert.equal(f.calls.at(-1),null);
 f.run("workflowMode='scan';openModal()");assert(f.get('modal').classList.contains('open'));assert.equal(f.calls.filter(c=>c==='checkpoint').length,2);
});
test('Zebra SAR routing arms only during identification in an open event',()=>{
 const f=sarFlowFixture();let blocked=false;f.context.document.querySelector=()=>blocked?{}:null;
 f.run(f.sar.slice(f.sar.indexOf('function setScanTarget('),f.sar.indexOf('function stopCamera(')));
 const check=expected=>{f.run('setScanTarget()');assert.equal(f.calls.at(-1),expected)};
 f.get('sarCheckModal').classList.add('open');f.get('sarCheckModal').dataset.step='identify';check('sar');
 f.get('sarCheckModal').dataset.step='review';check(null);
 f.get('sarCheckModal').dataset.step='identify';blocked=true;check(null);blocked=false;
 f.evt.status='Closed';check(null);f.evt.status='Open';check('sar');
 f.get('sarCheckModal').classList.remove('open');check(null);
 f.get('sarCheckModal').classList.add('open');f.context.document.body.dataset.system='evac';check(null);
});
test('tracked Resource lines persist stock and operation IDs using existing GIS fields',()=>{
 const f=fixture();f.run("person={firstName:'Jane',lastName:'Test',fullAddress:'10 Test',scanType:'Manual'};fields={id:'dist-test',type:'Water',name:'Cases',unit:'case',quantity:2,date:'2026-10-28T12:00',through:'',phone:'',notes:'',operator:'Test',preset:'RINV-stock',operationId:'ROP-operation'}");
 const a=f.run("resourceAttributes(person,{id:'',name:'',incident:''},fields,'LPC-TEST')");assert.equal(a.preset_id,'RINV-stock');assert.equal(a.incident,'ROP-operation');assert.equal(a.quantity,2);
});
test('insufficient inventory permits editing before a distribution write has started',async()=>{
 const f=preparedSave();let writes=0,cards=0;f.context.window.LPCInventory={checkStock:async()=>{throw Error('Not enough supply')},render(){}};
 f.context.ensurePersonCard=async()=>{cards++};f.context.fetch=async(url)=>{if(url.endsWith('/applyEdits'))writes++;return {ok:true,json:async()=>({features:[]})}};
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.equal(writes,0);assert.equal(cards,0);assert.equal(f.get('resourceForm')._pendingResource,undefined);assert.equal(f.get('resourceNextPerson').disabled,false);assert.equal(f.get('resourceSave').disabled,false);assert.match(f.get('resourceStatus').textContent,/Not enough supply/);
});
test('inventory retries check stock for only missing distribution lines',async()=>{
 const f=preparedSave(),saved=new Set(),checks=[];let batches=0;
 f.context.window.LPCInventory={checkStock:async items=>checks.push(items.length),render(){}};f.context.ensurePersonCard=async()=>({card:{cardId:'LPC-TEST'},created:false});
 f.context.fetch=async(url,opts)=>{if(url.endsWith('/applyEdits')){const adds=JSON.parse(opts.body.get('adds'));batches++;if(batches===1){saved.add(adds[0].attributes.distribution_id);throw Error('lost response')}return {ok:true,json:async()=>({addResults:adds.map(()=>({success:true}))})}}
 return {ok:true,json:async()=>({features:opts.body.get('outFields')==='distribution_id'?[...saved].map(id=>({attributes:{distribution_id:id}})):[]})}};
 await f.run('saveResourceDistribution({preventDefault(){}})');await f.run('saveResourceDistribution({preventDefault(){}})');assert.deepEqual(checks,[2,1]);assert.equal(f.get('resourceForm').dataset.saved,'true');
});
test('tracked resource check-in opens with no items and defers resource choice until recipient review',()=>{
 const f=fixture();f.context.window.LPCInventory={enabled:()=>true,mount(){},validateSelection:options=>assert.equal(options.allowEmpty,true)};
 f.run("workflowMode='resource';setupResourceSelection();resourceDraftItems=[]");assert.equal(f.run('beginResourceScan()'),true);assert.equal(f.run('activeResourceItems.length'),0);assert.match(f.get('resourceScanSummary').textContent,/after scanning/);
});
test('Resource Activity badge matches visible operation rows and updates for search and empty results',()=>{
 const f=fixture();let operation='ROP-open';f.context.window.LPCInventory={filterRows:rows=>rows.filter(r=>r.incident===operation),enabled:()=>false,render(){}};
 f.run("workflowMode='resource';activeTab='log';resourceHistoryState='ready';resourceRows=[{incident:'ROP-open',name:'Jane',resource_type:'Water'},{incident:'ROP-open',name:'Pat',resource_type:'Food'},{incident:'ROP-closed',name:'Alex',resource_type:'Water'}]");
 f.run('renderResourceHistory()');assert.equal(f.get('tlc').textContent,'2');assert.equal(f.get('dtb').children[0].children.length,2);
 f.get('tsr').value='Jane';f.run('renderResourceActivity()');assert.equal(f.get('tlc').textContent,'1');assert.equal(f.get('dtb').children[0].children.length,1);
 f.get('tsr').value='';operation='ROP-closed';f.run('renderResourceHistory()');assert.equal(f.get('tlc').textContent,'1');
 operation='ROP-empty';f.run('renderResourceHistory()');assert.equal(f.get('tlc').textContent,'0');assert.equal(f.get('dt').style.display,'none');assert.equal(f.get('dtb').children.length,0);
});
test('background Resource refresh keeps the last confirmed rows and Activity number until replacement data arrives',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log';resourceHistoryState='ready';resourceRows=[{name:'A'},{name:'B'}];window.LPC_RESOURCE_CONFIG.tableUrl='https://example.test/Resource/FeatureServer/0'");
 f.context.resourceMetadata=async()=>metadataFixture();f.context.getAgolToken=async()=> 'token';let release;f.context.fetch=async()=>new Promise(resolve=>{release=resolve});
 f.run('renderResourceHistory()');assert.equal(f.get('tlc').textContent,'2');const refresh=f.run('loadResourceHistory()');
 for(let i=0;i<10;i++)await Promise.resolve();assert.equal(f.run('resourceHistoryState'),'refreshing');assert.equal(f.get('tlc').textContent,'2');assert.equal(f.get('dt').style.display,'');
 release({ok:true,json:async()=>({features:[{attributes:{name:'A'}},{attributes:{name:'B'}},{attributes:{name:'C'}}]})});await refresh;assert.equal(f.get('tlc').textContent,'3');assert.equal(f.run('resourceHistoryState'),'ready');
});
test('checkpoint zone selection cannot clear Resource activity or overwrite its row count',async()=>{
 const f=fixture();f.run("workflowMode='resource';activeTab='log';resourceHistoryState='ready';resourceRows=[{name:'A'},{name:'B'}];let zones=[{id:7,name:'Test zone',feature:{geometry:{}}}]");
 f.context.EVAC_URL='https://example.test/evac';f.context.setLoading=()=>{};f.context.selLayer.addData=()=>{};f.context.renderLog=()=>f.run('renderResourceActivity()');f.context.fetch=async()=>({json:async()=>({features:[]})});
 let clears=0;f.context.clearResourceActivity=()=>clears++;f.run('renderResourceHistory()');
 f.run(html.slice(html.indexOf('async function selectZone('),html.indexOf('async function spQ(')));await f.run('selectZone(7,{fit:false})');
 assert.equal(clears,0);assert.equal(f.run('resourceRows.length'),2);assert.equal(f.get('tlc').textContent,'2');
});


test('OEM and SAR card renderers produce opaque binary monochrome at native card resolution',()=>{
 const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,232,30,44,255,102,119,151,255,136,136,136,255,248,250,252,255,0,0,0,0]);
 let written;const ctx={getImageData:()=>({data:pixels}),putImageData:image=>written=image};
 const canvas={width:7,height:1,getContext:()=>ctx};
 const start=html.indexOf('function monochromeCardCanvas('),end=html.indexOf('window.monochromeCardCanvas=',start);
 const context=vm.createContext({canvas});vm.runInContext(html.slice(start,end),context);
 assert.equal(vm.runInContext('monochromeCardCanvas(canvas)',context),canvas);
 assert(written);assert.deepEqual([...pixels],[0,0,0,255,255,255,255,255,0,0,0,255,0,0,0,255,0,0,0,255,255,255,255,255,255,255,255,255]);
 assert.match(html,/resolve\(monochromeCardCanvas\(canvas\)\)/);
 assert.match(fs.readFileSync('sar.js','utf8'),/return window.monochromeCardCanvas\(canvas\)/);
});


function phoneFixture(){
 const handlers={},context=vm.createContext({document:{addEventListener:(name,handler)=>handlers[name]=handler}});
 vm.runInContext(html.slice(html.indexOf('function formatPhoneNumber('),html.indexOf('function phoneLink(')),context);
 const input={type:'tel',value:'',selectionStart:0,selectionEnd:0,setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end}};
 return {input,handlers,format:value=>{context.raw=value;return vm.runInContext('formatPhoneNumber(raw)',context)}};
}
test('phone fields format progressively, preserve international numbers and extensions, and remain optional',()=>{
 const f=phoneFixture();
 for(const [raw,expected] of [['',''],['9','(9'],['970','(970'],['9707','(970) 7'],['970749','(970) 749'],['9707495273','(970) 749-5273'],['19707495273','+1 (970) 749-5273'],['+','+'],['+1','+1'],['+1970','+1 (970'],['+44 20 7946 0958','+44 20 7946 0958'],['9707495273 ext 2','9707495273 ext 2'],['123456789012','123456789012']])assert.equal(f.format(raw),expected,raw);
});
test('delegated phone formatting handles typing, paste, edits, deletion, and dynamically created fields',()=>{
 const {input,handlers}=phoneFixture();
 for(const digit of '9707495273'){input.value+=digit;input.selectionStart=input.selectionEnd=input.value.length;handlers.input({target:input});}
 assert.equal(input.value,'(970) 749-5273');assert.equal(input.selectionStart,input.value.length);
 input.value='(970) 849-5273';input.selectionStart=input.selectionEnd=7;handlers.input({target:input});assert.equal(input.selectionStart,7);
 input.value='9707495273';input.selectionStart=input.selectionEnd=10;handlers.input({target:input});assert.equal(input.value,'(970) 749-5273');
 while(input.value){input.value=input.value.slice(0,-1);input.selectionStart=input.selectionEnd=input.value.length;handlers.input({target:input});}
 assert.equal(input.value,'');
 const dynamic={...input,value:'9707495273',selectionStart:null,selectionEnd:null};handlers.focusin({target:dynamic});assert.equal(dynamic.value,'(970) 749-5273');
 const text={...input,type:'text',value:'9707495273'};handlers.input({target:text});assert.equal(text.value,'9707495273');
 input.value='9707';handlers.input({target:input,isComposing:true});assert.equal(input.value,'9707');
});

test('OEM and SAR tables cap at 20 measured rows and remove the cap when filters shorten the list',()=>{
 let count=25,callback;const watched=[],wrap={style:{},classList:{add(){}},hasAttribute:()=>false,setAttribute(){}};
 const table={parentElement:wrap,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:100}),querySelectorAll:()=>Array.from({length:count},(_,i)=>({getBoundingClientRect:()=>({bottom:130+(i+1)*40})}))};
 const context=vm.createContext({WeakSet,Math,ResizeObserver:class{constructor(fn){callback=fn}observe(t){watched.push(t)}},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>{callback=fn},window:{addEventListener(){}},document:{body:{},addEventListener(){},querySelectorAll:selector=>{assert.match(selector,/sar-table-wrap/);assert.match(selector,/\.tw/);return [table]}}});
 const start=html.indexOf('// Bound long tables'),end=html.indexOf('</script>',start);vm.runInContext(html.slice(start,end),context);callback();
 assert.equal(wrap.style.maxHeight,'830px');assert.equal(wrap.tabIndex,0);assert.equal(watched.length,1);
 count=20;callback();assert.equal(wrap.style.maxHeight,'');
});
