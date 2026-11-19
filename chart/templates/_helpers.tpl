{{/*
Базове ім'я чарта. Можна перевизначити через nameOverride.
*/}}
{{- define "taskflow.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Повне ім'я релізу. Саме з нього будуються імена всіх об'єктів,
щоб чарт можна було встановити двічі в один кластер.
*/}}
{{- define "taskflow.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Ім'я об'єкта конкретного компонента: <fullname>-<component>.
Виклик: {{ include "taskflow.componentName" (dict "root" . "component" "tasks-api") }}
*/}}
{{- define "taskflow.componentName" -}}
{{- printf "%s-%s" (include "taskflow.fullname" .root) .component | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "taskflow.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Спільні мітки — ставляться на кожен об'єкт чарта.
*/}}
{{- define "taskflow.labels" -}}
helm.sh/chart: {{ include "taskflow.chart" . }}
{{ include "taskflow.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Мітки-селектори рівня релізу.
*/}}
{{- define "taskflow.selectorLabels" -}}
app.kubernetes.io/name: {{ include "taskflow.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Повний набір міток для компонента.
Виклик: {{ include "taskflow.componentLabels" (dict "root" . "component" "web") }}
*/}}
{{- define "taskflow.componentLabels" -}}
{{ include "taskflow.labels" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Мітки-селектори для компонента: саме за ними Deployment знаходить свої поди,
а Service — свої поди.
*/}}
{{- define "taskflow.componentSelectorLabels" -}}
{{ include "taskflow.selectorLabels" .root }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Повна назва образу сервісу: [registry/]repository:tag
Виклик: {{ include "taskflow.image" (dict "root" . "svc" .Values.web) }}
*/}}
{{- define "taskflow.image" -}}
{{- $registry := .root.Values.image.registry -}}
{{- $tag := default .root.Values.image.tag .svc.image.tag -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry .svc.image.repository $tag -}}
{{- else -}}
{{- printf "%s:%s" .svc.image.repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Ім'я ConfigMap і Secret релізу.
*/}}
{{- define "taskflow.configMapName" -}}
{{- printf "%s-config" (include "taskflow.fullname" .) }}
{{- end }}

{{- define "taskflow.secretName" -}}
{{- printf "%s-secret" (include "taskflow.fullname" .) }}
{{- end }}

{{/*
DNS-ім'я сервісу бази даних усередині кластера.
*/}}
{{- define "taskflow.postgresHost" -}}
{{- include "taskflow.componentName" (dict "root" . "component" "postgres") }}
{{- end }}
