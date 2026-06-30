/* BAW Panel — script.js — 3-Num Logic + Recovery Math + Play Window */

/* ════════ HELPERS ════════ */
const $=id=>document.getElementById(id);

function go(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  if(id==='login')setTimeout(previewSavedKey,300);
  if(id==='signal'){
    setTimeout(()=>{
      const st=getPlayStatus();
      if(!st.active){
        _signalAllowed=false;
        $('signalOffBanner').classList.add('show');
        $('predVal').className='pred-val WAIT';
        $('predVal').textContent='OFF';
        $('predMeta').textContent='Signal closed';
        $('predTypeBadge').textContent='OUTSIDE PLAY WINDOW';
        showPwDlg(true,st);
      }
    },400);
  }
}

/* ════════ STATE ════════ */
const STATE={signals:[],results:{},recovery:false,win:0,loss:0,streak:0,lastPredPeriod:null};

/* ════════ LOADING ════════ */
const BOOT_MSGS=['BOOTING SYSTEM...','CONNECTING API...','CALIBRATING AI...','LOADING SIGNALS...','READY'];
let loadP=0;
const loadIv=setInterval(()=>{
  loadP+=100/60;
  if(loadP>=100){loadP=100;clearInterval(loadIv);setTimeout(()=>go('landing'),400)}
  $('loadFill').style.width=loadP+'%';
  const mi=Math.min(4,Math.floor(loadP/20));
  $('loadStatus').textContent=BOOT_MSGS[mi];
  $('loadTxt').textContent='INITIALIZING • '+Math.floor(loadP)+'%';
},100);

/* ════════ NAV SLIDER ════════ */
function updateSlider(){
  const active=document.querySelector('.bnav button.active');
  const nav=$('bnav');
  if(!active||!nav)return;
  const navRect=nav.getBoundingClientRect();
  const btnRect=active.getBoundingClientRect();
  const sl=$('bnavSlider');
  sl.style.left=(btnRect.left-navRect.left)+'px';
  sl.style.width=btnRect.width+'px';
}
setTimeout(updateSlider,80);

/* ════════ LANDING CARDS ════════ */
const infos=[
  {i:'ri-flashlight-fill',t:'Realtime AI',d:'Live market signal engine'},
  {i:'ri-crosshair-2-fill',t:'3-Num Logic',d:'Triple pattern prediction'},
  {i:'ri-timer-flash-fill',t:'1 Min Mode',d:'WinGo 1 Minute period'},
  {i:'ri-shield-check-fill',t:'Safe Logic',d:'Smart recovery system'},
  {i:'ri-line-chart-fill',t:'Smart Trend',d:'Detects zigzag, repeat, double'},
  {i:'ri-function-fill',t:'300+ Combos',d:'Deep pattern matrix'},
  {i:'ri-fire-fill',t:'Hot Streaks',d:'Win streak tracking'},
  {i:'ri-bar-chart-box-fill',t:'Live Stats',d:'Win/Loss counters'},
  {i:'ri-history-line',t:'Full History',d:'Track every prediction'},
  {i:'ri-sparkling-2-fill',t:'Cyber UI',d:'Premium animated interface'},
  {i:'ri-lock-password-fill',t:'Key System',d:'Supabase secured access'},
  {i:'ri-telegram-fill',t:'24/7 Support',d:'Telegram help channel'},
];
const ig=$('infoGrid');
infos.forEach((c,i)=>{
  const el=document.createElement('div');
  el.className='info-card';
  el.style.animationDelay=(i*0.06)+'s';
  el.innerHTML=`<div class="ic"><i class="${c.i}"></i></div><h4>${c.t}</h4><p>${c.d}</p>`;
  ig.appendChild(el);
});

/* ════════ SUPABASE CONFIG ════════ */
const SB_URL  = 'https://jmqqfsymvpktynabvgmu.supabase.co';
const SB_KEY  = 'sb_publishable_dCgDbN7j4CPGy3GfXVL1Eg_xLC1x3Et';
let _sb=null;
try{_sb=window.supabase.createClient(SB_URL,SB_KEY);}catch(e){}

const DEVICE_ID=(()=>{
  let id=localStorage.getItem('baw_did');
  if(!id){id='D'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase();localStorage.setItem('baw_did',id);}
  return id;
})();

let _activeKey=null;
function fmtMin(m){if(m<60)return m+'m';if(m<1440)return(m/60).toFixed(1)+'h';return Math.round(m/1440)+'d';}

