FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        texlive-latex-extra \
        texlive-fonts-recommended \
        texlive-plain-generic \
        fonts-lmodern \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY graph ./graph
COPY tools ./tools
COPY templates ./templates
COPY worker.py ./

CMD ["python", "worker.py"]
