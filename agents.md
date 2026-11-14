# Agent rules

## Concurrent sessions

Other Claude sessions may be working in this same checkout at the same time and may edit the same files you are editing.

- Only commit your own changes. Stage files (or hunks) explicitly, e.g. `git add <file>` or `git add -p`, never `git add -A` / `git add .` / `git commit -a`.
- Before committing, review `git diff --staged` and make sure every staged line is yours. If a file contains both your edits and someone else's, stage only your hunks.
- Do not revert, reformat, stash, or "clean up" changes you did not make (no `git stash`, `git checkout -- <file>`, `git restore`, or `git reset --hard` on files touched by others).
- If an unexpected change blocks your work (e.g. breaks the build), mention it to the user instead of fixing or discarding it yourself.

## Committing

Commit your own changes yourself, feature by feature: as soon as one self-contained piece of work is done (a new module, a route, a wired-up UI, a test), commit it before starting the next. Do not collect a whole task into one big commit at the end, and do not leave finished work uncommitted.

Each commit should build on its own and have a message that says what that feature does, prefixed `feat(<mode>)`, `fix(<mode>)`, `chore(<mode>)`, `docs(<mode>)` or `refactor(<mode>)` (see agents.md).

The rules from "Concurrent sessions" still apply to every one of these commits.

## Git workflow

Commit directly onto main, feature by feature. Do not push after every commit: the commits stay local until the user asks for a push. Do not create feature branches or pull requests unless asked.

Only commit your own changes. Other work may be in progress in the same working tree, so stage files explicitly and leave unrelated changes alone.

The full agent rules are in agents.md.
