/* Shared county supply ledger. Stock is consumed only by confirmed distributions. */
window.LPCInventory=(()=>{
 const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:3}),pct=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:1});
 const state={ready:false,loading:false,error:'',entries:[],operations:[],tables:null,selected:new Map(),location:'',resource:'',operation:'',activityScope:'open',mounted:false,version:0};
 let pending=null;
 function balances(entries,distributions){
   const stocks=new Map(),seen=new Set();
   const ordered=entries.map((row,index)=>({row,index})).filter(({row})=>{if(!row.entry_id||seen.has(row.entry_id))return false;seen.add(row.entry_id);return true}).sort((a,b)=>(Number(a.row.recorded_at)||0)-(Number(b.row.recorded_at)||0)||a.index-b.index).map(x=>x.row);
   for(const row of ordered)if(row.record_type==='stock'&&row.entry_id===row.inventory_id&&!stocks.has(row.inventory_id))stocks.set(row.inventory_id,{...row,supplied:Number(row.quantity)||0,issued:0,active:true,versionId:row.entry_id});
   for(const row of ordered){const stock=stocks.get(row.inventory_id);if(!stock)continue;
     if(row.record_type==='receipt'&&Number.isFinite(Number(row.quantity)))stock.supplied+=Number(row.quantity);
     if(['stock_update','stock_count','stock_inactive','stock_active'].includes(row.record_type)){
       for(const field of ['resource_type','resource_name','unit','location'])stock[field]=row[field];
       if(row.record_type==='stock_count'&&Number.isFinite(Number(row.quantity)))stock.supplied=Number(row.quantity);
       if(row.record_type==='stock_inactive')stock.active=false;if(row.record_type==='stock_active')stock.active=true;
       stock.versionId=row.entry_id;
     }
   }
   const issued=new Set();for(const row of distributions){if(!row.distribution_id||issued.has(row.distribution_id))continue;issued.add(row.distribution_id);const stock=stocks.get(row.preset_id);if(stock&&Number.isFinite(Number(row.quantity)))stock.issued+=Number(row.quantity)}
   return [...stocks.values()].map(s=>({...s,remaining:s.supplied-s.issued,percent:s.supplied>0?100*(s.supplied-s.issued)/s.supplied:0}));
 }
 let stockCacheEntries=null,stockCacheRows=null,stockCache=[];
 function allStocks(){if(stockCacheEntries!==state.entries||stockCacheRows!==resourceRows){stockCache=balances(state.entries,resourceRows);stockCacheEntries=state.entries;stockCacheRows=resourceRows}return stockCache}
 const resourceKey=s=>JSON.stringify([s.resource_type,s.resource_name,s.unit]);
 function visibleStocks(){return allStocks().filter(s=>s.active&&(!state.location||s.location===state.location)&&(!state.resource||resourceKey(s)===state.resource))}
 function operation(){return state.operations.find(o=>o.operation_id===state.operation)}
 function usable(){return state.ready&&!state.loading&&resourceHistoryState==='ready'}
 function currentItems(){return [...state.selected].map(([id,quantity])=>{const s=allStocks().find(s=>s.inventory_id===id);return s?.active?{key:id,preset:id,type:s.resource_type,name:s.resource_name,unit:s.unit,quantity,inventoryId:id,location:s.location,operationId:state.operation}:null}).filter(Boolean)}
 function preferenceKey(){return 'lpc-resource-last-items:'+String(window.LPC_RESOURCE_CONFIG?.inventoryTableUrl||window.LPC_RESOURCE_CONFIG?.serviceUrl||'')}
 function restoreChoices(){
   try{const rows=JSON.parse(window.localStorage?.getItem(preferenceKey())||'[]');if(!Array.isArray(rows))return;
     state.selected=new Map(rows.slice(0,50).filter(row=>Array.isArray(row)&&row.length===2&&typeof row[0]==='string'&&Number.isFinite(Number(row[1]))&&String(row[1]??'').trim()!==''&&Number(row[1])>=0&&allStocks().some(s=>s.active&&s.inventory_id===row[0])).map(([id,q])=>[id,Number(q)]));
   }catch{/* Choices still persist between recipients when device storage is unavailable. */}
 }
 function remember(items){
   if(!state.ready)return;const stocks=new Set(allStocks().filter(s=>s.active).map(s=>s.inventory_id));
   const rows=items.filter(i=>stocks.has(i.preset)&&Number.isFinite(Number(i.quantity))&&String(i.quantity??'').trim()!==''&&Number(i.quantity)>=0).map(i=>[i.preset,Number(i.quantity)]);
   state.selected=new Map(rows);try{window.localStorage?.setItem(preferenceKey(),JSON.stringify(rows))}catch{/* Shared records are saved independently of device preferences. */}
 }
 function setConfiguration(open,kind='county'){
   const county=open&&kind==='county',ops=open&&kind==='operations',dialog=$('riManagementDialog');
   dialog.dataset.kind=kind;
   $('resourceInventoryConfig').hidden=!county;$('riOperationConfig').hidden=!ops;
   if(county&&!pending)setCountyAction(null);
   if(ops){const resume=pending?.kind==='operations';dialog.dataset.page=resume?'new-operation':'operations';$('riDialogTitle').textContent=resume?'Create operation':'Operation setup';$('riNewOperation').hidden=!resume}
   $('riCountySetup').setAttribute('aria-expanded',String(county));$('riOperationSetup').setAttribute('aria-expanded',String(ops));$('riSelectedOperation').setAttribute('aria-expanded',String(ops));
   if(open){if(!dialog.open)dialog.showModal()}else{if(dialog.open)dialog.close();$(kind==='operations'?'riOperationSetup':'riCountySetup').focus({preventScroll:true})}
 }
 function setCountyAction(action){
   const dialog=$('riManagementDialog');dialog.dataset.page=action||'county';
   $('riDialogTitle').textContent=action==='stock'?'Add a resource':action==='receipt'?'Receive stock':action==='revise'?'Edit supply details':action==='count'?'Update supply':action==='deactivate'?'Make supply inactive':action==='activate'?'Reactivate supply':'County inventory';
   $('riAddStock').hidden=action!=='stock';$('riReceiveStock').hidden=action!=='receipt';
   if($('riSupplyEditor'))$('riSupplyEditor').hidden=!['revise','count','deactivate','activate'].includes(action);
   if($('riSupplyLists'))$('riSupplyLists').hidden=!!action;
 }
 function chooseOperation(id){
   if(resourceSaving||$('resourceForm')?._pendingResource)return;
   if(id&&!state.operations.some(o=>o.operation_id===id))return;
   state.operation=id;if(!id)state.activityScope='open';syncDraft();setConfiguration(false,'operations');render();renderResourceHistory();
 }
 function syncDraft(){if(!state.ready)return;resourceDraftItems=currentItems();if($('resourceForm')&&$('resourceForm').dataset.saved!=='true'&&!$('resourceForm')._pendingResource){activeResourceItems=currentItems();$('resourceItemSummary').textContent='Distributing: '+describeResourceItems(activeResourceItems);$('resourceSave').textContent=activeResourceItems.length?'Save '+activeResourceItems.length+' item'+(activeResourceItems.length===1?'':'s'):'Select resources to save';$('resourceSave').disabled=!activeResourceItems.length}}
 async function resolve(){
   const config=window.LPC_RESOURCE_CONFIG||{},service=String(config.serviceUrl||'').replace(/\/$/,'');
   let tables=[];if(!config.inventoryTableUrl||!config.operationsTableUrl){if(!service)throw new Error('Set the Resource service URL.');tables=(await resourceMetadata(service)).tables||[]}
   const pick=(override,name)=>override||(()=>{const found=tables.filter(t=>String(t.name).toLowerCase()===name.toLowerCase());if(found.length!==1)throw new Error('Shared inventory setup needed: add Resource_Inventory and Resource_Operations. Existing distribution entry remains available.');return service+'/'+found[0].id})();
   const urls={stock:pick(config.inventoryTableUrl,'Resource_Inventory'),operations:pick(config.operationsTableUrl,'Resource_Operations')};
   for(const [kind,source] of Object.entries(urls)){
     let url=String(source).trim().replace(/\/$/,'');
     if(/\/FeatureServer$/i.test(url)){
       const serviceMetadata=await resourceMetadata(url),tables=serviceMetadata.tables||[],name=kind==='stock'?'Resource_Inventory':'Resource_Operations';
       const matches=tables.filter(t=>String(t.name).toLowerCase()===name.toLowerCase());
       const table=matches.length===1?matches[0]:tables.length===1?tables[0]:null;
       if(!table||!Number.isInteger(table.id))throw new Error('Cannot identify '+name+'. Publish it as a nonspatial table or configure its exact /FeatureServer/<table ID> URL.');
       url+='/'+table.id;
     }
     if(!/\/FeatureServer\/\d+$/i.test(url))throw new Error('Inventory URLs must end in /FeatureServer or /FeatureServer/<table ID>.');
     const m=await resourceMetadata(url),fields=new Map((m.fields||[]).map(f=>[f.name,f])),oid=(m.fields||[]).find(f=>f.type==='esriFieldTypeOID');
     const expected=kind==='stock'?{entry_id:'String',inventory_id:'String',record_type:'String',resource_type:'String',resource_name:'String',unit:'String',location:'String',quantity:'Double',recorded_at:'Date',operator_name:'String',notes:'String'}:{operation_id:'String',name:'String',status:'String',created_at:'Date',operator_name:'String'};
     if(m.geometryType||!oid||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(oid.name)||Object.entries(expected).some(([n,t])=>fields.get(n)?.type!=='esriFieldType'+t))throw new Error('Check '+kind+' table fields in RESOURCE_GIS_SETUP.md.');
     const caps=String(m.capabilities||'').toLowerCase().split(',').map(s=>s.trim());if(!caps.includes('query')||!caps.includes('create')||(kind==='operations'&&!caps.includes('update')))throw new Error('Enable Query/Create'+(kind==='operations'?'/Update':'')+' on '+kind+'.');
     if(m.advancedQueryCapabilities?.supportsPagination===false)throw new Error('Enable pagination on '+kind+'.');
     urls[kind]={url,oid:oid.name};
   }
   return urls;
 }
 async function queryAll(table){
   const token=await getAgolToken(table.url),rows=[];let offset=0;
   while(true){const r=await resourceQuery(table.url,token,{where:'1=1',outFields:'*',returnGeometry:'false',orderByFields:table.oid+' ASC',resultOffset:String(offset),resultRecordCount:'1000'});if(!Array.isArray(r.features))throw new Error('Inventory records were not returned.');rows.push(...r.features.map(f=>f.attributes));if(!r.exceededTransferLimit)return rows;if(!r.features.length)throw new Error('Inventory page was incomplete.');offset+=r.features.length}
 }
 async function refresh(){
   if(state.loading)return;const version=state.version;state.loading=true;render();
   try{const tables=await resolve(),entries=await queryAll(tables.stock),operations=await queryAll(tables.operations);if(version!==state.version)return;
     const first=!state.ready;state.tables=tables;state.entries=entries;state.operations=operations;state.ready=true;state.error='';
     if(first){state.selected.clear();restoreChoices();syncDraft()}
   }catch(e){if(version===state.version)state.error=e.message}
   finally{if(version===state.version){state.loading=false;render();if(typeof renderResourceHistory==='function')renderResourceHistory()}}
 }
 async function edit(kind,attributes,update=false){
   const table=state.tables[kind],token=await getAgolToken(table.url),action=update?'updateFeatures':'addFeatures';
   const response=await fetch(table.url+'/'+action,{method:'POST',body:new URLSearchParams({f:'json',token,rollbackOnFailure:'true',features:JSON.stringify([{attributes}])})});const result=await response.json();const row=(update?result.updateResults:result.addResults)?.[0];
   if(!response.ok||result.error||!row?.success)throw new Error(result.error?.message||row?.error?.description||'Inventory save was not confirmed. Retry this action.');
 }
 function revisionRow(stock,mode,fields,entries){
   const quantity=mode==='count'?Number(fields.quantity)+stock.issued:0;
   if(mode==='count'&&(!Number.isFinite(Number(fields.quantity))||Number(fields.quantity)<0))throw new Error('Enter the physical quantity on hand, zero or greater.');
   const detail=mode==='revise'?fields:stock;
   if(!String(detail.resource_name||'').trim()||!String(detail.resource_type||'').trim()||!String(detail.location||'').trim())throw new Error('Complete resource name, category and storage location.');
   const latest=Math.max(0,...entries.filter(r=>r.inventory_id===stock.inventory_id).map(r=>Number(r.recorded_at)||0));
   return {entry_id:'RREV-'+crypto.randomUUID(),inventory_id:stock.inventory_id,record_type:mode==='deactivate'?'stock_inactive':mode==='activate'?'stock_active':mode==='count'?'stock_count':'stock_update',resource_type:detail.resource_type.trim(),resource_name:detail.resource_name.trim(),unit:stock.unit,location:detail.location.trim(),quantity,recorded_at:Math.max(Date.now(),latest+1),operator_name:operatorName,notes:String(fields.notes||'').trim()};
 }
 function openSupplyEditor(id,mode){
   if(pending||resourceSaving)return;const stock=allStocks().find(s=>s.inventory_id===id);if(!stock)return;const form=$('riSupplyEditForm');
   form.reset();for(const [key,value] of Object.entries({stock:id,mode,name:stock.resource_name,type:stock.resource_type,unit:stock.unit,location:stock.location,quantity:Math.max(0,stock.remaining)}))form.elements.namedItem(key).value=value;
   for(const key of ['name','type','location']){const field=form.elements.namedItem(key);field.disabled=mode!=='revise';field.required=mode==='revise'}
   form.elements.namedItem('quantity').disabled=mode!=='count';form.elements.namedItem('quantity').required=mode==='count';
   $('riEditDetails').hidden=mode!=='revise';$('riEditQuantity').hidden=mode!=='count';
   const title=mode==='revise'?'Edit supply details':mode==='count'?'Update quantity on hand':mode==='deactivate'?'Make supply inactive':'Reactivate supply';
   $('riSupplyEditTitle').textContent=title;$('riSupplyEditContext').textContent=stock.resource_name+' · '+stock.location+' · '+fmt(stock.remaining)+' '+stock.unit+' on hand';
   $('riSupplyEditSave').textContent=mode==='deactivate'?'Make inactive':mode==='activate'?'Reactivate':'Save';
   form.querySelector('[role="status"]').textContent='';setCountyAction(mode);
 }
 function renderSupplies(stocks){
   const active=$('riActiveSupplies'),inactive=$('riInactiveSupplies');active.replaceChildren();inactive.replaceChildren();$('riInactiveGroup').hidden=!stocks.some(s=>!s.active);
   if(!stocks.some(s=>s.active)){const p=document.createElement('p');p.className='resource-help';p.textContent=state.ready?'No active supplies. Add a resource to begin.':'Connect shared inventory to load supplies.';active.append(p)}
   for(const stock of stocks){const card=document.createElement('article');card.className='ri-supply-card';
     card.innerHTML='<h4>'+esc(stock.resource_name)+'</h4><p>'+esc(stock.location+' · '+stock.unit)+'</p><p><strong>'+esc(usable()?fmt(stock.remaining)+' on hand':'Count unavailable')+'</strong> · '+(stock.active?'Active':'Inactive')+'</p><p class="resource-help">'+esc(fmt(stock.issued)+' issued · '+fmt(stock.supplied)+' total received / corrected')+'</p>';
     const actions=document.createElement('div');actions.className='ri-supply-actions';
     for(const [label,mode] of [['Edit details','revise'],['Update supply','count'],[stock.active?'Make inactive':'Reactivate',stock.active?'deactivate':'activate']]){const b=document.createElement('button');b.className='b';b.type='button';b.textContent=label;b.disabled=!!pending||resourceSaving||state.loading;b.onclick=()=>openSupplyEditor(stock.inventory_id,mode);actions.append(b)}
     card.append(actions);const history=document.createElement('details');history.className='ri-supply-history';const summary=document.createElement('summary');summary.textContent='Revision & supply history';history.append(summary);
     const entries=state.entries.filter(r=>r.inventory_id===stock.inventory_id).sort((a,b)=>Number(b.recorded_at||0)-Number(a.recorded_at||0));
     for(const entry of entries){const line=document.createElement('p');const version=['stock','stock_update','stock_count','stock_inactive','stock_active'].includes(entry.record_type);const status=version?(entry.entry_id===stock.versionId?(stock.active?'Current active version':'Current inactive version'):'Superseded / inactive version'):'Stock receipt';line.textContent=[entry.resource_name,entry.location,entry.recorded_at?new Date(entry.recorded_at).toLocaleString():'',status,entry.record_type==='receipt'?entry.quantity+' '+stock.unit+' received':entry.record_type==='stock'?entry.quantity+' '+stock.unit+' starting supply':entry.record_type==='stock_count'?entry.quantity+' '+stock.unit+' corrected supply basis':'Supply details / status revised',entry.operator_name,entry.notes].filter(Boolean).join(' · ');history.append(line)}
     card.append(history);(stock.active?active:inactive).append(card);
   }
 }
 async function saveEntry(form,kind){
   if(pending&&pending.form!==form)throw new Error('Retry the pending inventory save first.');
   if(!pending){const value=n=>form.elements.namedItem(n).value.trim();let row;
     if(['restock','revise','count','deactivate','activate'].includes(kind)){await refresh();await loadResourceHistory();if(!usable()||state.error)throw new Error('Refresh supplies and distribution history before making a change.')}
     if(['revise','count','deactivate','activate'].includes(kind)){
       const stock=allStocks().find(s=>s.inventory_id===value('stock'));if(!stock)throw new Error('This supply is no longer available.');
       row=revisionRow(stock,kind,{resource_name:kind==='revise'?value('name'):stock.resource_name,resource_type:kind==='revise'?value('type'):stock.resource_type,location:kind==='revise'?value('location'):stock.location,quantity:kind==='count'?value('quantity'):stock.remaining,notes:value('notes')},state.entries);
       if((stock.active||kind==='activate')&&kind!=='deactivate'&&allStocks().some(s=>s.active&&s.inventory_id!==stock.inventory_id&&['resource_type','resource_name','unit','location'].every(k=>String(s[k]).trim().toLowerCase()===row[k].toLowerCase())))throw new Error('An active supply with these details already exists at this location.');
     }else
     if(kind==='operations'){row={operation_id:'ROP-'+crypto.randomUUID(),name:value('name'),status:'Open',created_at:Date.now(),operator_name:operatorName};if(!row.name)throw new Error('Enter an operation name.')}
     else{const id=value('stock'),restock=kind==='restock',quantity=Number(value('quantity'));if(!Number.isFinite(quantity)||quantity<0||(restock&&quantity===0))throw new Error('Enter a valid supply quantity.');
       const inventoryId=restock?id:'RINV-'+crypto.randomUUID();if(restock&&!allStocks().some(e=>e.active&&e.inventory_id===id))throw new Error('Select a configured resource.');
       row={entry_id:restock?'RREC-'+crypto.randomUUID():inventoryId,inventory_id:inventoryId,record_type:restock?'receipt':'stock',quantity,recorded_at:Date.now(),operator_name:operatorName,notes:value('notes'),resource_type:restock?'':value('type'),resource_name:restock?'':value('name'),unit:restock?'':value('unit'),location:restock?'':value('location')};
       if(!restock&&allStocks().some(s=>s.active&&['resource_type','resource_name','unit','location'].every(k=>String(s[k]).trim().toLowerCase()===row[k].toLowerCase())))throw new Error('This resource already exists at this location. Use Receive stock.');
       if(!restock&&(!row.resource_type||!row.resource_name||!row.unit||!row.location))throw new Error('Complete resource name, category, unit and location.');
     }
     pending={form,kind:kind==='operations'?'operations':'stock',row};
   }
   // Retain the ID and freeze fields on uncertain responses; a retry checks the same ID.
   form.querySelectorAll('input,select,textarea').forEach(e=>e.disabled=true);
   const p=pending,table=state.tables[p.kind],field=p.kind==='stock'?'entry_id':'operation_id',token=await getAgolToken(table.url);
   const found=await resourceQuery(table.url,token,{where:field+"='"+p.row[field].replace(/'/g,"''")+"'",outFields:field,returnGeometry:'false'});
   if(!Array.isArray(found.features))throw new Error('Could not verify inventory save. Retry.');
   if(!found.features.length)await edit(p.kind,p.row);
   const row=p.row;pending=null;form.reset();form.querySelectorAll('input,select,textarea').forEach(e=>e.disabled=false);
   await refresh();if(p.kind==='operations')state.operation=row.operation_id;
   if(row.record_type==='stock_inactive'){state.selected.delete(row.inventory_id);remember(currentItems())}
   syncDraft();
   setCountyAction(null);$('riNewOperation').hidden=true;setConfiguration(false,p.kind==='operations'?'operations':'county');render();if(p.kind==='operations')renderResourceHistory();return row;
 }
 function mount(section){
   if(state.mounted)return;state.mounted=true;
   const host=document.createElement('div');host.id='resourceInventory';section.prepend(host);
   host.innerHTML=`<div class="ri-heading"><h2>Resource Tracker</h2><button id="riSelectedOperation" class="ri-selected-operation sar-selected-event" type="button" aria-label="Select or change operation" aria-expanded="false" aria-controls="riOperationConfig"></button><div class="ri-setup-actions"><button class="b" id="riOperationSetup" type="button" aria-expanded="false" aria-controls="riOperationConfig">Operation setup</button><button class="b" id="riCountySetup" type="button" aria-expanded="false" aria-controls="resourceInventoryConfig">County inventory</button><button class="b" id="riRefresh" type="button">Refresh</button></div></div>
    <p id="riConnection" class="resource-help" role="status"></p><div id="riMetrics" class="ri-metrics"></div>
    <section id="riOperationConfig" hidden aria-label="Operation setup"><div class="ri-config-heading"><div><span class="ri-command-label">Command staff</span><h3>Operation setup</h3></div><button class="b" id="riOperationDone" type="button">Close</button></div>
      <p class="resource-help">Choose an open operation to track its distributions, or create one. County supplies stay shared.</p><div class="ri-panel-actions"><button class="b ba" id="riCreateOperation" type="button">New operation</button><button class="b" id="riCountyOperation" type="button">Countywide / no operation</button></div>
      <div id="riNewOperation" hidden><form id="riOperationForm" class="ri-form"><label>Operation name<input name="name" maxlength="150" required placeholder="Enter operation name"></label><button class="b ba" type="submit">Create &amp; use operation</button><button class="b" id="riCancelOperation" type="button">Cancel</button><p role="status"></p></form></div>
      <h4 class="ri-section-label">Open operations</h4><div id="riOpenOperations"></div><details id="riClosedOperationsGroup"><summary>Closed operations</summary><div id="riClosedOperations"></div></details>
    </section>
    <section id="resourceInventoryConfig" hidden aria-label="County inventory"><div class="ri-config-heading"><div><span class="ri-command-label">Command staff</span><h3>County inventory</h3></div><button class="b" id="riCountyDone" type="button">Close</button></div>
      <p class="resource-help">Manage the supplies physically stored across the county. Choose what you need to do.</p><div class="ri-panel-actions"><button class="b" id="riAddStockAction" type="button">Add a resource</button><button class="b" id="riReceiveStockAction" type="button">Receive stock</button></div>
      <div id="riConfigForms"><section id="riSupplyEditor" hidden><h4 id="riSupplyEditTitle"></h4><p id="riSupplyEditContext" class="resource-help"></p><p class="resource-help">This saves a new revision. Earlier rows remain in the table and history.</p><form id="riSupplyEditForm" class="ri-form"><input name="stock" type="hidden"><input name="mode" type="hidden"><div id="riEditDetails" class="ri-edit-details"><label>Resource name<input name="name" maxlength="150"></label><label>Category<input name="type" maxlength="80"></label><label>Storage location<input name="location" maxlength="150"></label><label>Unit<input name="unit" readonly></label></div><label id="riEditQuantity">Physical quantity on hand<input name="quantity" type="number" min="0" step="any"></label><label>Reason / notes (optional)<input name="notes" maxlength="2000"></label><button id="riSupplyEditSave" class="b ba" type="submit">Save</button><button id="riSupplyEditCancel" class="b" type="button">Close</button><p role="status"></p></form></section><section id="riAddStock" hidden><h4 class="ri-section-label">1. Choose a resource</h4><div id="riCommonResources" class="ri-pills"></div><h4 class="ri-section-label">2. Enter location &amp; starting supply</h4><form id="riStockForm" class="ri-form"><input name="stock" type="hidden" value=""><label>Resource name<input name="name" maxlength="150" required placeholder="Enter resource name"></label><label>Category<input name="type" maxlength="80" required placeholder="Enter resource category"></label><label>Storage location<input name="location" maxlength="150" required placeholder="Enter storage location"></label><label>Unit (case, box, each)<input name="unit" maxlength="40" required placeholder="Enter unit of measure"></label><label>Starting supply<input name="quantity" type="number" min="0" step="any" required></label><label>Notes (optional)<input name="notes" maxlength="2000"></label><button class="b ba" type="submit">Save starting supply</button><p role="status"></p></form></section>
      <section id="riReceiveStock" hidden><h4 class="ri-section-label">1. Choose the resource &amp; storage location</h4><div id="riReceiptChoices" class="ri-choice-list"></div><p id="riReceiptPrompt" class="resource-help">Choose a supply above to enter the delivery amount.</p><button id="riChangeReceipt" class="b" type="button" hidden>Choose a different supply</button><form id="riReceiptForm" class="ri-form"><input name="stock" id="riRestockChoice" type="hidden"><p id="riReceiptSelected" class="ri-form-context"></p><label>Quantity received<input name="quantity" type="number" min="0.001" step="any" required></label><label>Notes (optional)<input name="notes" maxlength="2000"></label><button class="b ba" type="submit">Add stock</button><p role="status"></p></form></section></div>
      <section id="riSupplyLists"><h4 class="ri-section-label">Active supplies</h4><div id="riActiveSupplies" class="ri-supply-list"></div><details id="riInactiveGroup"><summary>Inactive supplies</summary><div id="riInactiveSupplies" class="ri-supply-list"></div></details></section>
      <a href="https://github.com/Matthew-Richardson/TrackLPC/blob/main/RESOURCE_GIS_SETUP.md" target="_blank" rel="noopener">Shared inventory setup guide</a>
    </section>
    <details id="riFilters" class="ri-dashboard-filters"><summary>Filter dashboard &amp; activity</summary><div id="riActivityScope" class="ri-activity-scope" aria-label="Countywide activity scope"><h4 class="ri-section-label">Countywide activity</h4><button class="ri-pill" id="riOpenActivity" type="button" aria-pressed="true">Open operations</button><button class="ri-pill" id="riAllActivity" type="button" aria-pressed="false">Open + closed</button></div><h4 class="ri-section-label">Location</h4><div id="riLocationChoices" class="ri-pills"></div><h4 class="ri-section-label">Resource</h4><div id="riResourceChoices" class="ri-pills"></div></details>
    <p class="resource-help ri-scan-help">Scan or enter a person, then choose resources and amounts inside check-in.</p>`;
   const dialog=document.createElement('dialog');dialog.id='riManagementDialog';dialog.className='ri-management-dialog';dialog.setAttribute('aria-labelledby','riDialogTitle');
   dialog.innerHTML='<div class="ri-dialog-header"><h2 id="riDialogTitle">Resource setup</h2><button class="b" type="button" id="riDialogClose" autofocus>Close</button></div><div class="ri-dialog-content" id="riDialogContent"></div>';
   document.body.append(dialog);$('riDialogContent').append($('riOperationConfig'),$('resourceInventoryConfig'));
   $('riDialogClose').onclick=()=>setConfiguration(false,dialog.dataset.kind||'county');
   dialog.addEventListener('cancel',e=>{e.preventDefault();setConfiguration(false,dialog.dataset.kind||'county')});
   for(const id of ['riOperationSetup','riCountySetup','riSelectedOperation'])$(id).setAttribute('aria-haspopup','dialog');
   for(const [id,kind] of [['riStockForm','county'],['riReceiptForm','county'],['riOperationForm','operations'],['riSupplyEditForm','county']]){
     const form=$(id),actions=document.createElement('div');actions.className='ri-form-actions';
     const save=form.querySelector('button[type="submit"]');let close=form.querySelector('button[type="button"]');
     if(!close){close=document.createElement('button');close.type='button';close.className='b';close.textContent='Close'}
     close.textContent='Close';close.onclick=()=>setConfiguration(false,kind);actions.append(save,close);form.append(actions);
   }
   const fitDialog=()=>{const view=window.visualViewport;dialog.style.setProperty('--ri-visible-height',(view?.height||window.innerHeight)+'px');dialog.style.setProperty('--ri-visible-top',(view?.offsetTop||0)+'px')};
   window.visualViewport?.addEventListener('resize',fitDialog);window.visualViewport?.addEventListener('scroll',fitDialog);window.addEventListener('resize',fitDialog);fitDialog();
   $('riOpenActivity').onclick=()=>setActivityScope('open');$('riAllActivity').onclick=()=>setActivityScope('all');
   $('riSelectedOperation').onclick=()=>setConfiguration($('riOperationConfig').hidden,'operations');
   $('riOperationSetup').onclick=()=>setConfiguration($('riOperationConfig').hidden,'operations');
   $('riCountySetup').onclick=()=>setConfiguration($('resourceInventoryConfig').hidden,'county');
   $('riOperationDone').onclick=()=>setConfiguration(false,'operations');$('riCountyDone').onclick=()=>setConfiguration(false,'county');
   $('riCreateOperation').onclick=()=>{$('riManagementDialog').dataset.page='new-operation';$('riDialogTitle').textContent='Create operation';$('riNewOperation').hidden=false};
   $('riCancelOperation').onclick=()=>setConfiguration(false,'operations');$('riCountyOperation').onclick=()=>chooseOperation('');
   $('riSupplyEditCancel').onclick=()=>setConfiguration(false,'county');
   $('riChangeReceipt').onclick=()=>{$('riRestockChoice').value='';render()};
   $('riAddStockAction').onclick=()=>setCountyAction('stock');$('riReceiveStockAction').onclick=()=>setCountyAction('receipt');
   for(const preset of RESOURCE_PRESETS){const button=document.createElement('button');button.type='button';button.className='ri-pill';button.textContent=preset[0]==='custom'?'Custom resource':preset[2];button.onclick=()=>{const form=$('riStockForm');for(const [field,value] of [['name',preset[2]],['type',preset[1]],['unit',preset[3]]])form.elements.namedItem(field).value=value};$('riCommonResources').append(button)}
   $('riRefresh').onclick=async()=>{await refresh();await loadResourceHistory()};
   for(const [id,kind] of [['riStockForm','stock'],['riReceiptForm','restock'],['riOperationForm','operations'],['riSupplyEditForm','revision']])$(id).onsubmit=async e=>{e.preventDefault();const form=$(id),button=form.querySelector('button'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Saving…';try{if(!usable())throw new Error('Refresh inventory and distribution history before configuring supplies.');await saveEntry(form,kind==='revision'?form.elements.namedItem('mode').value:kind);status.textContent='Saved.'}catch(err){status.textContent=err.message}finally{button.disabled=false}};
   render();void refresh();
 }
 function selectStock(id){
   if(resourceSaving||$('resourceForm')?._pendingResource)return;
   if(state.selected.has(id))state.selected.delete(id);else state.selected.set(id,1);
   syncDraft();renderSelection();
 }
 function renderPills(pills,quantities){
   if(!pills||!quantities)return;pills.replaceChildren();quantities.replaceChildren();
   const locked=resourceSaving||!!($('resourceForm')?._pendingResource)||($('modal')?.classList.contains('open')&&$('resourceForm')?.dataset.saved==='true');
   const choices=new Map(allStocks().filter(s=>(s.active||state.selected.has(s.inventory_id))&&(!state.location||s.location===state.location||state.selected.has(s.inventory_id))).map(s=>[s.inventory_id,s]));
   for(const stock of choices.values()){
     const on=state.selected.has(stock.inventory_id),button=document.createElement('button');button.type='button';button.className='ri-pill';button.setAttribute('aria-pressed',String(on));button.textContent=stock.resource_name+' · '+stock.location+(stock.active?'':' · Inactive');button.disabled=locked||!usable()||(!on&&(!stock.active||stock.remaining<=0))||operation()?.status==='Closed';button.onclick=()=>selectStock(stock.inventory_id);pills.append(button);
   }
   for(const [id,q] of state.selected){const stock=allStocks().find(s=>s.inventory_id===id);if(!stock)continue;const label=document.createElement('label');label.textContent=stock.resource_name+' · '+stock.location+' ('+stock.unit+')';const input=document.createElement('input');input.type='number';input.min='0';input.step='any';input.value=q;input.required=true;input.disabled=locked||!stock.active;input.setAttribute('aria-label','Quantity of '+stock.resource_name+' from '+stock.location);input.oninput=()=>{state.selected.set(id,input.value);syncDraft()};label.append(input);quantities.append(label)}
 }
 function renderSelection(){if(document.activeElement?.closest?.('.ri-quantities'))return;renderPills($('riRecipientPills'),$('riRecipientQuantities'))}
 function mountRecipient(panel){
   if(!state.ready)return;const box=document.createElement('section');box.className='ri-recipient-selection';box.setAttribute('aria-label','Resources for this person');
   box.innerHTML='<h3>Resources for this person</h3><div id="riRecipientPills" class="ri-pills"></div><div id="riRecipientQuantities" class="ri-quantities"></div><p class="ri-choice-hint">Your last-used resources and amounts stay ready for the next person.</p>';
   $('resourceForm').insertBefore(box,$('resourceItemSummary'));$('resourceItemSummary').hidden=true;syncDraft();renderSelection();
 }

 function render(){
   if(!state.mounted)return;
   $('riConnection').textContent=state.loading?'Refreshing shared supply counts…':state.error||(!state.ready?'Connect shared inventory to track supply.':'Shared county inventory · counts update from saved distributions.');
   $('riConnection').hidden=state.ready&&!state.error;
   $('riConnection').dataset.error=state.error?'true':'false';$('riRefresh').disabled=state.loading;
   for(const id of ['riConfigForms','riMetrics','riFilters'])$(id).hidden=!state.ready;
   $('resourceSelection').dataset.inventory=String(state.ready);
   for(const id of ['resourceSelectionForm','resourceAddItem'])if($(id))$(id).hidden=state.ready;
   const all=allStocks(),stocks=visibleStocks(),groups=new Map(all.map(s=>[resourceKey(s),s]));
   const selected=operation(),operationName=selected?.name||'Countywide assistance';
   $('riSelectedOperation').innerHTML='<strong>'+esc(operationName)+'</strong>'+(selected?'<span class="ri-selector-status">'+esc(selected.status)+'</span>':'')+'<svg class="ri-selector-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
   $('riSelectedOperation').setAttribute('aria-label','Operation: '+operationName+'. Select operation');
   const filterButtons=(id,items,key)=>{const list=$(id);list.replaceChildren();for(const [value,label] of items){const b=document.createElement('button');b.type='button';b.className='ri-pill';b.textContent=label;b.setAttribute('aria-pressed',String(state[key]===value));b.onclick=()=>{state[key]=value;render();renderResourceHistory()};list.append(b)}};
   filterButtons('riLocationChoices',[['','All locations'],...[...new Set(all.map(s=>s.location))].sort().map(s=>[s,s])],'location');
   filterButtons('riResourceChoices',[['','All resources'],...[...groups].map(([key,s])=>[key,s.resource_name+' ('+s.unit+')'])],'resource');
   const receiptChoices=$('riReceiptChoices');receiptChoices.replaceChildren();
   const receiptId=$('riRestockChoice').value,receiptStock=all.find(s=>s.inventory_id===receiptId);
   $('riReceiptChoices').hidden=!!receiptStock;$('riReceiptForm').hidden=!receiptStock;$('riReceiptPrompt').hidden=!!receiptStock;$('riChangeReceipt').hidden=!receiptStock;
   $('riReceiptSelected').textContent=receiptStock?'2. Add quantity received: '+receiptStock.resource_name+' · '+receiptStock.location+' ('+receiptStock.unit+')':'Select a resource above to continue.';
   $('riReceiptForm').querySelector('button[type="submit"]').disabled=!receiptStock||state.loading;
   renderSupplies(all);
   for(const stock of all.filter(s=>s.active)){const b=document.createElement('button');b.type='button';b.className='ri-stock-choice';b.innerHTML='<strong>'+esc(stock.resource_name)+'</strong><span>'+esc(stock.location+' · '+stock.unit)+'</span>';b.setAttribute('aria-pressed',String(stock.inventory_id===receiptId));b.disabled=!!pending;b.onclick=()=>{$('riRestockChoice').value=stock.inventory_id;render()};receiptChoices.append(b)}
   const scoped=filterRows(resourceRows);
   $('riActivityScope').hidden=!state.ready||!!state.operation;
   $('riOpenActivity').setAttribute('aria-pressed',String(state.activityScope==='open'));$('riAllActivity').setAttribute('aria-pressed',String(state.activityScope==='all'));
   const people=new Set(scoped.map(r=>r.card_id||JSON.stringify([r.name,r.address]))).size;
   const supplied=stocks.reduce((n,s)=>n+s.supplied,0),remaining=stocks.reduce((n,s)=>n+s.remaining,0),issued=stocks.reduce((n,s)=>n+s.issued,0);
   const metrics=state.resource?[[fmt(remaining),'Remaining '+(stocks[0]?.unit||'units')],[supplied>0?pct(remaining/supplied*100)+'%':'—','Supply remaining'],[fmt(state.operation?scoped.reduce((n,r)=>n+Number(r.quantity||0),0):issued),state.operation?'Issued · operation':'Issued from stock'],[fmt(people),'People served'+(state.operation?' · operation':'')]]:[[fmt(new Set(stocks.map(resourceKey)).size),'Configured resources'],[fmt(new Set(stocks.map(s=>s.location)).size),'Stock locations'],[fmt(people),'People served'+(state.operation?' · operation':'')],[fmt(stocks.filter(s=>s.remaining<=0||s.percent<=20).length),'Low / empty supplies']];
   $('riMetrics').innerHTML=metrics.map(([value,label])=>'<div'+(label==='Low / empty supplies'?' title="Resource/location supplies with 20% or less of total received remaining, including empty stock."':'')+'><strong>'+esc(usable()?value:'—')+'</strong><span>'+esc(label)+'</span></div>').join('');


   $('riClosedOperationsGroup').hidden=!state.operations.some(o=>o.status==='Closed');
   for(const [id,status] of [['riOpenOperations','Open'],['riClosedOperations','Closed']]){
     const list=$(id);list.replaceChildren();const ops=state.operations.filter(o=>o.status===status).sort((a,b)=>Number(b.created_at)-Number(a.created_at));
     if(!ops.length&&status==='Open'){const p=document.createElement('p');p.className='resource-help';p.textContent='No open operations. Use New operation to begin tracking.';list.append(p)}
     for(const op of ops){const row=document.createElement('div');row.className='ri-operation-row';const choose=document.createElement('button');choose.className='sar-event-item ri-operation-choice';choose.type='button';choose.innerHTML='<strong>'+esc(op.name)+'</strong><span>'+esc(op.status)+'</span>';choose.setAttribute('aria-pressed',String(op.operation_id===state.operation));choose.disabled=resourceSaving;choose.onclick=()=>chooseOperation(op.operation_id);
       const b=document.createElement('button');b.className='b';b.type='button';b.textContent=status==='Open'?'Close':'Reopen';b.disabled=state.loading||!!pending||resourceSaving;b.onclick=async()=>{if(pending||resourceSaving)return;b.disabled=true;try{await edit('operations',{[state.tables.operations.oid]:op[state.tables.operations.oid],status:status==='Open'?'Closed':'Open'},true);await refresh();$('riClosedOperationsGroup').open=false;setConfiguration(false,'operations')}catch(e){$('riConnection').textContent=e.message}finally{b.disabled=false}};row.append(choose,b);list.append(row)}
   }
   if(workflowMode==='resource')$('zoneScanBtn').disabled=state.ready&&(!usable()||operation()?.status==='Closed');
   renderSelection();
 }
 function validateSelection({allowEmpty=false}={}){if(!state.ready)return;if(!usable()||state.error)throw new Error('Refresh shared inventory and history before distributing.');if(state.operation&&!operation())throw new Error('Select an available operation.');if(operation()?.status==='Closed')throw new Error('Reopen the operation or select county inventory.');syncDraft();if(!allowEmpty){if([...state.selected.keys()].some(id=>!allStocks().some(s=>s.active&&s.inventory_id===id)))throw new Error('A selected supply is inactive. Remove it and select an active supply.');validateResourceItems(resourceDraftItems)}}
 async function checkStock(items){
   const tracked=items.filter(i=>String(i.preset).startsWith('RINV-'));if(!tracked.length)return;
   if(!state.ready)throw new Error('Connect shared inventory before distributing tracked stock.');
   await refresh();await loadResourceHistory();if(!usable()||state.error)throw new Error('Supply availability could not be verified. Refresh and retry.');
   const required=new Map();for(const i of tracked){required.set(i.preset,(required.get(i.preset)||0)+Number(i.quantity));if(i.operationId&&!state.operations.some(o=>o.operation_id===i.operationId&&o.status==='Open'))throw new Error('The selected operation is closed or unavailable.')}
   for(const [id,q] of required){const stock=allStocks().find(s=>s.inventory_id===id);if(stock&&!stock.active)throw new Error(stock.resource_name+' is inactive. Select an active supply.');if(!stock||q>stock.remaining+1e-9)throw new Error('Not enough supply for '+(stock?.resource_name||'this resource')+'. Available: '+fmt(stock?.remaining||0)+'.')}
 }
 function setActivityScope(mode){
   if(!['open','all'].includes(mode))return;state.activityScope=mode;render();if(typeof renderResourceHistory==='function')renderResourceHistory();
 }
 function filterRows(rows){
   if(!state.ready)return rows;const stocks=allStocks(),open=new Set(state.operations.filter(o=>o.status==='Open').map(o=>o.operation_id));
   return rows.filter(r=>(state.operation?r.incident===state.operation:state.activityScope==='all'||!String(r.incident||'').trim()||open.has(r.incident))&&(!state.location||stocks.some(s=>s.inventory_id===r.preset_id&&s.location===state.location))&&(!state.resource||stocks.some(s=>s.inventory_id===r.preset_id&&resourceKey(s)===state.resource)));
 }
 function describe(row){
   const at=Number(row.recorded_at??row.distributed_at),current=allStocks().find(s=>s.inventory_id===row.preset_id);let location=current?.location||'';
   if(Number.isFinite(at)){
     const versions=state.entries.filter(e=>e.inventory_id===row.preset_id&&['stock','stock_update','stock_count','stock_inactive','stock_active'].includes(e.record_type)&&(Number(e.recorded_at)||0)<=at).sort((a,b)=>(Number(a.recorded_at)||0)-(Number(b.recorded_at)||0));
     if(versions.length)location=versions.at(-1).location||'';
   }
   return {location,operation:state.operations.find(o=>o.operation_id===row.incident)?.name||''};
 }

 return {mount,refresh,render,mountRecipient,remember,validateSelection,checkStock,filterRows,setActivityScope,describe,balances,enabled:()=>state.ready};
})();
