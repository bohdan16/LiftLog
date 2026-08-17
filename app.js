const KEY='liftlog-data-v2';
const EX={
'Incline Dumbbell Press':['Chest',['Incline Machine Press']],'Overhead Press':['Shoulders',['Machine Shoulder Press']],'Cable Lateral Raise':['Shoulders',['Dumbbell Lateral Raise']],'Chest Fly':['Chest',['Cable Fly','Pec Deck']],'Triceps Pushdown':['Triceps',['Overhead Triceps Extension']],
'Incline Machine Press':['Chest',['Incline Dumbbell Press']],'Overhead Triceps Extension':['Triceps',['Triceps Pushdown']],
'Lat Pulldown':['Back',['Assisted Pull-Up']],'Seated Cable Row':['Back',['Chest-Supported Row']],'Rear Delt Fly':['Rear Delts',['Reverse Pec Deck']],'Face Pull':['Rear Delts',['Cable Rear Delt Row']],'Preacher Curl':['Biceps',['Incline Dumbbell Curl']],'Hammer Curl':['Biceps',['Rope Hammer Curl']],
'Standing Cable Pullover':['Back',['Straight-Arm Pulldown']],'Machine Lat Pulldown':['Back',['Lat Pulldown']],'Bent-Over Row':['Back',['Chest-Supported Row']],
'Squat':['Quads',['Leg Press','Deadlift','Hack Squat']],'Deadlift':['Hamstrings',['Leg Press','Hack Squat']],'Romanian Deadlift':['Hamstrings',['Leg Curl']],'Leg Press':['Quads',['Deadlift','Hack Squat']],'Hack Squat':['Quads',['Leg Press','Deadlift']],'Leg Curl':['Hamstrings',['Romanian Deadlift']],'Leg Extension':['Quads',['Squat','Leg Press']],'Calf Raise':['Calves',['Seated Calf Raise']]
};
const ROUTINES={'Push A':['Incline Dumbbell Press','Overhead Press','Cable Lateral Raise','Chest Fly','Triceps Pushdown'],'Push B':['Incline Machine Press','Overhead Press','Cable Lateral Raise','Chest Fly','Overhead Triceps Extension'],'Pull A':['Lat Pulldown','Seated Cable Row','Rear Delt Fly','Face Pull','Preacher Curl','Hammer Curl'],'Pull B':['Standing Cable Pullover','Machine Lat Pulldown','Seated Cable Row','Face Pull','Bent-Over Row','Preacher Curl','Hammer Curl'],'Legs A':['Deadlift','Leg Curl','Leg Extension','Calf Raise'],'Legs B':['Leg Press','Leg Curl','Leg Extension','Calf Raise'],'Legs C':['Hack Squat','Leg Curl','Leg Extension','Calf Raise']};
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{workouts:[],cardio:[],routines:ROUTINES,settings:{rest:90}};
if(!data.routines['Legs A']&&!data.routines['Legs B']&&!data.routines['Legs C']){
  delete data.routines['Legs'];
  data.routines['Legs A']=ROUTINES['Legs A'];
  data.routines['Legs B']=ROUTINES['Legs B'];
  data.routines['Legs C']=ROUTINES['Legs C'];
  localStorage.setItem(KEY,JSON.stringify(data));
}
let cur={routine:Object.keys(data.routines)[0]||'Push A',started:null,exercises:[],active:false},activeTimers={},installEvt=null;
const $=id=>document.getElementById(id); const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(data)); const dk=d=>new Date(d).toISOString().slice(0,10); const fd=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

function nav(id){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));if(id==='dashboard')dashboard();if(id==='workout')workout();if(id==='cardio')cardio();if(id==='progress')progress();if(id==='history')history();if(id==='settings')settings();scrollTo(0,0)}
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));
function info(n){return EX[n]||['Other',[]]};
function setsFor(n){let a=[];data.workouts.forEach(w=>(w.exercises||[]).filter(e=>e.name===n).forEach(e=>(e.sets||[]).forEach(s=>{let wt=+s.weight||0,r=+s.reps||0;if(wt&&r)a.push({weight:wt,reps:r,date:w.date})})));return a}
function best(n){let a=setsFor(n);return{weight:Math.max(0,...a.map(x=>x.weight)),reps:Math.max(0,...a.map(x=>x.reps))}}
function oneRM(n){return Math.max(0,...setsFor(n).map(x=>x.weight*(1+x.reps/30)))}
function suggest(n){let a=setsFor(n);if(!a.length)return'First session: choose a comfortable weight';let s=a[a.length-1],w=s.weight;if(s.reps>=12)return`Next: ${Math.round((w+5)/5)*5} lb`;if(s.reps>=10)return`Next: ${Math.round((w+2.5)/2.5)*2.5} lb`;return`Repeat ${Math.round(w/2.5)*2.5} lb and add reps`}

