import React, { useEffect, useState } from "react";
import { Target, Brain, BookOpen, BarChart3, MessageCircle, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

const API="/api";
const USER_ID=1;

async function api(path, options={}) {
  const res=await fetch(API+path,{headers:{"Content-Type":"application/json"},...options});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||"Request failed");
  return data;
}

function ProgressBar({value}) {
  return <div className="bar"><div className="barFill" style={{width:`${Math.min(100,value)}%`}}/></div>
}

function App() {
  const [profile,setProfile]=useState(null);
  const [dashboard,setDashboard]=useState(null);
  const [plan,setPlan]=useState(null);
  const [chat,setChat]=useState([]);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("dashboard");
  const [error,setError]=useState("");

  const load=async()=>{
    try {
      setProfile(await api(`/profile/${USER_ID}`));
      setDashboard(await api(`/dashboard/${USER_ID}`));
      const rows=await api(`/roadmap/${USER_ID}`);
      if(rows.length){
        const groups={};
        rows.forEach(r=>{groups[r.path_id]??=[];groups[r.path_id].push(r)});
        const latest=groups[Math.max(...Object.keys(groups).map(Number))];
        setPlan({goal:latest[0].goal,roadmap:latest.map(x=>({
          path_item_id:x.path_item_id,
          title:x.title,resource_type:x.resource_type,skill_name:x.skill_name,
          estimated_hours:x.estimated_hours,status:x.status,reason:x.reason,url:x.url
        }))});
      }
    } catch(e){setError(e.message)}
  };

  useEffect(()=>{load()},[]);

  const generate=async()=>{
    setLoading(true);setError("");
    try { setPlan(await api("/roadmap/generate",{method:"POST",body:JSON.stringify({userId:USER_ID})})); await load(); setTab("roadmap");}
    catch(e){setError(e.message)}
    finally{setLoading(false)}
  };

  const sendMessage=()=>{
    if(!message.trim()) return;
    const q=message.trim();
    setChat(c=>[...c,{role:"user",text:q}]);
    setMessage("");
    const goal=profile?.career_goal||"your career goal";
    const answer=`I can help you reach ${goal}. Your current roadmap is based on your recorded skills, skill gaps and prerequisites. Try generating the roadmap, then use assessments to adapt it.`;
    setTimeout(()=>setChat(c=>[...c,{role:"assistant",text:answer}]),250);
  };

  const markDone=async(item)=>{
    // Demo UI updates locally; full persistence requires path_item id returned by roadmap query.
    setPlan(p=>({...p,roadmap:p.roadmap.map(x=>x.title===item.title?{...x,status:"completed"}:x)}));
  };

  if(!profile) return <div className="center"><div className="loader"/>Loading PathWise AI...</div>;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="logo">P</div><div><b>PathWise</b><small>AI Learning Coach</small></div></div>
        <nav>
          {[
            ["dashboard","Dashboard",BarChart3],
            ["roadmap","Learning Path",Target],
            ["skills","Skill Gaps",Brain],
            ["assistant","AI Assistant",MessageCircle]
          ].map(([id,label,Icon])=>
            <button className={tab===id?"nav active":"nav"} onClick={()=>setTab(id)} key={id}><Icon size={18}/>{label}</button>
          )}
        </nav>
        <div className="sideCard">
          <Sparkles size={18}/>
          <b>Personalized</b>
          <span>Your roadmap adapts to progress and assessment results.</span>
        </div>
      </aside>

      <main>
        <header>
          <div><span className="eyebrow">PERSONALIZED LEARNING</span><h1>{tab==="dashboard"?"Good to see you, "+profile.name+" 👋":"PathWise AI"}</h1></div>
          <button className="outline" onClick={generate}><RefreshCw size={16}/> Regenerate</button>
        </header>

        {error && <div className="error">{error}</div>}

        {tab==="dashboard" && <Dashboard profile={profile} dashboard={dashboard} generate={generate} loading={loading}/>}
        {tab==="roadmap" && <Roadmap plan={plan} markDone={markDone}/>}
        {tab==="skills" && <Skills profile={profile}/>}
        {tab==="assistant" && <Assistant chat={chat} message={message} setMessage={setMessage} sendMessage={sendMessage}/>}
      </main>
    </div>
  )
}

