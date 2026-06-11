import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import boto3
import fitz  # PyMuPDF
import pymongo
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH, override=True)

from graph.graph import graph

REQUIRED_ENV = [
    "MONGODB_URI",
    "AWS_REGION",
    "S3_BUCKET",
    "SQS_QUEUE_URL",
    "GROQ_API_KEY",
    "GROQ_MODEL",
]

missing_env = [name for name in REQUIRED_ENV if not os.environ.get(name, "").strip()]
if missing_env:
    print(f"[worker] Missing env vars: {', '.join(missing_env)}")
    sys.exit(1)


def _aws_client_kwargs():
    kwargs = {"region_name": os.environ["AWS_REGION"]}
    access_key_id = os.environ.get("AWS_ACCESS_KEY_ID", "").strip()
    secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip()

    if access_key_id and secret_access_key:
        kwargs["aws_access_key_id"] = access_key_id
        kwargs["aws_secret_access_key"] = secret_access_key

    return kwargs

sqs = boto3.client(
    "sqs",
    **_aws_client_kwargs(),
)
s3 = boto3.client(
    "s3",
    **_aws_client_kwargs(),
)

DB_NAME = os.environ.get("MONGODB_DB", "resumeforge")
mongo = pymongo.MongoClient(os.environ["MONGODB_URI"])
db = mongo[DB_NAME]
jobs = db["jobs"]

QUEUE_URL = os.environ["SQS_QUEUE_URL"]
BUCKET = os.environ["S3_BUCKET"]
LATEX_TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "shivansh_one_page_resume.tex"

llm = ChatGroq(
    model=os.environ["GROQ_MODEL"],
    temperature=0.2,
    max_tokens=4096,
)


def extract_text_from_s3(s3_key: str) -> str:
    obj = s3.get_object(Bucket=BUCKET, Key=s3_key)
    pdf = fitz.open(stream=obj["Body"].read(), filetype="pdf")
    return "\n".join(page.get_text() for page in pdf)


def set_status(job_id: str, status: str, extra: dict = {}):
    jobs.update_one({"_id": job_id}, {"$set": {"status": status, **extra}})


def _parse_json(text: str):
    clean = text.replace("```json", "").replace("```", "").strip()
    start = clean.find("{")
    end = clean.rfind("}")
    if start != -1 and end != -1 and end > start:
        clean = clean[start:end + 1]
    return json.loads(clean)


def _latex_escape(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in (value or ""))


def _compact(items, limit):
    return [item for item in items if item][:limit]


def _load_latex_template() -> str:
    return LATEX_TEMPLATE_PATH.read_text(encoding="utf-8")


def build_resume_document(resume_text: str, source_resume_text: str, template_kind: str) -> dict:
    prompt = f"""
Convert the resume below into structured JSON for a one-page LaTeX resume.
Return ONLY valid JSON. Do not include markdown fences.

TEMPLATE FAMILY: {template_kind}

JSON FORMAT:
{{
  "name": "Candidate name",
  "phone": "phone or empty string",
  "email": "email or empty string",
  "linkedin": "linkedin url or empty string",
  "github": "github url or empty string",
  "education": [
    {{
      "institution": "Institute",
      "date": "Aug 2023 -- May 2027",
      "degree": "Degree",
      "detail": "CGPA or equivalent"
    }}
  ],
  "skill_groups": [
    {{
      "label": "AI / GenAI",
      "items": ["LLMs", "RAG", "Prompt Engineering"]
    }}
  ],
  "projects": [
    {{
      "url": "https://...",
      "title": "Project title",
      "date": "2026",
      "stack": "Python | LangChain | ...",
      "bullets": ["bullet", "bullet"]
    }}
  ],
  "achievements": [
    {{
      "text": "achievement line"
    }}
  ]
}}

RULES:
- Preserve truth from the resume. Never fabricate missing facts.
- If a field is unknown, use an empty string or empty list.
- Optimize for one page only.
- Keep at most 1 education item, 6 skill groups, 3 projects, 2 bullets per project, and 4 achievements.
- Bullets must be concise, ATS-strong, and quantifiable when the source supports that.
- Reflect the target JD keywords naturally, but never invent experience.

REWRITTEN RESUME:
{resume_text}

ORIGINAL SOURCE RESUME:
{source_resume_text[:5000]}
"""

    response = llm.invoke([HumanMessage(content=prompt)])

    try:
        document = _parse_json(response.content)
        if isinstance(document, dict):
            document["education"] = _compact(document.get("education", []), 1)
            document["skill_groups"] = _compact(document.get("skill_groups", []), 6)
            document["projects"] = _compact(document.get("projects", []), 3)
            for project in document["projects"]:
                project["bullets"] = _compact(project.get("bullets", []), 2)
            document["achievements"] = _compact(document.get("achievements", []), 4)
            return document
    except Exception:
        pass

    return {
        "name": "Candidate Resume",
        "phone": "",
        "email": "",
        "linkedin": "",
        "github": "",
        "education": [],
        "skill_groups": [],
        "projects": [],
        "achievements": [],
    }


