import re

def compute_ats_score(parsed_resume: dict, parsed_jd: dict) -> tuple[int, dict, list]:
    """
    Deterministic ATS scoring. No LLM needed here — keeps costs at zero.

    Weights:
      required_skills  → 60 pts
      nice_to_have     → 20 pts
      format checks    → 20 pts
    """
    required = [s.lower().strip() for s in parsed_jd.get("required_skills", [])]
    nice     = [s.lower().strip() for s in parsed_jd.get("nice_to_have",     [])]

    # Build a single searchable string from the entire resume
    experience_text = " ".join(
        " ".join(exp.get("bullets", []))
        for exp in parsed_resume.get("experience", [])
    )
    resume_blob = " ".join([
        " ".join(parsed_resume.get("skills", [])),
        experience_text,
        parsed_resume.get("summary", ""),
        parsed_resume.get("education_text", ""),
    ]).lower()

    keyword_map: dict[str, str] = {}
    matched_required = 0
    matched_nice     = 0

    for kw in required:
        # match whole word or compound phrase
        found = bool(re.search(r'\b' + re.escape(kw) + r'\b', resume_blob))
        keyword_map[kw] = "present" if found else "missing"
        if found:
            matched_required += 1

    for kw in nice:
        found = bool(re.search(r'\b' + re.escape(kw) + r'\b', resume_blob))
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