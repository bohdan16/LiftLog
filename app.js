const KEY='liftlog-data-v2';
const EX={
'Incline Dumbbell Press':['Chest',['Incline Machine Press']],'Overhead Press':['Shoulders',['Machine Shoulder Press']],'Cable Lateral Raise':['Shoulders',['Dumbbell Lateral Raise']],'Chest Fly':['Chest',['Machine Chest Fly']],'Triceps Pushdown':['Triceps',['Overhead Triceps Extension']],'Dumbbell Bench Press':['Chest',['Barbell Bench Press']],
'Incline Machine Press':['Chest',['Incline Dumbbell Press']],'Overhead Triceps Extension':['Triceps',['Triceps Pushdown']],
'Lat Pulldown':['Back',['Assisted Pull-Up']],'Seated Cable Row':['Back',['Chest-Supported Row']],'Rear Delt Fly':['Rear Delts',['Reverse Pec Deck']],'Face Pull':['Rear Delts',['Cable Rear Delt Row']],
'Standing Cable Pullover':['Back',['Straight-Arm Pulldown']],'Machine Lat Pulldown':['Back',['Lat Pulldown']],'Bent-Over Row':['Back',['Chest-Supported Row']],
'Squat':['Quads',['Leg Press','Deadlift','Hack Squat']],'Deadlift':['Hamstrings',['Leg Press','Hack Squat']],'Romanian Deadlift':['Hamstrings',['Leg Curl']],'Leg Press':['Quads',['Deadlift','Hack Squat']],
};
const ROUTINES={'Push A':['Incline Dumbbell Press','Overhead Press','Cable Lateral Raise','Chest Fly','Triceps Pushdown'],'Push B':['Incline Machine Press','Overhead Press','Cable Lateral Raise','Chest Fly','Overhead Triceps Extension'],'Pull A':['Lat Pulldown','Seated Cable Row','Rear Delt Fly','Face Pull'],'Pull B':['Machine Lat Pulldown','Bent-Over Row','Standing Cable Pullover','Cable Rear Delt Row']};
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{workouts:[],routines:{...ROUTINES},settings:{rest:90}};
delete data.routines['Legs A'];delete data.routines['Legs B'];delete data.routines['Legs C'];delete data.routines['Legs'];
localStorage.setItem(KEY,JSON.stringify(data));
let cur={routine:Object.keys(data.routines)[0]||'Push A',started:null,exercises:[],active:false},activeTimers={},installEvt=null;
let editingRoutineKey=null;
const $=id=>document.getElementById(id); const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(data)); const dk=d=>new Date(d).toISOString().slice(0,10); const fd=d=>new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

function nav(id){document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.nav===id));if(id==='dashboard')dashboard();if(id==='performance')performance();if(id==='workout')workout()}
document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>nav(b.dataset.nav));
function info(n){return EX[n]||['Other',[]]};
function setsFor(n){let a=[];data.workouts.forEach(w=>(w.exercises||[]).filter(e=>e.name===n).forEach(e=>(e.sets||[]).forEach(s=>{let wt=+s.weight||0,r=+s.reps||0;if(wt&&r)a.push({weight:wt,reps:r,date:w.date})})));return a}
function best(n){let a=setsFor(n);let b={weight:Math.max(0,...a.map(x=>x.weight)),reps:Math.max(0,...a.map(x=>x.reps))};let ov=data.overrides&&data.overrides[n];if(ov&&ov.weight>b.weight){b={weight:ov.weight,reps:ov.reps||b.reps}}return b}
function oneRM(n){return Math.max(0,...setsFor(n).map(x=>x.weight*(1+x.reps/30)))}
function suggest(n){let a=setsFor(n);if(!a.length)return'First session: pick a weight you can control for 6–8 reps';let s=a[a.length-1],w=s.weight,r=s.reps,r5=x=>Math.round(x/5)*5;if(r<6)return`Last set ${w} lb × ${r} — drop to ${r5(w*0.9)} lb to land in the 6–8 rep range`;if(r>8)return`Last set ${w} lb × ${r} — add ${r5(w*1.05)} lb to bring reps back down to 6–8`;if(r===8)return`Last set ${w} lb × 8, top of range — add 5 lb next session`;return`Last set ${w} lb × ${r}, in the 6–8 range — hold this weight until you hit 8 reps, then add 5 lb`}

