#!/usr/bin/env bash
# Create GitHub labels, milestones, and issues from project_manager/issues/*.md
#
# Usage:
#   ./project_manager/create_issues.sh            # dry run (prints gh commands, no network calls)
#   ./project_manager/create_issues.sh --apply    # actually create (needs `gh auth status` OK)
#   REPO=owner/name ./project_manager/create_issues.sh --apply
#
# Each issue file must start with:
#   <!-- gh-labels: a,b,c | gh-milestone: M1 Name -->
#   # PM-xxx: Title
# Issues whose exact title already exists in the repo are skipped (safe to re-run).
# Compatible with macOS /bin/bash 3.2.

set -euo pipefail

REPO="${REPO:-CrossCures/crosscures}"
APPLY=0
if [[ "${1:-}" == "--apply" ]]; then APPLY=1; fi
DIR="$(cd "$(dirname "$0")" && pwd)"

run() {
  if [[ $APPLY -eq 1 ]]; then
    "$@"
  else
    printf 'DRY-RUN:'
    printf ' %q' "$@"
    printf '\n'
  fi
}

# name|color|description
LABELS=(
  "type:decision|5319e7|Needs a human product/clinical decision (ADR)"
  "type:design|1d76db|Design doc / contract / UX spec before build"
  "type:build|0e8a16|Implementation work"
  "type:test|fbca04|Automated test suite work"
  "type:eval|c2e0c6|Evaluation harness / quality measurement"
  "type:bug|d73a4a|Defect in current app"
  "conflict|b60205|Current app conflicts with v4; discuss first"
  "security|b60205|Security-sensitive change"
  "agent:ready|0e8a16|Agent can implement once dependencies are closed"
  "agent:draft-then-approve|fef2c0|Agent drafts; human must approve before build"
  "agent:prep-only|f9d0c4|Agent may prepare analysis only; no code changes"
  "area:backend|c5def5|FastAPI backend (crosscures_v2)"
  "area:web|c5def5|React web app (artifacts/crosscures)"
  "area:mobile|c5def5|Expo mobile app"
  "area:data|c5def5|Sources, snapshots, schemas, migrations"
  "area:llm|c5def5|Model stages, prompts, providers"
  "area:product|c5def5|Product scope and policy"
  "area:testing|c5def5|Test infrastructure and fixtures"
  "area:integration|c5def5|External integrations (Fasten, etc.)"
  "area:ux|c5def5|Interaction and visual design"
  "area:clinical-safety|c5def5|Evidence fidelity and clinical distinctions"
  "area:voice|c5def5|Speech in/out"
  "area:feedback|c5def5|Physician feedback"
)

MILESTONES=(
  "M0 Foundations & Decisions"
  "M1 Source-of-Truth Intake"
  "M2 Filtering & Reconstruction"
  "M3 Summaries & Follow-ups"
  "M4 Patient Interaction"
  "M5 Model & Experiment Workspace"
  "M6 Physician Feedback"
  "M7 Hardening & Acceptance"
)

echo "== Labels"
for entry in "${LABELS[@]}"; do
  name="${entry%%|*}"; rest="${entry#*|}"; color="${rest%%|*}"; desc="${rest#*|}"
  run gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force
done

echo "== Milestones"
existing_ms=""
if [[ $APPLY -eq 1 ]]; then
  existing_ms="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title')"
fi
for m in "${MILESTONES[@]}"; do
  if [[ -n "$existing_ms" ]] && grep -Fxq "$m" <<<"$existing_ms"; then
    echo "skip milestone (exists): $m"
  else
    run gh api "repos/$REPO/milestones" -f title="$m" --silent
  fi
done

echo "== Issues"
existing_issues=""
if [[ $APPLY -eq 1 ]]; then
  existing_issues="$(gh issue list --repo "$REPO" --state all --limit 1000 --json title --jq '.[].title')"
fi
for f in "$DIR"/issues/PM-*.md; do
  header="$(head -1 "$f")"
  labels="$(printf '%s' "$header" | sed -n 's/.*gh-labels: *\([^|]*\)|.*/\1/p' | tr -d ' ')"
  milestone="$(printf '%s' "$header" | sed -n 's/.*gh-milestone: *\(.*\)-->.*/\1/p' | sed 's/ *$//')"
  title="$(grep -m1 '^# ' "$f" | sed 's/^# //')"
  if [[ -z "$labels" || -z "$milestone" || -z "$title" ]]; then
    echo "ERROR: bad header in $f" >&2
    exit 1
  fi
  if [[ -n "$existing_issues" ]] && grep -Fxq "$title" <<<"$existing_issues"; then
    echo "skip issue (exists): $title"
    continue
  fi
  run gh issue create --repo "$REPO" --title "$title" --body-file "$f" --label "$labels" --milestone "$milestone"
done

if [[ $APPLY -eq 0 ]]; then
  echo
  echo "Dry run only. Re-run with --apply to create in $REPO."
fi