function Dashboard({profile,dashboard,generate,loading}) {
  const completion=dashboard?.roadmap_total?dashboard.roadmap_completed/dashboard.roadmap_total*100:0;
  return <div className="content">
    <section className="hero">
      <div><span className="pill">🎯 Goal: {profile.career_goal}</span>
      <h2>A roadmap built around <em>your</em> goal.</h2>
      <p>PathWise identifies your skill gaps, respects prerequisites, and recommends what to learn next.</p>
      <button className="primary" onClick={generate} disabled={loading}>{loading?"Generating...":"Generate My Learning Path"} <Target size={17}/></button></div>
      <div className="score"><div className="scoreRing">{Math.round(dashboard?.avg_skill||0)}%</div><span>Average skill level</span></div>
    </section>

    <div className="cards">
      <Metric icon={Brain} label="Skill readiness" value={`${Math.round(dashboard?.avg_skill||0)}%`} note={`${dashboard?.strong_skills||0} strong skills`}/>
      <Metric icon={BookOpen} label="Roadmap progress" value={`${Math.round(completion)}%`} note={`${dashboard?.roadmap_completed||0}/${dashboard?.roadmap_total||0} milestones`}/>
      <Metric icon={Target} label="Weekly target" value={`${profile.weekly_hours}h`} note={`${profile.target_months} month plan`}/>
    </div>

    <section className="section">
      <div className="sectionHead"><div><span className="eyebrow">NEXT ACTION</span><h3>Close your biggest skill gap</h3></div></div>
      {profile.skills.filter(s=>s.proficiency<70).slice(0,3).map(s=><div className="skillRow" key={s.id}><div><b>{s.name}</b><span>{s.category}</span></div><div className="skillValue">{Math.round(s.proficiency)}%</div><ProgressBar value={s.proficiency}/></div>)}
    </section>
  </div>
}

function Metric({icon:Icon,label,value,note}) {
 return <div className="metric"><Icon size={20}/><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function Roadmap({plan,markDone}) {
 if(!plan) return <div className="empty"><Target size={40}/><h2>No roadmap yet</h2><p>Click Regenerate to create a personalized path.</p></div>;
 return <div className="content">
   <div className="pageTitle"><span className="eyebrow">ROADMAP</span><h2>{plan.goal}</h2><p>Prerequisite-aware sequence generated from your current profile.</p></div>
   <div className="timeline">
    {plan.roadmap.map((x,i)=><div className="step" key={x.title+i}><div className="stepNo">{i+1}</div><div className="stepCard">
      <div className="stepTop"><div><span className="type">{x.resource_type}</span><h3>{x.title}</h3><p className="muted">{x.skill_name} · {x.estimated_hours} hours</p></div>
      {x.status==="completed"?<span className="done"><CheckCircle2 size={16}/> Completed</span>:<button className="smallBtn" onClick={()=>markDone(x)}>Mark complete</button>}</div>
      <div className="why"><b>Why recommended?</b><span>{x.reason}</span></div>
    </div></div>)}
   </div>
 </div>
}

function Skills({profile}) {
 return <div className="content"><div className="pageTitle"><span className="eyebrow">SKILL GAP ANALYSIS</span><h2>What you need to improve</h2><p>Current proficiency compared with the recommended target.</p></div>
 <div className="skillGrid">{profile.skills.filter(s=>s.proficiency<100).map(s=><div className="skillCard" key={s.id}><div className="skillHead"><div><b>{s.name}</b><small>{s.category}</small></div><strong>{Math.round(s.proficiency)}%</strong></div><ProgressBar value={s.proficiency}/><div className="target">Target <b>{s.proficiency>=70?"70+":"70"}%</b></div></div>)}</div></div>
}

function Assistant({chat,message,setMessage,sendMessage}) {
 return <div className="content assistant"><div className="pageTitle"><span className="eyebrow">CONVERSATIONAL AI</span><h2>Ask your learning coach</h2><p>Describe a goal, weakness or learning problem.</p></div>
 <div className="chatBox"><div className="messages">
  {!chat.length && <div className="suggestions"><button onClick={()=>setMessage("What should I learn next?")}>What should I learn next?</button><button onClick={()=>setMessage("Why was this course recommended?")}>Why was this recommended?</button><button onClick={()=>setMessage("I am weak in machine learning")}>I am weak in ML</button></div>}
  {chat.map((m,i)=><div className={m.role==="user"?"bubble user":"bubble ai"} key={i}>{m.text}</div>)}
 </div><div className="composer"><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Tell me what you want to achieve..."/><button className="primary" onClick={sendMessage}>Send</button></div></div>
 </div>
}

export default App;
