const VERSION='0.000.009';
const KEY='mobud-production-data-v0.000.009';
const RECOVERY_PREFIX='mobud-recovery-';
const PREFERENCES_KEY=KEY.includes('beta')?'mobud-beta-preferences-v1':'mobud-production-preferences-v1';
const LEGACY_KEYS=['mobud-production-data-v0.000.008','mobud-production-data-v0.000.007','mobud-production-data-v0.000.006','mobud-production-data','vialego-data-v0.000.004','vialego-data-v0.000.003','tsumoriq-data-v0.000.001'];
const APP_CONFIG=window.MOBUD_CONFIG||window.VIALEGO_CONFIG||{};
const API=APP_CONFIG.API_BASE||'';
const GOOGLE_CLIENT_ID=APP_CONFIG.GOOGLE_CLIENT_ID||'';
const DEVICE_KEY='mobud-production-device-id';
const DEVICE_ID=localStorage.getItem(DEVICE_KEY)||uidDevice();
if(!localStorage.getItem(DEVICE_KEY))localStorage.setItem(DEVICE_KEY,DEVICE_ID);
function secureId(prefix='id'){const id=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,12)}`;return `${prefix}_${id}`}
function uidDevice(){return secureId('device')}
const todayISO=()=>new Date().toISOString().slice(0,10);
const uid=p=>secureId(p);
const fmtMonth=d=>d.toLocaleDateString(window.MOBUD_I18N?.locale?.()||undefined,{month:'long',year:'numeric'});
const t=(text)=>window.MOBUD_I18N?.tr?.(text)||text;
const iconId=t=>({bicycle:'i-bike',ebike:'i-ebike',speed_pedelec:'i-ebike',car:'i-car',van:'i-car',motorcycle:'i-motorcycle',scooter:'i-motorcycle',public_transport:'i-train',plane:'i-plane',helicopter:'i-helicopter',walking:'i-walk',other:'i-more'})[t]||'i-more';
const iconType=t=>`<svg aria-hidden="true"><use href="#${iconId(t)}"/></svg>`
const VEHICLE_TYPE_LABELS={bicycle:'Bicycle',ebike:'Electric bicycle',speed_pedelec:'Speed pedelec',car:'Car',van:'Van',motorcycle:'Motorcycle',scooter:'Scooter / moped',plane:'Plane',helicopter:'Helicopter',other:'Other vehicle',public_transport:'Public transport',walking:'Walking'};
const POWERTRAIN_LABELS={not_applicable:'Not applicable',electric:'Electric',petrol:'Petrol',diesel:'Diesel',hybrid_petrol:'Hybrid petrol',hybrid_diesel:'Hybrid diesel',plug_in_hybrid:'Plug-in hybrid',lpg:'LPG',cng:'CNG',hydrogen:'Hydrogen',kerosene:'Kerosene',other:'Other'};
const vehicleTypeLabel=value=>t(VEHICLE_TYPE_LABELS[value]||'Other vehicle');
const powertrainLabel=value=>t(POWERTRAIN_LABELS[value]||'Not applicable');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX_BACKUP_BYTES=25_000_000,MAX_ROWS=50_000,MAX_TEXT=5000,ALLOWED_ATTACHMENT_TYPES=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
const cleanText=(value,max=MAX_TEXT)=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').slice(0,max);
const safeAttr=value=>escapeHtml(cleanText(value,300));
function safeUrl(value,{allowHttp=false}={}){if(!value)return '';try{const u=new URL(String(value),location.origin);if(u.protocol==='https:'||(allowHttp&&u.protocol==='http:'))return u.href}catch{}return ''}
function safeCoords(value){return Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&value[0]>=-180&&value[0]<=180&&value[1]>=-90&&value[1]<=90?value:null}
function safeAttachment(a){if(!a||typeof a!=='object')return null;const type=cleanText(a.type,100);if(!ALLOWED_ATTACHMENT_TYPES.has(type))return null;const data=typeof a.data==='string'?a.data:'';if(!data.startsWith(`data:${type};base64,`)||data.length>6_000_000)return null;return {name:cleanText(a.name,180).replace(/[\/\\]/g,'_'),type,data,date:cleanText(a.date,50)}}
function validateBackupShape(d){if(!d||typeof d!=='object'||Array.isArray(d))return false;for(const key of ['trips','expenses','vehicles'])if(!Array.isArray(d[key])||d[key].length>MAX_ROWS)return false;if(!d.settings||typeof d.settings!=='object'||Array.isArray(d.settings))return false;try{return JSON.stringify(d).length<=MAX_BACKUP_BYTES}catch{return false}}
const fresh=()=>({version:VERSION,onboardingComplete:false,settings:{name:'',currency:'€',unit:'km',home1:'',homeLabel:'Home',work:'',workLabel:'Work',backupFrequency:'never',reportFrequency:'never',notifyUpdates:false,commuteReminderMode:'never',dailyReminderTime:'19:00',weeklyReminderDay:6,weeklyReminderTime:'10:00',lastCommuteReminder:'',theme:'system',language:(window.MOBUD_I18N?.language||'en'),storageMode:'local',driveConnected:false,lastDriveSync:'',country:'BE',locations:[]},vehicles:[],trips:[],expenses:[],tombstones:{trips:[],expenses:[],vehicles:[]},syncMeta:{modifiedAt:'',settingsUpdatedAt:'',preferencesUpdatedAt:'',addressesUpdatedAt:'',updatedByDevice:DEVICE_ID,changeToken:''},addresses:{},routeCache:{},selectedDirection:'home-work'});
function preferencePayload(){return {updatedAt:state?.syncMeta?.preferencesUpdatedAt||new Date().toISOString(),settings:{name:state?.settings?.name||'',language:state?.settings?.language||'en',currency:state?.settings?.currency||'€',unit:state?.settings?.unit||'km',theme:state?.settings?.theme||'system',country:state?.settings?.country||'BE',backupFrequency:state?.settings?.backupFrequency||'never',reportFrequency:state?.settings?.reportFrequency||'never',notifyUpdates:!!state?.settings?.notifyUpdates,commuteReminderMode:state?.settings?.commuteReminderMode||'never',dailyReminderTime:state?.settings?.dailyReminderTime||'19:00',weeklyReminderDay:Number(state?.settings?.weeklyReminderDay??6),weeklyReminderTime:state?.settings?.weeklyReminderTime||'10:00'}}}
function persistLocalPreferences(){try{localStorage.setItem(PREFERENCES_KEY,JSON.stringify(preferencePayload()))}catch{}}
function applyLocalPreferences(data){const saved=safeParse(localStorage.getItem(PREFERENCES_KEY));if(!saved?.settings)return data;const savedTime=Date.parse(saved.updatedAt||0)||0,currentTime=Date.parse(data?.syncMeta?.preferencesUpdatedAt||data?.syncMeta?.settingsUpdatedAt||0)||0;if(savedTime>=currentTime){data.settings={...data.settings,...saved.settings};data.syncMeta={...(data.syncMeta||{}),preferencesUpdatedAt:saved.updatedAt,settingsUpdatedAt:new Date(Math.max(savedTime,Date.parse(data?.syncMeta?.settingsUpdatedAt||0)||0)).toISOString()}}return data}
function safeParse(raw){try{return raw?JSON.parse(raw):null}catch{return null}}
function normalized(data){const base=fresh(),d=data&&typeof data==='object'?data:{},stamp=d.syncMeta?.modifiedAt||d.exportedAt||new Date(0).toISOString();const stampRows=rows=>(Array.isArray(rows)?rows:[]).map(x=>({...x,updatedAt:x.updatedAt||x.createdAt||stamp,updatedByDevice:x.updatedByDevice||d.syncMeta?.updatedByDevice||''}));const mergedSettings={...base.settings,...(d.settings||{})};if(!Array.isArray(mergedSettings.locations))mergedSettings.locations=[];[['home2','Second address'],['home3','Third address']].forEach(([key,label])=>{if(mergedSettings[key]&&!mergedSettings.locations.some(l=>l.legacyKey===key))mergedSettings.locations.push({id:uid('location'),kind:'other',label,address:mergedSettings[key],legacyKey:key})});return {...base,...d,settings:mergedSettings,vehicles:stampRows(d.vehicles).map(v=>({...v,odometerBase:Number(v.odometerBase??v.currentOdometer??v.initialOdometer??0),odometerBaselineTripKm:Number(v.odometerBaselineTripKm??0)})),trips:stampRows(d.trips),expenses:stampRows(d.expenses),tombstones:{trips:Array.isArray(d.tombstones?.trips)?d.tombstones.trips:[],expenses:Array.isArray(d.tombstones?.expenses)?d.tombstones.expenses:[],vehicles:Array.isArray(d.tombstones?.vehicles)?d.tombstones.vehicles:[]},syncMeta:{...base.syncMeta,...(d.syncMeta||{})},addresses:d.addresses&&typeof d.addresses==='object'?d.addresses:{},routeCache:d.routeCache&&typeof d.routeCache==='object'?d.routeCache:{}}}
function validData(d){return validateBackupShape(d)}
function snapshot(key,raw,label='migration'){if(!raw)return null;const stamp=new Date().toISOString().replace(/[:.]/g,'-');const recoveryKey=`${RECOVERY_PREFIX}${label}-${stamp}`;try{localStorage.setItem(recoveryKey,JSON.stringify({sourceKey:key,createdAt:new Date().toISOString(),raw}));return recoveryKey}catch{return null}}
function migrate(){
  const currentRaw=localStorage.getItem(KEY),current=safeParse(currentRaw);
  if(validData(current))return normalized(current);
  if(currentRaw)snapshot(KEY,currentRaw,'invalid-current');
  for(const key of LEGACY_KEYS){
    const raw=localStorage.getItem(key),old=safeParse(raw);
    if(!validData(old)&&!(old&&Array.isArray(old.trips)&&Array.isArray(old.expenses)))continue;
    snapshot(key,raw,'before-v004');
    const next=normalized(old);
    next.version=VERSION;
    next.onboardingComplete=old.onboardingComplete!==undefined?old.onboardingComplete:true;
    try{
      localStorage.setItem(KEY,JSON.stringify(next));
      const verify=safeParse(localStorage.getItem(KEY));
      if(validData(verify)&&verify.trips.length===next.trips.length&&verify.expenses.length===next.expenses.length)return verify;
    }catch{}
    return normalized(old);
  }
  return fresh();
}
let state=applyLocalPreferences(migrate()),viewDate=new Date(),calendarDate=new Date(),selectedDay=todayISO(),pendingAttachment={trip:null,expense:null},deferredPrompt=null,newWorker=null,tutorialIndex=0,tripOtherCoords={from:null,to:null};
let addressCommitTimer=null;
function applyTheme(pref=state.settings.theme||'system'){const resolved=pref==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):pref;const root=document.documentElement;root.dataset.theme=resolved;root.dataset.themePreference=pref;root.style.colorScheme=resolved;document.body?.setAttribute('data-theme',resolved);document.body?.setAttribute('data-theme-preference',pref);document.querySelector('meta[name=theme-color]')?.setAttribute('content',resolved==='light'?'#f4f4f4':'#111111');document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.setAttribute('content',resolved==='light'?'default':'black-translucent')}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if((state.settings.theme||'system')==='system')applyTheme('system')});
let autoSyncTimer=null,syncBusy=false,suppressAutoSync=false,drivePollTimer=null,sessionHeartbeatTimer=null,lastRemoteModified='';
function touchState(){const now=new Date().toISOString();state.version=VERSION;state.syncMeta={...(state.syncMeta||{}),modifiedAt:now,updatedByDevice:DEVICE_ID};return now}
function save(options={}){if(!options.preserveTimestamp)touchState();const payload=JSON.stringify(state);try{localStorage.setItem(KEY,payload);const check=safeParse(localStorage.getItem(KEY));if(!validData(check)||check.trips.length!==state.trips.length||check.expenses.length!==state.expenses.length)throw new Error('Verification failed');if(!options.skipRender)render();if(!options.skipSync&&!suppressAutoSync)scheduleAutoSync();return true}catch(e){toast('Save failed. Existing data was kept. Export a backup before adding more attachments.');return false}}
function scheduleAutoSync(delay=3000){if(!state.settings.driveConnected||!sessionStorage.getItem('mobudGoogleToken'))return;clearTimeout(autoSyncTimer);autoSyncTimer=setTimeout(()=>syncWithDrive({silent:true,reason:'local-change'}),delay)}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.add('hidden'),2600)}
function setScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById('screen-'+name).classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.screen===name));if(name==='garage')renderGarage();if(name==='stats')renderStats();if(name==='calendar')renderCalendar();window.MOBUD_I18N?.apply?.(document.getElementById('screen-'+name))}
function unitDistance(km){return state.settings.unit==='mi'?`${(km*.621371).toFixed(1)} mi`:`${Number(km||0).toFixed(1)} km`}
function money(n){return `${state.settings.currency}${Number(n||0).toFixed(2)}`}
function monthItems(){const y=viewDate.getFullYear(),m=viewDate.getMonth();const ok=x=>{const d=new Date(x.date+'T12:00:00');return d.getFullYear()===y&&d.getMonth()===m};return {trips:state.trips.filter(ok),expenses:state.expenses.filter(ok)}}
function defaultVehicle(type){return state.vehicles.find(v=>v.type===type&&v.active!==false&&v.isDefault)||state.vehicles.find(v=>v.type===type&&v.active!==false)}
function vehicleById(id){return state.vehicles.find(v=>v.id===id)}
function render(){const {trips,expenses}=monthItems();currentMonthLabel.textContent=fmtMonth(viewDate);statTrips.textContent=trips.length;statKm.textContent=unitDistance(trips.reduce((s,t)=>s+Number(t.km||0),0));statCost.textContent=money(expenses.reduce((s,e)=>s+Number(e.amount||0),0));statReceipts.textContent=expenses.filter(e=>e.attachment).length;{const h=new Date().getHours();const base=h<12?t('Good morning'):h<18?t('Good afternoon'):t('Good evening');greeting.textContent=`${base}${state.settings.name?', '+state.settings.name:''}`;}renderQuick();renderRecent();renderSettings();fillVehicleSelects();window.MOBUD_I18N?.apply?.(document.body)}
function renderQuick(){
  const active=state.vehicles.filter(v=>v.active!==false);
  const usage=v=>state.trips.filter(t=>t.vehicleId===v.id).length;
  const selected=[];
  // First, keep one preferred vehicle per type.
  [...new Set(active.map(v=>v.type))].forEach(type=>{
    const same=active.filter(v=>v.type===type).sort((a,b)=>(Number(b.isDefault)-Number(a.isDefault))||(usage(b)-usage(a)));
    if(same[0]) selected.push(same[0]);
  });
  // Fill remaining places with the most-used remaining vehicles, up to five.
  active.filter(v=>!selected.includes(v)).sort((a,b)=>usage(b)-usage(a)).forEach(v=>{if(selected.length<5)selected.push(v)});
  const picks=selected.sort((a,b)=>(Number(b.isDefault)-Number(a.isDefault))||(usage(b)-usage(a))).slice(0,5);
  quickVehicles.innerHTML=picks.length?picks.map(v=>`<button class="quick-tile" data-quick-vehicle="${v.id}" title="${escapeHtml(v.name)}">${iconType(v.type)}<span>${escapeHtml(v.name)}</span><small>${String(v.type).replaceAll('_',' ')}</small></button>`).join(''):`<button class="quick-tile add-garage-tile" data-open-garage>${iconType('other')}<span>Add vehicle</span><small>Open Garage</small></button>`;
  document.querySelectorAll('[data-quick-vehicle]').forEach(b=>b.onclick=()=>quickLogVehicle(b.dataset.quickVehicle));
  document.querySelector('[data-open-garage]')?.addEventListener('click',()=>setScreen('garage'));
}
async function quickLogVehicle(vehicleId){const v=vehicleById(vehicleId);if(!v)return;const from=state.selectedDirection==='home-work'?'home1':'work',to=state.selectedDirection==='home-work'?'work':'home1';const t={id:uid('trip'),date:todayISO(),vehicleId:v.id,from,to,fromText:addressText(from),toText:addressText(to),km:0,purpose:'Commute',notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedByDevice:DEVICE_ID};const coords=[state.addresses[from]?.coords,state.addresses[to]?.coords];if(coords.every(Boolean)){try{t.km=await routeDistance(coords[0],coords[1],v.type)}catch{}}state.trips.unshift(t);save();toast(`Trip saved · ${v.name} · ${t.km?t.km.toFixed(1)+' km':'edit distance'}`);editTrip(t.id)}
async function quickLog(type){const v=defaultVehicle(type);if(!v&&type!=='public_transport'){openVehicle(type);return}const from=state.selectedDirection==='home-work'?'home1':'work',to=state.selectedDirection==='home-work'?'work':'home1';const t={id:uid('trip'),date:todayISO(),vehicleId:v?.id||'',from,to,fromText:addressText(from),toText:addressText(to),km:0,purpose:'Commute',notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),updatedByDevice:DEVICE_ID};const coords=[state.addresses[from]?.coords,state.addresses[to]?.coords];if(coords.every(Boolean)){try{t.km=await routeDistance(coords[0],coords[1],v.type)}catch{}}state.trips.unshift(t);save();toast(`Trip saved · ${v?.name||'Public transport'} · ${t.km?t.km.toFixed(1)+' km':'edit distance'}`);editTrip(t.id)}
function registrationSortValue(row){
  const date=/^\d{4}-\d{2}-\d{2}$/.test(row.date||'')?row.date:'0000-00-00';
  const created=new Date(row.createdAt||row.updatedAt||0);
  const time=Number.isNaN(created.getTime())?'00:00:00.000':created.toISOString().slice(11,23);
  return `${date}T${time}`;
}
function allRows(){return [...state.trips.map(x=>({...x,kind:'trip'})),...state.expenses.map(x=>({...x,kind:'expense'}))].sort((a,b)=>registrationSortValue(b).localeCompare(registrationSortValue(a))||(b.updatedAt||'').localeCompare(a.updatedAt||''))}
function renderRecent(){const rows=allRows().slice(0,8);recentList.className=rows.length?'list':'list empty-state';recentList.innerHTML=rows.length?rows.map(logHtml).join(''):'No logs yet.';bindLogButtons(recentList)}
function friendlyWhen(date){const d=new Date(date+'T12:00:00'),today=new Date();today.setHours(12,0,0,0);const diff=Math.round((today-d)/86400000);if(diff===0)return 'Today';if(diff===1)return 'Yesterday';return d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}
function logHtml(x){const v=vehicleById(x.vehicleId),type=v?.type||(x.kind==='expense'?'other':'other'),attachment=x.attachment?'<span title="Attachment"> · attachment</span>':'';const title=x.kind==='trip'?friendlyWhen(x.date)+(x.createdAt?' '+new Date(x.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''):cleanText(x.category,200);const subtitle=x.kind==='trip'?(v?.name||t('No specific vehicle')):(v?.name||x.supplier||t('General cost'));const value=x.kind==='trip'?unitDistance(x.km):money(x.amount);const kind=x.kind==='expense'?'expense':'trip';return `<div class="log-row"><div class="log-icon">${iconType(type)}</div><div class="log-main"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}${attachment}</small></div><div class="log-side"><strong>${escapeHtml(value)}</strong><div class="log-actions"><button class="ghost" data-edit-${kind}="${safeAttr(x.id)}">Edit</button><button class="danger" data-delete-${kind}="${safeAttr(x.id)}">Delete</button></div></div></div>`}
function bindLogButtons(root=document){root.querySelectorAll('[data-edit-trip]').forEach(b=>b.onclick=()=>editTrip(b.dataset.editTrip));root.querySelectorAll('[data-edit-expense]').forEach(b=>b.onclick=()=>editExpense(b.dataset.editExpense));root.querySelectorAll('[data-delete-trip]').forEach(b=>b.onclick=()=>deleteLog('trip',b.dataset.deleteTrip));root.querySelectorAll('[data-delete-expense]').forEach(b=>b.onclick=()=>deleteLog('expense',b.dataset.deleteExpense))}
function deleteLog(kind,id){if(!confirm('Delete this record?'))return;if(!confirm('Are you sure? This cannot be undone.'))return;const key=kind==='trip'?'trips':'expenses',now=new Date().toISOString();state[key]=state[key].filter(x=>x.id!==id);state.tombstones[key]=[...(state.tombstones[key]||[]).filter(x=>x.id!==id),{id,deletedAt:now,updatedByDevice:DEVICE_ID}];save();renderCalendar()}
function fillVehicleSelects(){const tripValue=tripVehicle.value,expenseValue=expenseVehicle.value;const opts=[`<option value="">${t('No specific vehicle')}</option>`,...state.vehicles.filter(v=>v.active!==false).map(v=>`<option value="${safeAttr(v.id)}">${escapeHtml(v.name)}${v.isDefault?' · '+t('default'):''}</option>`)].join('');tripVehicle.innerHTML=opts;expenseVehicle.innerHTML=opts;if([...tripVehicle.options].some(o=>o.value===tripValue))tripVehicle.value=tripValue;if([...expenseVehicle.options].some(o=>o.value===expenseValue))expenseVehicle.value=expenseValue}
function allLocations(){
  const base=[
    {id:'home1',kind:'home',label:state.settings.homeLabel||'Home',address:state.settings.home1||''},
    {id:'work',kind:'work',label:state.settings.workLabel||'Work',address:state.settings.work||''}
  ];
  return base.concat(Array.isArray(state.settings.locations)?state.settings.locations:[]);
}
function fillLocations({defaultFrom='home1',defaultTo='work'}={}){
  const previousFrom=tripFrom.value||defaultFrom,previousTo=tripTo.value||defaultTo;
  const locations=allLocations();
  const opts=[...locations.map(l=>[l.id,l.label||l.address||l.id]),['other','Other']];
  tripFrom.innerHTML=opts.map(([k,n])=>`<option value="${k}">${escapeHtml(n)}</option>`).join('');
  tripTo.innerHTML=tripFrom.innerHTML;
  const valid=new Set(opts.map(([k])=>k));
  tripFrom.value=valid.has(previousFrom)?previousFrom:defaultFrom;
  tripTo.value=valid.has(previousTo)?previousTo:defaultTo;
}
function addressText(k){
  if(k==='other')return 'Other';
  const loc=allLocations().find(l=>l.id===k);
  return loc?.address||loc?.label||k;
}
function editTrip(id){const t=state.trips.find(x=>x.id===id);if(!t)return;setScreen('log');document.querySelector('[data-tab="trip"]').click();tripEditId.value=t.id;tripFormTitle.textContent='Edit trip';tripDate.value=t.date;tripVehicle.value=t.vehicleId||'';fillLocations();tripFrom.value=t.from||'home1';tripTo.value=t.to||'work';tripFromOtherWrap.classList.toggle('hidden',tripFrom.value!=='other');tripToOtherWrap.classList.toggle('hidden',tripTo.value!=='other');tripFromOther.value=tripFrom.value==='other'?(t.fromText||''):'';tripToOther.value=tripTo.value==='other'?(t.toText||''):'';tripOtherCoords={from:Array.isArray(t.fromCoords)?t.fromCoords:null,to:Array.isArray(t.toCoords)?t.toCoords:null};tripKm.value=t.km||0;tripPurpose.value=t.purpose||'Commute';tripNotes.value=t.notes||'';pendingAttachment.trip=t.attachment||null;showAttachment('trip');cancelTripEdit.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function editExpense(id){const x=state.expenses.find(e=>e.id===id);if(!x)return;setScreen('log');document.querySelector('[data-tab="expense"]').click();expenseEditId.value=x.id;expenseFormTitle.textContent='Edit cost';expenseDate.value=x.date;expenseVehicle.value=x.vehicleId||'';expenseCategory.value=x.category;expenseAmount.value=x.amount;expenseSupplier.value=x.supplier||'';expenseOdometer.value=x.odometer||'';expenseNotes.value=x.notes||'';pendingAttachment.expense=x.attachment||null;showAttachment('expense');cancelExpenseEdit.classList.remove('hidden')}
function resetTrip({keepDate=false}={}){const selectedDate=tripDate.value||todayISO();tripForm.reset();tripEditId.value='';tripFormTitle.textContent='Log trip';tripDate.value=keepDate?selectedDate:todayISO();pendingAttachment.trip=null;tripOtherCoords={from:null,to:null};tripFromOtherWrap.classList.add('hidden');tripToOtherWrap.classList.add('hidden');tripFromOtherSuggestions.innerHTML='';tripToOtherSuggestions.innerHTML='';showAttachment('trip');cancelTripEdit.classList.add('hidden');fillLocations({defaultFrom:'home1',defaultTo:'work'});tripFrom.value='home1';tripTo.value='work'}
function resetExpense(){expenseForm.reset();expenseEditId.value='';expenseFormTitle.textContent='Cost / receipt';expenseDate.value=todayISO();pendingAttachment.expense=null;showAttachment('expense');cancelExpenseEdit.classList.add('hidden')}
async function fileData(file){if(!file)return null;if(file.size>4_000_000)throw new Error('File too large');if(!ALLOWED_ATTACHMENT_TYPES.has(file.type))throw new Error('Unsupported file type');return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const a=safeAttachment({name:file.name,type:file.type,data:r.result,date:new Date().toISOString()});a?res(a):rej(new Error('Invalid attachment'))};r.onerror=rej;r.readAsDataURL(file)})}
function showAttachment(kind){const box=document.getElementById(kind+'AttachmentInfo'),a=safeAttachment(pendingAttachment[kind]);pendingAttachment[kind]=a;box.classList.toggle('hidden',!a);box.replaceChildren();if(a){box.append(document.createTextNode(`📎 ${a.name} `));const button=document.createElement('button');button.type='button';button.className='ghost small';button.textContent='Remove';button.onclick=()=>{pendingAttachment[kind]=null;showAttachment(kind)};box.append(button)}}
function vehicleDistance(v){return state.trips.filter(t=>t.vehicleId===v.id).reduce((sum,t)=>sum+Number(t.km||0),0)}
function calculatedOdometer(v){const logged=vehicleDistance(v),base=Number(v.odometerBase??v.currentOdometer??v.initialOdometer??0),baseline=Number(v.odometerBaselineTripKm||0);return Math.max(0,base+(logged-baseline))}
function maintenanceTimeline(v){
  const logged=vehicleDistance(v),base=Number(v.odometerBase??v.currentOdometer??v.initialOdometer??0);
  const odometerLogs=state.expenses.filter(e=>e.vehicleId===v.id&&Number(e.odometer||0)>0);
  const current=Math.max(calculatedOdometer(v),...odometerLogs.map(e=>Number(e.odometer||0)),base,0);
  const maintenance=odometerLogs.filter(e=>e.category==='Maintenance').sort((a,b)=>Date.parse(a.date||0)-Date.parse(b.date||0));
  const last=maintenance.at(-1),intervalKm=Number(v.maintenanceKm||0),intervalMonths=Number(v.maintenanceMonths||0);
  const dueKm=intervalKm?Number(last?.odometer||base)+intervalKm:0;
  const anchorDate=last?.date||v.createdAt||todayISO();let dueDate='';
  if(intervalMonths){const d=new Date(anchorDate+'T12:00:00');if(!Number.isNaN(d.getTime())){d.setMonth(d.getMonth()+intervalMonths);dueDate=d.toLocaleDateString(window.MOBUD_I18N?.locale?.()||undefined)}}
  const parts=[];if(dueDate)parts.push(`${t('on')} ${dueDate}`);if(dueKm)parts.push(`${t('at')} ${dueKm.toLocaleString(window.MOBUD_I18N?.locale?.()||undefined)} km`);
  const due=parts.length?`${t('Next maintenance')} ${parts.join(` ${t('or')} `)}`:t('No maintenance interval configured');
  return `<div class="maintenance-summary"><span>${escapeHtml(due)}</span><small>${t('Current odometer')}: ${current.toLocaleString(window.MOBUD_I18N?.locale?.()||undefined,{maximumFractionDigits:1})} km</small></div>`
}
function renderGarage(){const typeFilter=document.getElementById('garageTypeFilter')?.value||'all',powerFilter=document.getElementById('garagePowertrainFilter')?.value||'all';const list=state.vehicles.filter(v=>(typeFilter==='all'||v.type===typeFilter)&&(powerFilter==='all'||(v.powertrain||'not_applicable')===powerFilter));if(!list.length){garageList.innerHTML='<div class="card empty-state">No matching vehicles.</div>';return}garageList.innerHTML=list.map(v=>{const trips=state.trips.filter(t=>t.vehicleId===v.id),logs=state.expenses.filter(e=>e.vehicleId===v.id);const title=[v.brand,v.model].filter(Boolean).join(' ')||v.name;return `<div class="card garage-card"><div class="section-head"><div class="vehicle-title"><span class="vehicle-icon">${iconType(v.type)}</span><div><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(v.name)}</strong><p class="muted">${vehicleTypeLabel(v.type)} · ${powertrainLabel(v.powertrain||'not_applicable')}</p>${v.isDefault?`<span class="default-badge">${t('DEFAULT')}</span>`:''}</div></div><div class="log-actions"><button class="ghost" data-edit-vehicle="${safeAttr(v.id)}">Edit</button><button class="ghost" data-archive-vehicle="${safeAttr(v.id)}">${v.active===false?'Restore':'Archive'}</button></div></div><div class="vehicle-meta"><div><small>Current odometer</small>${unitDistance(calculatedOdometer(v))}</div><div><small>Distance logged</small>${unitDistance(trips.reduce((s,t)=>s+Number(t.km||0),0))}</div><div><small>Tickets & logs</small>${logs.length}</div><div><small>Total cost</small>${money(logs.reduce((s,e)=>s+Number(e.amount||0),0))}</div><div><small>Status</small>${v.active===false?'Archived':'Active'}</div></div>${['bicycle','ebike','speed_pedelec','car','van','motorcycle','scooter'].includes(v.type)?maintenanceTimeline(v):''}${v.leasePartner?`<p>Lease partner: ${link(v.leasePartner,v.leaseUrl)}</p>`:''}${v.maintenanceProvider?`<p>Maintenance: ${link(v.maintenanceProvider,v.maintenanceUrl)}</p>`:''}${v.insurance?`<p>Insurance: ${escapeHtml(v.insurance)}</p>`:''}<button class="secondary small" data-vehicle-logs="${safeAttr(v.id)}">See all logs for this vehicle</button></div>`}).join('');document.querySelectorAll('[data-edit-vehicle]').forEach(b=>b.onclick=()=>openVehicle(null,b.dataset.editVehicle));document.querySelectorAll('[data-archive-vehicle]').forEach(b=>b.onclick=()=>archiveVehicle(b.dataset.archiveVehicle));document.querySelectorAll('[data-vehicle-logs]').forEach(b=>b.onclick=()=>showVehicleLogs(b.dataset.vehicleLogs))}
function link(label,url){const href=safeUrl(url,{allowHttp:true});return href?`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`:escapeHtml(label)}

const POWERTRAIN_OPTIONS={bicycle:[['not_applicable','Not applicable']],ebike:[['electric','Electric']],speed_pedelec:[['electric','Electric']],scooter:[['electric','Electric'],['petrol','Petrol']],motorcycle:[['electric','Electric'],['petrol','Petrol']],car:[['electric','Electric'],['petrol','Petrol'],['diesel','Diesel'],['hybrid_petrol','Hybrid petrol'],['hybrid_diesel','Hybrid diesel'],['plug_in_hybrid','Plug-in hybrid'],['lpg','LPG'],['cng','CNG'],['hydrogen','Hydrogen']],van:[['electric','Electric'],['petrol','Petrol'],['diesel','Diesel'],['hybrid_petrol','Hybrid petrol'],['plug_in_hybrid','Plug-in hybrid'],['lpg','LPG'],['cng','CNG'],['hydrogen','Hydrogen']],plane:[['kerosene','Kerosene'],['electric','Electric'],['other','Other']],helicopter:[['kerosene','Kerosene'],['electric','Electric'],['other','Other']],other:[['not_applicable','Not applicable'],['electric','Electric'],['petrol','Petrol'],['diesel','Diesel'],['other','Other']]};
function updatePowertrainOptions(value){const options=POWERTRAIN_OPTIONS[value]||POWERTRAIN_OPTIONS.other,old=vehiclePowertrain.value;vehiclePowertrain.innerHTML=options.map(([v,l])=>`<option value="${v}">${t(l)}</option>`).join('');if(options.some(([v])=>v===old))vehiclePowertrain.value=old}
function openVehicle(type='bicycle',id=''){vehicleForm.reset();vehicleId.value='';vehicleFormTitle.textContent=id?'Edit vehicle':'Add vehicle';if(id){const v=vehicleById(id);Object.entries({vehicleId:v?.id||'',vehicleType:v.type,vehicleName:v.name,vehicleBrand:v.brand,vehicleModel:v.model,vehicleCurrentOdometer:calculatedOdometer(v),vehiclePowertrain:v.powertrain||'not_applicable',vehicleBoughtFrom:v.boughtFrom,vehicleSellerUrl:v.sellerUrl,vehicleLeasePartner:v.leasePartner,vehicleLeaseUrl:v.leaseUrl,vehicleLeaseStart:v.leaseStart,vehicleLeaseEnd:v.leaseEnd,vehicleMaintenanceProvider:v.maintenanceProvider,vehicleMaintenanceUrl:v.maintenanceUrl,vehicleMaintenanceContact:v.maintenanceContact,vehicleMaintenanceAddress:v.maintenanceAddress,vehicleInsurance:v.insurance,vehicleInsuranceUrl:v.insuranceUrl,vehicleInsurancePhone:v.insurancePhone,vehicleInsuranceAddress:v.insuranceAddress,vehicleSellerPhone:v.sellerPhone,vehicleSellerAddress:v.sellerAddress,vehicleLeasePhone:v.leasePhone,vehicleLeaseAddress:v.leaseAddress,vehicleMaintenanceMonths:v.maintenanceMonths,vehicleMaintenanceKm:v.maintenanceKm}).forEach(([k,val])=>{document.getElementById(k).value=val||''});vehicleDefault.checked=!!v.isDefault;updatePowertrainOptions(v.type);vehiclePowertrain.value=v.powertrain||vehiclePowertrain.value}else{vehicleType.value=type||'bicycle';updatePowertrainOptions(vehicleType.value)}vehicleModal.classList.remove('hidden')}
function archiveVehicle(id){const v=vehicleById(id);if(!v)return;if(v.isDefault&&v.active!==false&&!confirm('This is the default vehicle. Archive it and choose a new default later?'))return;v.active=v.active===false;save();renderGarage()}
function showVehicleLogs(id){selectedDay=todayISO();setScreen('calendar');const rows=allRows().filter(x=>x.vehicleId===id);selectedDayTitle.textContent=`Logs for ${vehicleById(id)?.name||'vehicle'}`;dayLogs.innerHTML=rows.length?rows.map(logHtml).join(''):'No logs.';bindLogButtons(dayLogs)}
function renderStats(){
  const totalKm=state.trips.reduce((s,t)=>s+Number(t.km||0),0);
  const totalCost=state.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const receipts=state.expenses.filter(e=>e.attachment).length;
  const byVehicle=state.vehicles.map(v=>({
    v,
    km:state.trips.filter(t=>t.vehicleId===v.id).reduce((s,t)=>s+Number(t.km||0),0)
  })).filter(x=>x.km>0).sort((a,b)=>b.km-a.km);

  const palette=['#ff9d1c','#ffc14d','#f07818','#d9a441','#f4f4f4','#9b9b9f','#6f7075','#45464b'];
  let cursor=0;
  const gradientParts=byVehicle.map((x,i)=>{
    const percentage=totalKm?x.km/totalKm*100:0;
    const from=cursor;
    cursor+=percentage;
    return `${palette[i%palette.length]} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  const usageChart=byVehicle.length?`<div class="usage-mix-layout"><div class="usage-donut" role="img" aria-label="Share of logged distance by vehicle" style="--usage-gradient:conic-gradient(${gradientParts.join(',')})"><div><strong>${byVehicle.length}</strong><span>${t('vehicles')}</span></div></div><div class="usage-legend">${byVehicle.map((x,i)=>{const percentage=totalKm?x.km/totalKm*100:0;return `<div class="usage-legend-row"><span class="usage-dot" style="background:${palette[i%palette.length]}"></span><span class="usage-name">${escapeHtml(x.v.name)}</span><strong>${percentage.toFixed(1)}%</strong></div>`}).join('')}</div></div>`:'<p class="muted">Log trips with Garage vehicles to see your mobility mix.</p>';

  const cyclingTypes=['bicycle','ebike','speed_pedelec'];
  const cyclingKm=state.trips.filter(t=>cyclingTypes.includes(vehicleById(t.vehicleId)?.type)).reduce((s,t)=>s+Number(t.km||0),0);
  const estimatedCo2Saved=cyclingKm*0.17;

  statsContent.innerHTML=`
    <div class="card usage-mix-card">
      <div class="section-head"><div><h3>Vehicle usage mix</h3><p class="muted">Share of your logged distance</p></div></div>
      ${usageChart}
    </div>
    <div class="stats-kpi-grid">
      <div class="card stat-summary-row"><span>Total trips</span><strong>${state.trips.length}</strong></div>
      <div class="card stat-summary-row"><span>Total distance</span><strong>${unitDistance(totalKm)}</strong></div>
      <div class="card stat-summary-row"><span>Total costs</span><strong>${money(totalCost)}</strong></div>
      <div class="card stat-summary-row"><span>Receipts</span><strong>${receipts}</strong></div>
    </div>
    <div class="card">
      <h3>Distance per vehicle</h3>
      <div class="vehicle-distance-list">${byVehicle.map(x=>`<div class="vehicle-distance-row"><span class="vehicle-distance-icon">${iconType(x.v.type)}</span><span class="vehicle-distance-name">${escapeHtml(x.v.name)}</span><strong>${unitDistance(x.km)}</strong></div>`).join('')||'<p class="muted">No distance yet.</p>'}</div>
    </div>
    <div class="card impact-card">
      <h3>Estimated impact</h3>
      <div class="impact-row"><span>Cycling distance</span><strong>${unitDistance(cyclingKm)}</strong></div>
      <div class="impact-row"><span>Estimated CO₂ avoided</span><strong>${estimatedCo2Saved.toFixed(1)} kg</strong></div>
      <p class="muted">Estimated against an avoided average car journey. Actual savings vary by vehicle, energy source and route.</p>
    </div>`;
}
function renderCalendar(){calendarTitle.textContent=fmtMonth(calendarDate);const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),counts={};allRows().forEach(x=>counts[x.date]=(counts[x.date]||0)+1);let html='';for(let i=0;i<first;i++)html+='<span></span>';for(let d=1;d<=days;d++){const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;html+=`<button class="cal-day ${counts[iso]?'filled':''} ${iso===selectedDay?'selected':''} ${iso===todayISO()?'today':''}" data-day="${iso}"><span>${d}</span>${counts[iso]?`<small>${counts[iso]}</small>`:''}</button>`}calendarGrid.innerHTML=html;document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{selectedDay=b.dataset.day;renderCalendar()});selectedDayTitle.textContent=new Date(selectedDay+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});const rows=allRows().filter(x=>x.date===selectedDay);dayLogs.innerHTML=rows.length?rows.map(logHtml).join(''):'No registrations on this day.';bindLogButtons(dayLogs)}
function renderSettings(){
  settingName.value=state.settings.name||'';
  settingLanguage.value=state.settings.language||window.MOBUD_I18N?.language||'en';
  settingCountry.value=state.settings.country||'BE';
  settingCurrency.value=state.settings.currency||'€';
  settingUnit.value=state.settings.unit||'km';
  settingTheme.value=state.settings.theme||'system';
  commuteReminderMode.value=state.settings.commuteReminderMode||'never';
  dailyReminderTime.value=state.settings.dailyReminderTime||'19:00';
  weeklyReminderDay.value=String(state.settings.weeklyReminderDay??6);
  weeklyReminderTime.value=state.settings.weeklyReminderTime||'10:00';
  backupFrequency.value=state.settings.backupFrequency||'never';
  reportFrequency.value=state.settings.reportFrequency||'never';
  notifyUpdates.checked=!!state.settings.notifyUpdates;
  storageStatus.textContent=state.settings.driveConnected?t('Google Drive connected'):t('Data is stored locally on this device.');
  lastSyncStatus.textContent=`${t('Last sync')}: ${state.settings.lastDriveSync||t('never')}`;
  lastSyncStatus.classList.toggle('hidden',!state.settings.driveConnected);
  linkDrive.classList.toggle('hidden',state.settings.driveConnected);
  syncDrive.classList.toggle('hidden',!state.settings.driveConnected);
  driveBackupCreate.classList.toggle('hidden',!state.settings.driveConnected);
  driveBackupImport.classList.toggle('hidden',!state.settings.driveConnected);
  disconnectDrive.classList.toggle('hidden',!state.settings.driveConnected);
  renderAddressSettings();
  renderMobilityProviders();
  renderFaq();
}
function addressEditorRow(loc,locked=false){
  return `<div class="address-editor" data-location-row="${escapeHtml(loc.id)}"><div class="address-editor-head"><label>Location name<input data-location-label="${escapeHtml(loc.id)}" value="${escapeHtml(loc.label||'')}" placeholder="e.g. Home, Office, Parents"></label>${locked?'':`<button type="button" class="ghost small" data-remove-location="${escapeHtml(loc.id)}">Remove</button>`}</div><label>Address<input data-address="${escapeHtml(loc.id)}" value="${escapeHtml(loc.address||'')}" placeholder="Enter and select an address"><div class="suggestions" id="suggest_${escapeHtml(loc.id)}"></div></label></div>`;
}
function isEditingAddressSettings(){
  const active=document.activeElement;
  return !!(active&&addressFields?.contains(active)&&(active.matches('[data-location-label]')||active.matches('[data-address]')));
}
function queueAddressCommit(){
  const now=new Date().toISOString();
  state.syncMeta.settingsUpdatedAt=now;
  state.syncMeta.addressesUpdatedAt=now;
  save({skipRender:true,skipSync:true});
  clearTimeout(addressCommitTimer);
  addressCommitTimer=setTimeout(()=>save({skipRender:true}),900);
}
function renderAddressSettings({force=false}={}){
  if(!force&&isEditingAddressSettings())return;
  const locations=allLocations();
  addressFields.innerHTML=locations.map(l=>addressEditorRow(l,l.id==='home1'||l.id==='work')).join('')+'<button type="button" id="addAddress" class="secondary">+ Add address</button>';
  document.querySelectorAll('[data-location-label]').forEach(inp=>inp.oninput=()=>updateLocationLabel(inp.dataset.locationLabel,inp.value));
  document.querySelectorAll('[data-address]').forEach(inp=>{let timer;inp.oninput=()=>{updateLocationAddress(inp.dataset.address,inp.value);clearTimeout(timer);timer=setTimeout(()=>searchAddress(inp.dataset.address,inp.value),450)}});
  document.querySelectorAll('[data-remove-location]').forEach(btn=>btn.onclick=()=>removeLocation(btn.dataset.removeLocation));
  document.getElementById('addAddress').onclick=addLocation;
}
function updateLocationLabel(id,value){
  if(id==='home1')state.settings.homeLabel=value;
  else if(id==='work')state.settings.workLabel=value;
  else{const loc=(state.settings.locations||[]).find(x=>x.id===id);if(loc)loc.label=value}
  queueAddressCommit();
  renderDirectionLabels();
}
function updateLocationAddress(id,value){
  if(id==='home1')state.settings.home1=value;
  else if(id==='work')state.settings.work=value;
  else{const loc=(state.settings.locations||[]).find(x=>x.id===id);if(loc)loc.address=value}
  if(state.addresses[id])state.addresses[id].label=value;
  queueAddressCommit();
}
function addLocation(){
  state.settings.locations=Array.isArray(state.settings.locations)?state.settings.locations:[];
  state.settings.locations.push({id:uid('location'),kind:'other',label:'New address',address:''});
  {const now=new Date().toISOString();state.syncMeta.settingsUpdatedAt=now;state.syncMeta.addressesUpdatedAt=now}save();renderAddressSettings({force:true});fillLocations();
}
function removeLocation(id){
  if(!confirm('Remove this saved address? Existing trips keep their stored text.'))return;
  state.settings.locations=(state.settings.locations||[]).filter(x=>x.id!==id);delete state.addresses[id];
  {const now=new Date().toISOString();state.syncMeta.settingsUpdatedAt=now;state.syncMeta.addressesUpdatedAt=now}save();renderAddressSettings({force:true});fillLocations();
}
function renderDirectionLabels(){
  const home=allLocations().find(l=>l.id==='home1')?.label||'Home';
  const work=allLocations().find(l=>l.id==='work')?.label||'Work';
  const a=dirHomeWork?.querySelector('span'),b=dirWorkHome?.querySelector('span');
  if(a)a.textContent=`${home} → ${work}`;if(b)b.textContent=`${work} → ${home}`;
}
async function renderMobilityProviders(){
  const country=state.settings.country||'BE';
  mobilityProviderList.innerHTML='<p class="muted">Loading providers…</p>';
  try{
    const r=await fetch('./content/mobility-providers.json',{cache:'no-store'});if(!r.ok)throw new Error();
    const providers=(await r.json()).filter(p=>p.country===country);
    mobilityProviderList.innerHTML=providers.length?providers.map(p=>`<article class="provider-item"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.category||'Mobility provider')}</small></div><div class="provider-actions"><a class="ghost small" href="${escapeHtml(safeUrl(p.website,{allowHttp:true}))}" target="_blank" rel="noopener noreferrer">Website</a>${p.appUrl?`<a class="ghost small" href="${escapeHtml(safeUrl(p.appUrl,{allowHttp:true}))}" target="_blank" rel="noopener noreferrer">App</a>`:''}</div></article>`).join(''):'<p class="muted">No providers are available for this country yet.</p>';
  }catch{mobilityProviderList.innerHTML='<p class="muted">Provider list could not be loaded.</p>'}
}
async function searchAddress(key,text){const box=document.getElementById('suggest_'+key);if(!box)return;if(text.trim().length<3){box.innerHTML='';return}try{const r=await fetch(`${API}/geocode?text=${encodeURIComponent(text)}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const j=await r.json();box.innerHTML=(j.features||[]).slice(0,5).map((f,i)=>`<button type="button" class="ghost small" data-suggestion="${key}" data-index="${i}">${escapeHtml(f.properties?.label||'Address')}</button>`).join('');box._features=j.features||[];box.querySelectorAll('[data-suggestion]').forEach(b=>b.onclick=()=>{const f=box._features[Number(b.dataset.index)];const label=cleanText(f.properties?.label||'',500),coords=safeCoords(f.geometry?.coordinates);if(!coords)return;const input=document.querySelector(`[data-address="${CSS.escape(key)}"]`);if(input)input.value=label;updateLocationAddress(key,label);state.addresses[key]={label,coords};queueAddressCommit();box.innerHTML='';fillLocations();toast('Address selected')})}catch(e){box.innerHTML='<small class="muted">Address search unavailable; manual entry remains possible.</small>'}}
async function searchTripOther(which,text){
  const box=which==='from'?tripFromOtherSuggestions:tripToOtherSuggestions;
  tripOtherCoords[which]=null;
  if(text.trim().length<3){box.innerHTML='';return}
  try{
    const r=await fetch(`${API}/geocode?text=${encodeURIComponent(text)}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);
    const j=await r.json(),features=(j.features||[]).slice(0,5);box._features=features;
    box.innerHTML=features.map((f,i)=>`<button type="button" class="ghost small" data-trip-other="${which}" data-index="${i}">${escapeHtml(f.properties?.label||'Address')}</button>`).join('');
    box.querySelectorAll('[data-trip-other]').forEach(b=>b.onclick=()=>{const f=box._features[Number(b.dataset.index)];if(!f)return;const input=which==='from'?tripFromOther:tripToOther;input.value=f.properties?.label||input.value;tripOtherCoords[which]=safeCoords(f.geometry?.coordinates);box.innerHTML='';toast('Address selected')});
  }catch{box.innerHTML='<small class="muted">Address search unavailable; enter the distance manually.</small>'}
}
function debounceInput(fn,delay=300){let timer;return value=>{clearTimeout(timer);timer=setTimeout(()=>fn(value),delay)}}
function profile(type){return ['bicycle','ebike','speed_pedelec'].includes(type)?'cycling-regular':type==='walking'?'foot-walking':'driving-car'}
async function routeDistance(a,b,type){const cacheKey=[profile(type),...a,...b].join('|');if(state.routeCache[cacheKey])return state.routeCache[cacheKey];const r=await fetch(`${API}/route`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:profile(type),coordinates:[a,b]})});if(!r.ok)throw new Error(r.status);const j=await r.json();const km=j.features?.[0]?.properties?.summary?.distance/1000;if(!km)throw new Error('No route');state.routeCache[cacheKey]=km;save({skipRender:true});return km}
async function renderFaq(){
  faqList.innerHTML='<p class="muted">Loading FAQ…</p>';
  try{
    const response=await fetch('./content/faq.json',{cache:'no-store'});
    if(!response.ok)throw new Error('FAQ unavailable');
    const items=await response.json();
    const lang=state.settings.language||window.MOBUD_I18N?.language||'en';
    const topItems=items.slice(0,5);
    faqList.innerHTML=topItems.map((item,i)=>{
      const question=item.question?.[lang]||item.question?.en||item.id;
      const answer=item.answer?.[lang]||item.answer?.en||'';
      const tutorial=item.tutorial||item.tutorialId||'';
      return `<div class="faq-item"><button data-faq="${i}" aria-expanded="false"><span>${escapeHtml(question)}</span><span class="faq-chevron" aria-hidden="true"></span></button><div class="faq-answer hidden" id="faq_${i}">${escapeHtml(answer)} ${tutorial?`<button class="ghost small" data-tutorial-start="${escapeHtml(tutorial)}">Show tutorial</button>`:''}</div></div>`;
    }).join('')+`<a class="secondary link-btn" href="/faq/">View all FAQ</a>`;
    document.querySelectorAll('[data-faq]').forEach(b=>b.onclick=()=>{const answer=document.getElementById('faq_'+b.dataset.faq),open=!answer.classList.toggle('hidden');b.setAttribute('aria-expanded',String(open));b.closest('.faq-item')?.classList.toggle('open',open)});
    document.querySelectorAll('[data-tutorial-start]').forEach(b=>b.onclick=()=>startTutorial(b.dataset.tutorialStart));
  }catch(error){
    faqList.innerHTML='<p class="muted">FAQ could not be loaded. Open the full FAQ page instead.</p><a class="secondary link-btn" href="/faq/">View FAQ</a>';
  }
}
const tutorialSteps=[
{id:'quick-commute',title:'Quick commute',text:'Choose the direction for this commute.',screen:'dashboard',target:'[data-tutorial="commute-panel"]'},
{id:'quick-log',title:'Choose your vehicle',text:'Swipe horizontally and tap one of your Garage vehicles. Defaults or most-used vehicles are shown.',screen:'dashboard',target:'[data-tutorial="quick-log"]'},
{id:'open-log',title:'Add or adjust a log',text:'Use the central button to add a trip, cost or receipt.',screen:'dashboard',target:'[data-tutorial="nav-log"]'},
{id:'trip-form',title:'Review a trip',text:'Adjust distance, date, vehicle or attachment before saving.',screen:'log',target:'[data-tutorial="trip-form"]',action:()=>document.querySelector('[data-tab="trip"]')?.click()},
{id:'expense-form',title:'Add a ticket or bill',text:'Choose a file or take a photo. Keep the legally valid original.',screen:'log',target:'[data-tutorial="expense-form"]',action:()=>document.querySelector('[data-tab="expense"]')?.click()},
{id:'garage-nav',title:'Open your Garage',text:'Use Garage to add, edit and maintain your vehicles.',screen:'dashboard',target:'[data-tutorial="nav-garage"]'},
{id:'garage',title:'Manage vehicles',text:'Filter, edit, archive and choose default vehicles here.',screen:'garage',target:'[data-tutorial="garage-screen"]'},
{id:'stats-nav',title:'Open Reports',text:'Use Reports for distance, costs, receipts and vehicle totals.',screen:'dashboard',target:'[data-tutorial="nav-stats"]'},
{id:'help-nav',title:'More and FAQ',text:'Settings, FAQ, tutorials and feedback are under More.',screen:'dashboard',target:'[data-tutorial="nav-settings"]'}]
function startTutorial(id){tutorialIndex=Math.max(0,tutorialSteps.findIndex(s=>s.id===id||s.title.toLowerCase().includes(String(id||'').toLowerCase())));tutorial.classList.remove('hidden');showTutorial()}
const waitForElement=(selector,timeout=1600)=>new Promise(resolve=>{const start=performance.now();(function tick(){const el=document.querySelector(selector);if(el)return resolve(el);if(performance.now()-start>timeout)return resolve(null);requestAnimationFrame(tick)})()});
async function showTutorial(){const step=tutorialSteps[tutorialIndex];tutorialCount.textContent=`${tutorialIndex+1} / ${tutorialSteps.length}`;tutorialTitle.textContent=step.title;tutorialText.textContent=step.text;tutorialNext.textContent=tutorialIndex===tutorialSteps.length-1?'Have fun':'Next';setScreen(step.screen);step.action?.();const el=await waitForElement(step.target);if(!el){tutorialIndex++;if(tutorialIndex<tutorialSteps.length)return showTutorial();tutorial.classList.add('hidden');return}el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});await new Promise(r=>setTimeout(r,360));requestAnimationFrame(()=>requestAnimationFrame(()=>positionTutorial(el)))}
function positionTutorial(el){const r=el.getBoundingClientRect(),pad=7;const left=Math.max(6,r.left-pad),top=Math.max(6,r.top-pad),width=Math.min(innerWidth-left-6,r.width+pad*2),height=Math.min(innerHeight-top-6,r.height+pad*2);tutorialSpot.style.cssText=`left:${left}px;top:${top}px;width:${width}px;height:${height}px`}
window.addEventListener('resize',()=>{if(!tutorial.classList.contains('hidden')){const step=tutorialSteps[tutorialIndex],el=document.querySelector(step?.target);if(el)positionTutorial(el)}});
function finishOnboardingFlow(){state.onboardingComplete=true;state.settings.name=onboardName.value.trim();state.settings.language=onboardLanguage.value||window.MOBUD_I18N?.language||'en';window.MOBUD_I18N?.setLanguage?.(state.settings.language);state.settings.storageMode=document.querySelector('[name=storageChoice]:checked').value;state.settings.commuteReminderMode=onboardCommuteReminder.value;state.settings.dailyReminderTime='19:00';state.settings.weeklyReminderDay=6;state.settings.weeklyReminderTime='10:00';state.settings.backupFrequency=onboardBackup.value;state.settings.reportFrequency=onboardReport.value;state.settings.notifyUpdates=onboardNotify.checked;{const now=new Date().toISOString();state.syncMeta.settingsUpdatedAt=now;state.syncMeta.preferencesUpdatedAt=now}persistLocalPreferences();save();onboarding.classList.add('hidden');if(state.settings.storageMode==='drive')linkGoogleDrive();setTimeout(()=>{if(confirm(t('Want a quick MoBud tutorial?')))startTutorial()},200)}
const DRIVE_BACKUP_NAME='mobud-production-sync.json';
const DRIVE_LEGACY_BACKUP_NAMES=['mobud-backup.json'];
const DRIVE_MANUAL_PREFIX='mobud-production-manual-backup-';
const DRIVE_SESSION_PREFIX='mobud-production-session-';
async function driveFetch(url,options={}){const token=sessionStorage.getItem('mobudGoogleToken');if(!token)throw new Error('NO_TOKEN');const headers=new Headers(options.headers||{});headers.set('Authorization',`Bearer ${token}`);const response=await fetch(url,{...options,headers});if(response.status===401){sessionStorage.removeItem('mobudGoogleToken');stopDriveLoops()}return response}
async function listDriveFiles(query,fields='files(id,name,modifiedTime)'){const q=encodeURIComponent(query);const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=${encodeURIComponent(fields)}&pageSize=100`);if(!r.ok)throw new Error(`Drive list failed (${r.status})`);return (await r.json()).files||[]}
async function findDriveFile(name){const files=await listDriveFiles(`name='${name.replaceAll("'","\\'")}' and 'appDataFolder' in parents and trashed=false`);return files.sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)))[0]||null}
async function downloadDriveJson(fileId){const r=await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);if(!r.ok)throw new Error(`Drive download failed (${r.status})`);const text=await r.text();if(text.length>MAX_BACKUP_BYTES)throw new Error('Drive backup too large');const data=JSON.parse(text);if(!validData(data))throw new Error('Invalid Drive backup');return data}
async function uploadDriveJson(name,data,existingId=''){const metadata={name,mimeType:'application/json'};if(!existingId)metadata.parents=['appDataFolder'];const boundary='mobud_'+Math.random().toString(36).slice(2);const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;const endpoint=existingId?`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingId)}?uploadType=multipart`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';const r=await driveFetch(endpoint,{method:existingId?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});if(!r.ok)throw new Error(`Drive upload failed (${r.status})`);return r.json()}
function recordTime(x){return Date.parse(x?.updatedAt||x?.createdAt||0)||0}
function mergeCollection(localRows,remoteRows,localDeleted=[],remoteDeleted=[]){const deleted=new Map();[...localDeleted,...remoteDeleted].forEach(x=>{const old=deleted.get(x.id);if(!old||Date.parse(x.deletedAt||0)>Date.parse(old.deletedAt||0))deleted.set(x.id,x)});const rows=new Map();[...(localRows||[]),...(remoteRows||[])].forEach(x=>{if(!x?.id)return;const old=rows.get(x.id);if(!old||recordTime(x)>recordTime(old)||(recordTime(x)===recordTime(old)&&String(x.updatedByDevice||'')>String(old.updatedByDevice||'')))rows.set(x.id,x)});for(const [id,tomb] of deleted){const row=rows.get(id);if(!row||Date.parse(tomb.deletedAt||0)>=recordTime(row))rows.delete(id);else deleted.delete(id)}return {rows:[...rows.values()],deleted:[...deleted.values()]}}
function mergeState(localData,remoteData){
  const local=normalized(localData),remote=normalized(remoteData),merged=normalized(local);
  for(const key of ['vehicles','trips','expenses']){const result=mergeCollection(local[key],remote[key],local.tombstones[key],remote.tombstones[key]);merged[key]=result.rows;merged.tombstones[key]=result.deleted}
  const time=(obj,key,fallback='settingsUpdatedAt')=>Date.parse(obj.syncMeta?.[key]||obj.syncMeta?.[fallback]||obj.syncMeta?.modifiedAt||0)||0;
  const localPrefTime=time(local,'preferencesUpdatedAt'),remotePrefTime=time(remote,'preferencesUpdatedAt');
  const localAddressTime=time(local,'addressesUpdatedAt'),remoteAddressTime=time(remote,'addressesUpdatedAt');
  const preferenceKeys=['name','language','currency','unit','theme','country','backupFrequency','reportFrequency','notifyUpdates','commuteReminderMode','dailyReminderTime','weeklyReminderDay','weeklyReminderTime'];
  if(remotePrefTime>localPrefTime)for(const key of preferenceKeys)merged.settings[key]=remote.settings[key];
  if(remoteAddressTime>localAddressTime){for(const key of ['home1','homeLabel','work','workLabel','locations'])merged.settings[key]=remote.settings[key];merged.addresses=remote.addresses||merged.addresses}
  merged.selectedDirection=(time(remote,'settingsUpdatedAt')>time(local,'settingsUpdatedAt')?remote.selectedDirection:local.selectedDirection)||merged.selectedDirection;
  merged.routeCache={...(remote.routeCache||{}),...(local.routeCache||{})};
  merged.syncMeta={...(merged.syncMeta||{}),modifiedAt:new Date(Math.max(Date.parse(local.syncMeta?.modifiedAt||0)||0,Date.parse(remote.syncMeta?.modifiedAt||0)||0)).toISOString(),settingsUpdatedAt:new Date(Math.max(time(local,'settingsUpdatedAt'),time(remote,'settingsUpdatedAt'))).toISOString(),preferencesUpdatedAt:new Date(Math.max(localPrefTime,remotePrefTime)).toISOString(),addressesUpdatedAt:new Date(Math.max(localAddressTime,remoteAddressTime)).toISOString(),updatedByDevice:DEVICE_ID,changeToken:local.syncMeta?.changeToken||remote.syncMeta?.changeToken||''};
  merged.settings.driveConnected=true;merged.settings.storageMode='drive';merged.settings.lastDriveSync=local.settings.lastDriveSync||remote.settings.lastDriveSync||'';
  return applyLocalPreferences(merged)
}
async function linkGoogleDrive(){if(!GOOGLE_CLIENT_ID){toast('Add the Google OAuth Client ID to config.js first.');return}if(!window.google?.accounts?.oauth2){toast('Google sign-in is not ready yet. Reload and try again.');return}const client=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/drive.appdata',callback:async token=>{if(token.error){toast('Google Drive connection was cancelled.');return}sessionStorage.setItem('mobudGoogleToken',token.access_token);state.settings.driveConnected=true;state.settings.storageMode='drive';state.syncMeta.settingsUpdatedAt=new Date().toISOString();save({skipSync:true});await syncWithDrive({silent:false,reason:'connected'});startDriveLoops()}});client.requestAccessToken({prompt:'consent'})}
async function syncWithDrive({silent=false,reason='manual'}={}){if(syncBusy)return;const token=sessionStorage.getItem('mobudGoogleToken');if(!token){if(!silent)linkGoogleDrive();return}syncBusy=true;try{if(!silent)toast('Synchronising with Google Drive…');const existing=await findDriveFile(DRIVE_BACKUP_NAME);let source=existing;if(!source){for(const legacyName of DRIVE_LEGACY_BACKUP_NAMES){source=await findDriveFile(legacyName);if(source)break}}let merged=normalized(state);if(source){lastRemoteModified=source.modifiedTime||lastRemoteModified;const remote=await downloadDriveJson(source.id);merged=mergeState(state,remote);suppressAutoSync=true;state=merged;state.settings.lastDriveSync=new Date().toLocaleString();save({skipSync:true,preserveTimestamp:true});suppressAutoSync=false;await uploadDriveJson(DRIVE_BACKUP_NAME,buildBackupPayload(),existing?.id||'')}else{await uploadDriveJson(DRIVE_BACKUP_NAME,buildBackupPayload())}state.settings.lastDriveSync=new Date().toLocaleString();save({skipSync:true,preserveTimestamp:true});await updateSessionHeartbeat();await checkOtherActiveSessions();if(!silent)toast('Google Drive is up to date.')}catch(error){console.error(error);if(!silent)toast('Google Drive sync failed. Your local data was kept.')}finally{syncBusy=false;if(!isEditingAddressSettings())renderSettings()}}
async function getDriveStartPageToken(){const r=await driveFetch('https://www.googleapis.com/drive/v3/changes/startPageToken?spaces=appDataFolder');if(!r.ok)throw new Error(`Drive token failed (${r.status})`);return (await r.json()).startPageToken||''}
async function getDriveChanges(pageToken){const fields=encodeURIComponent('nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,modifiedTime,trashed))');const r=await driveFetch(`https://www.googleapis.com/drive/v3/changes?pageToken=${encodeURIComponent(pageToken)}&spaces=appDataFolder&includeRemoved=true&fields=${fields}`);if(!r.ok)throw new Error(`Drive changes failed (${r.status})`);return r.json()}
async function pollDriveChanges(){if(document.visibilityState!=='visible'||syncBusy||!state.settings.driveConnected||!sessionStorage.getItem('mobudGoogleToken'))return;try{let token=state.syncMeta?.changeToken;if(!token){token=await getDriveStartPageToken();state.syncMeta.changeToken=token;save({skipSync:true,preserveTimestamp:true});await updateSessionHeartbeat();await checkOtherActiveSessions();return}let changed=false,pageToken=token;do{const result=await getDriveChanges(pageToken);changed=changed||(result.changes||[]).some(change=>change.file?.name===DRIVE_BACKUP_NAME);pageToken=result.nextPageToken||'';if(result.newStartPageToken){state.syncMeta.changeToken=result.newStartPageToken;save({skipSync:true,preserveTimestamp:true})}}while(pageToken);if(changed)await syncWithDrive({silent:true,reason:'remote-change'});else await updateSessionHeartbeat();await checkOtherActiveSessions()}catch(e){console.warn('Drive change check failed',e)}}
async function updateSessionHeartbeat(){if(!sessionStorage.getItem('mobudGoogleToken'))return;const name=`${DRIVE_SESSION_PREFIX}${DEVICE_ID}.json`,existing=await findDriveFile(name);await uploadDriveJson(name,{deviceId:DEVICE_ID,deviceName:deviceLabel(),lastSeen:new Date().toISOString(),appVersion:VERSION},existing?.id||'')}
function deviceLabel(){const ua=navigator.userAgent;return /Android/i.test(ua)?'Android device':/iPhone|iPad/i.test(ua)?'Apple device':/Windows/i.test(ua)?'Windows computer':/Mac/i.test(ua)?'Mac computer':'Other device'}
let warnedSessionId='';
async function checkOtherActiveSessions(){const files=await listDriveFiles(`name contains '${DRIVE_SESSION_PREFIX}' and 'appDataFolder' in parents and trashed=false`,'files(id,name,modifiedTime)');const cutoff=Date.now()-45000;const active=files.filter(f=>!f.name.includes(DEVICE_ID)&&Date.parse(f.modifiedTime||0)>cutoff).sort((a,b)=>Date.parse(b.modifiedTime)-Date.parse(a.modifiedTime))[0];if(active&&warnedSessionId!==active.id){warnedSessionId=active.id;otherDeviceText.textContent='Je info staat nog open op een ander apparaat. Sluit deze eerst af voor je hier verdergaat om dataconflicten te vermijden.';otherDeviceModal.classList.remove('hidden')}}
function startDriveLoops(){stopDriveLoops();if(!state.settings.driveConnected||!sessionStorage.getItem('mobudGoogleToken'))return;drivePollTimer=setInterval(pollDriveChanges,15000);sessionHeartbeatTimer=setInterval(updateSessionHeartbeat,15000);pollDriveChanges()}
function stopDriveLoops(){clearInterval(drivePollTimer);clearInterval(sessionHeartbeatTimer);drivePollTimer=sessionHeartbeatTimer=null}
async function createManualDriveBackup(){if(!sessionStorage.getItem('mobudGoogleToken'))return linkGoogleDrive();try{const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');await uploadDriveJson(`${DRIVE_MANUAL_PREFIX}${stamp}.json`,buildBackupPayload());toast('Manual Drive backup created.')}catch(e){console.error(e);toast('Could not create the Drive backup.')}}
async function importDriveBackup(){if(!sessionStorage.getItem('mobudGoogleToken'))return linkGoogleDrive();try{const files=(await listDriveFiles(`name contains '${DRIVE_MANUAL_PREFIX}' and 'appDataFolder' in parents and trashed=false`)).sort((a,b)=>String(b.modifiedTime).localeCompare(String(a.modifiedTime)));if(!files.length){toast('No manual Drive backups found.');return}const selected=prompt(`Choose a backup number to merge:\n${files.slice(0,10).map((f,i)=>`${i+1}. ${new Date(f.modifiedTime).toLocaleString()}`).join('\n')}`,'1');if(!selected)return;const file=files[Number(selected)-1];if(!file){toast('Invalid backup selection.');return}const remote=await downloadDriveJson(file.id);snapshot(KEY,JSON.stringify(state),'before-manual-drive-import');state=mergeState(state,remote);state.settings.lastDriveSync=new Date().toLocaleString();save();toast('Backup imported and merged.')}catch(e){console.error(e);toast('Could not import the Drive backup.')}}
function openFeedback(type){feedbackForm.reset();feedbackType.value=type;feedbackTitle.textContent=type==='bug'?'Report bug':'Send request';feedbackModal.classList.remove('hidden')}
function feedbackPayload(){return {type:feedbackType.value,title:feedbackSubject.value,description:feedbackDescription.value,severity:feedbackSeverity.value,email:feedbackEmail.value,mayContact:feedbackContact.checked,version:VERSION,platform:navigator.platform,installed:matchMedia('(display-mode: standalone)').matches,online:navigator.onLine}}

function reminderKeyForNow(){const n=new Date(),mode=state.settings.commuteReminderMode;if(mode==='daily'){const [h,m]=(state.settings.dailyReminderTime||'19:00').split(':').map(Number);if(n.getHours()>h||(n.getHours()===h&&n.getMinutes()>=m))return `daily-${todayISO()}`}if(mode==='weekly'&&n.getDay()===Number(state.settings.weeklyReminderDay??6)){const [h,m]=(state.settings.weeklyReminderTime||'10:00').split(':').map(Number);if(n.getHours()>h||(n.getHours()===h&&n.getMinutes()>=m))return `weekly-${todayISO()}`}return ''}
function checkCommuteReminder(){const key=reminderKeyForNow();if(!key||state.settings.lastCommuteReminder===key)return;state.settings.lastCommuteReminder=key;save();const msg=state.settings.commuteReminderMode==='weekly'?'Review and complete your commutes from the past week.':'Remember to log today’s commute.';toast(msg);if(Notification.permission==='granted')new Notification('MoBud reminder',{body:msg,icon:'icon-192-v005.png'})}
async function requestReminderPermission(){if(commuteReminderMode.value==='never'||!('Notification'in window))return;if(Notification.permission==='default')await Notification.requestPermission()}

function autoSaveSettings(){
  state.settings.name=settingName.value.trim();
  state.settings.language=settingLanguage.value;
  state.settings.currency=settingCurrency.value;
  state.settings.unit=settingUnit.value;
  state.settings.theme=settingTheme.value;
  state.settings.country=settingCountry.value;
  state.settings.commuteReminderMode=commuteReminderMode.value;
  state.settings.dailyReminderTime=dailyReminderTime.value;
  state.settings.weeklyReminderDay=Number(weeklyReminderDay.value);
  state.settings.weeklyReminderTime=weeklyReminderTime.value;
  state.settings.backupFrequency=backupFrequency.value;
  state.settings.reportFrequency=reportFrequency.value;
  state.settings.notifyUpdates=notifyUpdates.checked;
  const preferenceStamp=new Date().toISOString();
  state.syncMeta.settingsUpdatedAt=preferenceStamp;
  state.syncMeta.preferencesUpdatedAt=preferenceStamp;
  persistLocalPreferences();
  window.MOBUD_I18N?.setLanguage?.(state.settings.language);
  applyTheme(state.settings.theme);
  save();
  renderDirectionLabels();
  renderMobilityProviders();
  autosaveStatus.classList.add('visible');
  clearTimeout(autoSaveSettings.timer);
  autoSaveSettings.timer=setTimeout(()=>autosaveStatus.classList.remove('visible'),1200);
}
// events
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setScreen(b.dataset.screen));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>setScreen(b.dataset.jump));document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');tripForm.classList.toggle('active-form',b.dataset.tab==='trip');expenseForm.classList.toggle('active-form',b.dataset.tab==='expense')});
dirHomeWork.onclick=()=>{state.selectedDirection='home-work';dirHomeWork.classList.add('active');dirWorkHome.classList.remove('active')};dirWorkHome.onclick=()=>{state.selectedDirection='work-home';dirWorkHome.classList.add('active');dirHomeWork.classList.remove('active')};
prevMonth.onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);render()};nextMonth.onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);render()};viewAllLogs.onclick=()=>setScreen('calendar');calPrev.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar()};calNext.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar()};addVehicleBtn.onclick=()=>openVehicle();garageTypeFilter.onchange=renderGarage;garagePowertrainFilter.onchange=renderGarage;cancelVehicle.onclick=()=>vehicleModal.classList.add('hidden');
vehicleForm.onsubmit=e=>{e.preventDefault();const id=vehicleId.value||uid('vehicle'),existing=state.vehicles.find(v=>v.id===id),tripKmNow=state.trips.filter(t=>t.vehicleId===id).reduce((sum,t)=>sum+Number(t.km||0),0),enteredOdometer=Math.max(0,Number(vehicleCurrentOdometer.value||0)),previousCalculated=existing?calculatedOdometer(existing):0,odometerWasChanged=!existing||Math.abs(enteredOdometer-previousCalculated)>0.0001;const data={id,updatedAt:new Date().toISOString(),updatedByDevice:DEVICE_ID,type:vehicleType.value,powertrain:vehiclePowertrain.value,name:vehicleName.value.trim(),brand:vehicleBrand.value.trim(),model:vehicleModel.value.trim(),odometerBase:odometerWasChanged?enteredOdometer:Number(existing?.odometerBase??existing?.currentOdometer??existing?.initialOdometer??enteredOdometer),odometerBaselineTripKm:odometerWasChanged?tripKmNow:Number(existing?.odometerBaselineTripKm||0),currentOdometer:odometerWasChanged?enteredOdometer:Number(existing?.currentOdometer??existing?.initialOdometer??enteredOdometer),initialOdometer:Number(existing?.initialOdometer??enteredOdometer),isDefault:vehicleDefault.checked,boughtFrom:vehicleBoughtFrom.value,sellerUrl:vehicleSellerUrl.value,leasePartner:vehicleLeasePartner.value,leaseUrl:vehicleLeaseUrl.value,leaseStart:vehicleLeaseStart.value,leaseEnd:vehicleLeaseEnd.value,maintenanceProvider:vehicleMaintenanceProvider.value,maintenanceUrl:vehicleMaintenanceUrl.value,maintenanceContact:vehicleMaintenanceContact.value,maintenanceAddress:vehicleMaintenanceAddress.value,insurance:vehicleInsurance.value,insuranceUrl:vehicleInsuranceUrl.value,insurancePhone:vehicleInsurancePhone.value,insuranceAddress:vehicleInsuranceAddress.value,sellerPhone:vehicleSellerPhone.value,sellerAddress:vehicleSellerAddress.value,leasePhone:vehicleLeasePhone.value,leaseAddress:vehicleLeaseAddress.value,maintenanceMonths:Number(vehicleMaintenanceMonths.value||0),maintenanceKm:Number(vehicleMaintenanceKm.value||0),active:true};if(!state.vehicles.some(v=>v.type===data.type&&v.active!==false))data.isDefault=true;if(data.isDefault)state.vehicles.forEach(v=>{if(v.type===data.type)v.isDefault=false});const i=state.vehicles.findIndex(v=>v.id===id);if(i>=0){data.active=state.vehicles[i].active;data.createdAt=state.vehicles[i].createdAt||new Date().toISOString()}else data.createdAt=new Date().toISOString();i>=0?state.vehicles.splice(i,1,data):state.vehicles.push(data);save();vehicleModal.classList.add('hidden');renderGarage()};
tripForm.onsubmit=e=>{e.preventDefault();const isEdit=!!tripEditId.value,id=tripEditId.value||uid('trip'),old=state.trips.find(x=>x.id===id);const row={id,date:tripDate.value,vehicleId:tripVehicle.value,from:tripFrom.value,to:tripTo.value,fromText:tripFrom.value==='other'?tripFromOther.value:addressText(tripFrom.value),toText:tripTo.value==='other'?tripToOther.value:addressText(tripTo.value),fromCoords:tripFrom.value==='other'?tripOtherCoords.from:null,toCoords:tripTo.value==='other'?tripOtherCoords.to:null,km:Number(tripKm.value||0),purpose:tripPurpose.value,notes:tripNotes.value,attachment:pendingAttachment.trip||null,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),updatedByDevice:DEVICE_ID};const i=state.trips.findIndex(x=>x.id===id);i>=0?state.trips.splice(i,1,row):state.trips.unshift(row);if(!save({skipRender:true}))return;resetTrip({keepDate:!isEdit});render();toast(isEdit?'Trip updated':'Trip saved')};
expenseForm.onsubmit=e=>{e.preventDefault();const id=expenseEditId.value||uid('expense'),old=state.expenses.find(x=>x.id===id);const row={id,date:expenseDate.value,vehicleId:expenseVehicle.value,category:expenseCategory.value,amount:Number(expenseAmount.value||0),supplier:expenseSupplier.value,odometer:Number(expenseOdometer.value||0),notes:expenseNotes.value,attachment:pendingAttachment.expense||null,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),updatedByDevice:DEVICE_ID};const i=state.expenses.findIndex(x=>x.id===id);i>=0?state.expenses.splice(i,1,row):state.expenses.unshift(row);save();resetExpense();toast('Cost saved')};
[['tripFile','trip'],['tripCamera','trip'],['expenseFile','expense'],['expenseCamera','expense']].forEach(([id,k])=>document.getElementById(id).onchange=async e=>{try{pendingAttachment[k]=await fileData(e.target.files[0]);showAttachment(k)}catch(err){toast(err.message)}});
tripFrom.onchange=()=>{const other=tripFrom.value==='other';tripFromOtherWrap.classList.toggle('hidden',!other);if(!other){tripOtherCoords.from=null;tripFromOtherSuggestions.innerHTML=''}};tripTo.onchange=()=>{const other=tripTo.value==='other';tripToOtherWrap.classList.toggle('hidden',!other);if(!other){tripOtherCoords.to=null;tripToOtherSuggestions.innerHTML=''}};const searchFromOther=debounceInput(value=>searchTripOther('from',value));const searchToOther=debounceInput(value=>searchTripOther('to',value));tripFromOther.oninput=()=>searchFromOther(tripFromOther.value);tripToOther.oninput=()=>searchToOther(tripToOther.value);swapTrip.onclick=()=>{const a=tripFrom.value,b=tripFromOther.value,c=tripOtherCoords.from;tripFrom.value=tripTo.value;tripTo.value=a;tripFromOther.value=tripToOther.value;tripToOther.value=b;tripOtherCoords.from=tripOtherCoords.to;tripOtherCoords.to=c;tripFromOtherWrap.classList.toggle('hidden',tripFrom.value!=='other');tripToOtherWrap.classList.toggle('hidden',tripTo.value!=='other')};calcRoute.onclick=async()=>{const a=tripFrom.value==='other'?tripOtherCoords.from:state.addresses[tripFrom.value]?.coords,b=tripTo.value==='other'?tripOtherCoords.to:state.addresses[tripTo.value]?.coords,v=vehicleById(tripVehicle.value);if(!a||!b){toast('Select an address suggestion with coordinates first.');return}try{calcRoute.textContent='Calculating…';tripKm.value=(await routeDistance(a,b,v?.type||'car')).toFixed(1);toast('Route distance calculated')}catch{toast('Route unavailable; enter distance manually.')}finally{calcRoute.textContent='Calculate route'}};
cancelTripEdit.onclick=resetTrip;cancelExpenseEdit.onclick=resetExpense;commuteReminderMode.onchange=requestReminderPermission;
function buildBackupPayload(){return {...state,settings:{...state.settings},vehicles:[...state.vehicles],trips:[...state.trips],expenses:[...state.expenses],exportedAt:new Date().toISOString(),exportVersion:VERSION}}
function downloadBackup(reason='manual'){const payload=buildBackupPayload();const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`mobud-backup-${reason}-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return payload}
exportJson.onclick=()=>downloadBackup('manual');importJson.onchange=e=>{const f=e.target.files[0];if(!f||!confirm('Replace current local data with this backup?'))return;if(f.size>MAX_BACKUP_BYTES){toast('Backup is too large');return}const r=new FileReader();r.onload=()=>{try{const raw=JSON.parse(r.result);if(!validData(raw))throw new Error('Invalid backup');const imported=normalized(raw);state=imported;save();toast(`Backup imported · ${state.vehicles.length} garage vehicle(s)`)}catch{toast('Invalid backup')}};r.readAsText(f)};printReport.onclick=()=>window.print();
linkDrive.onclick=linkGoogleDrive;syncDrive.onclick=()=>syncWithDrive({silent:false,reason:'manual'});driveBackupCreate.onclick=createManualDriveBackup;driveBackupImport.onclick=importDriveBackup;disconnectDrive.onclick=()=>{sessionStorage.removeItem('mobudGoogleToken');stopDriveLoops();state.settings.driveConnected=false;state.settings.storageMode='local';state.syncMeta.settingsUpdatedAt=new Date().toISOString();save({skipSync:true})};otherDeviceRecheck.onclick=async()=>{otherDeviceModal.classList.add('hidden');warnedSessionId='';await pollDriveChanges()};otherDeviceContinue.onclick=()=>{otherDeviceModal.classList.add('hidden');if(confirm('Wijzigingen op twee apparaten kunnen elkaar overschrijven. MoBud probeert conflicten te voorkomen, maar kan geen foutloze samenvoeging garanderen.'))toast('Je werkt verder op dit apparaat.')};checkUpdate.onclick=async()=>{const reg=await navigator.serviceWorker?.getRegistration();await reg?.update();toast(newWorker?'Update available':'You are using the latest loaded version')};replayTutorial.onclick=()=>startTutorial();requestBtn.onclick=()=>openFeedback('request');bugBtn.onclick=()=>openFeedback('bug');cancelFeedback.onclick=()=>feedbackModal.classList.add('hidden');feedbackForm.onsubmit=async e=>{e.preventDefault();if(!APP_CONFIG.SUPPORT_ENDPOINT_ENABLED){const p=feedbackPayload();navigator.clipboard?.writeText(JSON.stringify(p,null,2));toast('Support endpoint is not enabled yet; report copied to clipboard.');feedbackModal.classList.add('hidden');return}try{const r=await fetch(`${API}/support`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(feedbackPayload())});if(!r.ok)throw 0;toast('Report sent');feedbackModal.classList.add('hidden')}catch{toast('Could not send report')}};
onboardAddVehicle.onclick=()=>openVehicle();onboardNext1.onclick=()=>{onboardingStep1.classList.add('hidden');onboardingStep2.classList.remove('hidden')};onboardBack2.onclick=()=>{onboardingStep2.classList.add('hidden');onboardingStep1.classList.remove('hidden')};onboardNext2.onclick=()=>{onboardingStep2.classList.add('hidden');onboardingStep3.classList.remove('hidden')};onboardBack3.onclick=()=>{onboardingStep3.classList.add('hidden');onboardingStep2.classList.remove('hidden')};finishOnboarding.onclick=finishOnboardingFlow;tutorialSkip.onclick=()=>tutorial.classList.add('hidden');tutorialNext.onclick=()=>{if(++tutorialIndex>=tutorialSteps.length){tutorial.classList.add('hidden');return}showTutorial()};
const installBanner=document.getElementById('installBanner'),installNow=document.getElementById('installNow'),installLater=document.getElementById('installLater');
function isInstalled(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function hideInstallBanner(){installBanner?.classList.add('hidden')}
window.addEventListener('mobud:languagechange',()=>{state.settings.language=window.MOBUD_I18N.language;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{};render()});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!isInstalled())installBanner?.classList.remove('hidden')});
installNow?.addEventListener('click',async()=>{if(!deferredPrompt)return;await deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;hideInstallBanner()});
installLater?.addEventListener('click',()=>hideInstallBanner());
window.addEventListener('appinstalled',()=>{deferredPrompt=null;hideInstallBanner()});
if(isInstalled())hideInstallBanner();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').then(reg=>{reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){newWorker=w;updateBanner.classList.remove('hidden')}})})});applyUpdate.onclick=async()=>{downloadBackup('before-update');toast('Safety backup downloaded. Updating MoBud…');await new Promise(r=>setTimeout(r,500));newWorker?.postMessage({type:'SKIP_WAITING'})};navigator.serviceWorker?.addEventListener('controllerchange',()=>location.reload());
tripDate.value=expenseDate.value=todayISO();onboardLanguage.value=state.settings.language||window.MOBUD_I18N?.language||'en';window.MOBUD_I18N?.setLanguage?.(state.settings.language||window.MOBUD_I18N?.language||'en');applyTheme();fillLocations({defaultFrom:'home1',defaultTo:'work'});tripFrom.value='home1';tripTo.value='work';renderDirectionLabels();render();checkCommuteReminder();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){checkCommuteReminder();if(state.settings.driveConnected&&sessionStorage.getItem('mobudGoogleToken')){startDriveLoops();syncWithDrive({silent:true,reason:'resume'})}}else{scheduleAutoSync(0);stopDriveLoops()}});window.addEventListener('pagehide',()=>{scheduleAutoSync(0)});if(state.settings.driveConnected&&sessionStorage.getItem('mobudGoogleToken')){syncWithDrive({silent:true,reason:'open'});startDriveLoops()}if(!state.onboardingComplete)onboarding.classList.remove('hidden');

async function fetchPartnerMetadata(urlInput,prefix){const url=urlInput.value.trim();if(!url){toast('Enter a website first.');return}try{toast('Looking up public contact details…');const r=await fetch(`${API}/metadata?url=${encodeURIComponent(url)}`);if(!r.ok)throw new Error();const d=await r.json();const map={seller:['vehicleBoughtFrom','vehicleSellerPhone','vehicleSellerAddress'],lease:['vehicleLeasePartner','vehicleLeasePhone','vehicleLeaseAddress'],maintenance:['vehicleMaintenanceProvider','vehicleMaintenanceContact','vehicleMaintenanceAddress'],insurance:['vehicleInsurance','vehicleInsurancePhone','vehicleInsuranceAddress']};const ids=map[prefix];if(d.name&&!document.getElementById(ids[0]).value)document.getElementById(ids[0]).value=d.name;if(d.phone&&!document.getElementById(ids[1]).value)document.getElementById(ids[1]).value=d.phone;if(d.address&&!document.getElementById(ids[2]).value)document.getElementById(ids[2]).value=d.address;toast(d.name||d.phone||d.address?'Public details added — please verify them.':'No public contact details found.')}catch{toast('Could not retrieve public contact details. You can enter them manually.')}}
vehicleType.addEventListener('change',()=>updatePowertrainOptions(vehicleType.value));document.querySelectorAll('[data-fetch-partner]').forEach(b=>b.addEventListener('click',()=>fetchPartnerMetadata(document.getElementById(b.dataset.urlInput),b.dataset.fetchPartner)));
settingName?.addEventListener('input',()=>{state.settings.name=settingName.value;{const now=new Date().toISOString();state.syncMeta.settingsUpdatedAt=now;state.syncMeta.preferencesUpdatedAt=now}persistLocalPreferences();save({skipRender:true});const h=new Date().getHours(),base=h<12?t('Good morning'):h<18?t('Good afternoon'):t('Good evening');greeting.textContent=`${base}${state.settings.name?', '+state.settings.name:''}`;autosaveStatus.classList.add('visible');clearTimeout(autoSaveSettings.timer);autoSaveSettings.timer=setTimeout(()=>autosaveStatus.classList.remove('visible'),1200)});settingName?.addEventListener('blur',()=>{state.settings.name=settingName.value.trim();{const now=new Date().toISOString();state.syncMeta.settingsUpdatedAt=now;state.syncMeta.preferencesUpdatedAt=now}persistLocalPreferences();save({skipRender:true})});['settingLanguage','settingCurrency','settingUnit','settingTheme','settingCountry','commuteReminderMode','dailyReminderTime','weeklyReminderDay','weeklyReminderTime','backupFrequency','reportFrequency','notifyUpdates'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('change',autoSaveSettings)});
