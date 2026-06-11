from .state import AgentState

GAP_THRESHOLD  = 40    # below this, rewriting alone won't save them → suggest instead
MAX_ITERATIONS = 3     # max rewrite loops before we accept the result

def route_after_score(state: AgentState) -> str:
    score = state["ats_score"]
    target = state.get("target_score", 90)
    if score >= target:
        return "done"       # already good — skip straight to verify
    if score < GAP_THRESHOLD:
        return "suggest"    # gap too large — advise what to add
    return "rewrite"        # rewrite can close the gap

def route_after_verify(state: AgentState) -> str:
    final     = state.get("final_score", 0)
    iteration = state.get("iteration",   0)
    target    = state.get("target_score", 90)

    if final >= target:
        return "done"
    if iteration >= MAX_ITERATIONS:
        return "done"       # hit iteration cap — ship what we have
    return "rewrite"        # loop back for another pass
