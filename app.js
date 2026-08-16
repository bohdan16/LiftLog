const KEY='liftlog-data-v1';
const defaultRoutines={
 'Push A':['Incline Dumbbell Press','Overhead Press','Cable Lateral Raise','Chest Fly','Triceps Pushdown'],
 'Push B':['Incline Machine Press','Overhead Press','Cable Lateral Raise','Chest Fly','Overhead Triceps Extension'],
 'Pull A':['Lat Pulldown','Seated Cable Row','Rear Delt Fly','Face Pull','Preacher Curl','Hammer Curl'],
 'Pull B':['Standing Cable Pullover','Machine Lat Pulldown','Seated Cable Row','Face Pull','Bent-Over Row','Preacher Curl','Hammer Curl'],
 'Legs':['Squat','Romanian Deadlift','Leg Press','Leg Curl','Leg Extension','Calf Raise']
};
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{workouts:[],cardio:[],routines:defaultRoutines};
let current={routine:'Push A',started:Date.now(),exercises:[]};
let deferredInstall=null;

function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function dateKey(d=new Date()){return new Date(d).toISOString().slice(0,10)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmtDate(d){return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
function show(id){
 document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));
 if(id==='dashboard')renderDashboard(); if(id==='workout')renderWorkout(); if(id==='cardio')renderCardio(); if(id==='history')renderHistory(); if(id==='settings')renderSettings();
 scrollTo(0,0);
}
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.nav)));

function previousBest(ex){let best={weight:0,reps:0};data.workouts.forEach(w=>(w.exercises||[]).filter(e=>e.name===ex).forEach(e=>(e.sets||[]).forEach(s=>{let n=+s.weight||0;if(n>best.weight||(n===best.weight&&(+s.reps||0)>best.reps))best={weight:n,reps:+s.reps||0}})));return best}
function makeExercise(name){let b=previousBest(name);return{name,sets:[{weight:b.weight||'',reps:b.reps||''},{weight:b.weight||'',reps:b.reps||''},{weight:b.weight||'',reps:b.reps||''}]}}
function renderWorkout(){
 const sel=document.getElementById('routineSelect');sel.innerHTML=Object.keys(data.routines).map(r=>`<option>${esc(r)}</option>`).join('');sel.value=current.routine;
 if(!current.exercises.length) current.exercises=data.routines[current.routine].map(makeExercise);
 document.getElementById('routineSummary').textContent=`${current.exercises.length} exercises • Previous bests are prefilled`;
 const list=document.getElementById('exerciseList');
 list.innerHTML=current.exercises.map((e,ei)=>`<div class="card exercise"><div class="exerciseHead"><b>${esc(e.name)}</b><span class="pill">Best ${previousBest(e.name).weight||0} lb</span></div><div class="sets">${e.sets.map((s,si)=>`<div class="setRow"><span class="setNum">${si+1}</span><input data-e="${ei}" data-s="${si}" data-f="weight" type="number" inputmode="decimal" placeholder="lb" value="${s.weight}"><input data-e="${ei}" data-s="${si}" data-f="reps" type="number" inputmode="numeric" placeholder="reps" value="${s.reps}"><button class="remove" data-remove="${ei}" data-set="${si}">×</button></div>`).join('')}</div><button class="addSet" data-add="${ei}">+ Add set</button></div>`).join('');
 list.querySelectorAll('input').forEach(i=>i.addEventListener('input',()=>{current.exercises[i.dataset.e].sets[i.dataset.s][i.dataset.f]=i.value}));
 list.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{current.exercises[+b.dataset.add].sets.push({weight:'',reps:''});renderWorkout()});
 list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{current.exercises[+b.dataset.remove].sets.splice(+b.dataset.set,1);renderWorkout()});
 sel.onchange=()=>{current={routine:sel.value,started:Date.now(),exercises:[]};renderWorkout()};
}
document.getElementById('newWorkout').onclick=()=>{current={routine:document.getElementById('routineSelect').value||'Push A',started:Date.now(),exercises:[]};renderWorkout()};
document.getElementById('finishWorkout').onclick=()=>{
 const valid=current.exercises.some(e=>e.sets.some(s=>(+s.weight||0)>0&&(+s.reps||0)>0));
 if(!valid)return alert('Log at least one completed set first.');
 data.workouts.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),routine:current.routine,durationMin:Math.max(1,Math.round((Date.now()-current.started)/60000)),exercises:current.exercises.map(e=>({...e,sets:e.sets.filter(s=>(+s.weight||0)>0&&(+s.reps||0)>0)}))});
 save();current={routine:current.routine,started:Date.now(),exercises:[]};alert('Workout saved!');show('dashboard');
};

