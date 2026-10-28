/* Aid distribution within the LPC Evac workspace. No checkpoint attendance writes. */
const RESOURCE_PRESETS = [
  ['water-case','Water','Bottled water case','case',1],
  ['water-gallon','Water','Drinking water','gallon',1],
  ['food-box','Food','Shelf-stable food box','box',1],
  ['meal','Food','Prepared meal','meal',1],
  ['mre','Food','Ready-to-eat meal','meal',1],
  ['cleanup','Cleanup','Cleanup kit','kit',1],
  ['hygiene','Hygiene','Personal hygiene kit','kit',1],
  ['blanket','Shelter','Blanket','each',1],
  ['tarp','Shelter','Tarp','each',1],
  ['sandbags','Flood supplies','Filled sandbags','bag',1],
  ['diapers','Infant supplies','Diapers','pack',1],
  ['formula','Infant supplies','Infant formula','container',1],
  ['pet-food','Animal supplies','Pet food','bag',1],
  ['custom','','','','']
];
let resourceSaving=false,resourceRows=[],resourceHistoryVersion=0;
let resourceHistoryState='idle',resourceHistoryError='';
let resourceDraftItems=[],activeResourceItems=[],resourceDraftSequence=0;
function newResourceDraft(presetId='water-case'){
  const preset=RESOURCE_PRESETS.find(p=>p[0]===presetId)||RESOURCE_PRESETS[0];
  return {key:++resourceDraftSequence,preset:preset[0],type:preset[1],name:preset[2],unit:preset[3],quantity:preset[4],collapsed:false};
}
function setupResourceSelection(){
  const section=document.getElementById('resourceSelection');
  if(!section.dataset.ready){
    section.dataset.ready='true';resourceDraftItems=[newResourceDraft()];
    section.innerHTML=`<strong>Resources to distribute</strong>
      <form id="resourceSelectionForm"><div id="resourceItemRows"></div></form>
      <button class="b" id="resourceAddItem" type="button">Add another item</button>
      <p id="resourceSelectionStatus" role="status" aria-live="polite"></p>`;
    document.getElementById('resourceSelectionForm').onsubmit=e=>{e.preventDefault();openModal()};
    document.getElementById('resourceSelectionForm').addEventListener('invalid',e=>{
      const row=e.target.closest('.resource-item-row');if(row)row.open=true;
    },true);
    document.getElementById('resourceAddItem').onclick=()=>{
      if(resourceDraftItems.length>=50){document.getElementById('resourceSelectionStatus').textContent='Use up to 50 items per person.';return}
      resourceDraftItems.forEach(item=>item.collapsed=true);
      resourceDraftItems.push(newResourceDraft());renderResourceDraftItems();
    };
    renderResourceDraftItems();
  }
}
function renderResourceDraftItems(){
  const list=document.getElementById('resourceItemRows');list.replaceChildren();
  resourceDraftItems.forEach((item,index)=>{
    const prefix='resourceItem'+item.key;
    const row=document.createElement('details');row.className='resource-item-row';row.open=!item.collapsed;
    row.ontoggle=()=>{if(row.isConnected!==false)item.collapsed=!row.open};
    row.innerHTML=`<summary class="resource-item-summary"><strong>Item ${index+1}</strong><span id="${prefix}Summary"></span></summary>
      <div class="resource-item-body"><div class="resource-item-heading"><span>Edit item</span><button class="b" id="${prefix}Remove" type="button" aria-label="Remove item ${index+1}">Remove</button></div>
      <div class="resource-grid">
        <div class="af"><label for="${prefix}Preset">Resource</label><select id="${prefix}Preset"></select></div>
        <div class="af"><label for="${prefix}Quantity">Quantity per person</label><input id="${prefix}Quantity" type="number" min="0.001" step="any" required></div>
      </div>
      <details ${item.preset==='custom'?'open':''}><summary>Edit type, description, or unit</summary><div class="resource-grid">
        <div class="af"><label for="${prefix}Type">Type</label><input id="${prefix}Type" maxlength="80" required></div>
        <div class="af"><label for="${prefix}Name">Resource / package description</label><input id="${prefix}Name" maxlength="150" required></div>
        <div class="af"><label for="${prefix}Unit">Unit</label><input id="${prefix}Unit" maxlength="40" required></div>
      </div></details></div>`;
    list.append(row);
    const updateSummary=()=>{document.getElementById(prefix+'Summary').textContent=[item.quantity,item.unit,item.name||'Custom resource'].filter(v=>String(v??'').trim()).join(' ')};
    updateSummary();
    const select=document.getElementById(prefix+'Preset');
    RESOURCE_PRESETS.forEach(p=>{const o=document.createElement('option');o.value=p[0];o.textContent=p[0]==='custom'?'Custom resource':p[2];select.append(o)});
    select.value=item.preset;
    select.onchange=()=>{const replacement=newResourceDraft(select.value);Object.assign(item,replacement,{key:item.key});renderResourceDraftItems()};
    ['quantity','type','name','unit'].forEach(field=>{
      const input=document.getElementById(prefix+field[0].toUpperCase()+field.slice(1));input.value=item[field];
      input.oninput=()=>{item[field]=input.value;updateSummary()};
    });
    document.getElementById(prefix+'Remove').onclick=()=>{resourceDraftItems=resourceDraftItems.filter(i=>i.key!==item.key);renderResourceDraftItems()};
  });
}
function validateResourceItems(items){
  if(!items.length)throw new Error('Add at least one resource before scanning.');
  if(items.length>50)throw new Error('Use up to 50 items per person.');
  items.forEach((item,index)=>{
    if(!String(item.type).trim()||!String(item.name).trim()||!String(item.unit).trim())throw new Error(`Complete type, description, and unit for item ${index+1}.`);
    if(!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0)throw new Error(`Enter a quantity greater than zero for item ${index+1}.`);
  });
}
function describeResourceItems(items){return items.map(i=>`${i.quantity} ${i.unit} ${i.name}`).join(' · ')}
function beginResourceScan(){
  setupResourceSelection();
  const status=document.getElementById('resourceSelectionStatus');status.textContent='';
  try{validateResourceItems(resourceDraftItems)}catch(err){
    resourceDraftItems.forEach(item=>{try{validateResourceItems([item])}catch{item.collapsed=false}});renderResourceDraftItems();
    status.textContent=err.message;document.getElementById('resourceSelection').scrollIntoView({block:'nearest'});return false}
  if(!document.getElementById('resourceSelectionForm').reportValidity())return false;
  activeResourceItems=resourceDraftItems.map(item=>({...item}));
  const summary=document.getElementById('resourceScanSummary');summary.hidden=false;
  summary.textContent='Resources per person: '+describeResourceItems(activeResourceItems);
  return true;
}
function resourceURL(){return String(window.LPC_RESOURCE_CONFIG?.tableUrl||window.LPC_RESOURCE_CONFIG?.serviceUrl||'').trim().replace(/\/$/,'')}
let resourceResolvedSource='',resourceResolvedPromise=null;
const resourceObjectIdFields=new Map();
async function resourceMetadata(url){
  const token=await getAgolToken(url);
  const response=await fetch(url,{method:'POST',body:new URLSearchParams({f:'json',token})});
  const metadata=await response.json();
  if(!response.ok||metadata.error)throw new Error(metadata.error?.message||'Resource service metadata could not be read.');
  return metadata;
}
function validateResourceTable(metadata){
  if(metadata.geometryType)throw new Error('Resource requires a nonspatial table. Publish the CSV with location set to None.');
  const oidFields=(metadata.fields||[]).filter(field=>field.type==='esriFieldTypeOID');
  const declared=metadata.objectIdField||metadata.objectIdFieldName||'';
  const oidField=oidFields.find(field=>field.name.toLowerCase()===String(declared).toLowerCase())||(oidFields.length===1?oidFields[0]:null);
  if(!oidField||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(oidField.name))throw new Error('Resource table metadata does not identify a valid Object ID field.');
  const text=['distribution_id','card_id','name','address','phone','zone_id','zone_name','incident','resource_type','resource_name','preset_id','unit','operator_name','scan_type','notes'];
  const types=Object.fromEntries(text.map(name=>[name,'esriFieldTypeString']));
  Object.assign(types,{quantity:'esriFieldTypeDouble',distributed_at:'esriFieldTypeDate',covers_through:'esriFieldTypeDate',recorded_at:'esriFieldTypeDate'});
  const fields=new Map((metadata.fields||[]).map(field=>[field.name,field]));
  const issues=Object.entries(types).filter(([name,type])=>fields.get(name)?.type!==type).map(([name,type])=>`${name} (${type.replace('esriFieldType','')})`);
  if(issues.length)throw new Error('Check Resource field names/types: '+issues.join(', '));
  const short=[['address',500],['notes',2000]].filter(([name,length])=>Number(fields.get(name)?.length||0)<length);
  if(short.length)throw new Error('Increase Resource text lengths: '+short.map(([name,length])=>`${name}: ${length}`).join(', '));
  const capabilities=new Set(String(metadata.capabilities||'').toLowerCase().split(',').map(c=>c.trim()));
  if(!capabilities.has('query')||!capabilities.has('create'))throw new Error('Enable Query and Add/Create editing for the Resource table.');
  if(metadata.advancedQueryCapabilities?.supportsPagination===false)throw new Error('Resource table must support pagination.');
  return oidField.name;
}
async function resolveResourceURL(){
  const source=resourceURL();if(!source)throw new Error('Resource GIS service is not configured.');
  if(resourceResolvedSource===source&&resourceResolvedPromise)return resourceResolvedPromise;
  resourceResolvedSource=source;
  const pending=(async()=>{
    let url=source;
    if(/\/FeatureServer$/i.test(source)){
      const service=await resourceMetadata(source),tables=service.tables||[];
      const matches=tables.filter(t=>['resource_distributions','lpcoem_resource'].includes(String(t.name).toLowerCase()));
      const table=matches.length===1?matches[0]:tables.length===1?tables[0]:null;
      if(!table||!Number.isInteger(table.id))throw new Error(tables.length?'Multiple Resource tables found; set the exact tableUrl in resource-config.js.':'No Resource table found. Publish the CSV as a table with location set to None.');
      url=source+'/'+table.id;
    }
    if(!/\/FeatureServer\/\d+$/i.test(url))throw new Error('Resource URL must end in /FeatureServer or /FeatureServer/<table ID>.');
    const oidField=validateResourceTable(await resourceMetadata(url));
    resourceObjectIdFields.set(url,oidField);
    return url;
  })();
  resourceResolvedPromise=pending;
  try{return await pending}catch(err){if(resourceResolvedPromise===pending)resourceResolvedPromise=null;throw err}
}
function resourceLocalDate(date=new Date()){
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function updateResourceModeUI(){
  const on=workflowMode==='resource';
  document.querySelector('#modal .mh h2').textContent=on?'Resource Tracker':'Checkpoint Scan';
  document.getElementById('resourcePanel').hidden=true;
  document.getElementById('resourceSelection').hidden=!on;
  document.getElementById('resourceScanSummary').hidden=!on;
  if(on)setupResourceSelection();
  document.getElementById('zoneHint').textContent=on?'':'Choose a zone to begin checkpoint scanning';
  document.getElementById('zoneScanBtn').disabled=!on&&!selZone;
  document.getElementById('resourceActivityType').hidden=!on;
  document.getElementById('scanDetailsLabel').textContent=on?'Person':'check-in details';
  document.getElementById('zoneScanBtn').textContent=on?'Scan / Enter':'Check in';
}
function resetResourceForm(){
  const panel=document.getElementById('resourcePanel');if(panel){panel.hidden=true;panel.replaceChildren()}
}
async function prepareResourceRecipient(){
  if(workflowMode!=='resource')return false;
  try{validateResourceItems(activeResourceItems)}catch(err){document.getElementById('ss').textContent=err.message;return false}
  const fn=document.getElementById('s1fn').value.trim(),ln=document.getElementById('s1ln').value.trim(),addr=document.getElementById('ai').value.trim();
  if(!fn||!ln||!addr){document.getElementById('ss').textContent='First name, last name, and address are required.';return false}
  window.LPCLiveScanner?.pause();wedge.setTarget(null);clearTimeout(manualAddressTimer);addressCheckSequence++;
  parsedDL={...parsedDL,firstName:fn,lastName:ln,fullAddress:addr,scanType:parsedDL?.scanType||'Manual'};
  document.getElementById('s1').style.display='none';document.getElementById('s2').style.display='none';
  document.getElementById('resourceScanSummary').hidden=true;
  const panel=document.getElementById('resourcePanel');panel.hidden=false;
  panel.innerHTML=`<p id="resourcePerson"></p>
    <p id="resourceSetup" role="status"></p>
    <form id="resourceForm">
      <p id="resourceItemSummary"></p>
      <div class="resource-fields">
        <div class="af"><label for="resourcePhone">Phone</label><input id="resourcePhone" type="tel" maxlength="40"></div>
        <div class="resource-grid">
          <div class="af"><label for="resourceDate">Date</label><input id="resourceDate" type="datetime-local" required></div>
          <div class="af"><label for="resourceThrough">Covers through (optional)</label><input id="resourceThrough" type="datetime-local"></div>
        </div>
        <div class="af"><label for="resourceNotes">Notes (optional)</label><textarea id="resourceNotes" maxlength="2000" placeholder="Package size, household needs, or other distribution notes"></textarea></div>
      </div>
      <button class="cb" id="resourceSave" type="submit">Save distribution</button>
      <p id="resourceStatus" role="status" aria-live="polite"></p>
    </form>
    <button class="b" id="resourceNextPerson" type="button" onclick="startNextCheckpointScan()">Scan another person</button>
    <details id="resourceCardResult" class="workflow-optional" hidden></details>
    <details><summary>Distribution history</summary><button class="b" type="button" id="resourceRefresh">Refresh</button><button class="b" type="button" id="resourceExport">Export CSV</button><p id="resourceHistoryStatus" role="status"></p><div id="resourceHistory"></div></details>`;
  document.getElementById('resourcePerson').textContent=[fn,ln].join(' ')+' · '+addr;
  document.getElementById('resourceItemSummary').textContent='Distributing: '+describeResourceItems(activeResourceItems);
  document.getElementById('resourceDate').value=resourceLocalDate();
  document.getElementById('resourcePhone').value=document.getElementById('s1phone').value||parsedDL.phone||'';
  document.getElementById('resourceForm').onsubmit=saveResourceDistribution;
  document.getElementById('resourceRefresh').onclick=loadResourceHistory;
  document.getElementById('resourceExport').onclick=exportResourceHistory;
  document.getElementById('resourceSave').disabled=!resourceURL();
  document.getElementById('resourceSave').textContent=`Save ${activeResourceItems.length} item${activeResourceItems.length===1?'':'s'}`;
  document.getElementById('resourceSetup').textContent=resourceURL()?'':'GIS setup required: connect Resource_Distributions in resource-config.js before saving. See RESOURCE_GIS_SETUP.md in GitHub.';
  await loadResourceHistory();return true;
}
function resourceAttributes(person,zone,fields,cardId){
  const quantity=Number(fields.quantity),distributed=Date.parse(fields.date),through=fields.through?Date.parse(fields.through):null;
  if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Enter a quantity greater than zero.');
  if(!Number.isFinite(distributed)||(fields.through&&!Number.isFinite(through)))throw new Error('Enter valid distribution dates.');
  if(through!==null&&through<distributed)throw new Error('Covers through must be after the distribution date.');
  if(!fields.type.trim()||!fields.name.trim()||!fields.unit.trim())throw new Error('Type, resource description, and unit are required.');
  return {distribution_id:fields.id,card_id:cardId,name:[person.firstName,person.lastName].filter(Boolean).map(titleCase).join(' '),
    address:person.fullAddress,phone:fields.phone,zone_id:String(zone.id),zone_name:zone.name,incident:zone.incident||'',
    resource_type:fields.type.trim(),resource_name:fields.name.trim(),preset_id:fields.preset,quantity,unit:fields.unit.trim(),
    distributed_at:distributed,covers_through:through,recorded_at:Date.now(),operator_name:fields.operator,scan_type:person.scanType,notes:fields.notes};
}
async function saveResourceDistribution(e){
  e.preventDefault();if(resourceSaving||workflowMode!=='resource')return;
  const url=resourceURL();if(!url)return;
  const form=document.getElementById('resourceForm'),btn=document.getElementById('resourceSave'),status=document.getElementById('resourceStatus');
  if(form.dataset.saved==='true'||!form.reportValidity())return;
  const read=id=>document.getElementById(id).value.trim();
  // Freeze the recipient, zone, and each line's ID for retrying uncertain/partial saves.
  let pending=form._pendingResource;
  if(!pending){
    try{
      validateResourceItems(activeResourceItems);
      const common={date:read('resourceDate'),through:read('resourceThrough'),phone:read('resourcePhone'),notes:read('resourceNotes'),operator:operatorName};
      pending={person:{...parsedDL},zone:{id:'',name:'',incident:''},items:activeResourceItems.map(item=>({...item,...common,id:crypto.randomUUID()}))};
      pending.items.forEach(item=>resourceAttributes(pending.person,pending.zone,item,pending.person.cardId||''));
    }catch(err){status.textContent=err.message;return}
    form._pendingResource=pending;
  }
  form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
  const next=document.getElementById('resourceNextPerson');next.disabled=true;
  resourceSaving=true;btn.disabled=true;status.textContent=`Saving ${pending.items.length} resource item(s)…`;
  try{
    const tableUrl=await resolveResourceURL();
    const token=await getAgolToken(tableUrl);
    const ids=pending.items.map(i=>`'${i.id}'`).join(',');
    const existing=await resourceQuery(tableUrl,token,{where:`distribution_id IN (${ids})`,outFields:'distribution_id',returnGeometry:'false',resultRecordCount:'1000'});
    if(!Array.isArray(existing.features)||existing.exceededTransferLimit)throw new Error('Could not verify all pending items.');
    const savedIds=new Set(existing.features.map(f=>f.attributes?.distribution_id));
    const missing=pending.items.filter(item=>!savedIds.has(item.id));
    if(missing.length){
      const person=pending.person;
      const saved=await ensurePersonCard({fn:person.firstName,ln:person.lastName,addr:person.fullAddress,phone:pending.items[0].phone,reason:'',cardId:person.cardId||''});
      person.cardId=saved.card.cardId;pending.card=saved.card;pending.cardCreated=saved.created;
      if(document.getElementById('resourceForm')===form&&parsedDL)parsedDL.cardId=person.cardId;
      const features=missing.map(item=>({attributes:resourceAttributes(person,pending.zone,item,person.cardId)}));
      const response=await fetch(tableUrl+'/applyEdits',{method:'POST',body:new URLSearchParams({f:'json',token,rollbackOnFailure:'true',adds:JSON.stringify(features)})});
      const result=await response.json();
      if(!response.ok||result.error||result.addResults?.length!==features.length||result.addResults.some(r=>!r.success))throw new Error(result.error?.message||result.addResults?.find(r=>r.error)?.error?.description||'GIS did not confirm every item.');
    }
    if(document.getElementById('resourceForm')!==form)return;
    delete form._pendingResource;form.dataset.saved='true';
    btn.textContent='Distribution saved';
    showResourceCardReady(pending.card,pending.cardCreated);
    status.textContent=`Saved ${pending.items.length} item${pending.items.length===1?'':'s'}.`;
    next.classList.add('ready-next');
    next.scrollIntoView({behavior:'smooth',block:'nearest'});
    await loadResourceHistory();
  }catch(err){status.textContent='Distribution not confirmed: '+err.message+' Retry to confirm.'}
  finally{
    resourceSaving=false;
    if(document.getElementById('resourceForm')===form){btn.disabled=form.dataset.saved==='true';next.disabled=!!form._pendingResource;}
  }
}
function showResourceCardReady(card,created){
  if(!card?.cardId)return;
  const result=document.getElementById('resourceCardResult');result.hidden=false;
  result.innerHTML=`<summary>Custom card (optional)</summary><p id="resourceCardReady" role="status"></p>
    <button class="b" type="button" id="resourceCardView">View custom card</button>
    <button class="b" type="button" id="resourceCardPrint">Print to ZC300</button>
    <button class="b" type="button" id="resourceCardPNG">Save card PNG</button>
    <canvas id="resourceCardCanvas" hidden aria-label="Custom card preview"></canvas>
    <p class="resource-help">This card works for both Evac and Resource. Printing is optional.</p>`;
  document.getElementById('resourceCardReady').textContent=(created?'Custom card created: ':'Existing custom card ready: ')+card.cardId;
  document.getElementById('resourceCardView').onclick=async()=>{
    const btn=document.getElementById('resourceCardView');btn.disabled=true;
    try{
      const rendered=await renderCardCanvas(card),canvas=document.getElementById('resourceCardCanvas');
      canvas.width=rendered.width;canvas.height=rendered.height;canvas.getContext('2d').drawImage(rendered,0,0);canvas.hidden=false;
    }catch(err){document.getElementById('resourceCardReady').textContent='Card is saved, but preview failed: '+err.message}
    finally{btn.disabled=false}
  };
  document.getElementById('resourceCardPrint').onclick=()=>{window._lastCard=card;return printCard()};
  document.getElementById('resourceCardPNG').onclick=()=>{window._lastCard=card;return savePNG()};
}
async function resourceQuery(url,token,params){
  const r=await fetch(url+'/query',{method:'POST',body:new URLSearchParams({f:'json',token,...params})});const j=await r.json();
  if(!r.ok||j.error)throw new Error(j.error?.message||'Resource query failed');return j;
}
function clearResourceActivity(){
  resourceHistoryVersion++;resourceRows=[];resourceHistoryState='idle';resourceHistoryError='';
  if(workflowMode==='resource')renderResourceHistory();
}
function resourceFilteredRows(){
  const query=document.getElementById('tsr').value.toLowerCase().trim();
  const type=document.getElementById('resourceActivityType').value;
  const rows=type?resourceRows.filter(row=>row.resource_type===type):resourceRows;
  return query?rows.filter(row=>['name','address','phone','resource_type','resource_name','unit','notes','operator_name','card_id'].some(key=>String(row[key]??'').toLowerCase().includes(query))):rows;
}
function resourceHistoryMessage(){
  if(resourceHistoryState==='loading')return 'Loading resource distributions…';
  if(resourceHistoryState==='error')return 'Could not load distributions: '+resourceHistoryError;
  if(resourceHistoryState==='idle')return 'Resource distributions have not loaded yet. Use Refresh to load activity.';
  return `${resourceRows.length} resource item records.`;
}
function renderResourceActivity(){
  document.getElementById('activityFilters').style.display='none';
  document.getElementById('tlc').textContent=String(resourceRows.length);
  const typeFilter=document.getElementById('resourceActivityType'),selectedType=typeFilter.value;
  typeFilter.replaceChildren();
  const all=document.createElement('option');all.value='';all.textContent='All resource types';typeFilter.append(all);
  [...new Set(resourceRows.map(row=>row.resource_type).filter(Boolean))].sort().forEach(type=>{const option=document.createElement('option');option.value=type;option.textContent=type;typeFilter.append(option)});
  typeFilter.value=selectedType;
  if(![...new Set(resourceRows.map(row=>row.resource_type))].includes(selectedType))typeFilter.value='';
  typeFilter.hidden=false;
  const rows=resourceFilteredRows(),empty=document.getElementById('emp'),table=document.getElementById('dt');
  const ready=resourceHistoryState==='ready';
  table.style.display=ready&&rows.length?'':'none';empty.style.display=ready&&rows.length?'none':'';
  if(!ready||!rows.length){empty.textContent=ready?(resourceRows.length?'No distributions match this filter.':'No resource distributions recorded.'):resourceHistoryMessage();document.getElementById('dtb').replaceChildren();return}
  renderTableHeader(['Distributed','Name','Resource','Quantity','Unit','Address','Phone','Notes','Operator']);
  const fragment=document.createDocumentFragment();
  rows.forEach(record=>{
    const row=document.createElement('tr');
    const date=record.distributed_at==null?'':new Date(record.distributed_at).toLocaleString();
    [date,record.name,record.resource_name,record.quantity,record.unit,record.address,record.phone,record.notes,record.operator_name].forEach(value=>row.appendChild(makeElement('td',{text:value??''})));
    fragment.appendChild(row);
  });
  document.getElementById('dtb').replaceChildren(fragment);
  document.getElementById('csv').disabled=false;
}
function renderResourceHistory(){
  if(workflowMode==='resource'&&document.body.dataset.system!=='sar'){
    document.getElementById('tlc').textContent=String(resourceRows.length);
    if(activeTab==='log')renderResourceActivity();
  }
  const status=document.getElementById('resourceHistoryStatus'),list=document.getElementById('resourceHistory');
  if(!status||!list)return;
  status.textContent=resourceHistoryMessage()+(resourceHistoryState==='ready'?' Showing latest 100; CSV includes all loaded records.':'');
  list.replaceChildren();
  if(resourceHistoryState!=='ready')return;
  resourceRows.slice(0,100).forEach(record=>{
    const row=document.createElement('p');row.textContent=`${new Date(record.distributed_at).toLocaleString()} · ${record.name} · ${record.quantity} ${record.unit} ${record.resource_name}${record.notes?' · '+record.notes:''}`;list.append(row);
  });
}
async function loadResourceHistory(){
  const version=++resourceHistoryVersion,url=resourceURL();
  resourceRows=[];resourceHistoryState='loading';resourceHistoryError='';
  if(!url){resourceHistoryState='error';resourceHistoryError='Resource GIS table is not connected.';renderResourceHistory();return}
  renderResourceHistory();
  try{
    const tableUrl=await resolveResourceURL();
    const token=await getAgolToken(tableUrl),rows=[];let offset=0;
    while(true){
      const result=await resourceQuery(tableUrl,token,{where:'1=1',outFields:'*',returnGeometry:'false',orderByFields:`distributed_at DESC,${resourceObjectIdFields.get(tableUrl)} DESC`,resultOffset:String(offset),resultRecordCount:'1000'});
      if(!Array.isArray(result.features))throw new Error('GIS returned no distribution records array.');
      const batch=result.features;rows.push(...batch.map(feature=>feature.attributes));
      if(!result.exceededTransferLimit)break;if(!batch.length)throw new Error('GIS returned an incomplete page');offset+=batch.length;
    }
    if(version!==resourceHistoryVersion)return;
    resourceRows=rows;resourceHistoryState='ready';renderResourceHistory();
  }catch(err){
    if(version!==resourceHistoryVersion)return;
    resourceHistoryState='error';resourceHistoryError=err.message;renderResourceHistory();
  }
}
function exportResourceHistory(){
  if(!resourceRows.length)return;
  const fields=['distribution_id','card_id','name','address','phone','zone_id','zone_name','incident','resource_type','resource_name','preset_id','quantity','unit','distributed_at','covers_through','recorded_at','operator_name','scan_type','notes'];
  const rows=[fields.map(csvCell).join(','),...resourceRows.map(a=>fields.map(k=>csvCell(k.endsWith('_at')||k==='covers_through'?a[k]==null?'':new Date(a[k]).toISOString():a[k])).join(','))];
  const url=URL.createObjectURL(new Blob([rows.join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='LPC_Resource_Distributions.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// On touch screens, native page scrolling takes priority until map movement is enabled.
let mobileMapPan=false;
function syncMobileMapInteraction(){
  if(typeof matchMedia!=='function')return;
  const mobile=matchMedia('(max-width:700px), (pointer:coarse)').matches;
  const button=document.getElementById('mapPanToggle');button.hidden=!mobile;
  const pan=!mobile||mobileMapPan;
  if(pan){map.dragging.enable();map.touchZoom.enable()}else{map.dragging.disable();map.touchZoom.disable()}
  map.scrollWheelZoom.disable();
  document.getElementById('map').dataset.pageScroll=mobile&&!pan?'true':'false';
  button.setAttribute('aria-pressed',String(mobile&&mobileMapPan));
  button.textContent=mobileMapPan?'Scroll page':'Move map';
}
function toggleMobileMapPan(){mobileMapPan=!mobileMapPan;syncMobileMapInteraction()}
if(typeof matchMedia==='function'){
  const media=matchMedia('(max-width:700px), (pointer:coarse)');
  media.addEventListener('change',()=>{mobileMapPan=false;syncMobileMapInteraction()});
  syncMobileMapInteraction();
}
