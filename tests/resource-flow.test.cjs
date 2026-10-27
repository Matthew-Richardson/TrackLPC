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
  querySelectorAll(){return []} reportValidity(){return true} focus(){this.focused=true}
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
test('presets, custom fields, and unconfigured save guard',async()=>{
 const f=fixture();f.run("workflowMode='resource';parsedDL={scanType:'Card',cardId:'LPC-TEST'}");
 for(const [id,val] of [['s1fn','Jane'],['s1ln','Test'],['ai','10 Test St']])f.get(id).value=val;
 // Simulate the first option selected by a browser.
 f.get('resourcePreset').value='water-case';
 await f.run('prepareResourceRecipient()');assert.equal(f.get('resourceQuantity').value,1);assert(f.get('resourceSave').disabled);assert.equal(f.get('resourcePanel').hidden,false);
 f.get('resourcePreset').value='custom';f.run('applyResourcePreset()');assert.equal(f.get('resourceName').value,'');
});
test('GIS payload validates quantity and dates and links the shared card',()=>{
 const f=fixture();f.run(`globalThis.fields={id:'test',type:'Water',name:'Case',quantity:'2',unit:'case',date:'2026-10-27T12:00',through:'',phone:'',preset:'water-case',operator:'Test',notes:''}`);
 const a=f.run("resourceAttributes({firstName:'Jane',lastName:'Test',fullAddress:'10 Test St',scanType:'Card'},selZone,fields,'LPC-SHARED')");
 assert.equal(a.card_id,'LPC-SHARED');assert.equal(a.quantity,2);assert.equal(a.zone_id,'7');assert.equal(a.covers_through,null);assert(!('license_num' in a));assert(!('direction' in a));
 assert.throws(()=>f.run("resourceAttributes({},selZone,{...fields,quantity:'0'},'')"),/greater than zero/);
 assert.throws(()=>f.run("resourceAttributes({},selZone,{...fields,through:'2026-10-26T12:00'},'')"),/after the distribution/);
});
test('save uses only Resource endpoint and retry resolves an uncertain response once',async()=>{
 const f=fixture();f.run("window.LPC_RESOURCE_CONFIG.tableUrl='https://example.test/Resource/FeatureServer/0';workflowMode='resource';parsedDL={firstName:'Jane',lastName:'Test',fullAddress:'10 Test St',scanType:'DL'}");
 const input={resourceType:'Water',resourceName:'Water case',resourceQuantity:'2',resourceUnit:'case',resourceDate:'2026-10-27T12:00',resourceThrough:'',resourcePhone:'',resourcePreset:'water-case',resourceNotes:''};
 Object.entries(input).forEach(([id,value])=>f.get(id).value=value);
 let adds=0,saved=false;const urls=[];
 f.context.getAgolToken=async()=> 'test-token';f.context.ensurePersonCard=async()=>({card:{cardId:'LPC-SHARED'}});
 f.context.fetch=async(url,opts)=>{urls.push(url);const body=opts.body;
  if(url.endsWith('/applyEdits')){adds++;saved=true;throw Error('response lost')}
  if(body.get('outFields')==='distribution_id')return {ok:true,json:async()=>({features:saved?[{attributes:{distribution_id:'saved'}}]:[]})};
  return {ok:true,json:async()=>({features:[]})};
 };
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.match(f.get('resourceStatus').textContent,/not confirmed/);
 await f.run('saveResourceDistribution({preventDefault(){}})');assert.match(f.get('resourceStatus').textContent,/Saved 2 case/);assert.equal(adds,1);assert(urls.every(u=>u.startsWith('https://example.test/Resource/')));
});