function routineEntries(list){
  return (list||[]).map(e=>typeof e==='string'?{name:e,sets:3,reps:null}:{name:e.name,sets:e.sets||3,reps:e.reps||null});
}
function routineNames(list){return routineEntries(list).map(e=>e.name)}

function makeSet(b){
  return {weight:b.weight||'',reps:b.reps||'',done:false,restSec:data.settings.rest||90,timerEnd:null,timerDuration:null};
}
function make(n,entry){
  let b=best(n);
  let setCount=entry&&entry.sets?entry.sets:3;
  let reps=entry&&entry.reps?entry.reps:b.reps;
  let sets=[];
  for(let i=0;i<setCount;i++)sets.push(makeSet({weight:b.weight,reps}));
  return {name:n,sets};
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

function currentExerciseName(){
  let e=cur.exercises.find(e=>e.sets.some(s=>!s.done));
  return e?e.name:(cur.exercises.length?cur.exercises[cur.exercises.length-1].name:'Workout');
}

function workout(){
  if(!data.routines[cur.routine])cur.routine=Object.keys(data.routines)[0];

  $('workoutTitle').textContent=cur.active?currentExerciseName():'Workouts';
  $('newWorkout').classList.toggle('hidden',!cur.active);
  $('addRoutineBtn').classList.toggle('hidden',cur.active);
  $('editRoutinesBtn').classList.toggle('hidden',cur.active);
  $('routineGrid').classList.toggle('hidden',cur.active);
  if(cur.active){$('addRoutineForm').classList.add('hidden')}else{$('addExerciseForm').classList.add('hidden')}
  $('routinePreview').classList.toggle('hidden',cur.active);
  $('startWorkoutBtn').classList.toggle('hidden',cur.active);
  $('exerciseList').classList.toggle('hidden',!cur.active);
  $('workoutFooter').classList.toggle('hidden',!cur.active);
  $('workoutEndActions').classList.toggle('hidden',!cur.active);

  if(!cur.active){
    $('routineGrid').innerHTML=Object.keys(data.routines).map(r=>`
      <button class="card routineCard${r===cur.routine?' selected':''}" data-pick="${esc(r)}">
        <b>${esc(r)}</b><span>${data.routines[r].length} exercises</span>
      </button>`).join('');
    $('routineGrid').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{cur.routine=b.dataset.pick;workout()});

    let names=routineNames(data.routines[cur.routine]);
    $('routineSummary').textContent=`${names.length} exercises • ${names.join(', ')}`;
    $('exerciseList').innerHTML='';
    $('setsCompleted').textContent='0';
    $('workoutClock').textContent='00:00';
    return;
  }

  $('routineSummary').textContent=`${cur.exercises.length} exercises • Visual rest countdown bars + progression suggestions`;

  $('exerciseList').innerHTML=cur.exercises.map((e,i)=>{
    let b=best(e.name),inf=info(e.name);
    let partnerIdx=supersetPartner(i);
    let pairNote=partnerIdx!=null?`<span class="muted small pairNote">⇄ Paired with ${esc(cur.exercises[partnerIdx].name)} — rest starts once both sides are done</span>`:'';
    return `<div class="card exercise" data-idx="${i}">
      <div class="exerciseDragBar" data-drag>${esc(e.name)}${e.superset?' • SUPERSET':''}</div>
      <div class="exerciseSub"><span class="pill">${esc(inf[0])}</span></div>
      ${pairNote}
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
      let partnerIdx=supersetPartner(eIdx);
      if(partnerIdx!=null){
        let partnerSet=cur.exercises[partnerIdx]&&cur.exercises[partnerIdx].sets[sIdx];
        if(partnerSet&&partnerSet.done){
          startSetTimer(eIdx,sIdx); // both halves of the superset done — rest starts now
        }
        // else: waiting on the paired exercise's matching set, no timer yet
      }else{
        startSetTimer(eIdx, sIdx);
      }
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
    let ex=cur.exercises[+b.dataset.add];
    let last=ex.sets[ex.sets.length-1];
    let src=(last&&(+last.weight||+last.reps))?{weight:last.weight,reps:last.reps}:best(ex.name);
    ex.sets.push(makeSet(src));
    workout();
  });
  $('exerciseList').querySelectorAll('[data-rem]').forEach(b=>b.onclick=()=>{cur.exercises.splice(+b.dataset.rem,1);workout()});
  $('exerciseList').querySelectorAll('[data-sup]').forEach(b=>b.onclick=()=>{let e=cur.exercises[+b.dataset.sup];e.superset=!e.superset;workout()});
  $('exerciseList').querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{let i=+b.dataset.sub,a=info(cur.exercises[i].name)[1];if(!a.length)return alert('No substitution listed.');let n=prompt('Sub with:\n'+a.map((x,j)=>`${j+1}. ${x}`).join('\n'));let idx=(+n||0)-1;if(idx<0||idx>=a.length)return;cur.exercises[i].name=a[idx];workout()});
  $('setsCompleted').textContent=cur.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0);
  initExerciseDrag();
}

function supersetPartner(i){
  if(cur.exercises[i]&&cur.exercises[i].superset&&cur.exercises[i+1])return i+1;
  if(cur.exercises[i-1]&&cur.exercises[i-1].superset)return i-1;
  return null;
}

function initExerciseDrag(){
  let list=$('exerciseList');
  list.querySelectorAll('[data-drag]').forEach(handle=>{
    handle.onpointerdown=e=>{
      e.preventDefault();
      let card=handle.closest('.exercise');
      try{card.setPointerCapture(e.pointerId)}catch(err){}
      card.classList.add('dragging');
      list.classList.add('reordering');

      let cardH=card.getBoundingClientRect().height;
      let curY=e.clientY;
      let translateY=0;

      function applyTransform(){
        let staticTop=card.getBoundingClientRect().top-translateY;
        translateY=curY-(staticTop+cardH/2);
        card.style.transform=`translateY(${translateY}px)`;
      }
      applyTransform();

      function checkSwap(){
        let guard=0;
        while(guard++<20){
          let next=card.nextElementSibling;
          if(next&&next.classList.contains('exercise')){
            let nr=next.getBoundingClientRect();
            if(curY>nr.top+nr.height/2){list.insertBefore(next,card);applyTransform();continue}
          }
          let prev=card.previousElementSibling;
          if(prev&&prev.classList.contains('exercise')){
            let pr=prev.getBoundingClientRect();
            if(curY<pr.top+pr.height/2){list.insertBefore(card,prev);applyTransform();continue}
          }
          break;
        }
      }

      let scrollRAF=null;
      function scrollLoop(){
        let margin=90,maxSpeed=16,vh=window.innerHeight;
        let dy=0;
        if(curY<margin)dy=-maxSpeed*(1-curY/margin);
        else if(curY>vh-margin)dy=maxSpeed*(1-(vh-curY)/margin);
        if(dy){window.scrollBy(0,dy);applyTransform();checkSwap()}
        scrollRAF=requestAnimationFrame(scrollLoop);
      }
      scrollRAF=requestAnimationFrame(scrollLoop);

      let onMove=ev=>{curY=ev.clientY;applyTransform();checkSwap()};
      let onUp=()=>{
        list.removeEventListener('pointermove',onMove);
        list.removeEventListener('pointerup',onUp);
        list.removeEventListener('pointercancel',onUp);
        if(scrollRAF)cancelAnimationFrame(scrollRAF);
        card.classList.remove('dragging');
        list.classList.remove('reordering');
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
  let entries=routineEntries(data.routines[r]);
  cur={routine:r,started:Date.now(),exercises:entries.map(e=>make(e.name,e)),active:true};
  workout();
};

$('newWorkout').onclick=()=>{
  $('addExerciseForm').classList.remove('hidden');
  $('addExerciseSearch').value='';
  renderAddExercisePicker('');
  $('addExerciseSearch').focus();
};
$('addExerciseSearch').oninput=e=>renderAddExercisePicker(e.target.value);
$('cancelAddExercise').onclick=()=>$('addExerciseForm').classList.add('hidden');

function renderAddExercisePicker(filter){
  let existing=cur.exercises.map(e=>e.name);
  let q=(filter||'').trim().toLowerCase();
  let groups={};
  Object.keys(EX).sort().forEach(n=>{
    if(existing.includes(n))return;
    if(q&&!n.toLowerCase().includes(q))return;
    let g=info(n)[0];(groups[g]=groups[g]||[]).push(n);
  });
  let html=Object.keys(groups).sort().map(g=>`<div class="pickerGroup"><div class="pickerGroupLabel">${esc(g)}</div><div class="exBubbles">${groups[g].map(n=>`<button class="exBubble" data-pickex="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>`).join('');
  $('addExercisePicker').innerHTML=html||'<div class="empty">No matches.</div>';
  $('addExercisePicker').querySelectorAll('[data-pickex]').forEach(b=>b.onclick=()=>{
    cur.exercises.push(make(b.dataset.pickex));
    $('addExerciseForm').classList.add('hidden');
    workout();
  });
}

let pickerChosen=[];
function renderExercisePicker(initial){
  pickerChosen=(initial||[]).map(e=>typeof e==='string'?{name:e,sets:3}:{name:e.name,sets:e.sets||3});
  $('routineExerciseSearch').value='';
  renderChosenList();
  renderAddList();
}
function renderChosenList(){
  let html=pickerChosen.map((item,i)=>`<div class="card pickRow" data-idx="${i}"><span class="dragHandle"></span><span class="pickRowName">${esc(item.name)}</span><div class="setsStepper" data-setsfor="${i}"><button type="button" class="stepBtn" data-step="-1">−</button><span class="stepVal">${item.sets}</span><button type="button" class="stepBtn" data-step="1">+</button></div><button data-rmpick="${i}" class="textBtn">✕</button></div>`).join('');
  $('chosenList').innerHTML=html||'<div class="empty">No exercises chosen yet.</div>';
  $('chosenList').querySelectorAll('[data-rmpick]').forEach(el=>el.onclick=()=>{pickerChosen.splice(+el.dataset.rmpick,1);renderChosenList();renderAddList()});
  $('chosenList').querySelectorAll('.setsStepper').forEach(stepper=>{
    let i=+stepper.dataset.setsfor;
    stepper.querySelectorAll('.stepBtn').forEach(btn=>btn.onclick=()=>{
      pickerChosen[i].sets=Math.max(1,Math.min(999,pickerChosen[i].sets+(+btn.dataset.step)));
      stepper.querySelector('.stepVal').textContent=pickerChosen[i].sets;
    });
  });
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
        renderChosenList();
      };
      list.addEventListener('pointermove',onMove);list.addEventListener('pointerup',onUp);list.addEventListener('pointercancel',onUp);
    };
  });
}
function renderAddList(){
  let q=$('routineExerciseSearch').value.trim().toLowerCase();
  let groups={};
  Object.keys(EX).sort().forEach(n=>{
    if(pickerChosen.some(x=>x.name===n))return;
    if(q&&!n.toLowerCase().includes(q))return;
    let g=info(n)[0];(groups[g]=groups[g]||[]).push(n);
  });
  let html=Object.keys(groups).sort().map(g=>`<div class="pickerGroup"><div class="pickerGroupLabel">${esc(g)}</div>${groups[g].map(n=>`<div class="checkRow" data-addpick="${esc(n)}" style="cursor:pointer"><span>+ ${esc(n)}</span></div>`).join('')}</div>`).join('');
  $('exercisePicker').innerHTML=html||'<div class="empty">No matches.</div>';
  $('exercisePicker').querySelectorAll('[data-addpick]').forEach(el=>el.onclick=()=>{pickerChosen.push({name:el.dataset.addpick,sets:3});renderChosenList();renderAddList()});
}
$('routineExerciseSearch').oninput=()=>renderAddList();

