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
function resourceURL(){return String(window.LPC_RESOURCE_CONFIG?.tableUrl||'').trim().replace(/\/$/,'')}
function resourceLocalDate(date=new Date()){
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function updateResourceModeUI(){
  const on=workflowMode==='resource';
  document.querySelector('#modal .mh h2').textContent=on?'Resource — aid distribution':'Checkpoint Scan';
  document.getElementById('resourceManual').hidden=!on;
  document.getElementById('resourcePanel').hidden=true;
  document.getElementById('zoneHint').textContent=on?'Resource mode — choose an evacuation zone to record aid distribution':'Choose a zone to begin checkpoint scanning';
  document.getElementById('zoneScanBtn').textContent=on?'Distribute resources':'Check in';
}
function resetResourceForm(){
  resourceHistoryVersion++;
  const panel=document.getElementById('resourcePanel');if(panel){panel.hidden=true;panel.replaceChildren()}
  resourceRows=[];
  const manual=document.getElementById('resourceManual');if(manual)manual.hidden=workflowMode!=='resource';
}
function applyResourcePreset(){
  const preset=RESOURCE_PRESETS.find(p=>p[0]===document.getElementById('resourcePreset').value);
  ['resourceType','resourceName','resourceUnit','resourceQuantity'].forEach((id,i)=>document.getElementById(id).value=preset[i+1]);
}
async function prepareResourceRecipient(){
  if(workflowMode!=='resource'||!checkpointZoneConfirmed||!selZone)return false;
  const fn=document.getElementById('s1fn').value.trim(),ln=document.getElementById('s1ln').value.trim(),addr=document.getElementById('ai').value.trim();
  if(!fn||!ln||!addr){document.getElementById('ss').textContent='First name, last name, and address are required.';return false}
  window.LPCLiveScanner?.pause();clearTimeout(manualAddressTimer);addressCheckSequence++;
  parsedDL={...parsedDL,firstName:fn,lastName:ln,fullAddress:addr,scanType:parsedDL?.scanType||'Manual'};
  document.getElementById('s1').style.display='none';document.getElementById('s2').style.display='none';
  document.getElementById('resourceManual').hidden=true;
  const panel=document.getElementById('resourcePanel');panel.hidden=false;
  panel.innerHTML=`<p class="resource-mode-label">RESOURCE MODE · <span id="resourceZone"></span></p>
    <p id="resourcePerson"></p><p class="resource-help">The selected zone identifies this distribution. An address outside the zone does not block aid. The same EZcard works at evacuation checkpoints.</p>
    <p id="resourceSetup" role="status"></p>
    <form id="resourceForm">
      <div class="af"><label for="resourcePreset">Resource preset</label><select id="resourcePreset"></select></div>
      <p class="resource-help">Presets fill editable fields. Confirm package size and quantity for the supplies actually issued.</p>
      <div class="resource-grid">
        <div class="af"><label for="resourceType">Type</label><input id="resourceType" maxlength="80" required></div>
        <div class="af"><label for="resourceName">Resource / package description</label><input id="resourceName" maxlength="150" required></div>
        <div class="af"><label for="resourceQuantity">Quantity distributed</label><input id="resourceQuantity" type="number" min="0.001" step="any" required></div>
        <div class="af"><label for="resourceUnit">Unit</label><input id="resourceUnit" maxlength="40" required></div>
        <div class="af"><label for="resourceDate">Distributed at (local)</label><input id="resourceDate" type="datetime-local" required></div>
        <div class="af"><label for="resourceThrough">Covers through (local, optional)</label><input id="resourceThrough" type="datetime-local"></div>
      </div>
      <div class="af"><label for="resourcePhone">Phone (optional)</label><input id="resourcePhone" type="tel" maxlength="40"></div>
      <div class="af"><label for="resourceNotes">Notes (optional)</label><textarea id="resourceNotes" maxlength="2000" placeholder="Package size, household needs, or other distribution notes"></textarea></div>
      <button class="cb" id="resourceSave" type="submit">Save distribution</button>
      <p id="resourceStatus" role="status" aria-live="polite"></p>
    </form>
    <button class="b" type="button" onclick="startNextCheckpointScan()">Scan another person</button>
    <details><summary>Distributions for selected zone</summary><button class="b" type="button" id="resourceRefresh">Refresh</button><button class="b" type="button" id="resourceExport">Export CSV</button><p id="resourceHistoryStatus" role="status"></p><div id="resourceHistory"></div></details>`;
  document.getElementById('resourceZone').textContent=selZone.name;
  document.getElementById('resourcePerson').textContent=[fn,ln].join(' ')+' · '+addr;
  const select=document.getElementById('resourcePreset');
  RESOURCE_PRESETS.forEach(p=>{const o=document.createElement('option');o.value=p[0];o.textContent=p[0]==='custom'?'Custom resource':p[2];select.append(o)});
  select.onchange=applyResourcePreset;applyResourcePreset();
  document.getElementById('resourceDate').value=resourceLocalDate();
  document.getElementById('resourcePhone').value=document.getElementById('s1phone').value||parsedDL.phone||'';
  document.getElementById('resourceForm').onsubmit=saveResourceDistribution;
  document.getElementById('resourceRefresh').onclick=loadResourceHistory;
  document.getElementById('resourceExport').onclick=exportResourceHistory;
  document.getElementById('resourceSave').disabled=!resourceURL();
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
  e.preventDefault();if(resourceSaving||workflowMode!=='resource'||!checkpointZoneConfirmed||!selZone)return;
  const url=resourceURL();if(!url)return;
  const form=document.getElementById('resourceForm'),btn=document.getElementById('resourceSave'),status=document.getElementById('resourceStatus');
  if(!form.reportValidity())return;
  const read=id=>document.getElementById(id).value.trim();
  const person={...parsedDL},zone={...selZone};
  // Preserve one ID across retries after a lost network response.
  form.dataset.distributionId ||= crypto.randomUUID();
  const fields=form._pendingResource||{id:form.dataset.distributionId,type:read('resourceType'),name:read('resourceName'),quantity:read('resourceQuantity'),unit:read('resourceUnit'),date:read('resourceDate'),through:read('resourceThrough'),phone:read('resourcePhone'),preset:read('resourcePreset'),notes:read('resourceNotes'),operator:operatorName};
  form._pendingResource=fields;
  form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
  resourceSaving=true;btn.disabled=true;status.textContent='Saving distribution…';
  try{
    const attrs=resourceAttributes(person,zone,fields,person.cardId||'');
    const token=await getAgolToken(url);
    const existing=await resourceQuery(url,token,{where:`distribution_id='${fields.id}'`,outFields:'distribution_id',returnGeometry:'false'});
    if(!existing.features?.length){
      const saved=await ensurePersonCard({fn:person.firstName,ln:person.lastName,addr:person.fullAddress,phone:fields.phone,reason:'',cardId:person.cardId||''});
      attrs.card_id=saved.card.cardId;
      if(document.getElementById('resourceForm')===form)parsedDL.cardId=attrs.card_id;
      const response=await fetch(url+'/applyEdits',{method:'POST',body:new URLSearchParams({f:'json',token,adds:JSON.stringify([{attributes:attrs}])})});
      const result=await response.json();
      if(!response.ok||result.error||!result.addResults?.[0]?.success)throw new Error(result.error?.message||result.addResults?.[0]?.error?.description||'GIS did not confirm the save.');
    }
    if(document.getElementById('resourceForm')!==form)return;
    delete form.dataset.distributionId;delete form._pendingResource;
    form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=false);
    status.textContent=`Saved ${fields.quantity} ${fields.unit} — ${fields.name}. You can add another resource for this person or scan another person.`;
    await loadResourceHistory();
  }catch(err){status.textContent='Distribution not confirmed: '+err.message+' Retry to check whether it was saved.'}
  finally{resourceSaving=false;if(document.getElementById('resourceForm')===form)btn.disabled=false}
}
async function resourceQuery(url,token,params){
  const r=await fetch(url+'/query',{method:'POST',body:new URLSearchParams({f:'json',token,...params})});const j=await r.json();
  if(!r.ok||j.error)throw new Error(j.error?.message||'Resource query failed');return j;
}
async function loadResourceHistory(){
  const version=++resourceHistoryVersion,zone=selZone,url=resourceURL(),status=document.getElementById('resourceHistoryStatus');
  if(!status)return;resourceRows=[];document.getElementById('resourceHistory').replaceChildren();
  if(!url){status.textContent='Resource GIS table is not connected.';return}
  status.textContent='Loading distributions…';
  try{
    const token=await getAgolToken(url),rows=[];let offset=0;
    while(true){
      const j=await resourceQuery(url,token,{where:`zone_id='${String(zone.id).replace(/'/g,"''")}'`,outFields:'*',returnGeometry:'false',orderByFields:'distributed_at DESC,OBJECTID DESC',resultOffset:String(offset),resultRecordCount:'1000'});
      const batch=j.features||[];rows.push(...batch.map(f=>f.attributes));
      if(!j.exceededTransferLimit)break;if(!batch.length)throw new Error('GIS returned an incomplete page');offset+=batch.length;
    }
    if(version!==resourceHistoryVersion)return;
    resourceRows=rows;status.textContent=`${rows.length} distributions in ${zone.name}. Showing latest 100; CSV includes all loaded records.`;
    const list=document.getElementById('resourceHistory');
    rows.slice(0,100).forEach(a=>{const row=document.createElement('p');row.textContent=`${new Date(a.distributed_at).toLocaleString()} · ${a.name} · ${a.quantity} ${a.unit} ${a.resource_name}${a.notes?' · '+a.notes:''}`;list.append(row)});
  }catch(err){if(version===resourceHistoryVersion)status.textContent='Could not load distributions: '+err.message}
}
function exportResourceHistory(){
  if(!resourceRows.length)return;
  const fields=['distribution_id','card_id','name','address','phone','zone_id','zone_name','incident','resource_type','resource_name','preset_id','quantity','unit','distributed_at','covers_through','recorded_at','operator_name','scan_type','notes'];
  const rows=[fields.map(csvCell).join(','),...resourceRows.map(a=>fields.map(k=>csvCell(k.endsWith('_at')||k==='covers_through'?a[k]==null?'':new Date(a[k]).toISOString():a[k])).join(','))];
  const url=URL.createObjectURL(new Blob([rows.join('\r\n')],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='LPC_Resource_Distributions.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
