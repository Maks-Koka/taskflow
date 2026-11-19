# TaskFlow

Навчальний мікросервісний застосунок для циклу лабораторних робіт з предмету
**«Технології DevOps»**. Один і той самий проєкт проходить через усі п'ять робіт:
контейнеризація → CI → Kubernetes → Helm → GitOps.

---

## Зміст

- [Що це за застосунок](#що-це-за-застосунок)
- [Архітектура](#архітектура)
- [Швидкий старт](#швидкий-старт)
- [Змінні середовища](#змінні-середовища)
- [API](#api)
- [Тести та лінтери](#тести-та-лінтери)
- [Лабораторні роботи](#лабораторні-роботи)

---

## Що це за застосунок

**TaskFlow** — трекер завдань. Користувач додає завдання, позначає їх виконаними,
бачить статистику. Застосунок навмисно розбитий на кілька частин, щоб задовольняти
вимоги всіх п'яти лабораторних:

| Вимога ЛР-1 | Як виконано |
|---|---|
| Веб-застосунок, що взаємодіє з базою даних | `tasks-api` ↔ PostgreSQL |
| Містить юніт- або інтеграційні тести | 17 юніт-тестів (Jest), 11 інтеграційних (Jest + реальна БД), 19 тестів Python (pytest) |
| Складається з декількох частин (мікросервіси) | 3 власні сервіси + БД |
| Dockerfile для кожної частини | `services/*/Dockerfile` |
| docker-compose, що піднімає все | `docker-compose.yml` |

---

## Архітектура

```
                    ┌──────────────────────────┐
   браузер  ───────▶│  web  (nginx :8080)      │
                    │  статика + reverse proxy │
                    └───────┬──────────┬───────┘
                            │          │
              /api/tasks    │          │   /api/analytics
                            ▼          ▼
         ┌──────────────────────┐   ┌─────────────────────────┐
         │ tasks-api  :3000     │◀──│ analytics  :8000        │
         │ Node.js 20 + Express │   │ Python 3.12 + FastAPI   │
         └──────────┬───────────┘   └─────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ postgres :5432       │
         │ PostgreSQL 16        │
         └──────────────────────┘
```

| Сервіс | Стек | Порт у мережі | Роль |
|---|---|---|---|
| `web` | nginx 1.27 | 8080 | Віддає SPA і проксує запити до API (жодного CORS у браузері) |
| `tasks-api` | Node.js 20, Express 4, pg | 3000 | CRUD завдань, зберігає їх у PostgreSQL |
| `analytics` | Python 3.12, FastAPI | 8000 | Читає завдання з `tasks-api` і рахує статистику |
| `postgres` | PostgreSQL 16 | 5432 | Сховище завдань |

Кожен сервіс має три службові ендпоінти:

- `GET /health` — **liveness**: процес живий, зовнішні залежності не перевіряються;
- `GET /ready` — **readiness**: сервіс готовий приймати трафік (БД / upstream відповідають);
- `GET /version` — версія збірки; використовується в ЛР-5, щоб довести, що Argo CD
  справді перерозгорнув новий образ.

---

## Швидкий старт

Потрібно: **Docker Desktop** (або Docker Engine + Compose v2).

```bash
git clone <URL цього репозиторію>
cd taskflow
cp .env.example .env        # за бажанням; без нього беруться значення за замовчуванням
docker compose up -d --build
```

Через ~30 секунд:

| Що | Адреса |
|---|---|
| Веб-інтерфейс | <http://localhost:8090> |
| tasks-api | <http://localhost:3000/version> |
| analytics | <http://localhost:8001/version> |
| PostgreSQL | `localhost:55432` |

Перевірка, що все піднялося:

```bash
docker compose ps
```

Усі чотири сервіси мають бути у стані `Up (healthy)`.

Зупинити:

```bash
docker compose down          # зупинити, дані лишаються у volume
docker compose down -v       # зупинити і стерти базу
```

> **Чому нестандартні порти на хості.** База винесена на `55432`, бо на машині
> розробника вже слухає локальний PostgreSQL на `5432`; `web` — на `8090`, а
> `analytics` — на `8001` з тієї ж причини. Усередині мережі Docker порти звичайні
> (5432 / 8080 / 8000). Усі порти хоста перевизначаються змінними у `.env`.

---

## Змінні середовища

Файл `.env.example` — шаблон. Скопіюйте його в `.env` і змініть за потреби.

| Змінна | За замовчуванням | Призначення |
|---|---|---|
| `APP_VERSION` | `1.0.0` | Версія, яку віддають `/version` усіх сервісів і тег образів |
| `DB_USER` | `taskflow` | Користувач PostgreSQL |
| `DB_PASSWORD` | `taskflow_dev_pw` | Пароль PostgreSQL (тільки для локальної розробки) |
| `DB_NAME` | `taskflow` | Назва бази |
| `DB_PORT_HOST` | `55432` | Порт БД на хості |
| `TASKS_API_PORT_HOST` | `3000` | Порт `tasks-api` на хості |
| `ANALYTICS_PORT_HOST` | `8001` | Порт `analytics` на хості |
| `WEB_PORT_HOST` | `8090` | Порт веб-інтерфейсу на хості |
| `INTERNAL_TOKEN` | `dev-internal-token` | Демонстраційний «секрет» для `analytics` (у K8s приїжджає зі `Secret`) |

Параметри поведінки застосунку (у ЛР-3 приїжджають із `ConfigMap`):

| Змінна | Сервіс | За замовчуванням | Дія |
|---|---|---|---|
| `MAX_TITLE_LENGTH` | tasks-api | `120` | Максимальна довжина назви завдання |
| `FEATURE_STATS` | tasks-api | `true` | Вмикає ендпоінт `/api/tasks/summary` |
| `SHOW_PRIORITY_BREAKDOWN` | analytics | `true` | Додає розбивку за пріоритетами у відповідь |
| `TASKS_API_URL` | analytics | `http://tasks-api:3000` | Адреса upstream-сервісу |

---

## API

### tasks-api (`:3000`)

| Метод | Шлях | Опис |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness (перевіряє БД) |
| `GET` | `/version` | Версія + активна конфігурація |
| `GET` | `/api/tasks` | Список завдань |
| `GET` | `/api/tasks/:id` | Одне завдання |
| `GET` | `/api/tasks/summary` | Зведення (вимикається через `FEATURE_STATS`) |
| `POST` | `/api/tasks` | Створити: `{ "title": "...", "priority": 1..3, "done": false }` |
| `PUT` | `/api/tasks/:id` | Оновити |
| `DELETE` | `/api/tasks/:id` | Видалити |

### analytics (`:8000`)

| Метод | Шлях | Опис |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/ready` | Readiness (перевіряє `tasks-api`) |
| `GET` | `/version` | Версія + активна конфігурація |
| `GET` | `/api/analytics` | Агрегована статистика |
| `GET` | `/docs` | Swagger UI (генерує FastAPI) |

### web (`:8080`)

Віддає статику і проксує: `/api/tasks*` → tasks-api, `/api/analytics` → analytics,
`/api/version/{tasks,analytics}` → `/version` відповідного сервісу.

Приклад:

```bash
curl -s http://localhost:3000/version
curl -s -X POST http://localhost:3000/api/tasks \
     -H 'Content-Type: application/json' \
     -d '{"title":"Здати лабораторну","priority":1}'
curl -s http://localhost:8001/api/analytics
```

---

## Тести та лінтери

### tasks-api

```bash
cd services/tasks-api
npm install
npm run lint              # ESLint 9, flat config, --max-warnings=0
npm run test:unit         # 17 юніт-тестів, без БД
npm run test:integration  # 11 інтеграційних тестів, потрібна жива БД
```

Для інтеграційних тестів підніміть базу і вкажіть їй адресу:

```bash
docker compose up -d postgres
DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=taskflow \
DB_PASSWORD=taskflow_dev_pw DB_NAME=taskflow npm run test:integration
```

### analytics

```bash
cd services/analytics
pip install -r requirements-dev.txt
ruff check .              # лінтер
pytest -q                 # 19 тестів; upstream підміняється моком respx
```

Те саме можна зробити без локального Python — стадія `test` в образі робить
і лінт, і тести:

```bash
docker build --target test services/analytics
docker build --target test services/tasks-api
```

---

## Лабораторні роботи

| № | Тема | Де дивитися |
|---|---|---|
| 1 | Віртуалізація та контейнеризація | `services/*/Dockerfile`, `docker-compose.yml`, [звіт](reports/lab1.md) |
| 2 | Continuous Integration | `.github/workflows/`, [звіт](reports/lab2.md) |
| 3 | Розгортання в Kubernetes | `k8s/`, [звіт](reports/lab3.md) |
| 4 | Пакування в Helm-чарт | `chart/`, [звіт](reports/lab4.md) |
| 5 | GitOps через Argo CD | репозиторій `taskflow-gitops`, [звіт](reports/lab5.md) |

Інструкції із запуску кожної роботи — у файлі [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

## Структура репозиторію

```
taskflow/
├── services/
│   ├── tasks-api/        Node.js + Express + PostgreSQL
│   ├── analytics/        Python + FastAPI
│   └── web/              nginx: статика + reverse proxy
├── k8s/                  Маніфести Kubernetes (ЛР-3)
├── chart/                Helm-чарт (ЛР-4)
├── .github/workflows/    Пайплайни CI (ЛР-2)
├── docs/                 RUNBOOK та додаткова документація
├── reports/              Звіти, логи команд і скріншоти
├── tools/                Допоміжні скрипти для збору доказів
└── docker-compose.yml    Повний стек одним файлом (ЛР-1)
```