function openRoutineEditor(key){
  editingRoutineKey=key;
  $('newRoutineName').value=key;
  renderExercisePicker(routineEntries(data.routines[key]));
  $('deleteRoutineBtn').classList.remove('hidden');
  $('saveAddRoutine').textContent='Save changes';
  $('addRoutineForm').classList.remove('hidden');
  $('newRoutineName').focus();
}

$('editRoutinesBtn').onclick=()=>openRoutineEditor(cur.routine);

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
function showChoiceModal(title,body,btn1,btn2,btn3){
  return new Promise(resolve=>{
    $('modalTitle').textContent=title;
    $('modalBody').textContent=body;
    $('modalBtn1').textContent=btn1;
    $('modalBtn2').textContent=btn2;
    $('modalBtn3').classList.toggle('hidden',!btn3);
    $('modalOverlay').classList.remove('hidden');
    let done=v=>{$('modalOverlay').classList.add('hidden');resolve(v)};
    $('modalBtn1').onclick=()=>done(1);
    $('modalBtn2').onclick=()=>done(2);
    $('modalBtn3').onclick=()=>done(0);
  });
}

function avgReps(sets){return Math.round(sets.reduce((a,s)=>a+(+s.reps||0),0)/sets.length)}

let toastTimer=null;
function showToast(msg,onUndo){
  clearTimeout(toastTimer);
  $('toastMsg').textContent=msg;
  $('toast').classList.remove('hidden');
  $('toastUndo').classList.toggle('hidden',!onUndo);
  $('toastUndo').onclick=()=>{
    clearTimeout(toastTimer);
    $('toast').classList.add('hidden');
    onUndo&&onUndo();
  };
  toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),5000);
}

