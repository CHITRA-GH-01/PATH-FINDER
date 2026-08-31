# PathWise AI — AI-Powered Personalized Learning Path Recommender

A full-stack SIH prototype for personalized, prerequisite-aware and adaptive learning paths.

## Architecture

React frontend -> Node.js/Express backend -> MySQL
                              |
                              -> Python/FastAPI AI recommendation engine

## Features

- Learner profile
- Natural-language goal input
- Skill-gap analysis
- Prerequisite-aware roadmap generation
- Course/project/assessment recommendations
- Explainable recommendations
- Assessment-driven adaptation
- Progress dashboard

## Requirements

- Node.js 18+
- Python 3.10+
- MySQL 8+

## 1. Database

Create the database and seed data:

```bash
mysql -u root -p < database/schema.sql
```

## 2. AI engine

```bash
cd ai-engine
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## 3. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Linux/macOS:
```bash
cp .env.example .env
npm run dev
```

Default backend: http://localhost:5000

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend: http://localhost:5173

## Environment

Backend `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pathwise_ai
AI_ENGINE_URL=http://localhost:8000
```

Frontend can use Vite's proxy to call `/api`.

## Demo flow

1. Open the frontend.
2. Create/select a learner profile.
3. Enter a goal such as "Become an AI/ML engineer".
4. Generate a roadmap.
5. Inspect skill gaps and explanations.
6. Mark a milestone complete or submit an assessment.
7. Regenerate the roadmap to demonstrate adaptation.

## Notes

This prototype intentionally keeps recommendation logic deterministic and explainable. An LLM can later be connected to the conversational assistant without allowing it to override prerequisite and recommendation rules.
