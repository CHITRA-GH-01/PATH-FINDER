import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const AI_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";

app.get("/api/health", async (_, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "backend" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/profile/:userId", async (req,res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id,u.name,u.email,p.education,p.experience_level,p.career_goal,
             p.interests,p.weekly_hours,p.target_months,p.learning_preference
      FROM users u JOIN learner_profiles p ON p.user_id=u.id
      WHERE u.id=?`, [req.params.userId]);
    if (!rows.length) return res.status(404).json({error:"Profile not found"});
    const [skills] = await pool.query(`
      SELECT s.id,s.name,s.category,COALESCE(us.proficiency,0) proficiency
      FROM skills s LEFT JOIN user_skills us
      ON us.skill_id=s.id AND us.user_id=?`, [req.params.userId]);
    res.json({...rows[0], skills});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.put("/api/profile/:userId", async (req,res) => {
  try {
    const {name,education,experience_level,career_goal,interests,weekly_hours,target_months,learning_preference} = req.body;
    await pool.query("UPDATE users SET name=? WHERE id=?", [name,req.params.userId]);
    await pool.query(`
      UPDATE learner_profiles SET education=?,experience_level=?,career_goal=?,
      interests=?,weekly_hours=?,target_months=?,learning_preference=? WHERE user_id=?`,
      [education,experience_level,career_goal,JSON.stringify(interests||[]),weekly_hours,target_months,learning_preference,req.params.userId]
    );
    res.json({message:"Profile updated"});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get("/api/goals", async (_,res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM career_goals ORDER BY name");
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/skills/update", async (req,res) => {
  try {
    const {userId, updates} = req.body;
    for (const x of updates) {
      await pool.query(`
        INSERT INTO user_skills(user_id,skill_id,proficiency,last_assessed_at)
        VALUES(?,?,?,NOW())
        ON DUPLICATE KEY UPDATE proficiency=VALUES(proficiency),last_assessed_at=NOW()
      `,[userId,x.skillId,Math.max(0,Math.min(100,x.proficiency))]);
    }
    res.json({message:"Skills updated"});
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/roadmap/generate", async (req,res) => {
  try {
    const userId = req.body.userId;
    const [profileRows] = await pool.query(`
      SELECT p.*,u.name FROM learner_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=?`,
      [userId]);
    if (!profileRows.length) return res.status(404).json({error:"Profile not found"});
    const profile = profileRows[0];

    const [goalRows] = await pool.query(`
      SELECT gs.skill_id,s.name,gs.required_level,gs.importance
      FROM career_goals g
      JOIN goal_skills gs ON gs.goal_id=g.id
      JOIN skills s ON s.id=gs.skill_id
      WHERE LOWER(g.name)=LOWER(?)`,
      [profile.career_goal]);

    const [userSkills] = await pool.query(`
      SELECT skill_id,proficiency FROM user_skills WHERE user_id=?`, [userId]);
    const skillMap = Object.fromEntries(userSkills.map(x => [x.skill_id, Number(x.proficiency)]));

    const [resources] = await pool.query(`
      SELECT r.*,rs.skill_id,rs.contribution,s.name skill_name
      FROM resources r
      JOIN resource_skills rs ON rs.resource_id=r.id
      JOIN skills s ON s.id=rs.skill_id`);

    const [prereqs] = await pool.query(`
      SELECT p.skill_id,p.prerequisite_skill_id,p.min_level FROM prerequisites p`);

    const aiResponse = await fetch(`${AI_URL}/recommend`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        profile,
        goal_skills: goalRows,
        user_skills: userSkills,
        resources,
        prerequisites: prereqs
      })
    });
    if (!aiResponse.ok) throw new Error(`AI engine returned ${aiResponse.status}`);
    const plan = await aiResponse.json();

    const [pathResult] = await pool.query(
      "INSERT INTO learning_paths(user_id,goal) VALUES(?,?)",
      [userId,profile.career_goal]
    );
    const pathId = pathResult.insertId;

    for (const [i,item] of plan.roadmap.entries()) {
      await pool.query(`
        INSERT INTO path_items(path_id,resource_id,skill_id,sequence_no,milestone,status,reason)
        VALUES(?,?,?,?,?,'recommended',?)`,
        [pathId,item.resource_id,item.skill_id,i+1,item.skill_name,item.reason]
      );
    }
    res.json({...plan,path_id:pathId});
  } catch(e) {
    console.error(e);
    res.status(500).json({error:e.message});
  }
});

app.get("/api/roadmap/:userId", async (req,res) => {
  try {
    const [rows] = await pool.query(`
      SELECT lp.id path_id,lp.goal,lp.created_at,pi.id path_item_id,pi.sequence_no,pi.status,pi.reason,
             r.title,r.resource_type,r.provider,r.url,r.estimated_hours,s.name skill_name
      FROM learning_paths lp
      JOIN path_items pi ON pi.path_id=lp.id
      JOIN resources r ON r.id=pi.resource_id
      JOIN skills s ON s.id=pi.skill_id
      WHERE lp.user_id=? ORDER BY lp.id DESC,pi.sequence_no`,[req.params.userId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/path-item/:id/status", async (req,res) => {
  try {
    await pool.query("UPDATE path_items SET status=? WHERE id=?",[req.body.status,req.params.id]);
    res.json({message:"Updated"});
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/assessment", async (req,res) => {
  try {
    const {userId,assessmentId,score} = req.body;
    await pool.query(
      "INSERT INTO assessment_results(user_id,assessment_id,score) VALUES(?,?,?)",
      [userId,assessmentId,score]
    );
    const [a] = await pool.query("SELECT skill_id FROM assessments WHERE id=?",[assessmentId]);
    if (a.length) {
      await pool.query(`
        INSERT INTO user_skills(user_id,skill_id,proficiency,last_assessed_at)
        VALUES(?,?,?,NOW())
        ON DUPLICATE KEY UPDATE proficiency=VALUES(proficiency),last_assessed_at=NOW()
      `,[userId,a[0].skill_id,score]);
    }
    res.json({message:"Assessment saved",skill_id:a[0]?.skill_id});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/api/dashboard/:userId", async (req,res) => {
  try {
    const userId=req.params.userId;
    const [[profile]]=await pool.query("SELECT * FROM learner_profiles WHERE user_id=?",[userId]);
    const [[progress]] = await pool.query(`
      SELECT
      COALESCE(AVG(proficiency),0) avg_skill,
      SUM(proficiency >= 70) strong_skills,
      COUNT(*) skill_count
      FROM user_skills WHERE user_id=?`,[userId]);
    const [[path]] = await pool.query(`
      SELECT COUNT(*) total,
             SUM(status='completed') completed
      FROM path_items pi JOIN learning_paths lp ON lp.id=pi.path_id
      WHERE lp.user_id=? AND lp.id=(SELECT MAX(id) FROM learning_paths WHERE user_id=?)`,
      [userId,userId]);
    res.json({
      goal:profile?.career_goal || "",
      avg_skill:Number(progress?.avg_skill||0),
      strong_skills:Number(progress?.strong_skills||0),
      skill_count:Number(progress?.skill_count||0),
      roadmap_total:Number(path?.total||0),
      roadmap_completed:Number(path?.completed||0)
    });
  } catch(e){res.status(500).json({error:e.message});}
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`PathWise backend running on http://localhost:${process.env.PORT || 5000}`)
);