$('finishWorkout').onclick=async()=>{
  let ex=cur.exercises.map(e=>({...e,sets:e.sets.filter(s=>s.done)})).filter(e=>e.sets.length);
  if(!ex.length)return alert('Complete at least one set first.');
  let vol=ex.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(+s.weight||0)*(+s.reps||0),0),0);

  let entries=routineEntries(data.routines[cur.routine]);
  let names=entries.map(e=>e.name);
  let added=ex.filter(e=>!names.includes(e.name));
  let changed=ex.filter(e=>{
    if(added.includes(e))return false;
    let t=entries.find(x=>x.name===e.name);
    return t.sets!==e.sets.length||(t.reps&&t.reps!==avgReps(e.sets));
  });

  let templateChoice=null;
  if(added.length||changed.length){
    let lines=[];
    if(added.length)lines.push('Added: '+added.map(e=>`${e.name} (${e.sets.length}×${avgReps(e.sets)})`).join(', '));
    if(changed.length)lines.push('Changed: '+changed.map(e=>`${e.name} (${e.sets.length}×${avgReps(e.sets)})`).join(', '));
    let choice=await showChoiceModal(`Finish "${cur.routine}"?`,lines.join('\n'),'Exercises and Sets/Reps','Sets/Reps','Cancel');
    if(choice===0)return;
    templateChoice=choice;
  }else{
    if(!confirm('Finish this workout?'))return;
  }

  let routineSnapshot=JSON.parse(JSON.stringify(data.routines[cur.routine]));
  let workoutRecord={id:crypto.randomUUID(),date:new Date().toISOString(),routine:cur.routine,durationMin:Math.max(1,Math.round((Date.now()-cur.started)/60000)),volume:vol,exercises:ex};
  data.workouts.unshift(workoutRecord);
  save();

  if(templateChoice===1){
    data.routines[cur.routine]=ex.map(e=>({name:e.name,sets:e.sets.length,reps:avgReps(e.sets)}));
    save();
  }else if(templateChoice===2&&changed.length){
    changed.forEach(e=>{let t=entries.find(x=>x.name===e.name);t.sets=e.sets.length;t.reps=avgReps(e.sets)});
    data.routines[cur.routine]=entries;
    save();
  }

  let finishedRoutine=cur.routine;
  cur={routine:cur.routine,started:null,exercises:[],active:false};nav('dashboard');
  dashboard();performance();
  showToast('Workout saved.',()=>{
    data.workouts=data.workouts.filter(w=>w.id!==workoutRecord.id);
    data.routines[finishedRoutine]=routineSnapshot;
    save();
    dashboard();performance();settings();
  });
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

