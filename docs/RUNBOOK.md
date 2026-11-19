# RUNBOOK — як запустити кожну лабораторну

Покрокові інструкції для відтворення всіх п'яти робіт на чистій машині.
Усі команди перевірені на Windows 11 + Docker Desktop, PowerShell.

---

## 0. Підготовка середовища (один раз)

### Що має бути встановлено

| Інструмент | Для чого | Як поставити |
|---|---|---|
| Docker Desktop | ЛР-1…ЛР-5 | <https://docs.docker.com/desktop/> |
| Git | усі роботи | `winget install Git.Git` |
| Node.js 20+ | локальні тести tasks-api | `winget install OpenJS.NodeJS.LTS` |
| GitHub CLI | ЛР-2, ЛР-5 | `winget install GitHub.cli` |
| minikube | ЛР-3…ЛР-5 | `winget install Kubernetes.minikube` |
| kubectl | ЛР-3…ЛР-5 | іде в складі Docker Desktop |
| Helm 3+ | ЛР-4, ЛР-5 | `winget install Helm.Helm` |
| Argo CD CLI | ЛР-5 | див. розділ ЛР-5 |

### PATH

winget ставить `helm` і `minikube` у каталоги, яких немає в `PATH` поточної
сесії. У репозиторії є скрипт, що це лагодить:

```powershell
cd C:\Users\Lenovo\DevOps-labs\taskflow
. .\tools\env.ps1
```

Він друкує, який інструмент де знайдено, і додає потрібні каталоги до `PATH`
**поточного вікна** (нічого системного не змінює).

### Зайняті порти

На цій машині вже працюють сторонні служби на портах `5432`, `8000` і `8080`,
тому проєкт опубліковано на інших портах хоста. Перевизначити можна у `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

---

## ЛР-1 — Віртуалізація та контейнеризація

**Що показуємо:** Dockerfile кожного сервісу, docker-compose, живий застосунок.

```powershell
cd C:\Users\Lenovo\DevOps-labs\taskflow

# 1. Зібрати та підняти весь стек
docker compose up -d --build

# 2. Переконатися, що всі 4 контейнери healthy (~30 секунд)
docker compose ps

# 3. Перевірити сервіси
curl.exe -s http://localhost:3000/version      # tasks-api
curl.exe -s http://localhost:3000/ready        # перевіряє з'єднання з БД
curl.exe -s http://localhost:8001/version      # analytics
curl.exe -s http://localhost:8001/api/analytics
curl.exe -s http://localhost:8090/version      # web

# 4. Відкрити інтерфейс
start http://localhost:8090
```

Показати тести:

```powershell
cd services\tasks-api
npm install
npm run lint
npm run test:unit

# інтеграційні — проти бази з compose
$env:DB_HOST='127.0.0.1'; $env:DB_PORT='55432'
$env:DB_USER='taskflow'; $env:DB_PASSWORD='taskflow_dev_pw'; $env:DB_NAME='taskflow'
npm run test:integration
cd ..\..

# analytics: лінт і тести всередині образу
docker build --target test services\analytics
```

Зупинити:

```powershell
docker compose down        # дані лишаються
docker compose down -v     # разом із базою
```

---

## ЛР-2 — Continuous Integration

**Що показуємо:** пайплайн у GitHub Actions, статуси в PR, образи в GHCR,
заблокований PR.

Нічого запускати локально не треба — пайплайн живе в репозиторії.

```powershell
# Подивитися список запусків
gh run list --limit 10

# Деталі останнього запуску
gh run view --log

# Відкрити у браузері
gh browse --branch main
```

Перевірити опубліковані образи:

```powershell
docker pull ghcr.io/<OWNER>/taskflow-tasks-api:latest
docker run --rm -e APP_VERSION=test ghcr.io/<OWNER>/taskflow-web:latest nginx -v
```

Показати захист гілки:

```powershell
gh api repos/<OWNER>/taskflow/branches/main/protection | ConvertFrom-Json
```

---

## ЛР-3 — Kubernetes

**Що показуємо:** кластер minikube, маніфести, життєвий цикл застосунку.

```powershell
cd C:\Users\Lenovo\DevOps-labs\taskflow
. .\tools\env.ps1