/* ════════ KEY LOGIN ════════ */
async function doLogin(){
  const raw=$('passInput').value.trim().toUpperCase();
  if(!raw){$('loginErr').textContent='Key দিন';return;}
  const btn=$('loginBtn');
  btn.disabled=true;btn.innerHTML='<i class="ri-loader-4-line"></i> CHECKING...';
  $('loginErr').textContent='';
  if(!_sb){$('loginErr').textContent='⚠ Config error';btn.disabled=false;btn.innerHTML='<i class="ri-key-2-fill"></i> VERIFY & LOGIN';return;}
  const{data,error}=await _sb.from('baw_keys').select('*').eq('key_code',raw).single();
  btn.disabled=false;btn.innerHTML='<i class="ri-key-2-fill"></i> VERIFY & LOGIN';
  if(error||!data){$('loginErr').textContent='✗ Invalid key!';$('passInput').style.borderColor='var(--red)';setTimeout(()=>$('passInput').style.borderColor='',900);return;}
  if(!data.is_active){$('loginErr').textContent='✗ Key disable করা হয়েছে।';return;}
  const now=new Date();
  let expiresAt;
  if(!data.first_used_at){
    expiresAt=new Date(now.getTime()+data.duration_minutes*60000);
    await _sb.from('baw_keys').update({first_used_at:now.toISOString(),expires_at:expiresAt.toISOString()}).eq('id',data.id);
  } else {expiresAt=new Date(data.expires_at);}
  if(expiresAt<now){$('loginErr').textContent='✗ Key expired! নতুন key নিন।';return;}
  const devs=Array.isArray(data.devices_used)?data.devices_used:[];
  if(!devs.includes(DEVICE_ID)){
    if(devs.length>=data.device_limit){$('loginErr').textContent=`✗ Device limit পূর্ণ! Max ${data.device_limit}।`;return;}
    await _sb.from('baw_keys').update({devices_used:[...devs,DEVICE_ID]}).eq('id',data.id);
  }
  _activeKey=data;
  localStorage.setItem('baw_saved_key',raw);
  $('keyInfoBar').style.display='none';
  go('signal');
  startEngine();
  setTimeout(updateSlider,120);
  startKeyExpireWatcher(expiresAt);
  initPlayWindow();
}

let _keyExpWatcher=null;
function startKeyExpireWatcher(exp){
  if(_keyExpWatcher)clearInterval(_keyExpWatcher);
  _keyExpWatcher=setInterval(()=>{if(new Date()>exp){clearInterval(_keyExpWatcher);go('login');$('loginErr').textContent='✗ Key expired!';$('passInput').value='';$('keyInfoBar').style.display='none';}},15000);
}

async function previewSavedKey(){
  const saved=localStorage.getItem('baw_saved_key');
  if(saved&&$('passInput')){$('passInput').value=saved;await fetchKeyPreview(saved);}
}
async function fetchKeyPreview(raw){
  if(!_sb||!raw)return;
  const{data}=await _sb.from('baw_keys').select('*').eq('key_code',raw.toUpperCase()).single();
  if(!data)return;
  const now=new Date(),neverUsed=!data.first_used_at,exp=new Date(data.expires_at),expired=!neverUsed&&exp<now;
  $('kInfoLabel').textContent=data.label||'—';
  $('kInfoDur').textContent=fmtMin(data.duration_minutes);
  if(neverUsed){$('kInfoStatus').textContent='NOT STARTED YET';$('kInfoStatus').style.color='var(--gold)';}
  else if(expired){$('kInfoStatus').textContent='EXPIRED';$('kInfoStatus').style.color='var(--red)';}
  else{const left=Math.max(0,Math.round((exp-now)/60000));$('kInfoStatus').textContent=fmtMin(left)+' LEFT';$('kInfoStatus').style.color='var(--green)';}
  $('kInfoDev').textContent=(Array.isArray(data.devices_used)?data.devices_used.length:0)+'/'+data.device_limit;
  $('keyInfoBar').style.display='block';
}
$('passInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
$('passInput')?.addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase();$('keyInfoBar').style.display='none';$('loginErr').textContent='';});

/* ════════════════════════════════════════
   PLAY WINDOW SYSTEM — Bangladesh Time
════════════════════════════════════════ */
const PLAY_WINDOWS=[
  {label:'08:00 AM',startH:8, startM:0,  durationMin:40},
  {label:'11:20 AM',startH:11,startM:20, durationMin:20},
  {label:'03:15 PM',startH:15,startM:15, durationMin:35},
  {label:'07:30 PM',startH:19,startM:30, durationMin:20},
  {label:'09:40 PM',startH:21,startM:40, durationMin:10},
];