function themeColors(){
  let light=document.body.classList.contains('light');
  return light
    ? {muted:'#6b7280',accent:'#4a5bc7',accentDim:'#7885d6',accentSoft:'#39469c',gridStrong:'rgba(70,80,120,.15)',gridSoft:'rgba(70,80,120,.08)',fill:'rgba(74,91,199,.14)',text:'#161a22'}
    : {muted:'#8995a6',accent:'#aebcff',accentDim:'#7180bd',accentSoft:'#c7d0ff',gridStrong:'rgba(140,153,170,.12)',gridSoft:'rgba(140,153,170,.06)',fill:'rgba(174,188,255,.16)',text:'#eef1ff'};
}

function emptyChart(ctx,w,h,msg){
  ctx.fillStyle=themeColors().muted;ctx.font='12px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';
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
  let tc=themeColors();
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
    ctx.strokeStyle=tc.gridStrong;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle=tc.muted;ctx.textAlign='right';
    ctx.fillText(Math.round(v).toLocaleString()+(unit?' '+unit:''),left-8,y+3);
  }

  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1);
    ctx.strokeStyle=tc.gridSoft;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+plotH);ctx.stroke();
    ctx.fillStyle=tc.muted;ctx.textAlign='center';
    ctx.fillText(labels[i]||'',x,h-6);
  });

  if(opts.avgLine!=null&&niceMax>0){
    let y=top+plotH-(opts.avgLine/niceMax)*plotH;
    ctx.save();ctx.setLineDash([4,4]);
    ctx.strokeStyle=tc.accentDim;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1),y=top+plotH-(v/niceMax)*plotH;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.strokeStyle=tc.accent;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  vals.forEach((v,i)=>{
    let x=left+(plotW*i)/Math.max(1,vals.length-1),y=top+plotH-(v/niceMax)*plotH;
    ctx.fillStyle=tc.accent;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    if(opts.showValues){
      ctx.fillStyle=tc.accentSoft;ctx.font='10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
      ctx.textAlign='center';
      ctx.fillText(String(Math.round(v)),x,y-8);
    }
  });
}

