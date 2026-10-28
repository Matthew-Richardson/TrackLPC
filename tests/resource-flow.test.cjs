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
 const quantity=f.get('resourceItem'+key+'Quantity');quantity.value='0';quantity.oninput();f.get('resourceAddItem').onclick();
 assert.equal(f.get('resourceItemRows').children[0].open,false);
 assert.equal(f.run('beginResourceScan()'),false);assert.equal(f.get('resourceItemRows').children[0].open,true);
 assert.match(f.get('resourceSelectionStatus').textContent,/greater than zero/);
});