function makeSet(b){
  return {weight:b.weight||'',reps:b.reps||'',done:false,restSec:data.settings.rest||90,timerEnd:null,timerDuration:null};
}
function make(n){
  let b=best(n);
  return {name:n,sets:[makeSet(b),makeSet(b),makeSet(b)]};
}

function startSetTimer(eIdx, sIdx){
  let set = cur.exercises[eIdx].sets[sIdx];
  let timerKey = `${eIdx}-${sIdx}`;
  if(activeTimers[timerKey]) clearInterval(activeTimers[timerKey]);
  
  let duration = Math.max(5, +set.restSec || 90);
  set.timerDuration = duration;
  set.timerEnd = Date.now() + duration * 1000;
  
  activeTimers[timerKey] = setInterval(()=>{
    let el = $(`timer-${eIdx}-${sIdx}`);
    let barEl = $(`timerBar-${eIdx}-${sIdx}`);
    let left = Math.max(0, set.timerEnd - Date.now());
    let pct = (left / (set.timerDuration * 1000)) * 100;
    
    if(el){
      el.textContent = new Date(left).toISOString().slice(14,19);
      el.classList.add('running');
    }
    if(barEl){
      barEl.style.width = `${pct}%`;
    }
    
    if(left <= 0){
      clearInterval(activeTimers[timerKey]);
      delete activeTimers[timerKey];
      set.timerEnd = null;
      set.timerDuration = null;
      if(el){
        el.textContent = 'GO!';
        el.classList.remove('running');
      }
      if(barEl){
        barEl.style.width = '0%';
      }
      navigator.vibrate?.([200,100,200]);
    }
  }, 100);
}

function stopSetTimer(eIdx, sIdx){
  let timerKey = `${eIdx}-${sIdx}`;
  if(activeTimers[timerKey]){
    clearInterval(activeTimers[timerKey]);
    delete activeTimers[timerKey];
  }
  let set = cur.exercises[eIdx].sets[sIdx];
  set.timerEnd = null;
  set.timerDuration = null;
  let barEl = $(`timerBar-${eIdx}-${sIdx}`);
  if(barEl) barEl.style.width = '0%';
}

