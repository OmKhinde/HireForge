import os
import json
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from .state import AgentState
from tools.ats_scorer import compute_ats_score

llm = ChatGroq(
    model=os.environ["GROQ_MODEL"],
    temperature=0.3,
    max_tokens=4096,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _log(state: AgentState, msg: str) -> list:
    """Append a progress message to state."""
    progress = state.get("progress", [])
    return progress + [msg]

def _parse_json(text: str) -> dict | list:
    """Strip markdown fences and parse JSON robustly."""
    clean = re.sub(r"```(?:json)?|```", "", text).strip()
    # sometimes the model adds a leading/trailing sentence — find the JSON block
    match = re.search(r"(\{.*\}|\[.*\])", clean, re.DOTALL)
    if match:
        clean = match.group(1)
    return json.loads(clean)

# ── Node 1 ────────────────────────────────────────────────────────────────────

def parse_documents(state: AgentState) -> AgentState:
    progress = _log(state, "Parsing resume and job description...")

    resume_prompt = f"""
Extract structured information from this resume. 
Return ONLY valid JSON, no explanation, no markdown fences.

Output format:
{{
  "summary": "professional summary text or empty string",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 - Present",
      "bullets": ["bullet 1", "bullet 2"]
    }}
  ],
  "education": [
    {{
      "degree": "B.Tech Computer Science",
      "institution": "University Name",
      "year": "2021"
    }}
  ]
}}

RESUME TEXT:
{state["resume_text"]}
"""

    jd_prompt = f"""
Extract structured information from this job description.
Return ONLY valid JSON, no explanation, no markdown fences.

Output format:
{{
  "role_title": "Job title",
  "required_skills": ["skill1", "skill2"],
  "nice_to_have": ["skill1", "skill2"],
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "experience_years": "3-5 years or empty string"
}}

JOB DESCRIPTION:
{state["jd_text"]}
"""

    resume_resp = llm.invoke([HumanMessage(content=resume_prompt)])
    jd_resp     = llm.invoke([HumanMessage(content=jd_prompt)])

    try:
        parsed_resume = _parse_json(resume_resp.content)
    except json.JSONDecodeError:
        # fallback — empty structure so the graph doesn't crash
        parsed_resume = {"summary": "", "skills": [], "experience": [], "education": []}

    try:
        parsed_jd = _parse_json(jd_resp.content)
    except json.JSONDecodeError:
        parsed_jd = {"role_title": "", "required_skills": [], "nice_to_have": [], "responsibilities": []}

    return {
        **state,
        "parsed_resume": parsed_resume,
        "parsed_jd":     parsed_jd,
        "progress":      _log({"progress": progress}, "Documents parsed successfully."),
    }

# ── Node 2 ────────────────────────────────────────────────────────────────────

def ats_score(state: AgentState) -> AgentState:
    progress = _log(state, "Running ATS keyword scoring...")

    score, keyword_map, gaps = compute_ats_score(
        state["parsed_resume"],
        state["parsed_jd"],
    )

    msg = f"ATS score: {score}/100. Missing {len(gaps)} keywords."
    return {
        **state,
        "ats_score":   score,
        "keyword_map": keyword_map,
        "gaps":        gaps,
        "progress":    _log({"progress": progress}, msg),
    }

# ── Node 3 ────────────────────────────────────────────────────────────────────

def rewrite_resume(state: AgentState) -> AgentState:
    iteration = state.get("iteration", 0) + 1
    progress  = _log(state, f"Rewriting resume (pass {iteration})...")
    target_score = state.get("target_score", 90)
    template_kind = state.get("template_kind", "sde").upper()

    prompt = f"""
You are an expert ATS resume optimizer and professional resume writer.

TASK: Rewrite the candidate's resume to score at least {target_score} on ATS for the target job.

STRICT RULES:
1. Never fabricate experience, companies, dates, or degrees. 
2. Only rephrase, restructure, and incorporate missing keywords naturally.
3. Use strong action verbs (Led, Built, Optimized, Architected, Reduced, etc.).
4. Quantify achievements where the original has numbers.
5. Incorporate ALL missing keywords from the gaps list naturally into existing bullets.
6. Keep the same overall structure: Summary → Skills → Experience → Education.
7. Tailor tone and wording for the selected template family: {template_kind}.
8. Make the output complete enough to render directly into a polished one-page or two-page resume PDF.

MISSING KEYWORDS TO INCORPORATE:
{json.dumps(state["gaps"], indent=2)}

TARGET ROLE: {state["parsed_jd"].get("role_title", "Not specified")}

ORIGINAL RESUME SECTIONS:
{json.dumps(state["parsed_resume"], indent=2)}

OUTPUT: Write the full rewritten resume as clean plain text, ready to turn into a final resume PDF.
Start directly with the resume content. No preamble, no explanation.
"""

    response = llm.invoke([HumanMessage(content=prompt)])

    return {
        **state,
        "rewritten_resume": response.content.strip(),
        "iteration":        iteration,
        "progress":         _log({"progress": progress}, f"Resume rewrite pass {iteration} complete."),
    }

# ── Node 4 ────────────────────────────────────────────────────────────────────

def suggest_additions(state: AgentState) -> AgentState:
    progress = _log(state, "Generating skill gap suggestions...")

    prompt = f"""
A candidate's resume has a large skill gap for this role.

TARGET ROLE: {state["parsed_jd"].get("role_title", "Not specified")}

MISSING SKILLS: {json.dumps(state["gaps"])}

CANDIDATE'S CURRENT SKILLS: {json.dumps(state["parsed_resume"].get("skills", []))}

Suggest 4-5 concrete, achievable things the candidate can add to their resume 
to become competitive for this role.

Return ONLY a valid JSON array, no markdown fences:
[
  {{
    "type": "project",
    "title": "Build a REST API with Node.js and PostgreSQL",
    "why": "Demonstrates backend skills and addresses the missing Node.js keyword directly"
  }},
  {{
    "type": "certification",
    "title": "AWS Cloud Practitioner",
    "why": "Adds cloud credential which appears 3 times in the JD"
  }}
]

Types allowed: "project", "certification", "course", "skill", "contribution"
"""

    response = llm.invoke([HumanMessage(content=prompt)])

    try:
        suggestions = _parse_json(response.content)
        if not isinstance(suggestions, list):
            suggestions = []
    except json.JSONDecodeError:
        suggestions = []

    return {
        **state,
        "suggestions": suggestions,
        "progress":    _log({"progress": progress}, f"Generated {len(suggestions)} suggestions."),
    }

# ── Node 5 ────────────────────────────────────────────────────────────────────

def verify_score(state: AgentState) -> AgentState:
    progress = _log(state, "Verifying final ATS score...")

    if not state.get("rewritten_resume"):
        # suggest_additions path — no rewrite happened
        return {
            **state,
            "final_score": state["ats_score"],
            "progress":    _log({"progress": progress}, "No rewrite done. Final score equals original."),
        }

    # Extract skills from the rewritten resume to re-score
    prompt = f"""
Extract all technical skills, tools, frameworks, and technologies 
mentioned in this resume text.
Return ONLY valid JSON, no markdown fences:
{{"skills": ["skill1", "skill2", ...]}}

RESUME:
{state["rewritten_resume"][:3000]}
"""

    response = llm.invoke([HumanMessage(content=prompt)])

    try:
        extracted  = _parse_json(response.content)
        new_skills = extracted.get("skills", [])
    except json.JSONDecodeError:
        new_skills = state["parsed_resume"].get("skills", [])

    updated_resume = {
        **state["parsed_resume"],
        "skills":  new_skills,
        "summary": state["rewritten_resume"][:500],   # treat first 500 chars as new summary for scoring
    }

    final_score, _, _ = compute_ats_score(updated_resume, state["parsed_jd"])

    msg = (
        f"Final ATS score: {final_score}/100 "
        f"(target {state.get('target_score', 90)}, was {state['ats_score']}/100)."
    )
    return {
        **state,
        "final_score": final_score,
        "progress":    _log({"progress": progress}, msg),
    }