function getBDT(){
  const now=new Date();
  return new Date(now.getTime()+now.getTimezoneOffset()*60000+6*3600000);
}

function getPlayStatus(){
  const bdt=getBDT();
  const bdtMin=bdt.getHours()*60+bdt.getMinutes();
  const bdtSec=bdt.getSeconds();
  const todayBase=new Date(bdt);todayBase.setHours(0,0,0,0);
  for(let i=0;i<PLAY_WINDOWS.length;i++){
    const w=PLAY_WINDOWS[i];
    const wStartMin=w.startH*60+w.startM;
    const wEndMin=wStartMin+w.durationMin;
    if(bdtMin>=wStartMin&&bdtMin<wEndMin){
      const elapsedMin=bdtMin-wStartMin+(bdtSec/60);
      const leftMin=w.durationMin-elapsedMin;
      const windowEnd=new Date(todayBase.getTime()+(wEndMin*60000));
      const next=PLAY_WINDOWS[(i+1)%PLAY_WINDOWS.length];
      let nextStartMs=todayBase.getTime()+(next.startH*60+next.startM)*60000;
      if(i===PLAY_WINDOWS.length-1)nextStartMs+=86400000;
      return{active:true,window:w,minutesLeft:leftMin,windowEnd,nextWindow:next,msToNext:nextStartMs-Date.now()};
    }
  }
  let nextW=null,msToNext=Infinity;
  for(let i=0;i<PLAY_WINDOWS.length;i++){
    const w=PLAY_WINDOWS[i];
    const wStartMin=w.startH*60+w.startM;
    let nextStartMs=todayBase.getTime()+wStartMin*60000;
    if(bdtMin>=wStartMin)nextStartMs+=86400000;
    const diff=nextStartMs-Date.now();
    if(diff<msToNext){msToNext=diff;nextW=w;}
  }
  return{active:false,window:null,minutesLeft:0,windowEnd:null,nextWindow:nextW,msToNext};
}

