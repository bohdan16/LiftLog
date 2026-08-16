const KEY='liftlog-data-v2';
const EX={
'Incline Dumbbell Press':['Chest',['Incline Machine Press']],'Overhead Press':['Shoulders',['Machine Shoulder Press']],'Cable Lateral Raise':['Shoulders',['Dumbbell Lateral Raise']],'Chest Fly':['Chest',['Cable Fly','Pec Deck']],'Triceps Pushdown':['Triceps',['Overhead Triceps Extension']],
'Incline Machine Press':['Chest',['Incline Dumbbell Press']],'Overhead Triceps Extension':['Triceps',['Triceps Pushdown']],
'Lat Pulldown':['Back',['Assisted Pull-Up']],'Seated Cable Row':['Back',['Chest-Supported Row']],'Rear Delt Fly':['Rear Delts',['Reverse Pec Deck']],'Face Pull':['Rear Delts',['Cable Rear Delt Row']],'Preacher Curl':['Biceps',['Incline Dumbbell Curl']],'Hammer Curl':['Biceps',['Rope Hammer Curl']],
'Standing Cable Pullover':['Back',['Straight-Arm Pulldown']],'Machine Lat Pulldown':['Back',['Lat Pulldown']],'Bent-Over Row':['Back',['Chest-Supported Row']],
'Squat':['Quads',['Leg Press']],'Romanian Deadlift':['Hamstrings',['Leg Curl']],'Leg Press':['Quads',['Squat']],'Leg Curl':['Hamstrings',['Romanian Deadlift']],'Leg Extension':['Quads',['Reverse Lunge']],'Calf Raise':['Calves',['Seated Calf Raise']]
};
const ROUTINES={'Push A':['Incline Dumbbell Press','Overhead Press','Cable Lateral Raise','Chest Fly','Triceps Pushdown'],'Push B':['Incline Machine Press','Overhead Press','Cable Lateral Raise','Chest Fly','Overhead Triceps Extension'],'Pull A':['Lat Pulldown','Seated Cable Row','Rear Delt Fly','Face Pull','Preacher Curl','Hammer Curl'],'Pull B':['Standing Cable Pullover','Machine Lat Pulldown','Seated Cable Row','Face Pull','Bent-Over Row','Preacher Curl','Hammer Curl'],'Legs':['Squat','Romanian Deadlift','Leg Press','Leg Curl','Leg Extension','Calf Raise']};
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{workouts:[],cardio:[],routines:ROUTINES,settings:{rest:90}};
let cur={routine:'Push A',started:Date.now(),exercises:[]},timer=null,installEvt=null,currentTimerSec=data.settings.rest||90;
const $=id=>document.getElementById(id); const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(data)); const dk=d=>new Date(d).toISOString().slice(0,10); const fd=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

function nav(id){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));if(id==='dashboard')dashboard();if(id==='workout')workout();if(id==='cardio')cardio();if(id==='progress')progress();if(id==='history')history();if(id==='settings')settings();scrollTo(0,0)}
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));
function info(n){return EX[n]||['Other',[]]};
function setsFor(n){let a=[];data.workouts.forEach(w=>(w.exercises||[]).filter(e=>e.name===n).forEach(e=>(e.sets||[]).forEach(s=>{let wt=+s.weight||0,r=+s.reps||0;if(wt&&r)a.push({weight:wt,reps:r,date:w.date})})));return a}
function best(n){let a=setsFor(n);return{weight:Math.max(0,...a.map(x=>x.weight)),reps:Math.max(0,...a.map(x=>x.reps))}}
function oneRM(n){return Math.max(0,...setsFor(n).map(x=>x.weight*(1+x.reps/30)))}
function suggest(n){let a=setsFor(n);if(!a.length)return'First session: choose a comfortable weight';let s=a[a.length-1],w=s.weight;if(s.reps>=12)return`Next: ${Math.round((w+5)/5)*5} lb`;if(s.reps>=10)return`Next: ${Math.round((w+2.5)/2.5)*2.5} lb`;return`Repeat ${Math.round(w/2.5)*2.5} lb and add reps`}
function make(n){let b=best(n);return{name:n,sets:[{weight:b.weight||'',reps:b.reps||'',done:false},{weight:b.weight||'',reps:b.reps||'',done:false},{weight:b.weight||'',reps:b.reps||'',done:false}]}}