function workout(){
  let s=$('routineSelect');s.innerHTML=Object.keys(data.routines).map(r=>`<option>${esc(r)}</option>`).join('');s.value=cur.routine;s.disabled=cur.active;
  s.onchange=()=>{cur.routine=s.value;workout()};

  $('startWorkoutBtn').classList.toggle('hidden',cur.active);
  $('exerciseList').classList.toggle('hidden',!cur.active);
  $('workoutFooter').classList.toggle('hidden',!cur.active);
  $('finishWorkout').classList.toggle('hidden',!cur.active);

  if(!cur.active){
    let names=data.routines[cur.routine]||[];
    $('routineSummary').textContent=`${names.length} exercises • ${names.join(', ')}`;
    $('exerciseList').innerHTML='';
    $('setsCompleted').textContent='0';
    $('workoutClock').textContent='00:00';
    return;
  }

  $('routineSummary').textContent=`${cur.exercises.length} exercises • Visual rest countdown bars + progression suggestions`;
  
  $('exerciseList').innerHTML=cur.exercises.map((e,i)=>{
    let b=best(e.name),inf=info(e.name);
    return `<div class="card exercise">
      <div class="exerciseHead"><b>${esc(e.name)}${e.superset?' • SUPERSET':''}</b><span class="pill">${esc(inf[0])}</span></div>
      <div class="exerciseMeta"><span>Best ${b.weight||0} lb × ${b.reps||0}</span><span>${esc(suggest(e.name))}</span></div>
      <div class="sets">${e.sets.map((x,j)=>{
        let timeStr = x.timerEnd ? new Date(Math.max(0, x.timerEnd - Date.now())).toISOString().slice(14,19) : new Date((+x.restSec||90)*1000).toISOString().slice(14,19);
        let barPct = (x.timerEnd && x.timerDuration) ? Math.max(0, ((x.timerEnd - Date.now()) / (x.timerDuration * 1000)) * 100) : 0;
        
        return `<div class="setBlock ${x.done?'done':''}">
          <div class="setRow">
            <span class="setNum">${j+1}</span>
            <input data-e="${i}" data-s="${j}" data-f="weight" type="number" value="${x.weight}" placeholder="lb">
            <input data-e="${i}" data-s="${j}" data-f="reps" type="number" value="${x.reps}" placeholder="reps">
            <button class="complete ${x.done?'done':''}" data-c="${i}" data-s="${j}">✓</button>
          </div>
          <div class="progressTrack"><div id="timerBar-${i}-${j}" class="progressBar" style="width:${barPct}%"></div></div>
          <div class="setTimerRow">
            <span class="muted small">Rest</span>
            <input class="restInput" data-e="${i}" data-s="${j}" type="number" min="5" step="5" value="${x.restSec||90}">
            <span class="muted small">s</span>
            <span id="timer-${i}-${j}" class="setTimerDisplay ${x.timerEnd?'running':''}">${timeStr}</span>
            <button class="timerBtn ghost" data-tstart="${i}" data-ts="${j}">${x.timerEnd?'Skip':'Start'}</button>
          </div>
        </div>`
      }).join('')}</div>
      <div class="exerciseTools"><button data-sub="${i}">Substitute</button><button data-sup="${i}">Superset</button><button data-rem="${i}">Remove</button></div>
      <button class="addSet" data-add="${i}">+ Add set</button>
    </div>`
  }).join('');

  $('exerciseList').querySelectorAll('input[data-f]').forEach(x=>x.oninput=()=>cur.exercises[+x.dataset.e].sets[+x.dataset.s][x.dataset.f]=x.value);
  $('exerciseList').querySelectorAll('.restInput').forEach(x=>x.onchange=()=>{
    let val = Math.max(5, +x.value || 90);
    cur.exercises[+x.dataset.e].sets[+x.dataset.s].restSec = val;
    workout();
  });

  $('exerciseList').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{
    let eIdx = +b.dataset.c, sIdx = +b.dataset.s;
    let x = cur.exercises[eIdx].sets[sIdx];
    if(!(+x.weight&&+x.reps))return alert('Enter weight and reps first.');
    x.done = !x.done;
    if(x.done){
      startSetTimer(eIdx, sIdx);
    } else {
      stopSetTimer(eIdx, sIdx);
    }
    workout();
  });

  $('exerciseList').querySelectorAll('[data-tstart]').forEach(b=>b.onclick=()=>{
    let eIdx = +b.dataset.tstart, sIdx = +b.dataset.ts;
    let x = cur.exercises[eIdx].sets[sIdx];
    if(x.timerEnd){
      stopSetTimer(eIdx, sIdx);
    } else {
      startSetTimer(eIdx, sIdx);
    }
    workout();
  });

  $('exerciseList').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
    let bst = best(cur.exercises[+b.dataset.add].name);
    cur.exercises[+b.dataset.add].sets.push(makeSet(bst));
    workout();
  });
  $('exerciseList').querySelectorAll('[data-rem]').forEach(b=>b.onclick=()=>{cur.exercises.splice(+b.dataset.rem,1);workout()});
  $('exerciseList').querySelectorAll('[data-sup]').forEach(b=>b.onclick=()=>{let e=cur.exercises[+b.dataset.sup];e.superset=!e.superset;workout()});
  $('exerciseList').querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{let i=+b.dataset.sub,a=info(cur.exercises[i].name)[1];if(!a.length)return alert('No substitution listed.');let n=prompt('Choose:\n'+a.map((x,j)=>`${j+1}. ${x}`).join('\n'));n=a[(+n||1)-1];if(n){cur.exercises[i].name=n;workout()}});
  $('setsCompleted').textContent=cur.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
}

$('startWorkoutBtn').onclick=()=>{
  let r=$('routineSelect').value;
  if(!confirm(`Start "${r}" workout?`))return;
  cur={routine:r,started:Date.now(),exercises:data.routines[r].map(make),active:true};
  workout();
};

$('newWorkout').onclick=()=>{
  if(cur.active&&!confirm('Discard current workout?'))return;
  cur={routine:$('routineSelect').value||Object.keys(data.routines)[0],started:null,exercises:[],active:false};
  workout();
};
$('finishWorkout').onclick=()=>{
  let ex=cur.exercises.map(e=>({...e,sets:e.sets.filter(s=>s.done)})).filter(e=>e.sets.length);
  if(!ex.length)return alert('Complete at least one set first.');
  let vol=ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0);
  data.workouts.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),routine:cur.routine,durationMin:Math.max(1,Math.round((Date.now()-cur.started)/60000)),volume:vol,exercises:ex});
  save();cur={routine:cur.routine,started:null,exercises:[],active:false};alert('Workout saved!');nav('dashboard');
};

