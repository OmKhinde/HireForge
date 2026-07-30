import re

# ── Canonical aliases for common tech terms ────────────────────────────────────
# Each group lists alternate names for the same skill. When searching for any
# member, all variants in the group are tried.
_ALIAS_GROUPS = [
    ["javascript", "js"],
    ["typescript", "ts"],
    ["python", "python3"],
    ["node.js", "nodejs", "node"],
    ["react", "react.js", "reactjs"],
    ["next.js", "nextjs"],
    ["vue.js", "vuejs", "vue"],
    ["angular", "angularjs"],
    ["express", "express.js", "expressjs"],
    ["postgresql", "postgres", "psql"],
    ["mongodb", "mongo"],
    ["kubernetes", "k8s"],
    ["docker", "docker-compose", "docker compose"],
    ["amazon web services", "aws"],
    ["google cloud platform", "gcp"],
    ["microsoft azure", "azure"],
    ["ci/cd", "ci cd", "cicd"],
    ["machine learning", "ml"],
    ["artificial intelligence", "ai"],
    ["natural language processing", "nlp"],
    ["graphql", "graph ql"],
    ["rest api", "rest apis", "restful"],
    ["terraform", "tf"],
    ["redis", "redis cache"],
    ["rabbitmq", "rabbit mq"],
    ["apache kafka", "kafka"],
    [".net", "dotnet", "dot net"],
    ["c++", "cpp"],
    ["c#", "csharp", "c sharp"],
]

# Build a lookup: lowercase skill name → set of all aliases (including itself)
_ALIAS_MAP: dict[str, set[str]] = {}
for group in _ALIAS_GROUPS:
    normalized = set(s.lower() for s in group)
    for name in normalized:
        _ALIAS_MAP[name] = normalized


def _keyword_found(kw: str, resume_blob: str) -> bool:
    """Check if keyword or any of its known aliases appear in the resume text."""
    candidates = _ALIAS_MAP.get(kw, {kw})
    for variant in candidates:
        if re.search(r'(?<!\w)' + re.escape(variant) + r'(?!\w)', resume_blob):
            return True
    return False


def compute_ats_score(parsed_resume: dict, parsed_jd: dict) -> tuple[int, dict, list]:
    """
    Deterministic ATS scoring. No LLM needed here — keeps costs at zero.

    Weights:
      required_skills  → 60 pts
      nice_to_have     → 20 pts
      format checks    → 20 pts
    """
    required = [s.lower().strip() for s in parsed_jd.get("required_skills", [])]
    nice_raw = [s.lower().strip() for s in parsed_jd.get("nice_to_have",     [])]
    # Deduplicate: if a skill appears in both lists, only count it under required
    required_set = set(required)
    nice = [s for s in nice_raw if s not in required_set]

    # Build a single searchable string from the entire resume
    experience_text = " ".join(
        " ".join(exp.get("bullets", []))
        for exp in parsed_resume.get("experience", [])
    )
    # Serialize education list-of-dicts into searchable text
    education_text = " ".join(
        f"{edu.get('degree', '')} {edu.get('institution', '')} {edu.get('year', '')}"
        for edu in parsed_resume.get("education", [])
    )
    resume_blob = " ".join([
        " ".join(parsed_resume.get("skills", [])),
        experience_text,
        parsed_resume.get("summary", ""),
        education_text,
    ]).lower()

    keyword_map: dict[str, str] = {}
    matched_required = 0
    matched_nice     = 0

    for kw in required:
        found = _keyword_found(kw, resume_blob)
        keyword_map[kw] = "present" if found else "missing"
        if found:
            matched_required += 1

    for kw in nice:
        found = _keyword_found(kw, resume_blob)
        keyword_map[kw] = "present" if found else "missing"
        if found:
            matched_nice += 1

    # Format quality checks
    format_score = 100
    if len(parsed_resume.get("experience", [])) == 0:
        format_score -= 30
    if not parsed_resume.get("summary", "").strip():
        format_score -= 15
    if len(parsed_resume.get("skills", [])) < 5:
        format_score -= 15
    if len(experience_text.split()) < 50:          # very thin experience section
        format_score -= 10
    format_score = max(format_score, 0)

    req_pct  = matched_required / max(len(required), 1)
    nice_pct = matched_nice     / max(len(nice),     1)

    total = int(req_pct * 60 + nice_pct * 20 + (format_score / 100) * 20)
    total = min(total, 100)

    gaps = [kw for kw, status in keyword_map.items() if status == "missing"]
    return total, keyword_map, gaps