function renderCardio(){
 document.getElementById('treadmillFields').style.display=document.getElementById('cardioActivity').value==='Treadmill'?'grid':'none';
 document.getElementById('cardioHistory').innerHTML=data.cardio.slice(0,8).map(c=>`<div class="card historyItem"><div><strong>${esc(c.activity)}</strong><span class="muted small">${fmtDate(c.date)} • ${c.duration} min</span></div><div><strong>${c.calories||0} kcal</strong><span class="muted small">${c.speed?c.speed+' mph':''}${c.incline?` • ${c.incline}%`:''}</span></div></div>`).join('')||'<div class="empty">No cardio logged yet.</div>';
}
document.getElementById('cardioActivity').onchange=renderCardio;
document.getElementById('saveCardio').onclick=()=>{
 const c={id:crypto.randomUUID(),date:new Date().toISOString(),activity:document.getElementById('cardioActivity').value,duration:+document.getElementById('cardioDuration').value||0,calories:+document.getElementById('cardioCalories').value||0,speed:+document.getElementById('speed').value||0,incline:+document.getElementById('incline').value||0,notes:document.getElementById('cardioNotes').value};
 if(!c.duration)return alert('Enter duration.');
 data.cardio.unshift(c);save();['cardioDuration','cardioCalories','speed','incline','cardioNotes'].forEach(id=>document.getElementById(id).value='');renderCardio();renderDashboard();
};

function weekStart(){let d=new Date();let day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d}
function totals(){
 const ws=weekStart(),we=new Date(ws);we.setDate(we.getDate()+7);
 const w=data.workouts.filter(x=>new Date(x.date)>=ws&&new Date(x.date)<we);
 const c=data.cardio.filter(x=>new Date(x.date)>=ws&&new Date(x.date)<we);
 let vol=0;w.forEach(x=>(x.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>vol+=(+s.weight||0)*(+s.reps||0))));
 return {w,c,cal:c.reduce((a,x)=>a+(+x.calories||0),0),vol};
}
function renderDashboard(){
 const t=totals();document.getElementById('weekWorkouts').textContent=`${t.w.length} workout${t.w.length===1?'':'s'}`;document.getElementById('weekCalories').textContent=t.cal;document.getElementById('volumeWeek').textContent=`${Math.round(t.vol).toLocaleString()} lb volume`;
 const prs={};data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>{let n=+s.weight||0;if(n&&(n>(prs[e.name]||0)))prs[e.name]=n})));
 const arr=Object.entries(prs).sort((a,b)=>b[1]-a[1]).slice(0,5);
 document.getElementById('prs').innerHTML=arr.map(([n,v])=>`<div class="card pr"><div><strong>${esc(n)}</strong><span class="muted small">Best weight</span></div><b>${v} lb</b></div>`).join('')||'<div class="empty">Complete a workout to start tracking PRs.</div>';
 drawChart();
}
function drawChart(){
 const c=document.getElementById('volumeChart'),ctx=c.getContext('2d'),dpr=devicePixelRatio||1,w=c.clientWidth,h=180;c.width=w*dpr;c.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 let vals=[];for(let i=6;i>=0;i--){let day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-i);let key=dateKey(day),v=0;data.workouts.filter(x=>dateKey(x.date)===key).forEach(x=>(x.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>v+=(+s.weight||0)*(+s.reps||0))));vals.push(v)}
 const max=Math.max(...vals,1),pad=12;ctx.beginPath();vals.forEach((v,i)=>{let x=pad+i*(w-2*pad)/6,y=h-pad-(v/max)*(h-2*pad);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#aebcff';ctx.lineWidth=3;ctx.stroke();
}
function renderHistory(){
 const all=[...data.workouts.map(w=>({...w,type:'Workout'})),...data.cardio.map(c=>({...c,type:'Cardio'}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
 document.getElementById('historyList').innerHTML=all.map(x=>x.type==='Workout'?`<div class="card historyItem"><div><strong>${esc(x.routine)}</strong><span class="muted small">${fmtDate(x.date)} • ${x.durationMin} min</span></div><span class="pill">${(x.exercises||[]).reduce((a,e)=>a+e.sets.length,0)} sets</span></div>`:`<div class="card historyItem"><div><strong>${esc(x.activity)}</strong><span class="muted small">${fmtDate(x.date)} • ${x.duration} min</span></div><span class="pill">${x.calories||0} kcal</span></div>`).join('')||'<div class="empty">No history yet.</div>';
}
function renderSettings(){document.getElementById('routineSettings').innerHTML=Object.entries(data.routines).map(([r,e])=>`<div class="routineRow" style="padding:12px 0;border-bottom:1px solid #252e3b"><span><b>${esc(r)}</b><br><span class="muted small">${e.length} exercises</span></span><span class="pill">Built in</span></div>`).join('')}
document.getElementById('allHistory').onclick=()=>show('history');
document.getElementById('clearData').onclick=()=>{if(confirm('Delete all workouts and cardio history?')){localStorage.removeItem(KEY);location.reload()}};
window.addEventListener('resize',()=>{if(document.getElementById('dashboard').classList.contains('active'))drawChart()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;document.getElementById('installBtn').classList.remove('hidden')});
document.getElementById('installBtn').onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null}};
renderDashboard();renderWorkout();renderCardio();renderHistory();renderSettings();