setInterval(()=>{if(cur.active&&$('workout').classList.contains('active')){let s=Math.floor((Date.now()-cur.started)/1000);$('workoutClock').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}},1000);

function cardio(){let a=$('cardioActivity').value;$('treadmillFields').classList.toggle('hidden',a!=='Treadmill');$('stairFields').classList.toggle('hidden',a!=='StairMaster');$('cardioHistory').innerHTML=data.cardio.slice(0,10).map(c=>`<div class="card historyItem"><div><b>${esc(c.activity)}</b><span class="muted small">${fd(c.date)} • ${c.duration} min</span></div><b>${c.calories||0} kcal</b></div>`).join('')||'<div class="empty">No cardio logged yet.</div>'}
$('cardioActivity').onchange=cardio;$('saveCardio').onclick=()=>{let c={id:crypto.randomUUID(),date:new Date().toISOString(),activity:$('cardioActivity').value,duration:+$('cardioDuration').value||0,calories:+$('cardioCalories').value||0,speed:+$('speed').value||0,incline:+$('incline').value||0,level:+$('stairLevel').value||0,notes:$('cardioNotes').value};if(!c.duration)return alert('Enter duration.');data.cardio.unshift(c);save();['cardioDuration','cardioCalories','speed','incline','stairLevel','cardioNotes'].forEach(id=>$(id).value='');cardio();dashboard()};
function week(){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));let e=new Date(d);e.setDate(e.getDate()+7);let w=data.workouts.filter(x=>new Date(x.date)>=d&&new Date(x.date)<e),c=data.cardio.filter(x=>new Date(x.date)>=d&&new Date(x.date)<e);return{w,c,vol:w.reduce((a,x)=>a+(+x.volume||0),0),cal:c.reduce((a,x)=>a+(+x.calories||0),0)}}
function line(cv,vals){let ctx=cv.getContext('2d'),d=devicePixelRatio||1,w=cv.clientWidth,h=cv.height;cv.width=w*d;cv.height=h*d;ctx.scale(d,d);ctx.clearRect(0,0,w,h);let m=Math.max(...vals,1),p=15;ctx.beginPath();vals.forEach((v,i)=>{let x=p+i*(w-2*p)/Math.max(vals.length-1,1),y=h-p-v/m*(h-2*p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#aebcff';ctx.lineWidth=3;ctx.stroke()}
function dashboard(){let t=week(),days=new Set(t.w.map(x=>dk(x.date)));$('weekWorkouts').textContent=`${t.w.length} workout${t.w.length===1?'':'s'}`;$('weekFrequency').textContent=`${days.size} training day${days.size===1?'':'s'}`;$('weekCalories').textContent=t.cal;$('volumeWeek').textContent=`${Math.round(t.vol).toLocaleString()} lb`;$('goalFill').style.width=Math.min(100,t.cal/1000*100)+'%';let v=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);v.push(data.workouts.filter(w=>dk(w.date)===dk(d)).reduce((a,x)=>a+(+x.volume||0),0))}line($('volumeChart'),v);let prs=Object.keys(EX).map(n=>[n,best(n).weight]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,5);$('prs').innerHTML=prs.map(x=>`<div class="card pr"><span><b>${esc(x[0])}</b><br><span class="muted small">Weight PR</span></span><b>${x[1]} lb</b></div>`).join('')||'<div class="empty">Complete a workout to start tracking PRs.</div>'}
function progress(){let names=Object.keys(EX).sort();$('progressExercise').innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join('');updateProgress($('progressExercise').value)}$('progressExercise').onchange=e=>updateProgress(e.target.value);
function bars(cv,obj){let ctx=cv.getContext('2d'),d=devicePixelRatio||1,w=cv.clientWidth,h=cv.height;cv.width=w*d;cv.height=h*d;ctx.scale(d,d);ctx.clearRect(0,0,w,h);let a=Object.entries(obj).sort((x,y)=>y[1]-x[1]).slice(0,8),m=Math.max(...a.map(x=>x[1]),1);a.forEach(([k,v],i)=>{let y=10+i*25;ctx.fillStyle='#aebcff';ctx.fillRect(115,y,(w-130)*v/m,16);ctx.fillStyle='#9aa6b8';ctx.font='12px sans-serif';ctx.fillText(k,5,y+12)})}
function updateProgress(n){let a=setsFor(n),b=best(n),rm=oneRM(n),vol=a.reduce((x,s)=>x+s.weight*s.reps,0);$('bestWeight').textContent=`${b.weight} lb`;$('bestReps').textContent=b.reps;$('best1rm').textContent=`${Math.round(rm)} lb`;$('exerciseVolume').textContent=`${Math.round(vol).toLocaleString()} lb`;let trend={};a.forEach(s=>trend[dk(s.date)]=Math.max(trend[dk(s.date)]||0,s.weight*(1+s.reps/30)));line($('strengthChart'),Object.values(trend).slice(-14));let mus={};data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{let m=info(e.name)[0];mus[m]=(mus[m]||0)+e.sets.reduce((q,s)=>q+(+s.weight||0)*(+s.reps||0),0)}));bars($('muscleChart'),mus);let f=[];for(let i=7;i>=0;i--){let end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()-i*7);let start=new Date(end);start.setDate(start.getDate()-7);f.push(data.workouts.filter(w=>new Date(w.date)>=start&&new Date(w.date)<end).length)}line($('frequencyChart'),f);$('progressDetails').innerHTML=`<div class="card"><b>Progression recommendation</b><p class="muted small">${esc(suggest(n))}. Rep PRs and weight PRs are tracked independently. Estimated 1RM uses the Epley formula.</p></div>`}

