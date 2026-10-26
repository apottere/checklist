#!/bin/bash
# One-time Firebase setup. Run as the admin account somewhere with gcloud, curl, and jq. Safe to re-run.
# Usage: bash scripts/bootstrap.sh [project-id]
# The project id is saved to .firebaserc, so it's only needed the first time.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${1:-}" ]; then
    jq -n --arg id "$1" '{projects: {default: $id}}' >.firebaserc
fi
PROJECT_ID=$(jq -er .projects.default .firebaserc 2>/dev/null) || {
    echo 'Usage: bash scripts/bootstrap.sh <project-id>' >&2
    exit 1
}
REPO=$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
OWNER=${REPO%%/*}
LOCATION=${LOCATION:-nam5}
SA=github-deploy@$PROJECT_ID.iam.gserviceaccount.com

gcloud config set project "$PROJECT_ID"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud services enable \
    firebase.googleapis.com \
    firestore.googleapis.com \
    firebaserules.googleapis.com \
    identitytoolkit.googleapis.com \
    iamcredentials.googleapis.com \
    sts.googleapis.com

api() {
    curl -fsS -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "X-Goog-User-Project: $PROJECT_ID" \
        -H 'Content-Type: application/json' "$@"
}

echo '--- Firestore'
if ! gcloud firestore databases describe --database='(default)' &>/dev/null; then
    gcloud firestore databases create --location="$LOCATION"
fi

echo '--- Auth authorized domains'
AUTH_CONFIG=https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config
domains=$(api "$AUTH_CONFIG" | jq -c --arg domain "${OWNER,,}.github.io" '.authorizedDomains + [$domain] | unique')
api -X PATCH "$AUTH_CONFIG?updateMask=authorizedDomains" -d "{\"authorizedDomains\": $domains}" | jq -c .authorizedDomains

echo '--- Web app'
WEB_APPS=https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID/webApps
if [ "$(api "$WEB_APPS" | jq '.apps // [] | length')" -eq 0 ]; then
    api -X POST "$WEB_APPS" -d '{"displayName": "checklist"}' >/dev/null
fi

echo '--- Deploy service account'
if ! gcloud iam service-accounts describe "$SA" &>/dev/null; then
    gcloud iam service-accounts create github-deploy --display-name='GitHub deploy'
fi
# Rules deploys, reading the web app config, and syncing the allowlist.
for role in roles/firebaserules.admin roles/firebase.viewer roles/datastore.user roles/serviceusage.serviceUsageConsumer; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$role" \
        --condition=None >/dev/null
done

echo '--- Workload Identity Federation'
if ! gcloud iam workload-identity-pools describe github --location=global &>/dev/null; then
    gcloud iam workload-identity-pools create github --location=global --display-name=GitHub
fi
if ! gcloud iam workload-identity-pools providers describe checklist --location=global \
    --workload-identity-pool=github &>/dev/null; then
    gcloud iam workload-identity-pools providers create-oidc checklist \
        --location=global \
        --workload-identity-pool=github \
        --issuer-uri=https://token.actions.githubusercontent.com \
        --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository \
        --attribute-condition="assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"
fi
gcloud iam service-accounts add-iam-policy-binding "$SA" \
    --role=roles/iam.workloadIdentityUser \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" \
    >/dev/null

cat <<EOF

Done. Set these GitHub Actions variables on $REPO:
  FIREBASE_PROJECT_ID=$PROJECT_ID
  GCP_SERVICE_ACCOUNT=$SA
  GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/checklist
EOF
