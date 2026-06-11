import os
from dotenv import load_dotenv
load_dotenv()

from graph.graph import graph

test_state = {
    "job_id":           "test-001",
    "resume_text":      """
        John Doe | john@email.com
        
        SUMMARY
        Software developer with 3 years of experience building web applications.
        
        SKILLS
        Python, JavaScript, HTML, CSS, MySQL, Git
        
        EXPERIENCE
        Software Developer — Acme Corp (2021-2024)
        - Built web applications using Python and JavaScript
        - Managed MySQL databases
        - Worked with REST APIs
        
        EDUCATION
        B.Tech Computer Science — XYZ University (2021)
    """,
    "jd_text":          """
        Senior Backend Engineer — FinTech Startup
        
        Required Skills:
        Python, FastAPI, PostgreSQL, Redis, Docker, Kubernetes, AWS, REST APIs, 
        microservices, CI/CD, pytest, SQLAlchemy
        
        Nice to have:
        Kafka, gRPC, Terraform
        
        Responsibilities:
        - Design and build scalable microservices
        - Lead backend architecture decisions
        - Optimize database performance
    """,
    "parsed_resume":    {},
    "parsed_jd":        {},
    "ats_score":        0,
    "keyword_map":      {},
    "gaps":             [],
    "rewritten_resume": None,
    "suggestions":      [],
    "iteration":        0,
    "final_score":      None,
    "progress":         [],
}

print("Running agent...\n")
result = graph.invoke(test_state)

print(f"\n{'='*50}")
print(f"Original ATS Score : {result['ats_score']}/100")
print(f"Final ATS Score    : {result['final_score']}/100")
print(f"Iterations         : {result['iteration']}")
print(f"Gaps identified    : {len(result['gaps'])}")
print(f"Suggestions        : {len(result['suggestions'])}")
print(f"\nProgress log:")
for p in result['progress']:
    print(f"  → {p}")

if result.get('rewritten_resume'):
    print(f"\n--- REWRITTEN RESUME (first 500 chars) ---")
    print(result['rewritten_resume'][:500])

if result.get('suggestions'):
    print(f"\n--- SUGGESTIONS ---")
    for s in result['suggestions']:
        print(f"  [{s['type'].upper()}] {s['title']}")
        print(f"    Why: {s['why']}")