def build_resume_latex(document: dict) -> str:
    template = _load_latex_template()
    name = _latex_escape(document.get("name") or "Candidate Resume")
    phone = document.get("phone") or ""
    email = document.get("email") or ""
    linkedin = document.get("linkedin") or ""
    github = document.get("github") or ""

    header_parts = []
    if phone:
        header_parts.append(rf"\href{{tel:{phone}}}{{{_latex_escape(phone)}}}")
    if email:
        header_parts.append(rf"\href{{mailto:{email}}}{{{_latex_escape(email)}}}")
    if linkedin:
        header_parts.append(
            rf"\href{{{linkedin}}}{{{_latex_escape(linkedin.replace('https://', '').replace('http://', ''))}}}"
        )
    if github:
        header_parts.append(
            rf"\href{{{github}}}{{{_latex_escape(github.replace('https://', '').replace('http://', ''))}}}"
        )

    header_line = r"\enspace\textbar\enspace".join(header_parts)

    education_block = ""
    if document.get("education"):
        edu = document["education"][0]
        education_block = rf"""\section{{Education}}
\resumeSubheading
  {{{_latex_escape(edu.get("institution", ""))}}}{{{_latex_escape(edu.get("date", ""))}}}
  {{{_latex_escape(edu.get("degree", ""))}}}{{{_latex_escape(edu.get("detail", ""))}}}

\vspace{{2pt}}
"""

    skill_rows = []
    for group in document.get("skill_groups", []):
        label = _latex_escape(group.get("label", "Skills"))
        items = _latex_escape(", ".join(group.get("items", [])))
        if items:
            skill_rows.append(rf"  \small\textbf{{{label}}} & \small {items} \\[2pt]")

    skills_block = ""
    if skill_rows:
        final_rows = skill_rows[:-1]
        final_rows.append(skill_rows[-1].replace(r"\\[2pt]", r"\\"))
        skills_block = "\\section{Technical Skills}\n\\begin{tabular*}{\\textwidth}{@{}l@{\\hskip 6pt}l}\n"
        skills_block += "\n".join(final_rows)
        skills_block += "\n\\end{tabular*}\n\n\\vspace{2pt}\n"

    project_chunks = []
    for project in document.get("projects", []):
        bullets = "\n".join(
            rf"  \resumeItem{{{_latex_escape(bullet)}}}"
            for bullet in project.get("bullets", [])
            if bullet
        )
        project_chunks.append(rf"""\projectHeading
  {{{project.get("url", "")}}}
  {{{_latex_escape(project.get("title", ""))}}}
  {{{_latex_escape(project.get("date", ""))}}}
\projectStack{{{_latex_escape(project.get("stack", ""))}}}
\begin{{itemize}}
{bullets}
\end{{itemize}}

\vspace{{2pt}}
""")

    projects_block = ""
    if project_chunks:
        projects_block = "\\section{Projects}\n\n" + "\n".join(project_chunks)

    achievement_items = "\n".join(
        rf"  \resumeItem{{{_latex_escape(item.get('text', ''))}}}"
        for item in document.get("achievements", [])
        if item.get("text")
    )
    achievements_block = ""
    if achievement_items:
        achievements_block = rf"""\section{{Achievements \& Certifications}}
\begin{{itemize}}
{achievement_items}
\end{{itemize}}
"""
    return (
        template
        .replace("<<NAME>>", name)
        .replace("<<HEADER_LINE>>", header_line or r"\mbox{}")
        .replace("<<EDUCATION_BLOCK>>", education_block or "% No education data")
        .replace("<<SKILLS_BLOCK>>", skills_block or "% No skills data")
        .replace("<<PROJECTS_BLOCK>>", projects_block or "% No projects data")
        .replace("<<ACHIEVEMENTS_BLOCK>>", achievements_block or "% No achievements data")
    )