# 1. Підняти кластер
minikube start --driver=docker --cpus=4 --memory=6144
minikube addons enable metrics-server
minikube addons enable ingress

# 2. Перевірити вузол і системні поди
kubectl get nodes -o wide
kubectl get pods -n kube-system

# 3. Завантажити образи проєкту в кластер
minikube image load taskflow/tasks-api:1.0.0
minikube image load taskflow/analytics:1.0.0
minikube image load taskflow/web:1.0.0
minikube image load taskflow/web:1.1.0

# 4. Розгорнути все однією командою
kubectl apply -f k8s/

# 5. Дочекатися готовності
kubectl rollout status deployment/tasks-api -n taskflow
kubectl get all -n taskflow

# 6. Відкрити застосунок
minikube service web -n taskflow
```

Зупинити:

```powershell
kubectl delete -f k8s/
minikube stop
```

---

## ЛР-4 — Helm

**Що показуємо:** чарт, два середовища, життєвий цикл релізу.

```powershell
cd C:\Users\Lenovo\DevOps-labs\taskflow
. .\tools\env.ps1

# 1. Прибрати реліз ЛР-3, щоб не конфліктували імена
kubectl delete -f k8s/ --ignore-not-found

# 2. Перевірити чарт
helm lint ./chart
helm template taskflow ./chart --namespace taskflow | Select-Object -First 40

# 3. Порівняти середовища, нічого не встановлюючи
helm template taskflow ./chart -f chart/values-dev.yaml  > dev.yaml
helm template taskflow ./chart -f chart/values-prod.yaml > prod.yaml
Compare-Object (Get-Content dev.yaml) (Get-Content prod.yaml)

# 4. Встановити у власний namespace
helm upgrade --install taskflow ./chart `
  --namespace taskflow --create-namespace `
  -f chart/values-dev.yaml

# 5. Подивитися реліз
helm list -n taskflow
helm status taskflow -n taskflow
helm get values taskflow -n taskflow

# 6. Перевірити реліз
helm test taskflow -n taskflow

# 7. Оновити, подивитися історію, відкотити
helm upgrade taskflow ./chart -n taskflow -f chart/values-dev.yaml --set image.tag=1.1.0
helm history taskflow -n taskflow
helm rollback taskflow 1 -n taskflow

# 8. Видалити
helm uninstall taskflow -n taskflow
```

---

## ЛР-5 — GitOps з Argo CD

**Що показуємо:** Argo CD у кластері, App of Apps, реліз комітом, selfHeal,
Degraded, відкат через git revert.

```powershell
cd C:\Users\Lenovo\DevOps-labs\taskflow
. .\tools\env.ps1

# 1. Встановити Argo CD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl rollout status deployment/argocd-server -n argocd

# 2. Початковий пароль admin
kubectl -n argocd get secret argocd-initial-admin-secret `
  -o jsonpath="{.data.password}" | ForEach-Object {
    [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_))
  }

# 3. Відкрити інтерфейс
kubectl port-forward svc/argocd-server -n argocd 8081:443
# далі https://localhost:8081  (логін admin)

# 4. Застосувати кореневий Application (усе інше Argo CD візьме з Git)
kubectl apply -f ..\taskflow-gitops\bootstrap\root-app.yaml

# 5. Подивитися стан
argocd app list
argocd app get taskflow
```

Повний сценарій демонстрації (дрейф, selfHeal, Degraded, revert) —
у звіті [reports/lab5.md](../reports/lab5.md).

---

## Корисні дрібниці

### Зібрати нову версію образів

```powershell
$v = '1.2.0'
foreach ($s in 'tasks-api','analytics') {
  docker build --target runtime --build-arg "APP_VERSION=$v" -t "taskflow/${s}:$v" "services/$s"
}
docker build --build-arg "APP_VERSION=$v" -t "taskflow/web:$v" services/web
```

### Зібрати докази для звіту

```powershell
. .\tools\Capture.ps1
New-LabLog -Lab lab3 -Name 05-rollout -Title 'Оновлення Deployment'
Invoke-Capture 'kubectl rollout status deployment/tasks-api -n taskflow'

# перетворити логи на картинки-термінали
powershell -File .\tools\Render-Logs.ps1
```

### Повне прибирання

```powershell
docker compose down -v
minikube delete --all --purge
docker system prune -af
```