function history(){
  let all=[...data.workouts.map(x=>({...x,type:'Workout'})),...data.cardio.map(x=>({...x,type:'Cardio'}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  
  $('historyList').innerHTML=all.map((x, idx)=>{
    if(x.type==='Workout'){
      let exList = (x.exercises||[]).map(e=>`
        <div class="historyExercise">
          <div class="historyExHead"><b>${esc(e.name)}</b></div>
          <div class="historySetsGrid">
            ${(e.sets||[]).map((s,sIdx)=>`<span class="historySetBadge">Set ${sIdx+1}: ${s.weight}lb × ${s.reps}</span>`).join('')}
          </div>
        </div>
      `).join('');
      
      return `<div class="card historyCard">
        <div class="historyHeader" data-htoggle="${idx}">
          <div>
            <b>${esc(x.routine)}</b>
            <div class="muted small">${fd(x.date)} • ${x.durationMin} min • ${Math.round(x.volume||0).toLocaleString()} lb volume</div>
          </div>
          <span class="pill">${(x.exercises||[]).reduce((a,e)=>a+(e.sets||[]).length,0)} sets ▼</span>
        </div>
        <div id="hdetails-${idx}" class="historyDetails hidden">${exList}</div>
      </div>`;
    } else {
      return `<div class="card historyItem">
        <div><b>${esc(x.activity)}</b><br><span class="muted small">${fd(x.date)} • ${x.duration} min</span></div>
        <span class="pill">${x.calories||0} kcal</span>
      </div>`;
    }
  }).join('')||'<div class="empty">No history yet.</div>';

  $('historyList').querySelectorAll('[data-htoggle]').forEach(el=>{
    el.onclick=()=>{
      let det = $(`hdetails-${el.dataset.htoggle}`);
      if(det) det.classList.toggle('hidden');
    };
  });
}

$('clearHistory').onclick=()=>{if(confirm('Clear workout and cardio history?')){data.workouts=[];data.cardio=[];save();history();dashboard();progress()}};
function settings(){$('defaultRest').value=data.settings.rest;$('routineSettings').innerHTML=Object.entries(data.routines).map(([r,e])=>`<div class="routineRow" style="padding:12px 0;border-bottom:1px solid #252e3b"><span><b>${esc(r)}</b><br><span class="muted small">${e.length} exercises</span></span><span class="pill">Built in</span></div>`).join('')}
$('saveRest').onclick=()=>{data.settings.rest=Math.max(5,+$('defaultRest').value||90);save();alert('Default rest timer saved.')};$('exportData').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`liftlog-backup-${dk(new Date())}.json`;a.click()};$('importData').onchange=e=>{let f=e.target.files[0],r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.workouts||!x.cardio)throw 0;data=x;data.settings=data.settings||{rest:90};save();location.reload()}catch{alert('Invalid LiftLog backup.')}};r.readAsText(f)};$('clearData').onclick=()=>{if(confirm('Delete ALL LiftLog data?')){localStorage.removeItem(KEY);location.reload()}};
window.addEventListener('resize',()=>{if($('dashboard').classList.contains('active'))dashboard();if($('progress').classList.contains('active'))updateProgress($('progressExercise').value)});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(installEvt){installEvt.prompt();await installEvt.userChoice;installEvt=null}};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
dashboard();workout();cardio();progress();history();settings();
