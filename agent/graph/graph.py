from langgraph.graph import StateGraph, END
from .state  import AgentState
from .nodes  import parse_documents, ats_score, rewrite_resume, suggest_additions, verify_score
from .edges  import route_after_score, route_after_verify

def build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    # Register nodes
    g.add_node("parse_documents",   parse_documents)
    g.add_node("ats_score",         ats_score)
    g.add_node("rewrite_resume",    rewrite_resume)
    g.add_node("suggest_additions", suggest_additions)
    g.add_node("verify_score",      verify_score)

    # Entry point
    g.set_entry_point("parse_documents")

    # Fixed edges
    g.add_edge("parse_documents", "ats_score")

    # Conditional branch after scoring
    g.add_conditional_edges(
        "ats_score",
        route_after_score,
        {
            "rewrite": "rewrite_resume",
            "suggest": "suggest_additions",
            "done":    "verify_score",
        },
    )

    # Both paths converge at verify_score
    g.add_edge("rewrite_resume",    "verify_score")
    g.add_edge("suggest_additions", "verify_score")

    # Conditional loop or end after verify
    g.add_conditional_edges(
        "verify_score",
        route_after_verify,
        {
            "rewrite": "rewrite_resume",
            "done":    END,
        },
    )

    return g.compile()

graph = build_graph()