def compile_latex_to_pdf(latex_source: str) -> bytes:
    engine = next(
        (candidate for candidate in ("pdflatex", "xelatex", "lualatex", "tectonic") if shutil.which(candidate)),
        None,
    )

    if not engine:
        raise RuntimeError("No LaTeX compiler installed on the worker.")

    with tempfile.TemporaryDirectory(prefix="resume-tex-") as temp_dir:
        temp_path = Path(temp_dir)
        tex_path = temp_path / "resume.tex"
        tex_path.write_text(latex_source, encoding="utf-8")
        tex_env = os.environ.copy()
        tex_env["TEXMFVAR"] = str(temp_path / ".texmf-var")
        tex_env["TEXMFCONFIG"] = str(temp_path / ".texmf-config")
        tex_env["TEXMFHOME"] = str(temp_path / ".texmf-home")

        if engine == "tectonic":
            command = [engine, "--keep-logs", "--outdir", str(temp_path), str(tex_path)]
        else:
            command = [
                engine,
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-output-directory",
                str(temp_path),
                str(tex_path),
            ]

        result = subprocess.run(
            command,
            cwd=temp_path,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
            env=tex_env,
        )

        pdf_path = temp_path / "resume.pdf"
        if result.returncode != 0 or not pdf_path.exists():
            stderr = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(stderr[-1200:] or "LaTeX compilation failed.")

        return pdf_path.read_bytes()


def process_job(job_id: str):
    print(f"[worker] Processing job {job_id}")
    job = jobs.find_one({"_id": job_id})
    if not job:
        print(f"[worker] Job {job_id} not found in DB — skipping")
        return

    set_status(job_id, "processing")

    try:
        resume_text = extract_text_from_s3(job["resumeS3Key"])
    except Exception as error:
        set_status(job_id, "failed", {"errorMessage": f"PDF extraction failed: {error}"})
        return

    initial_state = {
        "job_id": job_id,
        "resume_text": resume_text,
        "jd_text": job["jdText"],
        "template_kind": job.get("templateKind", "sde"),
        "target_score": job.get("targetScore", 90),
        "parsed_resume": {},
        "parsed_jd": {},
        "ats_score": 0,
        "keyword_map": {},
        "gaps": [],
        "rewritten_resume": None,
        "rendered_resume_text": None,
        "suggestions": [],
        "iteration": 0,
        "final_score": None,
        "progress": [],
    }

    try:
        result = graph.invoke(initial_state)
    except Exception as error:
        set_status(job_id, "failed", {"errorMessage": f"Agent error: {error}"})
        print(f"[worker] Agent failed for {job_id}: {error}")
        return

    final_resume_text = result.get("rewritten_resume") or resume_text
    generated_resume_key = None
    generated_resume_tex = None

    try:
        resume_document = build_resume_document(
            final_resume_text,
            resume_text,
            job.get("templateKind", "sde"),
        )
        generated_resume_tex = build_resume_latex(resume_document)
        pdf_bytes = compile_latex_to_pdf(generated_resume_tex)
        generated_resume_key = f"generated-resumes/{job['userId']}/{job_id}.pdf"
        s3.put_object(
            Bucket=BUCKET,
            Key=generated_resume_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )
        result["rendered_resume_text"] = json.dumps(resume_document)
        result["progress"] = result.get("progress", []) + ["Generated final resume PDF from the LaTeX template."]
    except Exception as error:
        result["progress"] = result.get("progress", []) + [f"LaTeX PDF generation failed: {error}"]

    set_status(
        job_id,
        "done",
        {
            "originalScore": result["ats_score"],
            "finalScore": result["final_score"],
            "rewrittenResume": result.get("rewritten_resume"),
            "renderedResumeText": result.get("rendered_resume_text"),
            "generatedResumeTex": generated_resume_tex,
            "generatedResumeS3Key": generated_resume_key,
            "gaps": result["gaps"],
            "suggestions": result["suggestions"],
            "keywordMap": result["keyword_map"],
            "iterations": result["iteration"],
            "templateKind": job.get("templateKind", "sde"),
            "targetScore": job.get("targetScore", 90),
            "progress": result.get("progress", []),
        },
    )

    print(f"[worker] Job {job_id} done. Score: {result['ats_score']} → {result['final_score']}")


def poll():
    print(f"[worker] Loaded env from {ENV_PATH}")
    print(f"[worker] Mongo database: {DB_NAME}")
    print(f"[worker] Started. Polling SQS for jobs on {QUEUE_URL}")
    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,
            )
            messages = response.get("Messages", [])

            if not messages:
                continue

            print(f"[worker] Received {len(messages)} message(s)")
            for message in messages:
                body = json.loads(message["Body"])
                job_id = body["jobId"]

                try:
                    process_job(job_id)
                except Exception as error:
                    print(f"[worker] Unhandled error for {job_id}: {error}")
                    set_status(job_id, "failed", {"errorMessage": str(error)})
                finally:
                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=message["ReceiptHandle"],
                    )

        except KeyboardInterrupt:
            print("\n[worker] Shutting down.")
            sys.exit(0)
        except Exception as error:
            print(f"[worker] SQS error: {error} — retrying in 5s")
            time.sleep(5)


if __name__ == "__main__":
    poll()
