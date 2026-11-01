# Project-local skills

This directory holds skills that are versioned with `dsh-chat-improve`.

## dsh-mermaid-charts

- Source of truth: `skills/dsh-mermaid-charts/SKILL.md`.
- DSH discovers project skills from `<project>/.dsh/skills` and `<project>/.agents/skills`, not from `./skills`.
- For local testing, `scripts/setup-skill-sync.ps1` creates a directory junction at `.dsh/skills/dsh-mermaid-charts` pointing here. `.dsh/skills/` is gitignored; the junction is not committed.
- On a fresh clone, run the setup script once.

## Setup

```powershell
pwsh -File scripts/setup-skill-sync.ps1
```

The script:

1. Creates `.dsh/skills/dsh-mermaid-charts` as a directory junction to `skills/dsh-mermaid-charts`.
2. Installs `scripts/git-hooks/pre-push` as `.git/hooks/pre-push`.

The hook syncs this skill to the sibling `my-skills` repository on every push of the current branch:

```text
E:\repos\my-skills\
  skills\dsh-mermaid-charts\SKILL.md
```

It switches `my-skills` to `skill/dsh-mermaid-charts`, copies the skill, commits only that path, and pushes. If `my-skills` has uncommitted changes or its push fails, the project push is blocked. Use `git push --no-verify` to bypass in an emergency.

## Two-repository contract

- Edit only in this repository.
- `my-skills` is a generated copy; do not edit it directly.
- The hook checks out `skill/dsh-mermaid-charts` in `my-skills`. If you switch `my-skills` back to another branch, the skill files are not in that working tree until the hook switches again or you run `git -C E:\repos\my-skills switch skill/dsh-mermaid-charts`.
- `metadata.version` must match in both copies.
- The hook is local; a fresh clone must reinstall it. A server-side sync would need a GitHub Actions workflow and a cross-repository token.

## Manual checks

```powershell
Get-Item .dsh\skills\dsh-mermaid-charts | Select-Object LinkType,Target
git -C E:\repos\my-skills switch skill/dsh-mermaid-charts
Get-FileHash skills\dsh-mermaid-charts\SKILL.md
Get-FileHash E:\repos\my-skills\skills\dsh-mermaid-charts\SKILL.md
```

The two hashes must match after a sync. If you do not want to switch the `my-skills` working tree, read the committed copy with `git -C E:\repos\my-skills show skill/dsh-mermaid-charts:skills/dsh-mermaid-charts/SKILL.md`.
