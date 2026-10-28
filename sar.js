/* LPC SAR workspace. SAR records use only the configured standalone tables. */
(() => {
'use strict';
window.EZTAG_SAR_LOGO='data:image/png;base64,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';
const $=id=>document.getElementById(id), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.EZTAG_SAR_CONFIG||{};
const configured=['members','events','attendance'].every(k=>/^https:\/\/[^\s?#]+\/FeatureServer\/\d+\/?$/i.test(cfg[k]||''));
const fields={members:['member_id','name','division','phone','status','created_at','created_by','updated_at'],events:['event_id','name','event_type','event_date','location','notes','status','created_at','created_by','updated_at'],attendance:['record_id','event_id','member_id','member_name','division','direction','check_time','operator_name','notes']};
const state={preview:false,tab:'events',events:[],members:[],attendance:[],eventId:'',memberId:'',direction:'',loading:false,busy:false,ready:false,attendanceReady:false,attendanceError:'',loadVersion:0,attendanceVersion:0,pending:null,editEvent:null,editMember:null,card:null};
let cameraStream=null,cameraTimer=null,cameraVersion=0,refreshTimer=null;
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const enabled=()=>configured?state.ready:state.preview;
const event=()=>state.events.find(e=>e.event_id===state.eventId);
const member=()=>state.members.find(m=>m.member_id===state.memberId);
const fmt=value=>value?new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Date not set';
function feedback(message,error=false){const box=$('sarCheckModal')?.classList.contains('open')?$('sarFeedback'):($('sarEventFeedback')||$('sarFeedback'));if(!box)return;box.textContent=message;box.classList.toggle('error',error)}
function sql(value){return String(value).replace(/'/g,"''")}
function normalized(value){return String(value||'').trim().toLocaleUpperCase().replace(/\s+/g,' ')}
async function request(kind,method,params={}){
  if(!configured)throw new Error('SAR tables are not connected. Use the labeled preview to try this workflow.');
  const url=cfg[kind].replace(/\/$/,'');
  const token=await getAgolToken(url);
  const response=await fetch(url+(method?'/'+method:''),{method:'POST',body:new URLSearchParams({...params,f:'json',token})});
  let result;try{result=await response.json()}catch(e){throw new Error('SAR service returned an unreadable response.')}
  if(!response.ok||result.error)throw new Error(result.error?.message||`SAR request failed (${response.status}).`);
  return result;
}
async function query(kind,where='1=1'){
  const rows=[];let offset=0;
  while(true){
    const result=await request(kind,'query',{where,outFields:'*',returnGeometry:'false',orderByFields:'OBJECTID ASC',resultOffset:String(offset),resultRecordCount:'1000'});
    if(!Array.isArray(result.features))throw new Error('SAR query did not return records.');
    const batch=result.features;rows.push(...batch.map(f=>f.attributes));
    if(!result.exceededTransferLimit&&batch.length<1000)break;
    if(!batch.length)throw new Error('SAR query was incomplete. Refresh before continuing.');
    offset+=batch.length;
  }
  return rows;
}
async function validateTables(){
  for(const kind of ['members','events','attendance']){
    const metadata=await request(kind,'');
    if(metadata.geometryType)throw new Error(`${kind}: use a standalone table, without geometry.`);
    if(metadata.objectIdField!=='OBJECTID')throw new Error(`${kind}: the object ID field must be named OBJECTID.`);
    const names=new Set((metadata.fields||[]).map(f=>f.name));
    const missing=fields[kind].filter(f=>!names.has(f));
    if(missing.length)throw new Error(`${kind}: missing fields ${missing.join(', ')}. See the GIS setup guide.`);
    const caps=new Set(String(metadata.capabilities||'').toLowerCase().split(',').map(v=>v.trim()));
    if(!caps.has('query')||!caps.has('create')||(kind!=='attendance'&&!caps.has('update')))throw new Error(`${kind}: enable Query/Create${kind==='attendance'?'':'/Update'} capabilities.`);
  }
}
async function add(kind,attributes){
  const result=await request(kind,'addFeatures',{features:JSON.stringify([{attributes}]),rollbackOnFailure:'true'});
  const row=result.addResults?.[0];if(!row?.success)throw new Error(row?.error?.description||'The SAR record was not saved.');
  return {...attributes,OBJECTID:row.objectId};
}
async function update(kind,original,changes){
  const result=await request(kind,'updateFeatures',{features:JSON.stringify([{attributes:{OBJECTID:original.OBJECTID,...changes}}]),rollbackOnFailure:'true'});
  const row=result.updateResults?.[0];if(!row?.success)throw new Error(row?.error?.description||'The SAR changes were not saved.');
  return {...original,...changes};
}
$('sarRoot').innerHTML=`<div class="sar-shell">
 <div id="sarDashboard" aria-label="Selected event attendance" hidden></div>

 <div id="sarConnection" class="sar-notice" role="status"></div>
 <div id="sarEventView" class="sar-event-workspace"><div id="sarSelectedEvent" class="sar-selected-event" hidden></div><details id="sarEventConfig" class="sar-event-config" open><summary>Event configuration</summary><div class="sar-config-body"><div class="sar-panel-heading"><h2>Open events</h2><button class="sar-btn primary" id="sarNewEvent" data-sar-action="new-event" type="button">+ Create</button></div><div class="sar-event-list" id="sarEventList"></div><details id="sarClosedEvents" class="sar-closed-events" hidden><summary id="sarClosedEventsTitle">Closed events</summary><div class="sar-event-list" id="sarClosedEventList"></div></details><div id="sarSelectedEventTools"></div></div></details><section class="sar-panel"><div id="sarEventDetail"></div></section></div>
 <div id="sarMemberView" hidden><div class="sar-members-toolbar"><div class="sar-field"><label for="sarMemberSearch">Find a member</label><input id="sarMemberSearch" type="search" placeholder="Name, division, phone, or member ID"/></div><div class="sar-actions"><button class="sar-btn" data-sar-action="export-members" type="button">Export members</button><button class="sar-btn primary" id="sarNewMember" data-sar-action="new-member" type="button">+ Add member</button></div></div><div class="sar-member-grid" id="sarMemberList"></div></div>
 <footer class="sar-footer">La Plata County Search &amp; Rescue · <a href="https://laplatasar.org/" target="_blank" rel="noopener noreferrer">laplatasar.org</a></footer>
</div>
<div class="mo sar-modal" id="sarCheckModal" role="dialog" aria-modal="true" aria-labelledby="sarCheckTitle"><div class="md"><div class="mh"><h2 id="sarCheckTitle">SAR Check-in / Out</h2><button type="button" class="mx" data-sar-action="close-check" aria-label="Close SAR check-in">×</button></div><p id="sarCheckEvent" class="sar-help"></p><div id="sarCheckContent"></div><div id="sarCheckFooter"></div></div></div>
<div class="mo sar-modal" id="sarEventModal"><div class="md"><div class="mh"><h2 id="sarEventModalTitle">Create event</h2><button type="button" class="mx" data-sar-action="close-event" aria-label="Close event form">×</button></div><form id="sarEventForm"><div class="sar-field"><label for="sarEventName">Event name</label><input id="sarEventName" maxlength="150" required placeholder="Meeting, training, or mission name"/></div><div class="sar-form-grid"><div class="sar-field"><label for="sarEventType">Event type</label><select id="sarEventType"><option>Meeting</option><option>Training</option><option>Field mission</option><option>Other</option></select></div><div class="sar-field"><label for="sarEventDate">Date/time (local)</label><input id="sarEventDate" type="datetime-local"/></div></div><div class="sar-field"><label for="sarEventLocation">Location (optional)</label><input id="sarEventLocation" maxlength="255" placeholder="Station, trailhead, or other meeting place"/></div><div class="sar-field"><label for="sarEventNotes">Notes (optional)</label><textarea id="sarEventNotes" maxlength="2000"></textarea></div><div class="sar-feedback" id="sarEventFormStatus" role="status"></div></form><button class="sar-btn primary" type="submit" form="sarEventForm" id="sarEventSave">Save event</button></div></div>
<div class="mo sar-modal" id="sarMemberModal"><div class="md"><div class="mh"><h2 id="sarMemberModalTitle">Add member</h2><button type="button" class="mx" data-sar-action="close-member" aria-label="Close member form">×</button></div><form id="sarMemberForm"><div class="sar-field"><label for="sarMemberName">Name</label><input id="sarMemberName" maxlength="150" required autocomplete="name"/></div><div class="sar-field"><label for="sarMemberDivision">Division</label><input id="sarMemberDivision" list="sarDivisions" maxlength="100" required placeholder="Enter division"/><datalist id="sarDivisions"></datalist></div><div class="sar-field"><label for="sarMemberPhone">Phone number</label><input id="sarMemberPhone" type="tel" maxlength="40" autocomplete="tel"/></div><div class="sar-field" id="sarMemberStatusWrap" hidden><label for="sarMemberStatus">Member status</label><select id="sarMemberStatus"><option>Active</option><option>Inactive</option></select></div><div class="sar-feedback" id="sarMemberFormStatus" role="status"></div></form><button class="sar-btn primary" type="submit" form="sarMemberForm" id="sarMemberSave">Save member &amp; create card</button><p class="sar-help" style="margin-top:10px">A saved member has one reusable card ID. Printing is optional.</p></div></div>
<div class="mo sar-modal" id="sarCardModal"><div class="md"><div class="mh"><h2>Member card</h2><button type="button" class="mx" data-sar-action="close-card" aria-label="Close member card">×</button></div><canvas id="sarCardCanvas" class="sar-card-canvas" aria-label="SAR member card preview"></canvas><details class="workflow-optional"><summary>More card options &amp; print settings</summary><button class="sar-btn" data-sar-action="save-card" type="button">Save PNG</button><p class="sar-card-hint">CR-80 · Landscape printer paper · Actual size / 100% · No margins<br>The QR contains a member ID; member details are read from the SAR registry.</p></details><div class="sar-actions"><button class="sar-btn primary" data-sar-action="print-card" type="button">Print to ZC300</button><button class="sar-btn" data-sar-action="full-card" type="button">Full screen</button></div><div class="sar-feedback" id="sarCardStatus" role="status"></div></div></div>`;
function connection(message){
 const box=$('sarConnection');
 box.dataset.state=enabled()&&!state.preview?'live':'setup';
 if(message){box.textContent=message;return}
 if(state.preview){box.innerHTML='<strong>Preview only — records are not saved</strong>Events, members, and attendance exist only in this tab until reload. Use fictional data. Preview records will not be uploaded when tables are connected.<div class="sar-actions"><button class="sar-btn" data-sar-action="exit-preview" type="button">Exit preview</button><a class="sar-btn" href="https://github.com/Matthew-Richardson/TrackLPC/blob/main/SAR_GIS_SETUP.md" target="_blank" rel="noopener">GIS setup guide</a></div>';return}
 if(configured&&state.ready){box.innerHTML='<strong>SAR tables connected</strong>Member cards and event attendance are saved to ArcGIS Online. <span id="sarSyncStatus">Refresh to check for updates.</span>';return}
 box.innerHTML='<strong>SAR setup required</strong>Connect the Members, Events, and Attendance tables to save records. The preview lets you try the workflow before setup.<div class="sar-actions"><button class="sar-btn" data-sar-action="preview" type="button">Try preview</button><a class="sar-btn" href="https://github.com/Matthew-Richardson/TrackLPC/blob/main/SAR_GIS_SETUP.md" target="_blank" rel="noopener">GIS setup guide</a></div>';
}
function currentMap(rows=state.attendance){
 const latest=new Map();
 [...rows].sort((a,b)=>Number(a.check_time)-Number(b.check_time)||Number(a.OBJECTID||0)-Number(b.OBJECTID||0)||String(a.record_id).localeCompare(String(b.record_id))).forEach(r=>latest.set(r.member_id,r));
 return latest;
}
function render(){
 stopCamera();
 if(state.tab!=='events')$('sarCheckModal').classList.remove('open');
 $('sarEventView').hidden=state.tab!=='events';$('sarMemberView').hidden=state.tab!=='members';
 document.querySelectorAll('[data-sar-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.sarTab===state.tab)));
 $('sarNewEvent').disabled=!enabled()||state.loading;$('sarNewMember').disabled=!enabled()||state.loading;
 const events=[...state.events].sort((a,b)=>Number(b.created_at)-Number(a.created_at)),open=events.filter(e=>e.status!=='Closed'),closed=events.filter(e=>e.status==='Closed');
 $('sarEventList').innerHTML=open.length?eventButtons(open):'<div class="sar-empty">No open events. Create an event to begin.</div>';
 $('sarClosedEventList').innerHTML=eventButtons(closed);$('sarClosedEvents').hidden=!closed.length;
 $('sarClosedEventsTitle').textContent=`Closed events (${closed.length})`;
 syncEventConfiguration();
 renderDetail();renderMembers();
 const divisions=[...new Set(state.members.map(m=>m.division).filter(Boolean))].sort();$('sarDivisions').replaceChildren(...divisions.map(d=>new Option(d,d)));
 setScanTarget();
}
function syncEventConfiguration(){const selected=event(),config=$('sarEventConfig');if(!selected)config.open=true;else if(config.dataset.eventId!==selected.event_id)config.open=false;config.dataset.eventId=selected?.event_id||''}
function eventButtons(events){return events.map(e=>`<button class="sar-event-item" type="button" data-sar-event="${esc(e.event_id)}" aria-pressed="${e.event_id===state.eventId}"><strong>${esc(e.name)}</strong><span>${esc(e.event_type)} · ${esc(e.status)}</span><span>${esc(fmt(e.event_date))}</span></button>`).join('')}
function renderDetail(){
 const e=event(),root=$('sarEventDetail'),checkModal=$('sarCheckModal');
 const keepDraft=checkModal.classList.contains('open')&&checkModal.dataset.eventId===e?.event_id;
 const note=keepDraft?$('sarAttendanceNotes')?.value||'':'',scanText=keepDraft?$('sarScanInput')?.value||'':'';
 const step=keepDraft&&checkModal.dataset.step==='review'&&member()?'review':'identify';
 if(!e){$('sarSelectedEvent').hidden=true;$('sarSelectedEventTools').replaceChildren();$('sarEventConfig').open=true;$('sarDashboard').hidden=true;$('sarDashboard').replaceChildren();checkModal.classList.remove('open');$('sarCheckContent').replaceChildren();$('sarCheckFooter').replaceChildren();root.innerHTML='<div class="sar-empty"><strong>Start with an event</strong>Create or select an event to check members in and out.<br>No address or map is needed.</div>';return}
 $('sarSelectedEvent').hidden=false;$('sarSelectedEvent').innerHTML=`<span class="sar-selected-label">Selected event</span><strong>${esc(e.name)}</strong><span class="sar-pill ${e.status==='Open'?'':'closed'}">${esc(e.status)}</span>`;
 const latest=currentMap(),inside=[...latest.values()].filter(r=>r.direction==='IN').length,unique=new Set(state.attendance.map(r=>r.member_id)).size;
 root.innerHTML=`<div class="sar-detail"><div class="sar-event-head"><div><div class="sar-eyebrow">${esc(e.event_type)}</div><h2>${esc(e.name)}</h2><div class="sar-meta">${esc(fmt(e.event_date))}${e.location?' · '+esc(e.location):''}${e.notes?'\n'+esc(e.notes):''}</div></div><div class="sar-actions"><span class="sar-pill ${e.status==='Open'?'':'closed'}">${esc(e.status)}</span><button class="sar-btn" data-sar-action="edit-event" type="button">Edit event</button><button class="sar-btn" data-sar-action="toggle-event" type="button" ${state.busy?'disabled':''}>${e.status==='Open'?'Close event':'Reopen event'}</button></div></div>
 <div class="sar-metrics"><div><strong>${inside}</strong><span>Currently IN</span></div><div><strong>${unique}</strong><span>Unique attendees</span></div><div><strong>${state.attendance.filter(r=>r.direction==='IN').length}</strong><span>Total check-ins</span></div></div>
 <div id="sarEventFeedback" class="sar-feedback" role="status"></div>
 <div class="sar-launch-actions"><button class="sar-btn primary" data-sar-action="open-check" type="button" ${e.status!=='Open'||!enabled()?'disabled':''}>Scan / Enter</button></div>
 <div class="sar-checkin">
 <div id="sarIdentifyStep"><p class="sar-help">Scan a SAR member card or choose a saved member.</p>
 <div class="sar-check-grid"><div class="sar-field"><label for="sarScanInput">Scan QR / enter member ID</label><input id="sarScanInput" type="text" autocomplete="off" placeholder="SAR member ID" ${e.status!=='Open'||!enabled()?'disabled':''}/></div><div class="sar-field"><label for="sarMemberPick">Choose member</label><select id="sarMemberPick" ${e.status!=='Open'||!enabled()?'disabled':''}><option value="">Select a member…</option>${state.members.filter(m=>m.status==='Active').sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`<option value="${esc(m.member_id)}" ${m.member_id===state.memberId?'selected':''}>${esc(m.name)} · ${esc(m.division)}</option>`).join('')}</select></div></div>
 <div class="sar-actions sar-identify-tools"><button class="sar-btn scanner-camera-button" data-sar-action="camera" type="button" ${e.status!=='Open'||!enabled()?'disabled':''}>Start camera</button><button class="sar-btn" data-sar-action="add-for-event" type="button" ${e.status!=='Open'||!enabled()?'disabled':''}>+ Add member</button></div>
 <div class="sar-scan-video" id="sarCameraWrap"><div class="scanner-viewport"><video id="sarCameraVideo" playsinline muted aria-label="SAR member card scanner"></video><div class="live-scanner-frame"></div></div><p class="live-scanner-label">Hold member QR inside frame</p></div></div>
 <div id="sarReviewStep" hidden><div class="sar-picked" id="sarPicked"></div>
 <div class="sar-field"><label>Direction</label><div class="sar-direction-options" role="group" aria-label="Check-in direction"><button class="sar-btn" id="sarInBtn" data-sar-direction="IN" type="button" aria-pressed="false">IN</button><button class="sar-btn" id="sarOutBtn" data-sar-direction="OUT" type="button" aria-pressed="false">OUT</button></div></div>
 <div class="sar-field"><label for="sarAttendanceNotes">Notes (optional)</label><input id="sarAttendanceNotes" maxlength="1000" placeholder="Assignment or attendance note"/></div></div>
 <div id="sarCheckActions"><div id="sarIdentifyActions"><button class="sar-btn primary" id="sarContinueBtn" data-sar-action="review-member" type="button">Continue</button></div><div id="sarReviewActions" hidden><button class="sar-btn primary" id="sarSaveAttendance" data-sar-action="save-attendance" type="button" disabled>Save record</button><button class="sar-btn sar-back-action" data-sar-action="clear-member" type="button">Choose another member</button></div></div><div id="sarFeedback" class="sar-feedback" role="status">${e.status==='Open'?'':'This event is closed. Reopen it to record attendance.'}</div></div>
 <div class="sar-attendance-head"><h3>Attendance log</h3><div class="sar-actions"><button class="sar-btn" data-sar-action="refresh-attendance" type="button">Refresh</button><button class="sar-btn" data-sar-action="export-attendance" type="button">Export CSV</button></div></div><div class="sar-table-wrap"><table class="sar-table"><thead><tr><th>Name / division</th><th>Direction</th><th>Time</th><th>Note / operator</th></tr></thead><tbody>${[...state.attendance].sort((a,b)=>b.check_time-a.check_time||Number(b.OBJECTID||0)-Number(a.OBJECTID||0)).map(r=>`<tr><td>${esc(r.member_name)}<small>${esc(r.division)}</small></td><td><span class="sar-pill ${r.direction==='OUT'?'closed':''}">${esc(r.direction)}</span></td><td>${esc(fmt(r.check_time))}</td><td>${esc(r.notes)}<small>${esc(r.operator_name)}</small></td></tr>`).join('')||'<tr><td colspan="4">No attendance recorded for this event.</td></tr>'}</tbody></table></div></div>`;
 if(checkModal.dataset.eventId!==e.event_id)checkModal.classList.remove('open');
 checkModal.dataset.eventId=e.event_id;$('sarCheckEvent').textContent=e.name;
 $('sarSelectedEventTools').replaceChildren(root.querySelector('.sar-event-head'));
 $('sarDashboard').hidden=state.tab!=='events';$('sarDashboard').replaceChildren(root.querySelector('.sar-metrics'));
 $('sarCheckContent').replaceChildren(root.querySelector('.sar-checkin'));
 $('sarCheckFooter').replaceChildren($('sarCheckContent').querySelector('#sarCheckActions'),$('sarCheckContent').querySelector('#sarFeedback'));
 $('sarAttendanceNotes').value=note;$('sarScanInput').value=scanText;
 setCheckStep(step);
 $('sarMemberPick').addEventListener('change',()=>{state.memberId=$('sarMemberPick').value;state.direction='';state.pending=null;$('sarScanInput').value='';updatePicked();feedback('')});
 $('sarScanInput').addEventListener('input',()=>{if($('sarScanInput').value.trim()){state.memberId='';state.direction='';state.pending=null;$('sarMemberPick').value=''}updatePicked()});
 $('sarScanInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();reviewMember()}});
}
function updatePicked(){
 if(!$('sarPicked'))return;
 const m=member(),latest=currentMap().get(state.memberId),isIn=latest?.direction==='IN';
 $('sarPicked').textContent=m?`${m.name} · ${m.division}${m.phone?' · '+m.phone:''} · ${isIn?'Currently IN':'Currently OUT'}`:'Select or scan a member to continue.';
 const locked=!enabled()||state.loading||!state.attendanceReady||state.busy||event()?.status!=='Open'||!m||m.status!=='Active';
 $('sarInBtn').disabled=locked||isIn;$('sarOutBtn').disabled=locked||!isIn;
 if((state.direction==='IN'&&isIn)||(state.direction==='OUT'&&!isIn))state.direction='';
 ['IN','OUT'].forEach(direction=>{const button=$(direction==='IN'?'sarInBtn':'sarOutBtn'),selected=direction===state.direction;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('selected',selected)});
 $('sarSaveAttendance').disabled=locked||!state.direction;$('sarSaveAttendance').textContent=state.busy?'Saving…':'Save record';
 $('sarContinueBtn').disabled=!enabled()||state.loading||!state.attendanceReady||state.busy||event()?.status!=='Open'||(!m&&!$('sarScanInput').value.trim());
 const toggle=$('sarSelectedEventTools').querySelector('[data-sar-action="toggle-event"]');if(toggle)toggle.disabled=state.busy||state.loading;
}
function setCheckStep(step){
 if(!$('sarIdentifyStep'))return;
 const review=step==='review'&&!!member();
 $('sarCheckModal').dataset.step=review?'review':'identify';
 $('sarIdentifyStep').hidden=review;$('sarReviewStep').hidden=!review;
 $('sarIdentifyActions').hidden=review;$('sarReviewActions').hidden=!review;
 $('sarCheckTitle').textContent=review?'Confirm IN / OUT':'SAR Check-in / Out';
 if(review){stopCamera();if($('sarCheckModal').contains(document.activeElement)&&document.activeElement?.matches('input,select,textarea'))document.activeElement.blur()}
 $('sarCheckContent').scrollTop=0;updatePicked();setScanTarget();
}
async function reviewMember(){
 const raw=$('sarScanInput').value.trim();if(raw){await scan(raw);return}
 if(!member()){feedback('Choose a member or scan their card.',true);return}
 try{await loadAttendance({renderAfter:false});state.direction='';setCheckStep('review');feedback('')}catch(e){feedback(e.message,true)}
}
function pickDirection(direction){
 const button=$(direction==='IN'?'sarInBtn':'sarOutBtn');if(button.disabled||state.busy)return;
 state.direction=direction;updatePicked();feedback('');
}
function resetCheckin(){
 state.memberId='';state.direction='';state.pending=null;stopCamera();
 $('sarMemberPick').value='';$('sarScanInput').value='';$('sarAttendanceNotes').value='';feedback('');setCheckStep('identify');startCheckCamera();
}

function renderMembers(){
 const q=normalized($('sarMemberSearch').value);
 const rows=state.members.filter(m=>!q||[m.name,m.division,m.phone,m.member_id].some(v=>normalized(v).includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
 $('sarMemberList').innerHTML=rows.length?rows.map(m=>`<article class="sar-member-tile ${m.status==='Active'?'':'inactive'}"><h3>${esc(m.name)}</h3><p>${esc(m.division)}<br>${esc(m.phone||'No phone entered')} · ${esc(m.status)}</p><div class="sar-actions"><button class="sar-btn" type="button" data-sar-card="${esc(m.member_id)}">View card</button><button class="sar-btn" type="button" data-sar-edit-member="${esc(m.member_id)}">Edit</button></div><div class="sar-id">${esc(m.member_id)}</div></article>`).join(''):'<div class="sar-empty"><strong>No members found</strong>Add members to create reusable cards.</div>';
}
function setScanTarget(){try{wedge.setTarget(document.body.dataset.system==='sar'&&state.tab==='events'&&event()?.status==='Open'&&$('sarCheckModal').classList.contains('open')&&$('sarCheckModal').dataset.step!=='review'&&!document.querySelector('.sar-modal.open:not(#sarCheckModal)')&&enabled()?'sar':null)}catch(e){/* Evac scanner may still be initializing. */}}
function stopCamera(){cameraVersion++;clearTimeout(cameraTimer);cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;const wrap=$('sarCameraWrap');if(wrap)wrap.classList.remove('active');const button=$('sarCheckContent')?.querySelector('[data-sar-action="camera"]');if(button)button.textContent='Start camera'}
function stop(){stopCamera();clearInterval(refreshTimer);refreshTimer=null;try{wedge.setTarget(null)}catch(e){}}
function startCheckCamera(){if($('sarCheckModal').classList.contains('open')&&$('sarCheckModal').dataset.step==='identify'&&enabled()&&!state.busy&&event()?.status==='Open'&&!cameraStream)void toggleCamera()}
function openCheck(){
 if(!enabled()||state.busy||event()?.status!=='Open')return;
 const modal=$('sarCheckModal'),opening=!modal.classList.contains('open');
 modal.classList.add('open');if(opening){state.direction='';setCheckStep('identify')}setScanTarget();if(opening){modal.querySelector('.mx').focus({preventScroll:true});startCheckCamera()}
}
function closeForms(){stopCamera();document.querySelectorAll('.sar-modal').forEach(m=>m.classList.remove('open'));setScanTarget();$('sarRoot').scrollTop=0}
function switchSystem(mode){
 const sar=mode==='sar';stop();window.LPCLiveScanner?.stop();window.LPCCardLiveScanner?.stop();
 ['modal','cardModal'].forEach(id=>$(id).classList.remove('open'));closeForms();
 try{clearInterval(logTimer);logTimer=null}catch(e){}
 document.body.dataset.system=sar?'sar':'evac';$('systemMode').value=sar?'sar':'evac';$('systemMode').setAttribute('aria-checked',String(sar));
 try{sessionStorage.setItem('eztag_system',sar?'sar':'evac')}catch(e){}
 $('appLogo').src=sar?window.EZTAG_SAR_LOGO:LPC_LOGO_FIXED;$('appLogo').alt=sar?'La Plata County Search and Rescue logo':'La Plata County logo';
 document.querySelector('.brand-title').textContent=sar?'LPC Search & Rescue':'La Plata County EZcard';document.querySelector('.brand-copy small').textContent=sar?'MEMBER & EVENT MANAGEMENT':'EVACUATION ZONE CARD';
 $('refreshBtn').title=sar?'Refresh SAR events, members, and attendance':'Refresh zones, map, addresses, parcels, and activity';
 if(sar){connection();render();if(configured&&oauthManager)refresh()}
 else{requestAnimationFrame(()=>map.invalidateSize())}
}
async function refresh(){
 if(state.preview){connection();render();return}
 if(!configured){connection();render();return}
 if(!oauthManager){connection('Sign in to ArcGIS Online to access SAR records.');return}
 const version=++state.loadVersion;state.loading=true;updatePicked();
 try{
   await validateTables();
   const [events,members]=await Promise.all([query('events'),query('members')]);
   if(version!==state.loadVersion||document.body.dataset.system!=='sar')return;
   state.events=events;state.members=members;state.ready=true;state.loading=false;
   if(!event()){state.eventId=events.find(e=>e.status==='Open')?.event_id||events[0]?.event_id||'';state.memberId='';state.attendance=[]}
   if(state.eventId)await loadAttendance({renderAfter:false});
   if(version!==state.loadVersion)return;
   connection();render();if($('sarSyncStatus'))$('sarSyncStatus').textContent='Updated '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'.';
 }catch(e){state.ready=false;connection('SAR data could not be loaded: '+e.message);render()}
 finally{if(version===state.loadVersion){state.loading=false;updatePicked()}}
}
async function loadAttendance({renderAfter=true}={}){
 if(!state.eventId)return;
 const id=state.eventId,version=++state.attendanceVersion;
 const rows=state.preview?state.attendance:await query('attendance',`event_id='${sql(id)}'`);
 if(id!==state.eventId||version!==state.attendanceVersion)return;
 state.attendance=rows;state.attendanceReady=true;state.attendanceError='';if(renderAfter){stopCamera();renderDetail();setScanTarget()}
}
async function selectEvent(id){
 if(state.busy)return;stopCamera();state.eventId=id;state.memberId='';state.attendance=[];state.pending=null;state.attendanceReady=false;state.attendanceError='';state.loading=true;render();
 try{if(state.preview){state.attendance=previewAttendance.filter(r=>r.event_id===id);state.attendanceReady=true}else await loadAttendance({renderAfter:false})}
 catch(e){state.attendanceError=e.message}finally{state.loading=false;render();if(state.attendanceError)feedback(state.attendanceError,true);$('sarEventConfig').open=false;$('sarRoot').scrollTop=0}
}
let previewAttendance=[];
function openEvent(edit=false){
 if(!enabled()||state.busy)return;stopCamera();state.editEvent=edit?event():null;const e=state.editEvent;
 $('sarEventForm').reset();$('sarEventModalTitle').textContent=e?'Edit event':'Create event';
 if(e){$('sarEventName').value=e.name;$('sarEventType').value=e.event_type;$('sarEventLocation').value=e.location||'';$('sarEventNotes').value=e.notes||'';if(e.event_date){const d=new Date(e.event_date);$('sarEventDate').value=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}}
 $('sarEventFormStatus').textContent='';$('sarEventModal').classList.add('open');setScanTarget();$('sarEventModal').querySelector('.mx').focus({preventScroll:true});
}
async function saveEvent(e){
 e.preventDefault();if(state.busy||!enabled())return;
 const name=$('sarEventName').value.trim();if(!name)return;
 const formStatus=$('sarEventFormStatus');state.busy=true;$('sarEventSave').disabled=true;
 try{
   const changes={name,event_type:$('sarEventType').value,event_date:$('sarEventDate').value?new Date($('sarEventDate').value).getTime():null,location:$('sarEventLocation').value.trim(),notes:$('sarEventNotes').value.trim(),updated_at:Date.now()};
   const original=state.editEvent;
   let saved;
   if(original)saved=state.preview?{...original,...changes}:await update('events',original,changes);
   else{
     if(!state.preview)state.events=await query('events');
     const duplicate=state.events.find(x=>normalized(x.name)===normalized(name)&&x.event_date===changes.event_date);
     if(duplicate)throw new Error('An event with this name and date already exists. Select or edit it instead.');
     const row={...changes,event_id:uid('SAR-EVT'),status:'Open',created_at:Date.now(),created_by:state.preview?'Preview':operatorName};
     saved=state.preview?row:await add('events',row);
   }
   state.events=state.events.filter(x=>x.event_id!==saved.event_id).concat(saved);state.busy=false;closeForms();await selectEvent(saved.event_id);
 }catch(e){formStatus.textContent=e.message;formStatus.classList.add('error')}
 finally{state.busy=false;$('sarEventSave').disabled=false;updatePicked()}
}
async function toggleEvent(){
 const e=event();if(!e||state.busy||!enabled())return;
 const latest=currentMap();if(e.status==='Open'&&[...latest.values()].some(r=>r.direction==='IN')){feedback('Check out the members who are still IN before closing this event.',true);return}
 state.busy=true;updatePicked();
 try{
   if(!state.preview){await loadAttendance({renderAfter:false});if(e.status==='Open'&&[...currentMap().values()].some(r=>r.direction==='IN'))throw new Error('Members are still checked IN. Refresh and check them out before closing.');}
   const changes={status:e.status==='Open'?'Closed':'Open',updated_at:Date.now()};
   const saved=state.preview?{...e,...changes}:await update('events',e,changes);
   state.events=state.events.map(x=>x.event_id===saved.event_id?saved:x);stopCamera();if(saved.status==='Closed')$('sarClosedEvents').open=false;$('sarEventConfig').open=false;render();$('sarRoot').scrollTop=0;
 }catch(e){feedback(e.message,true)}finally{state.busy=false;updatePicked()}
}
function openMember(id=''){
 if(!enabled()||state.busy)return;stopCamera();$('sarCheckModal').classList.remove('open');state.editMember=state.members.find(m=>m.member_id===id)||null;const m=state.editMember;
 $('sarMemberForm').reset();$('sarMemberModalTitle').textContent=m?'Edit member':'Add member';$('sarMemberSave').textContent=m?'Save member':'Save member & create card';$('sarMemberStatusWrap').hidden=!m;
 if(m){$('sarMemberName').value=m.name;$('sarMemberDivision').value=m.division;$('sarMemberPhone').value=m.phone||'';$('sarMemberStatus').value=m.status}
 $('sarMemberFormStatus').textContent='';$('sarMemberModal').classList.add('open');setScanTarget();$('sarMemberModal').querySelector('.mx').focus({preventScroll:true});
}
async function saveMember(e){
 e.preventDefault();if(state.busy||!enabled())return;
 const name=$('sarMemberName').value.trim(),division=$('sarMemberDivision').value.trim(),phone=$('sarMemberPhone').value.trim();if(!name||!division)return;
 state.busy=true;$('sarMemberSave').disabled=true;
 try{
   if(!state.preview)state.members=await query('members');
   const original=state.editMember,matching=state.members.filter(m=>normalized(m.name)===normalized(name)&&normalized(m.division)===normalized(division)&&m.member_id!==original?.member_id);
   if(matching.length)throw new Error('A member with this name and division already exists. Use or edit their existing card.');
   const changes={name,division,phone,status:original?$('sarMemberStatus').value:'Active',updated_at:Date.now()};
   let saved;
   if(original)saved=state.preview?{...original,...changes}:await update('members',original,changes);
   else{const row={...changes,member_id:uid('SAR-MEM'),created_at:Date.now(),created_by:state.preview?'Preview':operatorName};saved=state.preview?row:await add('members',row)}
   state.members=state.members.filter(m=>m.member_id!==saved.member_id).concat(saved);state.memberId=saved.member_id;state.busy=false;closeForms();render();await viewCard(saved.member_id);
 }catch(e){$('sarMemberFormStatus').textContent=e.message;$('sarMemberFormStatus').classList.add('error')}
 finally{state.busy=false;$('sarMemberSave').disabled=false;updatePicked()}
}
async function scan(raw){
 if(document.body.dataset.system!=='sar'||state.tab!=='events'||!enabled()||state.busy||!event()||event().status!=='Open')return;
 openCheck();
 try{
   let data;try{data=JSON.parse(raw)}catch(e){data=null}
   if(data&&data.t!=='sar-member')throw new Error('This is not a SAR member card. LPC Evac cards are separate.');
   const id=data?String(data.id||''):String(raw).trim();if(!/^SAR-MEM-[a-z0-9-]+$/i.test(id))throw new Error('Scan a SAR member QR or enter a SAR member ID.');
   const rows=state.preview?state.members.filter(m=>m.member_id===id):await query('members',`member_id='${sql(id)}'`);
   if(rows.length!==1)throw new Error(rows.length?'Duplicate member IDs found. Contact the table owner.':'Member card was not found.');
   const m=rows[0];if(m.status!=='Active')throw new Error('This member is inactive. Review the member registry.');
   state.members=state.members.filter(x=>x.member_id!==id).concat(m);state.memberId=id;state.direction='';state.pending=null;
   await loadAttendance({renderAfter:false});$('sarMemberPick').value=id;updatePicked();$('sarScanInput').value='';setCheckStep('review');feedback('');
 }catch(e){feedback(e.message,true)}
}
async function record(direction){
 const e=event(),m=member();if(!e||!m||state.busy||!enabled()||!['IN','OUT'].includes(direction))return;
 state.busy=true;updatePicked();stopCamera();feedback('Saving…');
 try{
   if(!state.preview){
     // Resolve uncertain retries by stable record ID before checking current state.
     if(state.pending&&state.pending.event_id===e.event_id&&state.pending.member_id===m.member_id&&state.pending.direction===direction){const prior=await query('attendance',`record_id='${sql(state.pending.record_id)}'`);if(prior.length){await afterRecord(prior[0]);return}}
     const events=await query('events',`event_id='${sql(e.event_id)}'`),members=await query('members',`member_id='${sql(m.member_id)}'`);
     if(events.length!==1||events[0].status!=='Open')throw new Error('This event is no longer open. Refresh events.');
     if(members.length!==1||members[0].status!=='Active')throw new Error('This member is no longer active. Refresh members.');
     await loadAttendance({renderAfter:false});
   }else if(e.status!=='Open'||m.status!=='Active')throw new Error('Select an open event and an active member.');
   const current=currentMap().get(m.member_id)?.direction||'OUT';
   if(current===direction)throw new Error(`Member is already ${direction}. No duplicate entry was saved.`);
   const row=state.pending&&state.pending.event_id===e.event_id&&state.pending.member_id===m.member_id&&state.pending.direction===direction?state.pending:{record_id:uid('SAR-ATT'),event_id:e.event_id,member_id:m.member_id,member_name:m.name,division:m.division,direction,check_time:Date.now(),operator_name:state.preview?'Preview':operatorName,notes:$('sarAttendanceNotes').value.trim()};
   state.pending=row;
   const saved=state.preview?{...row,OBJECTID:previewAttendance.length+1}:await add('attendance',row);
   if(state.preview)previewAttendance.push(saved);
   await afterRecord(saved);
 }catch(e){feedback(e.message,true)}finally{state.busy=false;updatePicked()}
}
async function afterRecord(row){
 state.pending=null;
 state.attendance=state.attendance.filter(r=>r.record_id!==row.record_id).concat(row);
 const message=`${state.preview?'Preview: ':''}${row.member_name} checked ${row.direction} · ${fmt(row.check_time)}.`;
 state.memberId='';state.direction='';$('sarAttendanceNotes').value='';$('sarScanInput').value='';renderDetail();setScanTarget();feedback(message);requestAnimationFrame(startCheckCamera);
}
async function toggleCamera(){
 if(cameraStream){stopCamera();return}
 if(!enabled()||!event()||event().status!=='Open'||state.busy)return;
 const version=++cameraVersion;const button=$('sarCheckContent').querySelector('[data-sar-action="camera"]');if(button)button.textContent='Starting camera…';
 try{
   const Native=window.BarcodeDetector,Poly=window.BarcodeDetectionAPI?.BarcodeDetector;
   const formats=Native?await Native.getSupportedFormats():[];
   const Detector=formats.includes('qr_code')?Native:Poly;if(!Detector)throw new Error('Camera scanning is unavailable. Use the USB scanner or select a member.');
   const detector=new Detector({formats:['qr_code']});
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(version!==cameraVersion||document.body.dataset.system!=='sar'){stream.getTracks().forEach(t=>t.stop());return}
   cameraStream=stream;const video=$('sarCameraVideo');video.srcObject=stream;await video.play();$('sarCameraWrap').classList.add('active');$('sarCheckContent').querySelector('[data-sar-action="camera"]').textContent='Stop camera';feedback('');
   const tick=async()=>{
     if(version!==cameraVersion||!cameraStream)return;
     try{const results=await detector.detect(video);if(results[0]?.rawValue){stopCamera();await scan(results[0].rawValue);return}}catch(e){/* Wait for a readable frame. */}
     if(version===cameraVersion)cameraTimer=setTimeout(tick,250);
   };tick();
 }catch(e){if(version===cameraVersion){stopCamera();feedback(e.message||'Camera permission is unavailable.',true)}}
}
function fit(ctx,text,max,start,min=20){let n=start;do{ctx.font=`700 ${n}px Arial, sans-serif`;if(ctx.measureText(text).width<=max)break;n--}while(n>min);return n}
async function renderCard(m){
 const canvas=document.createElement('canvas');canvas.width=638;canvas.height=1013;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,638,1013);
 const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('SAR logo could not be loaded.'));image.src=window.EZTAG_SAR_LOGO});
 const ratio=Math.min(130/image.width,150/image.height);ctx.drawImage(image,(638-image.width*ratio)/2,75,image.width*ratio,image.height*ratio);
 ctx.textAlign='center';ctx.fillStyle='#e81e2c';ctx.font='700 27px Arial, sans-serif';ctx.fillText('LA PLATA COUNTY',319,265);ctx.font='700 31px Arial, sans-serif';ctx.fillText('SEARCH & RESCUE',319,307);
 ctx.fillStyle='#152447';fit(ctx,m.name,550,52);const words=m.name.split(/\s+/);let lines=[''];words.forEach(w=>{const i=lines.length-1,t=lines[i]?lines[i]+' '+w:w;if(ctx.measureText(t).width>550&&lines[i])lines.push(w);else lines[i]=t});
 if(lines.length>2){fit(ctx,m.name,550,36,14);lines=[m.name]}
 lines.forEach((line,i)=>ctx.fillText(line,319,390+i*55));
 ctx.fillStyle='#667797';fit(ctx,m.division,550,29,14);ctx.fillText(m.division,319,510);ctx.font='27px Arial, sans-serif';ctx.fillText(m.phone||'',319,554);
 const qr=qrcode(0,'M');qr.addData(JSON.stringify({t:'sar-member',id:m.member_id,v:1}));qr.make();const count=qr.getModuleCount(),cell=Math.floor(290/(count+8)),size=cell*(count+8),x=Math.round((638-size)/2),y=597;
 ctx.fillStyle='#fff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#142247';for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ctx.fillRect(x+(c+4)*cell,y+(r+4)*cell,cell,cell);
 ctx.fillStyle='#7b879d';ctx.font='15px monospace';ctx.fillText(m.member_id,319,928);ctx.font='21px Arial, sans-serif';ctx.fillText('LPCSAR · MEMBER CARD',319,970);
 if(state.preview){ctx.fillStyle='#a12836';ctx.font='bold 20px Arial, sans-serif';ctx.fillText('PREVIEW — NOT A SAVED MEMBER',319,340)}
 if(m.status!=='Active'){ctx.fillStyle='#a12836';ctx.font='bold 20px Arial, sans-serif';ctx.fillText('INACTIVE',319,340)}
 return canvas;
}
async function viewCard(id){
 const m=state.members.find(m=>m.member_id===id);if(!m)return;stopCamera();state.card=null;$('sarCardStatus').textContent='Loading card…';$('sarCardModal').classList.add('open');setScanTarget();
 try{const canvas=await renderCard(m),preview=$('sarCardCanvas');preview.width=canvas.width;preview.height=canvas.height;preview.getContext('2d').drawImage(canvas,0,0);state.card={...m};$('sarCardStatus').textContent=state.preview?'Preview card only. The member is not saved.':'Member saved. Printing is optional.'}
 catch(e){$('sarCardStatus').textContent=e.message}
}
function saveCard(){if(!state.card)return;const a=document.createElement('a');a.download=(state.preview?'PREVIEW_':'')+state.card.member_id+'.png';a.href=$('sarCardCanvas').toDataURL('image/png');a.click()}
function printCard(){
 if(!state.card)return;
 const frame=$('printFrame'),doc=frame.contentDocument||frame.contentWindow.document,url=$('sarCardCanvas').toDataURL('image/png');
 doc.open();doc.write(`<!doctype html><html><head><title>SAR Member Card</title><style>@page{size:85.6mm 53.98mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:85.6mm;height:53.98mm;overflow:hidden}img{position:absolute;top:0;left:0;width:53.70mm;height:85.30mm;object-fit:contain;transform-origin:0 0;transform:translateX(85.30mm) rotate(90deg);break-inside:avoid;page-break-inside:avoid}</style></head><body><img alt="SAR member card" src="${url}"></body></html>`);doc.close();
 const img=doc.querySelector('img'),run=()=>{try{frame.contentWindow.focus();frame.contentWindow.print()}catch(e){$('sarCardStatus').textContent='Printing failed. Use Save PNG and print the image.'}};
 if(img.complete)setTimeout(run,150);else img.onload=()=>setTimeout(run,150);
}
function exportCSV(kind){
 const rows=kind==='members'?state.members:state.attendance,columns=kind==='members'?['member_id','name','division','phone','status']:['record_id','event_id','member_id','member_name','division','direction','check_time','operator_name','notes'];
 const csv=[columns,...rows.map(r=>columns.map(k=>k==='check_time'?new Date(r[k]).toISOString():r[k]))].map(r=>r.map(csvCell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(state.preview?'PREVIEW_':'')+'LPCSAR_'+kind+'_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function preview(on){
 if(configured)return;
 stop();state.loadVersion++;state.attendanceVersion++;state.preview=on;state.ready=false;state.events=[];state.members=[];state.attendance=[];previewAttendance=[];state.eventId='';state.memberId='';state.pending=null;closeForms();connection();render();
}
$('sarModeToggle').addEventListener('click',e=>{
 const tab=e.target.closest('[data-sar-tab]');if(!tab||document.body.dataset.system!=='sar')return;
 stopCamera();state.tab=tab.dataset.sarTab;render();
});
$('systemMode').addEventListener('click',()=>switchSystem(document.body.dataset.system==='sar'?'evac':'sar'));$('sarMemberSearch').addEventListener('input',renderMembers);$('sarEventForm').addEventListener('submit',saveEvent);$('sarMemberForm').addEventListener('submit',saveMember);
$('sarRoot').addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.sarTab){stopCamera();state.tab=button.dataset.sarTab;render();return}
 if(button.dataset.sarEvent){await selectEvent(button.dataset.sarEvent);return}
 if(button.dataset.sarCard){await viewCard(button.dataset.sarCard);return}
 if(button.dataset.sarEditMember){openMember(button.dataset.sarEditMember);return}
 if(button.dataset.sarDirection){pickDirection(button.dataset.sarDirection);return}
 const action=button.dataset.sarAction;
 const handlers={'review-member':reviewMember,'save-attendance':()=>record(state.direction),'open-check':openCheck,'close-check':closeForms,'new-event':()=>openEvent(),'edit-event':()=>openEvent(true),'close-event':closeForms,'toggle-event':toggleEvent,'new-member':()=>openMember(),'add-for-event':()=>openMember(),'close-member':closeForms,'close-card':closeForms,'print-card':printCard,'full-card':()=>{if(state.card)openCardDisplay('sarCardCanvas')},'save-card':saveCard,'camera':toggleCamera,'preview':()=>preview(true),'exit-preview':()=>preview(false),'export-members':()=>exportCSV('members'),'export-attendance':()=>exportCSV('attendance'),'refresh-attendance':async()=>{try{await loadAttendance()}catch(e){feedback(e.message,true)}},'clear-member':resetCheckin};
 try{await handlers[action]?.()}catch(e){if($('sarFeedback'))feedback(e.message,true);else connection(e.message)}
});
// iOS keyboards resize/pan the visual viewport without resizing the layout viewport.
let viewportFrame=null;
function syncSARViewport(){
 viewportFrame=null;
 const viewport=window.visualViewport,height=viewport?.height||window.innerHeight,top=viewport?.offsetTop||0;
 const root=document.documentElement;
 root.style.setProperty('--sar-viewport-height',height+'px');
 root.style.setProperty('--sar-viewport-top',top+'px');
 const editing=!!document.activeElement?.matches('input,textarea,select');
 const reduced=height<Math.max(window.innerHeight,root.clientHeight)-100||height<500;
 root.dataset.sarKeyboard=String(editing&&reduced);
}
function scheduleSARViewport(){if(viewportFrame===null)viewportFrame=requestAnimationFrame(syncSARViewport)}
window.visualViewport?.addEventListener('resize',scheduleSARViewport);
window.visualViewport?.addEventListener('scroll',scheduleSARViewport);
window.addEventListener('resize',scheduleSARViewport);
document.addEventListener('focusin',scheduleSARViewport);
document.addEventListener('focusout',scheduleSARViewport);
syncSARViewport();
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
window.SAR={switchSystem,refresh,scan,stop,onLogin(){if(document.body.dataset.system==='sar'){refresh()}}};
let initial='evac';try{initial=sessionStorage.getItem('eztag_system')==='sar'?'sar':'evac'}catch(e){}
if(initial==='sar')switchSystem('sar');else document.body.dataset.system='evac';
})();
