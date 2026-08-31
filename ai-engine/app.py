from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List
from collections import defaultdict


app = FastAPI(title="PathWise AI Engine", version="1.0")


class RecommendRequest(BaseModel):
    profile: Dict[str, Any]
    goal_skills: List[Dict[str, Any]]
    user_skills: List[Dict[str, Any]]
    resources: List[Dict[str, Any]]
    prerequisites: List[Dict[str, Any]]


def skill_score(goal, user_map):
    skill_id = int(goal["skill_id"])

    current = float(user_map.get(skill_id, 0))
    required = float(goal["required_level"])
    gap = max(required - current, 0)

    return current, required, gap


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "PathWise AI Engine"
    }


@app.post("/recommend")
def recommend(req: RecommendRequest):
    
    user_map = {
        int(x["skill_id"]): float(x["proficiency"])
        for x in req.user_skills
    }

    goals = sorted(
        req.goal_skills,
        key=lambda g: -(
            max(
                float(g["required_level"])
                - user_map.get(int(g["skill_id"]), 0),
                0
            )
            * float(g.get("importance", 1))
        )
    )

    prereq_map = defaultdict(list)

    for p in req.prerequisites:
        prereq_map[int(p["skill_id"])].append(
            (
                int(p["prerequisite_skill_id"]),
                float(p["min_level"])
            )
        )

    ordered_skill_ids = []
    seen = set()

    def add_with_prereqs(skill_id):

        if skill_id in seen:
            return

        for pre_id, min_level in prereq_map.get(skill_id, []):

            if user_map.get(pre_id, 0) < min_level:
                add_with_prereqs(pre_id)

        if skill_id not in seen:
            seen.add(skill_id)
            ordered_skill_ids.append(skill_id)


    for g in goals:

        current, required, gap = skill_score(
            g,
            user_map
        )

        if gap > 0:
            add_with_prereqs(
                int(g["skill_id"])
            )

    resource_by_skill = defaultdict(list)

    for r in req.resources:

        resource_by_skill[
            int(r["skill_id"])
        ].append(r)


    roadmap = []

    used_resources = set()

    for sid in ordered_skill_ids:

        candidates = resource_by_skill.get(sid, [])

        if not candidates:
            continue

        candidates = sorted(
            candidates,
            key=lambda r: (
                -float(r.get("contribution", 0)),
                float(r.get("estimated_hours", 999))
            )
        )

        selected = next(
            (
                r
                for r in candidates
                if int(r["id"]) not in used_resources
            ),
            None
        )


        if not selected:
            continue


        selected_id = int(selected["id"])

        used_resources.add(selected_id)


        current = user_map.get(sid, 0)


        goal = next(
            (
                g
                for g in goals
                if int(g["skill_id"]) == sid
            ),
            None
        )


        required = (
            float(goal["required_level"])
            if goal
            else 70
        )


        gap = max(
            required - current,
            0
        )

        if current == 0:

            level_text = (
                "You have no recorded proficiency "
                "in this skill."
            )

        elif current < 50:

            level_text = (
                f"Your current proficiency is "
                f"{current:.0f}%, so this closes "
                f"a significant skill gap."
            )

        else:

            level_text = (
                f"Your current proficiency is "
                f"{current:.0f}%, so this strengthens "
                f"the skill toward the target."
            )

        prereq_reason = ""

        for pre_id, min_level in prereq_map.get(sid, []):

            if user_map.get(pre_id, 0) < min_level:

                prereq_reason = (
                    " It is placed after its prerequisite "
                    "because the prerequisite level is "
                    "not yet met."
                )

                break

        career_goal = req.profile.get(
            "career_goal",
            "your goal"
        )


        reason = (
            f"Recommended for {career_goal}. "
            f"Required level: {required:.0f}%, "
            f"current level: {current:.0f}%, "
            f"gap: {gap:.0f}%. "
            + level_text
            + prereq_reason
        )

        roadmap.append(
            {
                # Return resource_id to backend,
                # but get the value from database "id".
                "resource_id": selected_id,

                "skill_id": sid,

                "skill_name": selected.get(
                    "skill_name",
                    "Unknown Skill"
                ),

                "title": selected.get(
                    "title",
                    "Learning Resource"
                ),

                "resource_type": selected.get(
                    "resource_type",
                    "course"
                ),

                "estimated_hours": float(
                    selected.get(
                        "estimated_hours",
                        1
                    )
                ),

                "reason": reason
            }
        )

    total_gap = 0
    total_required = 0


    for g in goals:

        current, required, gap = skill_score(
            g,
            user_map
        )

        importance = float(
            g.get("importance", 1)
        )

        total_gap += gap * importance

        total_required += required * importance


    readiness = max(
        0,
        min(
            100,
            100
            - (
                total_gap
                / max(total_required, 1)
                * 100
            )
        )
    )

    return {

        "goal": req.profile.get(
            "career_goal"
        ),

        "readiness_score": round(
            readiness,
            1
        ),

        "skill_gaps": [

            {
                "skill_id": int(
                    g["skill_id"]
                ),

                "skill_name": g.get(
                    "name",
                    "Unknown Skill"
                ),

                "current": round(
                    float(
                        user_map.get(
                            int(g["skill_id"]),
                            0
                        )
                    ),
                    1
                ),

                "required": round(
                    float(
                        g["required_level"]
                    ),
                    1
                ),

                "gap": round(
                    max(
                        float(
                            g["required_level"]
                        )
                        - user_map.get(
                            int(g["skill_id"]),
                            0
                        ),
                        0
                    ),
                    1
                )
            }

            for g in goals
        ],

        "roadmap": roadmap,

        "adaptation": (
            "The roadmap is ordered by career relevance, "
            "skill gap and unmet prerequisites. Assessment "
            "scores can update proficiency and trigger "
            "a new roadmap."
        )
    }