function initTimerUI(){
  if($('timerInput')){
    $('timerInput').value=currentTimerSec;
    $('timerInput').onchange=(e)=>{
      currentTimerSec=Math.max(5,+$('timerInput').value||90);
      if(!timer) $('timerValue').textContent=new Date(currentTimerSec*1000).toISOString().slice(14,19);
    };
  }
}

function startRestTimer(sec){
  clearInterval(timer);
  let duration=sec||currentTimerSec;
  let end=Date.now()+duration*1000;
  $('restTimerBar').classList.add('running');
  $('startTimerBtn').classList.add('hidden');
  $('skipTimerBtn').classList.remove('hidden');
  timer=setInterval(()=>{
    let l=Math.max(0,end-Date.now());
    $('timerValue').textContent=new Date(l).toISOString().slice(14,19);
    if(l<=0){
      clearInterval(timer);
      timer=null;
      $('timerValue').textContent='GO!';
      $('restTimerBar').classList.remove('running');
      $('startTimerBtn').classList.remove('hidden');
      $('skipTimerBtn').classList.add('hidden');
      navigator.vibrate?.([200,100,200]);
    }
  },200);
}

$('startTimerBtn').onclick=()=>startRestTimer(currentTimerSec);
$('skipTimerBtn').onclick=()=>{
  clearInterval(timer);
  timer=null;
  $('restTimerBar').classList.remove('running');
  $('startTimerBtn').classList.remove('hidden');
  $('skipTimerBtn').classList.add('hidden');
  $('timerValue').textContent=new Date(currentTimerSec*1000).toISOString().slice(14,19);
};

function workout(){
  initTimerUI();
  let s=$('routineSelect');s.innerHTML=Object.keys(data.routines).map(r=>`<option>${esc(r)}</option>`).join('');s.value=cur.routine;
  if(!cur.exercises.length)cur.exercises=data.routines[cur.routine].map(make);
  $('routineSummary').textContent=`${cur.exercises.length} exercises • Previous bests + progression suggestions`;
  $('exerciseList').innerHTML=cur.exercises.map((e,i)=>{
    let b=best(e.name),inf=info(e.name);
    return `<div class="card exercise"><div class="exerciseHead"><b>${esc(e.name)}${e.superset?' • SUPERSET':''}</b><span class="pill">${esc(inf[0])}</span></div><div class="exerciseMeta"><span>Best ${b.weight||0} lb × ${b.reps||0}</span><span>${esc(suggest(e.name))}</span></div><div class="sets">${e.sets.map((x,j)=>`<div class="setRow ${x.done?'done':''}"><span class="setNum">${j+1}</span><input data-e="${i}" data-s="${j}" data-f="weight" type="number" value="${x.weight}" placeholder="lb"><input data-e="${i}" data-s="${j}" data-f="reps" type="number" value="${x.reps}" placeholder="reps"><button class="complete ${x.done?'done':''}" data-c="${i}" data-s="${j}">✓</button></div>`).join('')}</div><div class="exerciseTools"><button data-sub="${i}">Substitute</button><button data-sup="${i}">Superset</button><button data-rem="${i}">Remove</button></div><button class="addSet" data-add="${i}">+ Add set</button></div>`
  }).join('');

  $('exerciseList').querySelectorAll('input').forEach(x=>x.oninput=()=>cur.exercises[+x.dataset.e].sets[+x.dataset.s][x.dataset.f]=x.value);
  $('exerciseList').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{
    let x=cur.exercises[+b.dataset.c].sets[+b.dataset.s];
    if(!(+x.weight&&+x.reps))return alert('Enter weight and reps first.');
    x.done=!x.done;
    if(x.done) startRestTimer(currentTimerSec);
    workout();
  });
  $('exerciseList').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{cur.exercises[+b.dataset.add].sets.push({weight:'',reps:'',done:false});workout()});
  $('exerciseList').querySelectorAll('[data-rem]').forEach(b=>b.onclick=()=>{cur.exercises.splice(+b.dataset.rem,1);workout()});
  $('exerciseList').querySelectorAll('[data-sup]').forEach(b=>b.onclick=()=>{let e=cur.exercises[+b.dataset.sup];e.superset=!e.superset;workout()});
  $('exerciseList').querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{let i=+b.dataset.sub,a=info(cur.exercises[i].name)[1];if(!a.length)return alert('No substitution listed.');let n=prompt('Choose:\n'+a.map((x,j)=>`${j+1}. ${x}`).join('\n'));n=a[(+n||1)-1];if(n){cur.exercises[i].name=n;workout()}});
  $('setsCompleted').textContent=cur.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  s.onchange=()=>{cur={routine:s.value,started:Date.now(),exercises:[]};workout()};
}

