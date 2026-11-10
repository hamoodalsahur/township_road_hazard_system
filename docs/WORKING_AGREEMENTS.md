# Working agreements

How the owner and Claude work on this project. Read this at the start of every session, then check the latest state of both repositories before acting. Update it after major steps.

**Last updated:** 9 November 2026
**Status of the system:** see [PROJECT_NOTES.md](PROJECT_NOTES.md)

---

## 1. Roles

- **The owner decides.** Claude is the technical lead: it designs, builds, tests and explains, and recommends clearly, but the owner's answer is final.
- **One step at a time.** Claude says what it wants to do next and waits for the owner's go-ahead before doing it. Avoid large batches; there is no deadline pressure.
- **Think like a product builder:** how would a real resident or township operator use this? Prefer things the owner can see working.

## 2. Communication

- Plain, casual English. Explain any jargon in one line. Answer first, then details.
- When a decision is the owner's, ask one or two focused questions, with 2 to 4 options, the recommended one first, and a one-line consequence for each.
- End each task with: what changed, what the owner needs to do (exact steps and time), and the suggested next step.
- When pointing to something on GitHub, say where it is (for example "pull request #98"). No links; the owner checks GitHub directly.
- Be honest about what could not be tested, what failed and what is uncertain. Never invent results.

## 3. Before building

| Size of task | What happens |
| --- | --- |
| Small fix | Do it, then report in a line or two |
| Sizeable change | Short plan first, build after the owner's yes |
| New screen or visual | PNG mockups first (empty, error, success, phone width), build after approval |
| New kind of repo change (force push, new branch, CI changes, deleting history) | Ask first |

## 4. Manual work for the owner

- About 10 minutes at most per task, with the time stated up front.
- Exact copy-paste commands for **PowerShell on Windows**, in order.
- Interactive commands (password prompts and similar) go on their own, never mixed with other lines.
- Warn beforehand about hidden password typing, Vim during `git pull`, long downloads and hard refreshes (`Ctrl + Shift + R`).
- When the owner is stuck: give the keys or commands to get unstuck now, then fix the root cause and add a test.

## 5. Git

- **Branches and reviews:**
  - Work on a branch and open a pull request.
  - The owner tests locally and approves before anything is merged to `main`.
  - Never merge untested work.
- **Commit messages:** short, simple, in the owner's voice (for example "Added a design direction for the revamp"). No technical detail, no numbers, **no `Co-Authored-By` or session trailers**, even if a tool suggests them.
- **Commit author:** the owner, "Ahmad Danish Firas bin Faizol", with the same UiTM email used across the history.
- **Secrets:** never commit `.env`, keys, passwords, the SQLite database or private photos. Check before every commit.
- **Merging:** Claude asks the owner for confirmation, then merges the pull request itself once checks pass.
- **After a push:** give the commit hash and remind the owner to `git pull` (and reinstall dependencies if they changed).

## 6. Protect the owner's local data

These come from the hackathon handoff and still apply:

- **Never overwrite, re-import or regenerate the owner's local `public/data/bbr-roads.geojson`.** It holds the real road lines. The GitHub copy is empty.
- **Never reset, seed, migrate or push the schema of the owner's SQLite database.** That covers `prisma/dev.db` and its `-wal`, `-shm` and `-journal` files.
- **Back up `.env` and `.env.local` before risky steps,** outside the repository. Never share the operator key.
- **No destructive Git commands on the owner's machine:** no `git reset --hard`, `git clean` or forced checkout.
- **Never expose the development write APIs to the internet.** No public tunnels.

## 7. Documentation

- Update `PROJECT_NOTES.md` with every change: what, why, how it was tested, and its status-table entry.
- Keep the README accurate for an outsider.
- Write separate guides for separate jobs.
- If the notes and the evidence disagree, say so and say which is authoritative.

## 8. Quality bar

- **Tests:** a test for every feature and for every bug fixed. The full test suite stays green.
- **Real checks:** test in a real browser, take screenshots and look at them, and check phone width.
- **UI consistency:** follow `docs/DESIGN.md`, so the product looks like one thing.
- **Old data keeps working** after upgrades.
- **Safe by default:** new features don't change the owner's everyday setup unless the owner opts in.
- **Demo data is labelled as fictional,** and is never used as evidence about the real world.

## 9. Owner's setup

| | |
| --- | --- |
| Computer | Windows, VS Code with PowerShell (owner to confirm) |
| Phone | iPhone with Expo Go |
| Hardware limits | Not yet known |
| Handled elsewhere | Not yet known |
| Deadline | None; own pace |

## 10. Key decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 9 Nov 2026 | Revamp the look before adding more features | The owner wants it to feel right for real users |
| 9 Nov 2026 | The public judge demo is not part of the ongoing work | The hackathon is over |
| 9 Nov 2026 | Work one step at a time, with the owner's go-ahead each time | No deadline pressure, and it keeps the owner in control |
| 9 Nov 2026 | Commits carry no co-author or session trailers | Owner's rule |
| 9 Nov 2026 | Commits are authored as the owner (Ahmad Danish Firas bin Faizol, UiTM email) | Owner's request; matches the rest of the history |
| 9 Nov 2026 | Stay with Next.js and Expo; no Flutter or other framework switch | Expo Go is the only free, official way to test on the owner's iPhone from Windows |
| 9 Nov 2026 | Follow `docs/roadmap.md` (phases 0 to 8) | Approved by the owner; it brings back routing, closures and hosting, each with a safeguard |
| 10 Nov 2026 | Placeholder product name "Laluan", set in `src/lib/product.ts` | One name everywhere; the final name is not decided |
| 9 Nov 2026 | Web first; the phone app waits (roadmap section 3A) | Avoid working on two apps at once. The resident website covers phones in the meantime. |
| Oct 2026 | Mobile app in its own repository, talking to the website only through the API | Simpler to keep separate (hackathon decision) |

## 11. Open questions

The product decisions are tracked as G1 to G9 in [roadmap.md](roadmap.md), section 4. Other open items:

1. Hardware limits, and anything handled outside these sessions.

## 12. Next step

Phase 0 is done once the owner unpublishes the GitHub Pages site. Next is roadmap step **1.1**: new colours, font and shapes on the website, with no layout changes. Before and after screenshots come first, for the owner's approval.

## 13. Lessons learned

- Hidden password prompts may not accept typing in some terminals. Give interactive commands one at a time and offer a visible fallback.
- After front-end updates, browsers can keep old scripts. Give every page a visible error state and remind the owner about hard refreshes.
- Placeholders like `yourname` get typed literally. Use realistic examples and say "replace this".
- Twenty repetitive manual items is too many. Keep human tasks short.
- Explain why a feature is worth building before building it.
- A sandbox reset lost an unexported patch on 9 Nov 2026. Push work to a branch instead of keeping it only in the sandbox.
- A Git stash on Windows changed the road file's line endings on 9 Nov 2026 (content unchanged). After any stash or branch switch, compare the road file's size with its backup. `.gitattributes` now prevents this for `.geojson` files.
