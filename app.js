const KEY='liftlog-data-v2';
const EX={
'Incline Dumbbell Press':['Chest',['Incline Machine Press']],'Overhead Press':['Shoulders',['Machine Shoulder Press']],'Cable Lateral Raise':['Shoulders',['Dumbbell Lateral Raise']],'Chest Fly':['Chest',['Machine Chest Fly']],'Triceps Pushdown':['Triceps',['Overhead Triceps Extension']],'Dumbbell Bench Press':['Chest',['Barbell Bench Press']],
'Incline Machine Press':['Chest',['Incline Dumbbell Press']],'Overhead Triceps Extension':['Triceps',['Triceps Pushdown']],
'Lat Pulldown':['Back',['Assisted Pull-Up']],'Seated Cable Row':['Back',['Chest-Supported Row']],'Rear Delt Fly':['Rear Delts',['Reverse Pec Deck']],'Face Pull':['Rear Delts',['Cable Rear Delt Row']],
'Standing Cable Pullover':['Back',['Straight-Arm Pulldown']],'Machine Lat Pulldown':['Back',['Lat Pulldown']],'Bent-Over Row':['Back',['Chest-Supported Row']],
'Squat':['Quads',['Leg Press','Deadlift','Hack Squat']],'Deadlift':['Hamstrings',['Leg Press','Hack Squat']],'Romanian Deadlift':['Hamstrings',['Leg Curl']],'Leg Press':['Quads',['Deadlift','Hack Squat']],
};
const ROUTINES={'Push A':['Incline Dumbbell Press','Overhead Press','Cable Lateral Raise','Chest Fly','Triceps Pushdown'],'Push B':['Incline Machine Press','Overhead Press','Cable Lateral Raise','Chest Fly','Overhead Triceps Extension'],'Pull A':['Lat Pulldown','Seated Cable Row','Rear Delt Fly','Face Pull'],'Pull B':['Machine Lat Pulldown','Bent-Over Row','Standing Cable Pullover','Cable Rear Delt Row'],'Legs A':['Squat','Leg Press','Leg Curl'],'Legs B':['Deadlift','Hack Squat','Leg Curl'],'Legs C':['Leg Press','Squat','Romanian Deadlift']};
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{workouts:[],routines:{...ROUTINES},settings:{rest:90}};
if(!data.routines['Legs A']&&!data.routines['Legs B']&&!data.routines['Legs C']){
  delete data.routines['Legs'];
  data.routines['Legs A']=ROUTINES['Legs A'];
  data.routines['Legs B']=ROUTINES['Legs B'];
  data.routines['Legs C']=ROUTINES['Legs C'];
  localStorage.setItem(KEY,JSON.stringify(data));
}
let cur={routine:Object.keys(data.routines)[0]||'Push A',started:null,exercises:[],active:false},activeTimers={},installEvt=null;
let editingRoutines=false,editingRoutineKey=null;
const $=id=>document.getElementById(id); const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(data)); const dk=d=>new Date(d).toISOString().slice(0,10); const fd=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

