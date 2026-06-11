from typing import TypedDict, Optional

class AgentState(TypedDict):
    job_id:           str
    resume_text:      str
    jd_text:          str
    template_kind:    str
    target_score:     int
    parsed_resume:    dict
    parsed_jd:        dict
    ats_score:        int
    keyword_map:      dict
    gaps:             list
    rewritten_resume: Optional[str]
    rendered_resume_text: Optional[str]
    suggestions:      list
    iteration:        int
    final_score:      Optional[int]
    progress:         list        # list of progress messages pushed to WS
