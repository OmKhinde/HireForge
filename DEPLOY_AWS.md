**AWS Deploy**
Copy [.env.deploy.example](/home/shivansh/HireForge/.env.deploy.example:1) to `.env.deploy`, fill in the real secrets, then run:

```bash
docker compose up --build -d
```

This starts the full stack:
- `frontend`: public web app on port `80`
- `backend`: internal API
- `agent`: internal worker
- `mongo`: internal database

What changed in this setup:
- the browser now uses same-origin `/api` and `/ws`
- Nginx inside `frontend` proxies API and websocket traffic to `backend`
- only the `frontend` container is exposed publicly
- backend, worker, and mongo stay on the Docker network

On an EC2 box, the shortest path is:

```bash
git clone <your-repo>
cd HireForge
cp .env.deploy.example .env.deploy
# edit .env.deploy with real values
docker compose up --build -d
```

Then open:

```text
http://YOUR_EC2_PUBLIC_IP/
```

Notes:
- open inbound port `80` in the EC2 security group
- if you already use an ALB, point it at the EC2 instance on port `80`
- this compose file persists MongoDB in the `mongo_data` Docker volume
- for production durability, managed MongoDB is still better, but this gets you to a single-command deployment