$('newWorkout').onclick=()=>{cur={routine:$('routineSelect').value||'Push A',started:Date.now(),exercises:[]};workout()};
$('finishWorkout').onclick=()=>{
  let ex=cur.exercises.map(e=>({...e,sets:e.sets.filter(s=>s.done)})).filter(e=>e.sets.length);
  if(!ex.length)return alert('Complete at least one set first.');
  let vol=ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0);
  data.workouts.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),routine:cur.routine,durationMin:Math.max(1,Math.round((Date.now()-cur.started)/60000)),volume:vol,exercises:ex});
  save();cur={routine:cur.routine,started:Date.now(),exercises:[]};alert('Workout saved!');nav('dashboard');
};

setInterval(()=>{if($('workout').classList.contains('active')){let s=Math.floor((Date.now()-cur.started)/1000);$('workoutClock').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}},1000);

function cardio(){let a=$('cardioActivity').value;$('treadmillFields').classList.toggle('hidden',a!=='Treadmill');$('stairFields').classList.toggle('hidden',a!=='StairMaster');$('cardioHistory').innerHTML=data.cardio.slice(0,10).map(c=>`<div class="card historyItem"><div><b>${esc(c.activity)}</b><span class="muted small">${fd(c.date)} • ${c.duration} min</span></div><b>${c.calories||0} kcal</b></div>`).join('')||'<div class="empty">No cardio logged yet.</div>'}
$('cardioActivity').onchange=cardio;$('saveCardio').onclick=()=>{let c={id:crypto.randomUUID(),date:new Date().toISOString(),activity:$('cardioActivity').value,duration:+$('cardioDuration').value||0,calories:+$('cardioCalories').value||0,speed:+$('speed').value||0,incline:+$('incline').value||0,level:+$('stairLevel').value||0,notes:$('cardioNotes').value};if(!c.duration)return alert('Enter duration.');data.cardio.unshift(c);save();['cardioDuration','cardioCalories','speed','incline','stairLevel','cardioNotes'].forEach(id=>$(id).value='');cardio();dashboard()};
function week(){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));let e=new Date(d);e.setDate(e.getDate()+7);let w=data.workouts.filter(x=>new Date(x.date)>=d&&new Date(x.date)<e),c=data.cardio.filter(x=>new Date(x.date)>=d&&new Date(x.date)<e);return{w,c,vol:w.reduce((a,x)=>a+(+x.volume||0),0),cal:c.reduce((a,x)=>a+(+x.calories||0),0)}}
function line(cv,vals){let ctx=cv.getContext('2d'),d=devicePixelRatio||1,w=cv.clientWidth,h=cv.height;cv.width=w*d;cv.height=h*d;ctx.scale(d,d);ctx.clearRect(0,0,w,h);let m=Math.max(...vals,1),p=15;ctx.beginPath();vals.forEach((v,i)=>{let x=p+i*(w-2*p)/Math.max(vals.length-1,1),y=h-p-v/m*(h-2*p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#aebcff';ctx.lineWidth=3;ctx.stroke()}
function dashboard(){let t=week(),days=new Set(t.w.map(x=>dk(x.date)));$('weekWorkouts').textContent=`${t.w.length} workout${t.w.length===1?'':'s'}`;$('weekFrequency').textContent=`${days.size} training day${days.size===1?'':'s'}`;$('weekCalories').textContent=t.cal;$('volumeWeek').textContent=`${Math.round(t.vol).toLocaleString()} lb`;$('goalFill').style.width=Math.min(100,t.cal/1000*100)+'%';let v=[];for(let i=6;i>=0;i--){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);v.push(data.workouts.filter(w=>dk(w.date)===dk(d)).reduce((a,x)=>a+(+x.volume||0),0))}line($('volumeChart'),v);let prs=Object.keys(EX).map(n=>[n,best(n).weight]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,5);$('prs').innerHTML=prs.map(x=>`<div class="card pr"><span><b>${esc(x[0])}</b><br><span class="muted small">Weight PR</span></span><b>${x[1]} lb</b></div>`).join('')||'<div class="empty">Complete a workout to start tracking PRs.</div>'}
function progress(){let names=Object.keys(EX).sort();$('progressExercise').innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join('');updateProgress($('progressExercise').value)}$('progressExercise').onchange=e=>updateProgress(e.target.value);
function bars(cv,obj){let ctx=cv.getContext('2d'),d=devicePixelRatio||1,w=cv.clientWidth,h=cv.height;cv.width=w*d;cv.height=h*d;ctx.scale(d,d);ctx.clearRect(0,0,w,h);let a=Object.entries(obj).sort((x,y)=>y[1]-x[1]).slice(0,8),m=Math.max(...a.map(x=>x[1]),1);a.forEach(([k,v],i)=>{let y=10+i*25;ctx.fillStyle='#aebcff';ctx.fillRect(115,y,(w-130)*v/m,16);ctx.fillStyle='#9aa6b8';ctx.font='12px sans-serif';ctx.fillText(k,5,y+12)})}
function updateProgress(n){let a=setsFor(n),b=best(n),rm=oneRM(n),vol=a.reduce((x,s)=>x+s.weight*s.reps,0);$('bestWeight').textContent=`${b.weight} lb`;$('bestReps').textContent=b.reps;$('best1rm').textContent=`${Math.round(rm)} lb`;$('exerciseVolume').textContent=`${Math.round(vol).toLocaleString()} lb`;let trend={};a.forEach(s=>trend[dk(s.date)]=Math.max(trend[dk(s.date)]||0,s.weight*(1+s.reps/30)));line($('strengthChart'),Object.values(trend).slice(-14));let mus={};data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{let m=info(e.name)[0];mus[m]=(mus[m]||0)+e.sets.reduce((q,s)=>q+(+s.weight||0)*(+s.reps||0),0)}));bars($('muscleChart'),mus);let f=[];for(let i=7;i>=0;i--){let end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()-i*7);let start=new Date(end);start.setDate(start.getDate()-7);f.push(data.workouts.filter(w=>new Date(w.date)>=start&&new Date(w.date)<end).length)}line($('frequencyChart'),f);$('progressDetails').innerHTML=`<div class="card"><b>Progression recommendation</b><p class="muted small">${esc(suggest(n))}. Rep PRs and weight PRs are tracked independently. Estimated 1RM uses the Epley formula.</p></div>`}
function history(){let all=[...data.workouts.map(x=>({...x,type:'Workout'})),...data.cardio.map(x=>({...x,type:'Cardio'}))].sort((a,b)=>new Date(b.date)-new Date(a.date));$('historyList').innerHTML=all.map(x=>x.type==='Workout'?`<div class="card historyItem"><span><b>${esc(x.routine)}</b><br><span class="muted small">${fd(x.date)} • ${x.durationMin} min • ${Math.round(x.volume||0).toLocaleString()} lb volume</span></span><span class="pill">${x.exercises.reduce((a,e)=>a+e.sets.length,0)} sets</span></div>`:`<div class="card historyItem"><span><b>${esc(x.activity)}</b><br><span class="muted small">${fd(x.date)} • ${x.duration} min</span></span><span class="pill">${x.calories||0} kcal</span></div>`).join('')||'<div class="empty">No history yet.</div>'}
$('clearHistory').onclick=()=>{if(confirm('Clear workout and cardio history?')){data.workouts=[];data.cardio=[];save();history();dashboard();progress()}};
function settings(){$('defaultRest').value=data.settings.rest;$('routineSettings').innerHTML=Object.entries(data.routines).map(([r,e])=>`<div class="routineRow" style="padding:12px 0;border-bottom:1px solid #252e3b"><span><b>${esc(r)}</b><br><span class="muted small">${e.length} exercises</span></span><span class="pill">Built in</span></div>`).join('')}
$('saveRest').onclick=()=>{data.settings.rest=Math.max(5,+$('defaultRest').value||90);currentTimerSec=data.settings.rest;save();alert('Rest timer saved.')};$('exportData').onclick=()=>{let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`liftlog-backup-${dk(new Date())}.json`;a.click()};$('importData').onchange=e=>{let f=e.target.files[0],r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.workouts||!x.cardio)throw 0;data=x;data.settings=data.settings||{rest:90};save();location.reload()}catch{alert('Invalid LiftLog backup.')}};r.readAsText(f)};$('clearData').onclick=()=>{if(confirm('Delete ALL LiftLog data?')){localStorage.removeItem(KEY);location.reload()}};
window.addEventListener('resize',()=>{if($('dashboard').classList.contains('active'))dashboard();if($('progress').classList.contains('active'))updateProgress($('progressExercise').value)});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(installEvt){installEvt.prompt();await installEvt.userChoice;installEvt=null}};if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
dashboard();workout();cardio();progress();history();settings();