function bars(cv,obj,unit){
  let s=chartSetup(cv);if(!s)return;
  let{ctx,w,h}=s;
  let tc=themeColors();
  let entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!entries.length){emptyChart(ctx,w,h,'No workouts yet');return}
  let total=entries.reduce((a,x)=>a+x[1],0)||1;
  let max=Math.max(...entries.map(x=>x[1]),1);
  let rowH=Math.min(26,(h-8)/entries.length);
  let labelW=100;
  ctx.font='11px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
  entries.forEach(([k,v],i)=>{
    let y=6+i*rowH;
    ctx.fillStyle=tc.muted;ctx.textAlign='left';
    ctx.fillText(k.length>13?k.slice(0,12)+'…':k,4,y+rowH*0.62);
    let barMax=Math.max(10,w-labelW-90);
    let barW=Math.max(2,(barMax*v)/max);
    ctx.fillStyle=tc.accent;
    ctx.fillRect(labelW,y+3,barW,Math.max(4,rowH-10));
    ctx.fillStyle=tc.text;
    let pct=Math.round((v/total)*100);
    ctx.fillText(`${Math.round(v).toLocaleString()}${unit?' '+unit:''} (${pct}%)`,labelW+barW+6,y+rowH*0.62);
  });
}

function rangeChart(cv,labels,lowVals,highVals,baseStep,unit){
  let s=chartSetup(cv);if(!s)return;
  let{ctx,w,h}=s;
  let tc=themeColors();
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
    ctx.strokeStyle=tc.gridStrong;
    ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();
    ctx.fillStyle=tc.muted;ctx.textAlign='right';
    ctx.fillText(Math.round(v).toLocaleString()+(unit?' '+unit:''),left-8,y+3);
  }
  labels.forEach((lb,i)=>{
    let[x]=xy(highVals,i);
    ctx.fillStyle=tc.muted;ctx.textAlign='center';
    ctx.fillText(lb||'',x,h-6);
  });

  ctx.beginPath();
  highVals.forEach((v,i)=>{let[x,y]=xy(highVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  for(let i=lowVals.length-1;i>=0;i--){let[x,y]=xy(lowVals,i);ctx.lineTo(x,y)}
  ctx.closePath();ctx.fillStyle=tc.fill;ctx.fill();

  ctx.beginPath();
  lowVals.forEach((v,i)=>{let[x,y]=xy(lowVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle=tc.accentDim;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  ctx.beginPath();
  highVals.forEach((v,i)=>{let[x,y]=xy(highVals,i);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle=tc.accent;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

  [[lowVals,tc.accentDim],[highVals,tc.accent]].forEach(([vals,color])=>{
    vals.forEach((v,i)=>{let[x,y]=xy(vals,i);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill()});
  });
}

/* ---------- dashboard ---------- */
function computeStreak(){
  let goal=Math.max(1,data.settings.goal||3);
  let countWeek=start=>{let end=new Date(start);end.setDate(end.getDate()+7);return data.workouts.filter(w=>new Date(w.date)>=start&&new Date(w.date)<end).length};
  let ws=new Date(),day=(ws.getDay()+6)%7;
  ws.setHours(0,0,0,0);ws.setDate(ws.getDate()-day);
  let cursor=new Date(ws);
  if(countWeek(cursor)<goal)cursor.setDate(cursor.getDate()-7);
  let streak=0;
  while(countWeek(cursor)>=goal){streak++;cursor.setDate(cursor.getDate()-7)}
  return streak;
}

function dashboard(){
  let t=week(),days=new Set(t.w.map(x=>dk(x.date)));
  $('weekWorkouts').textContent=`${t.w.length} workout${t.w.length===1?'':'s'}`;
  $('weekFrequency').textContent=`${days.size} training day${days.size===1?'':'s'}`;
  let weekVol=t.w.reduce((a,x)=>a+(+x.volume||0),0);
  $('volumeWeek').textContent=`${Math.round(weekVol).toLocaleString()} lb`;
  $('streakVal').textContent=computeStreak();

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

  let extra='';
  let sessions={};
  a.forEach(s=>{let k=dk(s.date);(sessions[k]=sessions[k]||[]).push(s)});
  let sessionDates=Object.keys(sessions).sort();
  let sessionTrend=sessionDates.map(d=>Math.max(...sessions[d].map(s=>s.weight*(1+s.reps/30))));
  if(sessionDates.length>=2){
    let lastTwo=sessionDates.slice(-2);
    let readyToProgress=lastTwo.every(d=>sessions[d].every(s=>s.reps>=8));
    if(readyToProgress){
      let topWeight=Math.max(...sessions[lastTwo[1]].map(s=>s.weight));
      let nextWeight=Math.round((topWeight*1.05)/5)*5;
      let applied=data.overrides&&data.overrides[n]&&data.overrides[n].weight===nextWeight;
      extra+=`<div class="card"><b>🔼 Ready to progress</b><p class="muted small">You hit 8 reps on every set the last 2 sessions.</p>${applied?`<p class="muted small">Next session will start at ${nextWeight} lb.</p>`:`<button data-applyprogress="${nextWeight}" class="ghost full">Start next session at ${nextWeight} lb</button>`}</div>`;
    }
  }
  if(sessionTrend.length>=3){
    let last3=sessionTrend.slice(-3);
    let plateaued=last3[1]<=last3[0]*1.02&&last3[2]<=last3[1]*1.02;
    if(plateaued)extra+=`<div class="card"><b>⏸ Plateau detected</b><p class="muted small">Estimated 1RM has been flat or dropping for 3+ sessions. Consider a deload week — same exercises at ~60% intensity, fewer sets.</p></div>`;
  }

  $('progressDetails').innerHTML=`<div class="card"><b>Progression recommendation</b><p class="muted small">${esc(suggest(n))}. Shaded band shows your estimated 6–8 rep working range — widen/rise it by adding load once you can hit 8 reps.</p></div>${extra}`;
  let applyBtn=$('progressDetails').querySelector('[data-applyprogress]');
  if(applyBtn)applyBtn.onclick=()=>{
    data.overrides=data.overrides||{};
    data.overrides[n]={weight:+applyBtn.dataset.applyprogress,reps:6};
    save();
    updateProgress(n);
  };
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

$('clearHistory').onclick=()=>{
  if(!data.workouts.length)return;
  let snapshot=data.workouts;
  data.workouts=[];
  save();history();dashboard();performance();
  showToast('History cleared.',()=>{
    data.workouts=snapshot;
    save();history();dashboard();performance();
  });
};

/* ---------- settings ---------- */
function settings(){
  $('defaultRest').value=data.settings.rest;
  $('weeklyGoal').value=data.settings.goal||3;
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
$('saveGoal').onclick=()=>{data.settings.goal=Math.max(1,+$('weeklyGoal').value||3);save();dashboard();alert('Weekly goal saved.')};

function applyTheme(light){
  document.body.classList.toggle('light',light);
  $('themeToggle').textContent=light?'Switch to dark mode':'Switch to light mode';
  let meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',light?'#f5f6fa':'#0b0f17');
}
$('themeToggle').onclick=()=>{
  let light=!document.body.classList.contains('light');
  data.settings.theme=light?'light':'dark';
  save();
  applyTheme(light);
};
applyTheme(data.settings.theme==='light');

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

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        let installing=reg.installing;
        if(!installing)return;
        installing.addEventListener('statechange',()=>{
          if(installing.state==='installed'&&navigator.serviceWorker.controller){
            installing.postMessage('skipWaiting');
          }
        });
      });
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update()});
      setInterval(()=>reg.update(),60*60*1000);
    }).catch(()=>{});
  });
  let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloaded)return;
    reloaded=true;
    location.reload();
  });
}