function nav(id){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));if(id==='dashboard')dashboard();if(id==='performance')performance()}
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));
function info(n){return EX[n]||['Other',[]]};
function setsFor(n){let a=[];data.workouts.forEach(w=>(w.exercises||[]).filter(e=>e.name===n).forEach(e=>(e.sets||[]).forEach(s=>{let wt=+s.weight||0,r=+s.reps||0;if(wt&&r)a.push({weight:wt,reps:r,date:w.date})})));return a}
function best(n){let a=setsFor(n);return{weight:Math.max(0,...a.map(x=>x.weight)),reps:Math.max(0,...a.map(x=>x.reps))}}
function oneRM(n){return Math.max(0,...setsFor(n).map(x=>x.weight*(1+x.reps/30)))}
function epleyRM(wt,reps,range){if(!wt||!reps)return 0;let est=wt*(1+reps/30);return est*range}
function suggest(n){let a=setsFor(n);if(!a.length)return'First session: pick a weight you can control for 6–8 reps';let s=a[a.length-1],w=s.weight,r=s.reps,r5=x=>Math.round(x/5)*5;if(r<6)return`Last set ${w} lb × ${r} — drop to ${r5(w*0.9)} lb to land in the 6–8 rep range`;if(r>8)return`Last set ${w} lb × ${r} — add ${r5(w*1.05)} lb to bring reps back down to 6–8`;if(r===8)return`Last set ${w} lb × 8, top of range — add 5 lb next session`;return`Last set ${w} lb × ${r}, in the 6–8 range — hold this weight until you hit 8 reps, then add 5 lb`}

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
  if(!data.routines[cur.routine])cur.routine=Object.keys(data.routines)[0];

  $('newWorkout').classList.toggle('hidden',!cur.active);
  $('routineGrid').classList.toggle('hidden',cur.active);
  $('routineActions').classList.toggle('hidden',cur.active);
  if(cur.active){$('addRoutineForm').classList.add('hidden');editingRoutines=false}
  $('editRoutinesBtn').textContent=editingRoutines?'Done editing':'Edit routines';
  $('routinePreview').classList.toggle('hidden',cur.active||editingRoutines);
  $('startWorkoutBtn').classList.toggle('hidden',cur.active);
  $('exerciseList').classList.toggle('hidden',!cur.active);
  $('workoutFooter').classList.toggle('hidden',!cur.active);
  $('workoutEndActions').classList.toggle('hidden',!cur.active);

  if(!cur.active){
    $('routineGrid').innerHTML=Object.keys(data.routines).map(r=>`
      <button class="card routineCard${(r===cur.routine&&!editingRoutines)?' selected':''}${editingRoutines?' editing':''}" data-pick="${esc(r)}">
        <b>${esc(r)}${editingRoutines?' ✎':''}</b><span>${data.routines[r].length} exercises</span>
      </button>`).join('');
    $('routineGrid').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{
      if(editingRoutines){openRoutineEditor(b.dataset.pick)}
      else{cur.routine=b.dataset.pick;workout()}
    });

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
    return `<div class="card exercise" data-idx="${i}">
      <div class="exerciseHead"><div class="exerciseTitleRow"><span class="dragHandle"></span><b>${esc(e.name)}${e.superset?' • SUPERSET':''}</b></div><span class="pill">${esc(inf[0])}</span></div>
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
  $('exerciseList').querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{let i=+b.dataset.sub,a=info(cur.exercises[i].name)[1];if(!a.length)return alert('No substitution listed.');let n=prompt('Sub with:\n'+a.map((x,j)=>`${j+1}. ${x}`).join('\n'));let idx=(+n||0)-1;if(idx<0||idx>=a.length)return;cur.exercises[i].name=a[idx];workout()});
  $('setsCompleted').textContent=cur.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  initExerciseDrag();
}

function initExerciseDrag(){
  let list=$('exerciseList');
  list.querySelectorAll('.dragHandle').forEach(handle=>{
    handle.onpointerdown=e=>{
      e.preventDefault();
      let card=handle.closest('.exercise');
      let startY=e.clientY;
      try{card.setPointerCapture(e.pointerId)}catch(err){}
      card.classList.add('dragging');

      let onMove=ev=>{
        let dy=ev.clientY-startY;
        card.style.transform=`translateY(${dy}px)`;
        let guard=0;
        while(guard++<20){
          let rect=card.getBoundingClientRect();
          let center=rect.top+rect.height/2;
          let next=card.nextElementSibling;
          if(next&&next.classList.contains('exercise')){
            let nr=next.getBoundingClientRect();
            if(center>nr.top+nr.height/2){
              list.insertBefore(next,card);
              startY=ev.clientY;
              card.style.transform='translateY(0px)';
              continue;
            }
          }
          let prev=card.previousElementSibling;
          if(prev&&prev.classList.contains('exercise')){
            let pr=prev.getBoundingClientRect();
            if(center<pr.top+pr.height/2){
              list.insertBefore(card,prev);
              startY=ev.clientY;
              card.style.transform='translateY(0px)';
              continue;
            }
          }
          break;
        }
      };
      let onUp=ev=>{
        list.removeEventListener('pointermove',onMove);
        list.removeEventListener('pointerup',onUp);
        list.removeEventListener('pointercancel',onUp);
        card.classList.remove('dragging');
        card.style.transform='';
        let newOrder=[...list.children].filter(c=>c.classList.contains('exercise')).map(c=>+c.dataset.idx);
        cur.exercises=newOrder.map(i=>cur.exercises[i]);
        workout();
      };
      list.addEventListener('pointermove',onMove);
      list.addEventListener('pointerup',onUp);
      list.addEventListener('pointercancel',onUp);
    };
  });
}

$('startWorkoutBtn').onclick=()=>{
  let r=cur.routine;
  if(!confirm(`Start "${r}" workout?`))return;
  cur={routine:r,started:Date.now(),exercises:data.routines[r].map(make),active:true};
  workout();
};

$('newWorkout').onclick=()=>{
  let existing=cur.exercises.map(e=>e.name);
  let options=Object.keys(EX).filter(n=>!existing.includes(n)).sort();
  if(!options.length)return alert('All exercises already added.');
  let choice=prompt('Add exercise:\n'+options.map((n,i)=>`${i+1}. ${n}`).join('\n'));
  let idx=(+choice||0)-1;
  if(idx<0||idx>=options.length)return;
  cur.exercises.push(make(options[idx]));
  workout();
  if(confirm('Save this as the routine template too?')){
    data.routines[cur.routine]=cur.exercises.map(e=>e.name);
    save();
  }
};

let pickerChosen=[];
function renderExercisePicker(initial){
  pickerChosen=[...(initial||[])];
  drawPicker();
}
function drawPicker(){
  let chosenHtml=pickerChosen.map((n,i)=>`<div class="card pickRow" data-idx="${i}" style="padding:8px 10px;display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dragHandle"></span><span>${esc(n)}</span><button data-rmpick="${i}" class="textBtn" style="margin-left:auto">✕</button></div>`).join('');
  let groups={};
  Object.keys(EX).sort().forEach(n=>{if(!pickerChosen.includes(n)){let g=info(n)[0];(groups[g]=groups[g]||[]).push(n)}});
  let addHtml=Object.keys(groups).sort().map(g=>`<div class="pickerGroup"><div class="pickerGroupLabel">${esc(g)}</div>${groups[g].map(n=>`<div class="checkRow" data-addpick="${esc(n)}" style="cursor:pointer"><span>+ ${esc(n)}</span></div>`).join('')}</div>`).join('');
  $('exercisePicker').innerHTML=`<div class="pickerGroupLabel">Chosen (drag to reorder)</div><div id="chosenList">${chosenHtml}</div><div class="pickerGroupLabel" style="margin-top:10px">Add exercises</div>${addHtml}`;
  $('exercisePicker').querySelectorAll('[data-addpick]').forEach(el=>el.onclick=()=>{pickerChosen.push(el.dataset.addpick);drawPicker()});
  $('exercisePicker').querySelectorAll('[data-rmpick]').forEach(el=>el.onclick=()=>{pickerChosen.splice(+el.dataset.rmpick,1);drawPicker()});
  let list=$('chosenList');
  list.querySelectorAll('.dragHandle').forEach(handle=>{
    handle.onpointerdown=e=>{
      e.preventDefault();
      let card=handle.closest('.pickRow');
      let startY=e.clientY;
      try{card.setPointerCapture(e.pointerId)}catch(err){}
      card.classList.add('dragging');
      let onMove=ev=>{
        let dy=ev.clientY-startY;
        card.style.transform=`translateY(${dy}px)`;
        let guard=0;
        while(guard++<20){
          let rect=card.getBoundingClientRect(),center=rect.top+rect.height/2;
          let next=card.nextElementSibling;
          if(next&&next.classList.contains('pickRow')){let nr=next.getBoundingClientRect();if(center>nr.top+nr.height/2){list.insertBefore(next,card);startY=ev.clientY;card.style.transform='translateY(0px)';continue}}
          let prev=card.previousElementSibling;
          if(prev&&prev.classList.contains('pickRow')){let pr=prev.getBoundingClientRect();if(center<pr.top+pr.height/2){list.insertBefore(card,prev);startY=ev.clientY;card.style.transform='translateY(0px)';continue}}
          break;
        }
      };
      let onUp=()=>{
        list.removeEventListener('pointermove',onMove);list.removeEventListener('pointerup',onUp);list.removeEventListener('pointercancel',onUp);
        let newOrder=[...list.children].filter(c=>c.classList.contains('pickRow')).map(c=>+c.dataset.idx);
        pickerChosen=newOrder.map(i=>pickerChosen[i]);
        drawPicker();
      };
      list.addEventListener('pointermove',onMove);list.addEventListener('pointerup',onUp);list.addEventListener('pointercancel',onUp);
    };
  });
}

function openRoutineEditor(key){
  editingRoutineKey=key;
  $('newRoutineName').value=key;
  renderExercisePicker(data.routines[key]||[]);
  $('deleteRoutineBtn').classList.remove('hidden');
  $('saveAddRoutine').textContent='Save changes';
  $('addRoutineForm').classList.remove('hidden');
  $('newRoutineName').focus();
}

$('editRoutinesBtn').onclick=()=>{
  editingRoutines=!editingRoutines;
  $('addRoutineForm').classList.add('hidden');
  workout();
};

$('addRoutineBtn').onclick=()=>{
  editingRoutineKey=null;
  $('newRoutineName').value='';
  renderExercisePicker([]);
  $('deleteRoutineBtn').classList.add('hidden');
  $('saveAddRoutine').textContent='Save routine';
  $('addRoutineForm').classList.remove('hidden');
  $('newRoutineName').focus();
};
$('cancelAddRoutine').onclick=()=>{editingRoutineKey=null;$('addRoutineForm').classList.add('hidden')};
$('deleteRoutineBtn').onclick=()=>{
  if(!editingRoutineKey)return;
  if(Object.keys(data.routines).length<=1)return alert('You need at least one routine.');
  if(!confirm(`Delete routine "${editingRoutineKey}"?`))return;
  delete data.routines[editingRoutineKey];
  if(cur.routine===editingRoutineKey)cur.routine=Object.keys(data.routines)[0];
  save();
  editingRoutineKey=null;
  $('addRoutineForm').classList.add('hidden');
  workout();
};
$('saveAddRoutine').onclick=()=>{
  let name=$('newRoutineName').value.trim();
  if(!name)return alert('Enter a routine name.');
  let picked=[...pickerChosen];
  if(!picked.length)return alert('Select at least one exercise.');

  if(editingRoutineKey){
    if(name!==editingRoutineKey&&data.routines[name])return alert('A routine with that name already exists.');
    if(name!==editingRoutineKey)delete data.routines[editingRoutineKey];
    data.routines[name]=picked;
    if(cur.routine===editingRoutineKey)cur.routine=name;
    save();
    editingRoutineKey=null;
    $('addRoutineForm').classList.add('hidden');
    workout();
    return;
  }

  if(data.routines[name])return alert('A routine with that name already exists.');
  data.routines[name]=picked;
  save();
  cur.routine=name;
  $('addRoutineForm').classList.add('hidden');
  workout();
};
$('finishWorkout').onclick=()=>{
  let ex=cur.exercises.map(e=>({...e,sets:e.sets.filter(s=>s.done)})).filter(e=>e.sets.length);
  if(!ex.length)return alert('Complete at least one set first.');
  let vol=ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0);
  data.workouts.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),routine:cur.routine,durationMin:Math.max(1,Math.round((Date.now()-cur.started)/60000)),volume:vol,exercises:ex});
  save();cur={routine:cur.routine,started:null,exercises:[],active:false};alert('Workout saved!');nav('dashboard');
  dashboard();performance();
};
$('cancelWorkoutBtn').onclick=()=>{
  if(!confirm('Cancel this workout? Nothing will be saved.'))return;
  cur={routine:cur.routine,started:null,exercises:[],active:false};
  workout();
};

setInterval(()=>{if(cur.active&&$('workout').classList.contains('active')){let s=Math.floor((Date.now()-cur.started)/1000);$('workoutClock').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}},100);

/* ---------- charts ---------- */
function week(){let d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));let e=new Date(d);e.setDate(e.getDate()+7);let w=data.workouts.filter(x=>new Date(x.date)>=d&&new Date(x.date)<e);return{d,e,w}}

function chartSetup(cv){
  if(!cv)return null;
  let ctx=cv.getContext('2d'),d=window.devicePixelRatio||1;
  let w=cv.clientWidth,h=cv.clientHeight;
  if(!w||!h)return null;
  cv.width=Math.round(w*d);cv.height=Math.round(h*d);
  ctx.setTransform(d,0,0,d,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}

function emptyChart(ctx,w,h,msg){
  ctx.fillStyle='#6f7b8d';ctx.font='12px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';
  ctx.fillText(msg||'No data yet',w/2,h/2);
}

function niceStep(maxVal,base){
  if(maxVal<=0)return base;
  let mults=[1,2,3,4,5,6,8,10,15,20,25,30,40,50,75,100,150,200];
  for(let m of mults){
    let step=base*m;
    if(Math.ceil(maxVal/step)<=6)return step;
  }
  return base*Math.ceil(maxVal/(base*200));
}

function detailedLine(cv,vals,labels,baseStep,unit,opts){
  opts=opts||{};
  let s=chartSetup(cv);if(!s)return;
  let{ctx,w,h}=s;
  if(!vals||!vals.length||vals.every(v=>!v)){emptyChart(ctx,w,h,opts.emptyMsg);return}
  let left=50,right=12,top=opts.showValues?22:10,bottom=20;
  let plotW=Math.max(10,w-left-right),plotH=Math.max(10,h-top-bottom);
  let maxVal=Math.max(...vals,0,opts.avgLine||0);
  let step=niceStep(maxVal,baseStep);
  let count=Math.max(1,Math.ceil(maxVal/step));
  let niceMax=step*count;

  ctx.font='10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
  ctx.lineWidth=1;
  for(let i=0;i<=count;i++){
    let v=step*i,y=top+plotH-(v/niceMax)*plotH;
    ctx.strokeStyle='rgba(140,153,170,.12)';
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle='#8995a6';ctx.textAlign='right';
    ctx.fillText(Math.round(v).toLocaleString()+(unit?' '+unit:''),left-8,y+3);
  }

  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1);
    ctx.strokeStyle='rgba(140,153,170,.06)';
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
    ctx.fillStyle='#8995a6';ctx.textAlign='center';
    ctx.fillText(labels[i]||'',x,h-6);
  });

  if(opts.avgLine!=null&&niceMax>0){
    let y=top+plotH-(opts.avgLine/niceMax)*plotH;
    ctx.save();ctx.setLineDash([4,4]);
    ctx.strokeStyle='rgba(174,188,255,.5)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1),y=top+plotH-(v/niceMax)*plotH;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.strokeStyle='#aebcff';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1),y=top+plotH-(v/niceMax)*plotH;
    ctx.fillStyle='#aebcff';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    if(opts.showValues){
      ctx.fillStyle='#c7d0ff';ctx.font='10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
      ctx.textAlign='center';
      ctx.fillText(String(Math.round(v)),x,y-8);
    }
  });
}

function bars(cv,obj,unit){
  let s=chartSetup(cv);if(!s)return;
  let{ctx,w,h}=s;
  let entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!entries.length){emptyChart(ctx,w,h,'No workouts yet');return}
  let total=entries.reduce((a,x)=>a+x[1],0)||1;
  let max=Math.max(...entries.map(x=>x[1]),1);
  let rowH=Math.min(26,(h-8)/entries.length);
  let labelW=100;
  ctx.font='11px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
  entries.forEach(([k,v],i)=>{
    let y=6+i*rowH;
    ctx.fillStyle='#9aa6b8';ctx.textAlign='left';
    ctx.fillText(k.length>13?k.slice(0,12)+'…':k,4,y+rowH*0.62);
    let barMax=Math.max(10,w-labelW-90);
    let barW=Math.max(2,(barMax*v)/max);
    ctx.fillStyle='#aebcff';
    ctx.fillRect(labelW,y+3,barW,Math.max(4,rowH-10));
    ctx.fillStyle='#eef1ff';
    let pct=Math.round((v/total)*100);
    ctx.fillText(`${Math.round(v).toLocaleString()}${unit?' '+unit:''} (${pct}%)`,labelW+barW+6,y+rowH*0.62);
  });
}

function rangeChart(cv,labels,lowVals,highVals,baseStep,unit){
  let s=chartSetup(cv);if(!s)return;
  let{ctx,w,h}=s;
  if(!labels.length||highVals.every(v=>!v)){emptyChart(ctx,w,h,'No data yet');return}
  let left=50,right=12,top=10,bottom=20;
  let plotW=Math.max(10,w-left-right),plotH=Math.max(10,h-top-bottom);
  let maxVal=Math.max(...highVals,0);
  let step=niceStep(maxVal,baseStep);
  let count=Math.max(1,Math.ceil(maxVal/step));
  let niceMax=step*count;
  let xy=(vals,i)=>[left+(plotW*i)/Math.max(1,labels.length-1),top+plotH-(vals[i]/niceMax)*plotH];

  ctx.font='10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
  ctx.lineWidth=1;
  for(let i=0;i<=count;i++){
    let v=step*i,y=top+plotH-(v/niceMax)*plotH;
    ctx.strokeStyle='rgba(140,153,170,.12)';
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle='#8995a6';ctx.textAlign='right';
    ctx.fillText(Math.round(v).toLocaleString()+(unit?' '+unit:''),left-8,y+3);
  }
  labels.forEach((lb,i)=>{
    let[x]=xy(highVals,i);
    ctx.fillStyle='#8995a6';ctx.textAlign='center';
    ctx.fillText(lb||'',x,h-6);
  });

  ctx.beginPath();
  highVals.forEach((v,i)=>{let[x,y]=xy(highVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  for(let i=lowVals.length-1;i>=0;i--){let[x,y]=xy(lowVals,i);ctx.lineTo(x,y)}
  ctx.closePath();ctx.fillStyle='rgba(174,188,255,.16)';ctx.fill();

  ctx.beginPath();
  lowVals.forEach((v,i)=>{let[x,y]=xy(lowVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle='#7180bd';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  ctx.beginPath();
  highVals.forEach((v,i)=>{let[x,y]=xy(highVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle='#aebcff';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  [[lowVals,'#7180bd'],[highVals,'#aebcff']].forEach(([vals,color])=>{
    vals.forEach((v,i)=>{let[x,y]=xy(vals,i);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill()});
  });
}

/* ---------- dashboard ---------- */
function dashboard(){
  let t=week(),days=new Set(t.w.map(x=>dk(x.date)));
  $('weekWorkouts').textContent=`${t.w.length} workout${t.w.length===1?'':'s'}`;
  $('weekFrequency').textContent=`${days.size} training day${days.size===1?'':'s'}`;
  let weekVol=t.w.reduce((a,x)=>a+(+x.volume||0),0);
  $('volumeWeek').textContent=`${Math.round(weekVol).toLocaleString()} lb`;

  let ws=new Date(),day=(ws.getDay()+6)%7;
  ws.setHours(0,0,0,0);ws.setDate(ws.getDate()-day);
  let vals=[],labels=[];
  for(let i=0;i<7;i++){
    let d=new Date(ws);d.setDate(ws.getDate()+i);
    vals.push(data.workouts.filter(w=>dk(w.date)===dk(d)).reduce((a,x)=>a+(+x.volume||0),0));
    labels.push(d.toLocaleDateString(undefined,{weekday:'short'}));
  }
  detailedLine($('volumeChart'),vals,labels,2000,'lb');

  let prs=Object.keys(EX).map(n=>[n,best(n).weight]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('prs').innerHTML=prs.map(x=>`<div class="card pr"><span><b>${esc(x[0])}</b><br><span class="muted small">Weight PR</span></span><b>${x[1]} lb</b></div>`).join('')||'<div class="empty">Complete a workout to start tracking PRs.</div>';
}

/* ---------- performance ---------- */
function performance(){
  let names=Object.keys(EX).sort();
  $('progressExercise').innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join('');
  updateProgress($('progressExercise').value);
  history();
  renderMuscleChart();
  renderFrequencyChart();
}
$('progressExercise').onchange=e=>updateProgress(e.target.value);
$('historyToggle').onclick=()=>{
  let hidden=$('historyList').classList.toggle('hidden');
  $('historyToggle').textContent=hidden?'Show history':'Hide history';
};

function updateProgress(n){
  let a=setsFor(n),rm=oneRM(n);

  // Row 1: PR volume (best single set by weight*reps) + that set's weight/reps
  let prSet={weight:0,reps:0,volume:0};
  a.forEach(s=>{
    let vol=s.weight*s.reps;
    if(vol>prSet.volume||(vol===prSet.volume&&s.weight>prSet.weight))prSet={weight:s.weight,reps:s.reps,volume:vol};
  });
  $('prVolume').textContent=`${Math.round(prSet.volume).toLocaleString()} lb`;
  $('prWeightReps').textContent=`${prSet.weight||0} lb × ${prSet.reps||0}`;

  // Row 2: weekly / monthly volume
  let weekStart=new Date();weekStart.setDate(weekStart.getDate()-7);
  let weekVol=a.filter(s=>new Date(s.date)>=weekStart).reduce((x,s)=>x+s.weight*s.reps,0);
  let monthStart=new Date();monthStart.setDate(monthStart.getDate()-30);
  let monthVol=a.filter(s=>new Date(s.date)>=monthStart).reduce((x,s)=>x+s.weight*s.reps,0);
  $('weeklyVolume').textContent=`${Math.round(weekVol).toLocaleString()} lb`;
  $('monthlyVolume').textContent=`${Math.round(monthVol).toLocaleString()} lb`;

  // Row 3: 1RM + estimated 6-8RM range (Epley: 1RM = weight * (1 + reps/30))
  let sixRM=rm/1.2;             // weight at 6 reps: rm = w*(1+6/30) = w*1.2
  let eightRM=rm/(1+8/30);      // weight at 8 reps
  $('best1rm').textContent=`${Math.round(rm)} lb`;
  $('est68rm').textContent=`${Math.round(eightRM)}–${Math.round(sixRM)} lb`;

  let trend={};
  a.forEach(s=>{let k=dk(s.date),est=s.weight*(1+s.reps/30);trend[k]=Math.max(trend[k]||0,est)});
  let keys=Object.keys(trend).sort().slice(-14);
  let sixVals=keys.map(k=>trend[k]/1.2);
  let eightVals=keys.map(k=>trend[k]/(1+8/30));
  rangeChart($('strengthChart'),keys.map(k=>k.slice(5)),eightVals,sixVals,5,'lb');

  $('progressDetails').innerHTML=`<div class="card"><b>Progression recommendation</b><p class="muted small">${esc(suggest(n))}. Shaded band shows your estimated 6–8 rep working range — widen/rise it by adding load once you can hit 8 reps.</p></div>`;
}

function renderMuscleChart(){
  let mus={};
  data.workouts.forEach(w=>(w.exercises||[]).forEach(e=>{
    let m=info(e.name)[0];
    mus[m]=(mus[m]||0)+(e.sets||[]).reduce((q,s)=>q+(+s.weight||0)*(+s.reps||0),0);
  }));
  bars($('muscleChart'),mus,'lb');
}

function renderFrequencyChart(){
  let vals=[],labels=[];
  for(let i=7;i>=0;i--){
    let end=new Date();end.setHours(0,0,0,0);end.setDate(end.getDate()-i*7);
    let start=new Date(end);start.setDate(start.getDate()-7);
    vals.push(data.workouts.filter(w=>new Date(w.date)>=start&&new Date(w.date)<end).length);
    labels.push(i===0?'This wk':i+'w ago');
  }
  let avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  detailedLine($('frequencyChart'),vals,labels,1,'',{showValues:true,avgLine:avg,emptyMsg:'No workouts yet'});
  let cur=vals[vals.length-1],lbl=$('freqAvgLabel');
  if(lbl)lbl.textContent=vals.some(v=>v)?`8-week average: ${avg.toFixed(1)} workouts/wk (dashed line) • This week: ${cur} • ${cur>=avg?'At or above average':'Below average'}`:'';
}

function history(){
  let all=data.workouts.map(x=>({...x,type:'Workout'})).sort((a,b)=>new Date(b.date)-new Date(a.date));

  $('historyList').innerHTML=all.map((x, idx)=>{
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
  }).join('')||'<div class="empty">No history yet.</div>';

  $('historyList').querySelectorAll('[data-htoggle]').forEach(el=>{
    el.onclick=()=>{
      let det = $(`hdetails-${el.dataset.htoggle}`);
      if(det) det.classList.toggle('hidden');
    };
  });
}

$('clearHistory').onclick=()=>{if(confirm('Clear workout history?')){data.workouts=[];save();history();dashboard();performance()}};

/* ---------- settings ---------- */
function settings(){
  $('defaultRest').value=data.settings.rest;
  $('routineSettings').innerHTML=Object.entries(data.routines).map(([r,e])=>{
    let builtIn=Object.prototype.hasOwnProperty.call(ROUTINES,r);
    return `<div class="routineRow" style="padding:12px 0;border-bottom:1px solid #252e3b"><span><b>${esc(r)}</b><br><span class="muted small">${e.length} exercises${builtIn?' • Built in':''}</span></span><button data-delroutine="${esc(r)}" class="textBtn danger" style="color:var(--danger-text)">Delete</button></div>`;
  }).join('');
  $('routineSettings').querySelectorAll('[data-delroutine]').forEach(b=>b.onclick=()=>{
    let r=b.dataset.delroutine;
    if(Object.keys(data.routines).length<=1)return alert('You need at least one routine.');
    if(!confirm(`Delete routine "${r}"?`))return;
    delete data.routines[r];
    if(cur.routine===r)cur.routine=Object.keys(data.routines)[0];
    save();settings();
  });
}
$('saveRest').onclick=()=>{data.settings.rest=Math.max(5,+$('defaultRest').value||90);save();alert('Default rest timer saved.')};

$('exportData').onclick=()=>{
  let a=document.createElement('a');
  a.href='data:text/json,'+encodeURIComponent(JSON.stringify(data,null,2));
  a.download='liftlog-backup.json';
  a.click();
};

$('importData').onchange=e=>{
  let file=e.target.files[0];
  if(!file)return;
  let reader=new FileReader();
  reader.onload=()=>{
    try{
      let imported=JSON.parse(reader.result);
      if(!imported||typeof imported!=='object')throw new Error('bad format');
      if(!confirm('Import this backup? It will replace your current workouts, routines, and settings.')){e.target.value='';return}
      data={
        workouts:Array.isArray(imported.workouts)?imported.workouts:[],
        routines:(imported.routines&&typeof imported.routines==='object'&&Object.keys(imported.routines).length)?imported.routines:{...ROUTINES},
        settings:(imported.settings&&typeof imported.settings==='object')?imported.settings:{rest:90}
      };
      if(!data.routines[cur.routine])cur.routine=Object.keys(data.routines)[0]||'Push A';
      save();
      dashboard();workout();performance();settings();
      alert('Data imported successfully.');
    }catch(err){
      alert('Could not import this file. Make sure it is a valid LiftLog backup JSON.');
    }
    e.target.value='';
  };
  reader.readAsText(file);
};

$('clearData').onclick=()=>{
  if(!confirm('Delete ALL local data? This cannot be undone.'))return;
  if(!confirm('Are you absolutely sure? This will erase your workouts, routines, and settings.'))return;
  localStorage.removeItem(KEY);
  data={workouts:[],routines:{...ROUTINES},settings:{rest:90}};
  cur={routine:Object.keys(data.routines)[0]||'Push A',started:null,exercises:[],active:false};
  save();
  dashboard();workout();performance();settings();
  alert('All data deleted.');
};

let resizeT=null;
window.addEventListener('resize',()=>{
  clearTimeout(resizeT);
  resizeT=setTimeout(()=>{
    if($('dashboard').classList.contains('active'))dashboard();
    if($('performance').classList.contains('active')){updateProgress($('progressExercise').value);renderMuscleChart();renderFrequencyChart()}
  },150);
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installBtn').classList.remove('hidden')});
$('installBtn').onclick=async()=>{if(installEvt){installEvt.prompt();installEvt.userChoice.then(r=>{if(r.outcome==='accepted'){installEvt=null;$('installBtn').classList.add('hidden')}})}};

dashboard();workout();performance();settings();