function fmtHHMMSS(ms){
  if(ms<=0)return'00:00:00';
  const t=Math.floor(ms/1000);
  const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
  return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

let _pwInited=false,_pwCheckInterval=null,_signalAllowed=false,_sessionEndNotified=false;

function initPlayWindow(){
  if(_pwInited)return;
  _pwInited=true;
  checkPlayWindow();
  _pwCheckInterval=setInterval(checkPlayWindow,5000);
}

function checkPlayWindow(){
  const st=getPlayStatus();
  if(st.active){
    _signalAllowed=true;
    _sessionEndNotified=false;
    $('signalOffBanner').classList.remove('show');
    $('sobNextTxt').textContent='';
    if($('schedDot'))$('schedDot').style.display='block';
    if(st.minutesLeft>0){
      clearTimeout(window._sessionEndTimer);
      window._sessionEndTimer=setTimeout(()=>{
        _signalAllowed=false;_sessionEndNotified=true;
        showPwDlg(false,getPlayStatus());
        $('signalOffBanner').classList.add('show');
        $('predVal').className='pred-val WAIT';$('predVal').textContent='OFF';
        $('predMeta').textContent='Signal closed';$('predTypeBadge').textContent='OUTSIDE PLAY WINDOW';
      },Math.max(0,(st.minutesLeft-0.05)*60000));
    }
  } else {
    _signalAllowed=false;
    $('signalOffBanner').classList.add('show');
    if($('schedDot'))$('schedDot').style.display='none';
    const nextTxt=st.nextWindow?`Next: ${st.nextWindow.label} (${st.nextWindow.durationMin}min)`:'No more sessions today';
    $('sobNextTxt').textContent=nextTxt;
    if(!_sessionEndNotified&&document.getElementById('signal').classList.contains('active')){
      _sessionEndNotified=true;showPwDlg(false,st);
    }
  }
}

function buildScheduleHTML(st){
  const bdt=getBDT(),bdtMin=bdt.getHours()*60+bdt.getMinutes();
  return PLAY_WINDOWS.map(w=>{
    const wStart=w.startH*60+w.startM,wEnd=wStart+w.durationMin;
    let cls='done',txt='DONE';
    if(bdtMin<wStart){cls='upcoming';txt='UPCOMING';}
    else if(bdtMin>=wStart&&bdtMin<wEnd){cls='active';txt='ACTIVE';}
    const isNext=st.nextWindow&&st.nextWindow.label===w.label&&!st.active;
    return`<div class="pw-row${isNext?' next-session':''}">
      <div><div class="pr-time">${w.label}</div><div class="pr-dur">${w.durationMin} minutes</div></div>
      <span class="pr-badge ${cls}">${txt}</span>
    </div>`;
  }).join('');
}

let _pwCountdownIv=null;
function showPwDlg(isNoWindow,st){
  $('pwSchedule').innerHTML=buildScheduleHTML(st);
  $('pwTitle').textContent=isNoWindow||!st.active?'SIGNAL CLOSED':'SESSION ENDED';
  $('pwSub').innerHTML=isNoWindow||!st.active?'এই সময়ে signal পাওয়া যাবে না।<br>Schedule দেখুন:':'Play window শেষ। পরবর্তী session এর জন্য অপেক্ষা করুন।';
  $('pwBack').classList.add('show');
  if(_pwCountdownIv)clearInterval(_pwCountdownIv);
  _pwCountdownIv=setInterval(()=>{
    const s2=getPlayStatus();
    if(s2.active){clearInterval(_pwCountdownIv);$('pwBack').classList.remove('show');initPlayWindow();return;}
    $('pwCountdownVal').textContent=fmtHHMMSS(s2.msToNext);
    $('pwSchedule').innerHTML=buildScheduleHTML(s2);
  },1000);
}

function showScheduleDialog(){
  const st=getPlayStatus();
  $('pwTitle').textContent='PLAY SCHEDULE';
  $('pwSub').innerHTML='Bangladesh Time (BDT) signal sessions:';
  $('pwSchedule').innerHTML=buildScheduleHTML(st);
  $('pwBack').classList.add('show');
  if(_pwCountdownIv)clearInterval(_pwCountdownIv);
  const nextLabel=st.active?'Session ends in:':'Next session in:';
  const initMs=st.active?(st.windowEnd-Date.now()):st.msToNext;
  $('pwCountdown').innerHTML=nextLabel+' <span id="pwCountdownVal">'+fmtHHMMSS(initMs)+'</span>';
  _pwCountdownIv=setInterval(()=>{
    const s2=getPlayStatus();
    $('pwCountdownVal').textContent=fmtHHMMSS(s2.active?(s2.windowEnd-Date.now()):s2.msToNext);
    $('pwSchedule').innerHTML=buildScheduleHTML(s2);
  },1000);
}

function closePwDlg(){$('pwBack').classList.remove('show');if(_pwCountdownIv)clearInterval(_pwCountdownIv);}

/* ════════ SWITCH VIEW ════════ */
function switchView(v){
  $('dashView').style.display=v==='dash'?'block':'none';
  $('histView').style.display=v==='hist'?'block':'none';
  $('navDash').classList.toggle('active',v==='dash');
  $('navHist').classList.toggle('active',v==='hist');
  updateSlider();
  if(v==='hist')renderHistory();
}

/* ════════ PERIOD + TIMER — WinGo 30S ════════ */
function buildPeriod(){
  const now=new Date();
  const y=now.getUTCFullYear(),m=String(now.getUTCMonth()+1).padStart(2,'0'),d=String(now.getUTCDate()).padStart(2,'0');
  const hours=now.getUTCHours(),minutes=now.getUTCMinutes(),seconds=now.getUTCSeconds();
  const totalMinutesToday=(hours*60)+minutes;
  const periodNumber=(totalMinutesToday*2)+(seconds<30?1:2);
  const periodID=`${y}${m}${d}10005${String(periodNumber).padStart(4,'0')}`;
  const timerValue=30-(seconds%30);
  const remaining=timerValue===30?0:timerValue;
  return{period:periodID,remaining};
}
function updatePeriod(){
  const{period,remaining}=buildPeriod();
  $('periodVal').textContent=period;
  $('timerVal').textContent=`00:${String(remaining).padStart(2,'0')}`;
}
setInterval(updatePeriod,1000);


/* ═══════════════════════════════════════════════════════════
   PREDICTION ENGINE — 3-NUMBER LOGIC + 300+ COMBOS
   Format: "n1:n2:n3" => prediction
═══════════════════════════════════════════════════════════ */

function bs(n){return n>=5?'BIG':'SMALL';}
function colorOf(n){if(n===0||n===5)return n===0?'RED':'GREEN';return n%2===0?'RED':'GREEN';}

/* ── 3-number lookup table (all 1000 combos) ── */
function build3Map(){
  const M={};
  // Pattern rules used to generate all 1000 entries
  const out=['SMALL','SMALL','SMALL','BIG','SMALL','GREEN','BIG','BIG','SMALL','GREEN']; // n=0..9 base
  for(let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++){
    const key=`${a}:${b}:${c}`;
    const sum=a+b+c;
    // Primary: sum-based
    if(sum<=13) M[key]= sum%2===0?'SMALL':'BIG';
    else        M[key]= sum%2===0?'BIG':'SMALL';

    // Override with specific pattern rules
    // Zigzag: alternating big/small
    const abZig=(bs(a)!==bs(b));
    const bcZig=(bs(b)!==bs(c));
    if(abZig&&bcZig){ M[key]=bs(a)==='BIG'?'SMALL':'BIG'; }

    // Triple same
    if(a===b&&b===c){
      M[key]=a<=4?'BIG':'SMALL';
    }

    // Double then different
    if(a===b&&b!==c){ M[key]=bs(c)==='BIG'?'SMALL':'BIG'; }
    if(b===c&&a!==b){ M[key]=bs(a); }

    // Ascending streak
    if(b===a+1&&c===b+1){ M[key]=c>=5?'SMALL':'BIG'; }

    // Descending streak
    if(b===a-1&&c===b-1){ M[key]=c<=4?'BIG':'SMALL'; }

    // Color-based
    const aC=colorOf(a),bC=colorOf(b),cC=colorOf(c);
    if(aC==='GREEN'&&bC==='GREEN'){ M[key]='BIG'; }
    if(aC==='RED'&&bC==='RED'&&cC==='RED'){ M[key]='SMALL'; }

    // Cross-boundary (one side of 5)
    if(a<5&&b<5&&c>=5){ M[key]='BIG'; }
    if(a>=5&&b>=5&&c<5){ M[key]='SMALL'; }

    // Specific high-confidence manual overrides
    // 0,0,0 => SMALL  | 0,0,1 => BIG  etc
    const fixed={
      '0:0:0':'SMALL','0:0:1':'BIG','0:1:1':'SMALL','1:1:0':'BIG',
      '0:0:5':'GREEN','5:5:0':'GREEN','5:0:5':'BIG',
      '9:9:9':'BIG','9:8:7':'SMALL','7:8:9':'BIG',
      '0:5:0':'GREEN','5:0:0':'BIG','0:0:9':'SMALL',
      '1:2:3':'BIG','3:2:1':'SMALL','4:5:6':'BIG','6:5:4':'SMALL',
      '2:4:6':'BIG','1:3:5':'SMALL','5:3:1':'BIG','6:4:2':'SMALL',
      '9:0:9':'SMALL','0:9:0':'BIG','8:8:8':'BIG','2:2:2':'SMALL',
      '4:4:4':'BIG','6:6:6':'SMALL','3:3:3':'BIG','7:7:7':'SMALL',
      '1:1:1':'SMALL','5:5:5':'GREEN','0:1:2':'BIG','2:1:0':'SMALL',
      '7:5:3':'SMALL','3:5:7':'BIG','8:6:4':'SMALL','4:6:8':'BIG',
      '9:7:5':'SMALL','5:7:9':'BIG','1:4:7':'BIG','7:4:1':'SMALL',
      '2:5:8':'BIG','8:5:2':'SMALL','0:3:6':'SMALL','6:3:0':'BIG',
      '1:5:9':'BIG','9:5:1':'SMALL','0:4:8':'BIG','8:4:0':'SMALL',
    };
    if(fixed[key]) M[key]=fixed[key];
  }
  return M;
}
const PRED3=build3Map();

/* ── Additional pattern detectors ── */
function detectPattern(h){
  // h = array of {number,issueNumber,...} newest first
  const n=h.map(x=>+x.number);
  if(n.length<3)return null;

  // Momentum: last 3 same BS direction => continue
  const bArr=n.slice(0,5).map(x=>bs(x));
  if(bArr[0]===bArr[1]&&bArr[1]===bArr[2]){
    // strong streak — predict opposite (reversal)
    return{type:'REVERSAL',value:bArr[0]==='BIG'?'SMALL':'BIG'};
  }

  // Alternating pattern 5+ times
  let altCount=0;
  for(let i=0;i<Math.min(6,bArr.length-1);i++){
    if(bArr[i]!==bArr[i+1])altCount++;
    else break;
  }
  if(altCount>=4){return{type:'ZIGZAG',value:bArr[0]==='BIG'?'SMALL':'BIG'};}

  // Color run
  const cArr=n.slice(0,4).map(x=>colorOf(x));
  if(cArr[0]===cArr[1]&&cArr[1]===cArr[2]&&cArr[0]!=='GREEN'){
    return{type:'COLOR_BREAK',value:cArr[0]==='RED'?'BIG':'SMALL'};
  }

  // 0 or 5 special
  if(n[0]===0)return{type:'ZERO',value:'BIG'};
  if(n[0]===5)return{type:'FIVE',value:'GREEN'};
  if(n[1]===0&&n[2]===0)return{type:'DOUBLE_ZERO',value:'SMALL'};

  // High-low swing
  if(n[0]>=8&&n[1]<=2&&n[2]>=8)return{type:'SWING',value:'SMALL'};
  if(n[0]<=2&&n[1]>=8&&n[2]<=2)return{type:'SWING',value:'BIG'};

  // Increasing trend
  if(n[0]>n[1]&&n[1]>n[2]&&n[2]>n[3])return{type:'DOWN_TREND',value:'BIG'};
  if(n[0]<n[1]&&n[1]<n[2]&&n[2]<n[3])return{type:'UP_TREND',value:'SMALL'};

  return null;
}

/* ── RECOVERY LOGIC: Period last-3-digits × Market last-2 ── */
function recoveryLogic(periodStr, marketHistory){
  // Period last 3 digits
  const pStr=String(periodStr);
  const d1=+pStr[pStr.length-3]||0;
  const d2=+pStr[pStr.length-2]||0;
  const d3=+pStr[pStr.length-1]||0;
  const periodSum=d1+d2+d3;

  // Market last 2 numbers
  const m1=+marketHistory[0]?.number||0;
  const m2=+marketHistory[1]?.number||0;
  const marketSum=m1+m2;

  if(marketSum===0)return null; // avoid divide
  const product=(periodSum*marketSum)%100;
  const lastDigit=product%10;

  // 0,5 = special; <5 = SMALL; >=5 = BIG
  if(lastDigit===0)return'SMALL';
  if(lastDigit===5)return'BIG';
  return lastDigit<5?'SMALL':'BIG';
}

/* ── MAIN PREDICT ── */
function predictNext(history, nextPeriod){
  if(history.length<3)return null;
  const n1=+history[0].number, n2=+history[1].number, n3=+history[2].number;

  if(STATE.recovery){
    // Recovery mode: use both pattern detector + period-math logic
    const patPred=detectPattern(history);
    const recPred=recoveryLogic(nextPeriod, history);

    if(patPred&&recPred){
      // Both agree => high confidence
      if(patPred.value===recPred){
        return{type:'RECOVERY_CONFIRMED',value:recPred};
      } else {
        // Disagree => skip (return null = no signal)
        return null;
      }
    }
    // Only one available
    if(recPred) return{type:'RECOVERY_MATH',value:recPred};
    if(patPred) return{type:patPred.type,value:patPred.value};
    return null;
  }

  // Normal mode: 3-number lookup first
  const key=`${n1}:${n2}:${n3}`;
  const mapVal=PRED3[key];

  // Cross-check with pattern
  const patPred=detectPattern(history);

  if(mapVal&&patPred){
    // Both agree => confident signal
    if(mapVal===patPred.value){
      return{type:'CONFIRMED_3NUM',value:mapVal};
    }
    // Disagree => use pattern (more dynamic)
    return{type:patPred.type,value:patPred.value};
  }

  if(mapVal) return{type:'3NUM_LOGIC',value:mapVal};
  if(patPred) return{type:patPred.type,value:patPred.value};

  // Fallback: simple BS of latest
  return{type:'TREND',value:bs(n1)};
}

/* badge label map */
const TYPE_LABELS={
  'CONFIRMED_3NUM':'✦ CONFIRMED SIGNAL',
  '3NUM_LOGIC':'3-NUM PATTERN',
  'RECOVERY_CONFIRMED':'✦ RECOVERY CONFIRMED',
  'RECOVERY_MATH':'RECOVERY MATH',
  'REVERSAL':'REVERSAL PATTERN',
  'ZIGZAG':'ZIGZAG PATTERN',
  'COLOR_BREAK':'COLOR BREAK',
  'ZERO':'ZERO SIGNAL',
  'FIVE':'FIVE SIGNAL',
  'DOUBLE_ZERO':'DOUBLE ZERO',
  'SWING':'SWING PATTERN',
  'DOWN_TREND':'DOWN TREND',
  'UP_TREND':'UP TREND',
  'TREND':'TREND LOGIC',
  'PATTERN':'RECOVERY PATTERN',
};

/* ════════ API + ENGINE ════════ */
const API='https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';
let _lastTop=null;

async function fetchMarket(){
  try{const r=await fetch(API+'?t='+Date.now(),{cache:'no-store'});const j=await r.json();return j?.data?.list||[]}
  catch(e){return null}
}

function renderMarket(list){
  const el=$('mktList');
  if(!list||!list.length)return;
  const topIssue=list[0].issueNumber;
  if(topIssue===_lastTop)return;
  const isFirst=_lastTop===null;
  _lastTop=topIssue;
  el.innerHTML=list.map((it,i)=>{
    const n=+it.number,b=bs(n),c=colorOf(n);
    const isNew=!isFirst&&i===0?' new':'';
    const numC=c==='GREEN'?'var(--green)':c==='RED'?'var(--red)':'var(--gold)';
    const leftBorder=c==='GREEN'?'var(--green)':c==='RED'?'var(--red)':'var(--gold)';
    return`<div class="mkt-row${isNew}" style="border-left-color:${leftBorder}40">
      <span class="p">${it.issueNumber}</span>
      <span class="n" style="color:${numC}">${n}</span>
      <span class="bs ${b}">${b}</span>
      <span class="cl ${c}"></span>
    </div>`;
  }).join('');
}

function renderHistory(){
  const el=$('histList');
  if(!STATE.signals.length){el.innerHTML='<div class="empty"><i class="ri-history-line"></i>No predictions yet</div>';return;}
  el.innerHTML=STATE.signals.slice().reverse().map(s=>{
    const r=STATE.results[s.period];
    const resTxt=r?`${r.number} • ${bs(+r.number)}`:'—';
    const isSkip=s.status==='SKIP';
    return`<div class="hist-row${isSkip?' skip-row':''}">
      <div><div class="lbl">PERIOD</div><div class="v">${s.period}</div></div>
      <div><div class="lbl">SIGNAL</div><div class="v" style="color:${isSkip?'var(--muted)':'var(--gold)'}">${s.prediction}</div></div>
      <div><div class="lbl">RESULT</div><div class="v">${resTxt}</div></div>
      <div class="res ${s.status}">${s.status}</div>
    </div>`;
  }).join('');
}

/* confetti */
function spawnConfetti(){
  const colors=['#FFD400','#FF2D5E','#00FF85','#00EEFF','#A855F7','#FF9500'];
  const back=$('dlgBack');
  for(let i=0;i<36;i++){
    const c=document.createElement('div');
    c.className='cbit';
    c.style.cssText=`left:${5+Math.random()*90}%;top:5%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-delay:${Math.random()*.5}s;animation-duration:${.8+Math.random()*.9}s;`;
    back.appendChild(c);
    setTimeout(()=>c.remove(),1800);
  }
}

function showResultDialog(signal,result){
  const win=signal.status==='WIN';
  const dlg=$('dlg');
  dlg.classList.remove('win','loss');
  dlg.classList.add(win?'win':'loss');
  $('dlgIcon').className=win?'ri-trophy-fill':'ri-close-circle-fill';
  $('dlgTitle').textContent=win?'WIN 🎉':'LOSS';
  $('dlgSub').textContent=win?'Prediction successful!':'Market moved differently';
  $('dlgPeriod').textContent=signal.period;
  $('dlgPred').textContent=signal.prediction;
  $('dlgResult').textContent=`${result.number} • ${bs(+result.number)} • ${colorOf(+result.number)}`;
  $('dlgBack').classList.add('show');
  if(win)spawnConfetti();
}
function closeDlg(){$('dlgBack').classList.remove('show');}

function bumpStat(id){
  const el=$(id);if(!el)return;
  el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');
}

function evalSignal(signal,result){
  const n=+result.number,pr=signal.prediction;
  if(pr==='SKIP')return; // don't eval skip entries
  let win=false;
  if(pr==='BIG'||pr==='SMALL')win=(bs(n)===pr);
  else if(pr==='RED'||pr==='GREEN')win=(colorOf(n)===pr);
  signal.status=win?'WIN':'LOSS';
  if(win){STATE.win++;STATE.streak++;STATE.recovery=false;}
  else{STATE.loss++;STATE.streak=0;STATE.recovery=true;}
  updateStats();
  showResultDialog(signal,result);
  renderHistory();
}

function updateStats(){
  $('stTotal').textContent=STATE.win+STATE.loss; bumpStat('stTotal');
  $('stWin').textContent=STATE.win;              bumpStat('stWin');
  $('stLoss').textContent=STATE.loss;            bumpStat('stLoss');
  $('stStreak').textContent=STATE.streak;        bumpStat('stStreak');
  const total=STATE.win+STATE.loss;
  const acc=total>0?Math.round(STATE.win/total*100):0;
  $('accPct').textContent=acc+'%';
  $('accFill').style.width=acc+'%';
}

function nextPeriodOf(p){
  const base=p.slice(0,-4),tail=parseInt(p.slice(-4),10)+1;
  return base+String(tail).padStart(4,'0');
}

/* ════════ ENGINE ════════ */
let _engineRunning=false;
const _evalledPeriods=new Set();

async function engineTick(){
  if(_engineRunning)return;
  _engineRunning=true;
  try{
    const list=await fetchMarket();
    if(!list){_engineRunning=false;return;}
    renderMarket(list);

    // Eval pending signals (deduped)
    STATE.signals.forEach(s=>{
      if(s.status!=='PENDING'||_evalledPeriods.has(s.period))return;
      const hit=list.find(x=>x.issueNumber===s.period);
      if(hit){_evalledPeriods.add(s.period);STATE.results[s.period]=hit;evalSignal(s,hit);}
    });

    // New prediction — only inside play window
    if(_signalAllowed){
      const latest=list[0];
      if(latest){
        const nextP=nextPeriodOf(latest.issueNumber);
        const alreadyHas=STATE.signals.some(s=>s.period===nextP);
        if(!alreadyHas&&STATE.lastPredPeriod!==nextP){
          STATE.lastPredPeriod=nextP;
          const pred=predictNext(list,nextP);

          if(pred===null){
            // Recovery skip — signals disagree, record as SKIP
            STATE.signals.push({period:nextP,prediction:'SKIP',type:'RECOVERY_SKIP',status:'SKIP'});
            $('predVal').className='pred-val WAIT';
            $('predVal').textContent='WAIT';
            $('predMeta').textContent='Analyzing '+nextP;
            $('predTypeBadge').textContent='⏸ RECOVERY ANALYSIS — WAITING';
          } else {
            STATE.signals.push({period:nextP,prediction:pred.value,type:pred.type,status:'PENDING'});
            $('predVal').className='pred-val '+pred.value;
            $('predVal').textContent=pred.value;
            $('predMeta').textContent=nextP;
            $('predTypeBadge').textContent=TYPE_LABELS[pred.type]||pred.type;
            // Flash animation on new signal
            const pv=$('predVal');
            pv.style.transform='scale(1.18)';
            setTimeout(()=>pv.style.transform='',350);
          }
        }
      }
    }
  }catch(e){}
  _engineRunning=false;
}

function startEngine(){
  updatePeriod();
  engineTick();
  setInterval(engineTick,3000);
  setInterval(()=>{const s=new Date().getUTCSeconds()%30;if(s<=2)engineTick();},1000);
}

/* ════════ REALTIME IMAGE ANIMATION ════════ */
(function initImgAnim(){
  // Pulse ring on hero logo images
  document.querySelectorAll('.hero-core img, .ph-logo img, .admin-logo img').forEach(img=>{
    img.style.transition='transform .4s ease,filter .4s ease';
    setInterval(()=>{
      img.style.transform='scale(1.07)';
      img.style.filter='brightness(1.2) drop-shadow(0 0 12px rgba(255,212,0,.7))';
      setTimeout(()=>{
        img.style.transform='scale(1)';
        img.style.filter='brightness(1) drop-shadow(0 0 4px rgba(255,212,0,.3))';
      },700);
    },2800);
  });

  // Scan line sweep across pred card
  const predCard=document.querySelector('.pred-card');
  if(predCard){
    const sweep=document.createElement('div');
    sweep.style.cssText='position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,212,0,.06),transparent);pointer-events:none;z-index:3;border-radius:inherit';
    predCard.appendChild(sweep);
    setInterval(()=>{
      sweep.style.transition='none';sweep.style.left='-60%';
      requestAnimationFrame(()=>{
        sweep.style.transition='left 1.2s linear';
        sweep.style.left='110%';
      });
    },3500);
  }

  // Blinking status dots
  document.querySelectorAll('.live-dot,.status-dot,.schedDot').forEach(dot=>{
    dot.style.animation='blink 1.1s ease-in-out infinite';
  });
})();
