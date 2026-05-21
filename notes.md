# UX Test Ledger

### T001 - desktop landing first load -> mid-page scroll -> return to hero
- Time: 2026-05-18 09:20
- Description: Opened the product landing on desktop at `127.0.0.1:3000`, verified the hero copy, both primary CTAs, and the sticky top navigation. Scrolled down into the "From source to understanding" section and then returned to the hero state. The page felt visually coherent and the layout held together without jumps, overlap, or missing assets. A browser translation popup appeared, but it was browser-level noise rather than a product defect. No product bug found.
- Status: пофикшено

### T002 - desktop landing -> pricing -> browser back
- Time: 2026-05-18 09:21
- Description: Started on the landing page, moved to the pricing route, verified the pricing hero plus the three plan columns, then returned using the browser back button. Route transition felt fast and the back-stack behaved predictably. The header stayed intact after the round trip and the landing hero returned without a broken scroll lock or layout collapse. No product bug found.
- Status: пофикшено

### T003 - desktop landing -> roadmap -> back -> forward
- Time: 2026-05-18 09:22
- Description: Navigated to the roadmap page, confirmed the dedicated roadmap title and the shipped / in-progress / planned columns, then moved through browser history to return and reopen the page. The route resolved correctly and the history stack behaved normally. No product bug found.
- Status: пофикшено

### T004 - desktop roadmap -> about narrative page
- Time: 2026-05-18 09:23
- Description: Opened the about route and verified the narrative content structure: hero heading, explanatory paragraphs, and bullet lists all rendered cleanly. The page read as a focused long-form document rather than a broken marketing shell, and typography stayed stable through the content sections. No product bug found.
- Status: пофикшено

### T005 - desktop blog index load with featured article card
- Time: 2026-05-18 09:23
- Description: Opened the blog index and verified that the page headline, summary copy, featured article image, metadata, and “Read more” affordance all rendered correctly. The page loaded with stable layout and the featured card was immediately understandable as the primary next action. No product bug found.
- Status: пофикшено

### T006 - anonymous direct entry to /workspace
- Time: 2026-05-18 09:25
- Description: Opened `127.0.0.1:3000/workspace` in a fresh anonymous tab expecting a clean redirect into login. Network-level check returned `307 Temporary Redirect` with `location: /login`, but the actual browser tab stayed on `/workspace` as a blank dark page with no login UI. Manual refresh did not recover it. This feels broken and confusing because a user gets a dead-looking screen instead of a visible auth handoff. Retest 2026-05-19 02:28: under a production-like `next start` runtime, direct anonymous entry to `/workspace` now lands on a fully rendered `Sign in — Avenire` page immediately, with visible email/password fields and social/passkey actions. The auth handoff is now clear and usable.
- Status: пофикшено

### T007 - anonymous direct entry to /login
- Time: 2026-05-18 09:27
- Description: Opened `127.0.0.1:3000/login` directly in a fresh anonymous tab. The browser showed the same blank dark page with no form, no loading affordance, and no recovery messaging even after a manual refresh. A bounded network check with `curl --max-time 5` returned `000` after about five seconds, so the route appears to hang server-side instead of returning a page. This is a stronger confirmation that the login surface itself is currently broken locally. Retest 2026-05-19 02:28: direct entry to `/login` now returns `200` over the network and renders the full sign-in screen in-browser with visible email, password, forgot-password, and social/passkey options. No blank-screen behavior remains in this flow.
- Status: пофикшено

### T008 - anonymous direct entry to /waitlist
- Time: 2026-05-18 09:30
- Description: Opened `127.0.0.1:3000/waitlist` directly from an anonymous state. The tab stayed visually blank just like `/login`, and a bounded network probe with `curl --max-time 5` also timed out with `000` instead of returning headers or HTML. This suggests the problem is broader than the login form itself: the anonymous waitlist surface is also non-functional locally. Retest 2026-05-19 02:28: direct entry to `/waitlist` now returns `200` and renders the invite-only waitlist screen with heading, short explanation, and a visible `Join waitlist` CTA. The anonymous waitlist surface is functional again.
- Status: пофикшено

### T009 - anonymous direct entry to /register
- Time: 2026-05-18 09:36
- Description: Opened `127.0.0.1:3000/register` and the browser moved past the blank state into a full network error page: `ERR_CONNECTION_REFUSED`. A bounded header request also failed immediately with `000` and no headers written. This feels worse than a slow page because the route now looks outright unavailable to the browser. Retest 2026-05-19 02:29: direct entry to `/register` now returns `200` and renders the full account-creation form with email, username, display name, password, confirm-password, and social sign-up options. The route is reachable and usable again.
- Status: пофикшено

### T010 - public root after auth-route failures
- Time: 2026-05-18 09:36
- Description: After reproducing the auth and waitlist route failures, I checked whether the public root was still healthy. `lsof` still showed a Node process listening on `:3000`, but a bounded `curl --max-time 3` to `/` returned `000` with no headers, which means the server stayed bound to the port while no longer serving even the homepage within a reasonable time. From a user point of view this looks like the site has gone dark after touching the broken auth entrypoints. Retest 2026-05-19 02:29: after re-running the auth entry flows, the root route continued returning `200` over the network, and the browser still rendered the full marketing landing page with hero copy, top navigation, and CTAs. The site no longer goes dark after touching the auth routes.
- Status: пофикшено

### T011 - anonymous direct entry to /chats alias route
- Time: 2026-05-19 02:30
- Description: Opened `127.0.0.1:3000/chats` from an anonymous state. The route returned a fast `307` redirect to `/login`, and the browser rendered the full `Sign in — Avenire` screen instead of hanging or flashing a blank shell. The saved-thread alias now behaves like a clean auth handoff. No product bug found.
- Status: пофикшено

### T012 - anonymous direct entry to /workspace/files
- Time: 2026-05-19 02:31
- Description: Opened `127.0.0.1:3000/workspace/files` while signed out. The route immediately redirected to `/login` and landed on the same usable sign-in form with visible email/password inputs. No dead-end screen, timeout, or route confusion showed up in this protected files entry flow. No product bug found.
- Status: пофикшено

### T013 - anonymous direct entry to /chats/new
- Time: 2026-05-19 02:31
- Description: Opened `127.0.0.1:3000/chats/new` as an anonymous visitor. Network checks showed a clean `307` redirect to `/login`, and the browser surfaced the sign-in screen rather than an empty workspace shell. The new-chat entry route now degrades cleanly into auth. No product bug found.
- Status: пофикшено

### T014 - login form empty submit
- Time: 2026-05-19 02:31
- Description: On the sign-in screen, pressed `Login` with empty fields to see whether the form fails clearly or silently. The page stayed stable and the browser surfaced a native required-field validation message (`Please fill out this field.`) instead of posting a broken request or freezing the UI. That feels acceptable as a baseline no-data guard. No product bug found.
- Status: пофикшено

### T015 - register form mismatched password validation
- Time: 2026-05-19 02:31
- Description: Filled the registration form with a valid-looking email, username, and display name, but intentionally used mismatched passwords before pressing `Create account`. The form stayed on-page and showed a clear inline validation message under confirm password: `Passwords must match`. That prevented a bad submission without crashing or routing away unexpectedly. No product bug found.
- Status: пофикшено

### T016 - approved waitlist signup stays stuck in creating state
- Time: 2026-05-19 02:33
- Description: Approved `ux.qa+1@avenire.local` on the local waitlist, then opened `/register`, filled a complete matching signup form, and pressed `Create account`. The page switched the button into a disabled `Creating account...` state and stayed there instead of moving to a verification step or success screen. A direct helper check right after submit still reported `No user exists for that email yet`, so the account was not created in the database. This feels broken because the form looks submitted but gives no completion or failure feedback and leaves the user hanging. Retest 2026-05-19 02:57: in a fresh isolated browser session, I approved `ux.qa+t016@avenire.local`, filled `/register`, and submitted again. This time the form immediately transitioned to the `Verify your email` success state with the new address visible on-screen, and the local verification helper now returns a signed verification URL for that created user instead of saying no user exists.
- Status: пофикшено

### T017 - refresh after stuck signup
- Time: 2026-05-19 02:34
- Description: While the approved-signup page was stuck in `Creating account...`, I refreshed the page to see whether the UI recovered or remained poisoned. The route reloaded into a clean registration form with active fields and a normal `Create account` button, so the stuck state did not permanently wedge the page. That recovery path is acceptable, even though the original submit is still broken. No new product bug found beyond T016.
- Status: пофикшено

### T018 - public root health after stuck signup attempt
- Time: 2026-05-19 02:35
- Description: After reproducing the stuck signup flow, I checked whether the public landing route was still healthy. The root route continued returning `200` quickly and the site remained reachable instead of collapsing into the earlier all-routes timeout pattern. The signup bug appears localized rather than taking down the whole public surface. No new product bug found beyond T016.
- Status: пофикшено

### T019 - login route health after stuck signup attempt
- Time: 2026-05-19 02:35
- Description: After the stuck account-creation attempt, I checked the direct login route again. `/login` still returned `200` quickly and the sign-in surface remained available, which means the failure in T016 does not immediately poison the basic auth entrypoint for the next user action. No new product bug found beyond T016.
- Status: пофикшено

### T020 - waitlist route health after stuck signup attempt
- Time: 2026-05-19 02:35
- Description: I also rechecked `/waitlist` after the stuck registration submit to see whether the auth-adjacent public routes were destabilized together. The waitlist route still returned `200` quickly and remained reachable, so the failure appears centered on account creation itself rather than the broader invite-only entry surface. No new product bug found beyond T016.
- Status: пофикшено

### T021 - local verification URL -> workspace home
- Time: 2026-05-19 02:39
- Description: Created a local approved user state with the repo helper, opened the generated verification URL, and landed inside the authenticated workspace. The workspace home rendered with the sidebar, welcome copy, pet, task/activity cards, and student calendar instead of dropping into an auth loop or blank page. This is the first successful authenticated entry into the real product surface in this pass. No product bug found.
- Status: пофикшено

### T022 - authenticated workspace -> Files
- Time: 2026-05-19 02:40
- Description: From the authenticated workspace home, opened `Files` and landed in the user workspace folder route. The surface showed the workspace title, search field, upload affordances, sort controls, and the seeded `Welcome to Avenire.md` file. No crash or auth loss happened during the transition. No product bug found.
- Status: пофикшено

### T023 - authenticated workspace -> Mindset Sets
- Time: 2026-05-19 02:40
- Description: Opened `Mindset Sets` from the authenticated workspace. The page loaded into an empty-state review surface with a clear heading, sidebar state, and `New Mindset Set` affordance. The product handled the zero-set state cleanly instead of rendering a broken pane. No product bug found.
- Status: пофикшено

### T024 - authenticated workspace -> Tasks
- Time: 2026-05-19 02:40
- Description: Switched into `Tasks` from the workspace navigation. The tasks surface loaded the expected empty-state summary with search, `New Task`, and due/upcoming sections without auth jitter or route breakage. It is sparse, but it reads as an intentional empty state rather than a failed load. No product bug found.
- Status: пофикшено

### T025 - authenticated workspace -> New Method composer
- Time: 2026-05-19 02:40
- Description: Opened `New Method` as an authenticated user and reached the fresh method composer with the prompt field, upload button, voice input affordance, and disabled send button before input. The route loaded cleanly and felt like a usable creation surface for the next study action. No product bug found.
- Status: пофикшено

### T026 - new method composer enables send after input
- Time: 2026-05-19 02:44
- Description: In the authenticated `New Method` composer, entered a study prompt into the main text area: `Summarize the welcome note and suggest the first study step.` The composer immediately enabled the send button instead of staying inert, which makes the empty-to-ready transition feel correct and responsive. No product bug found.
- Status: пофикшено

### T027 - authenticated workspace settings overlay
- Time: 2026-05-19 02:44
- Description: Opened the authenticated settings overlay from inside the workspace. The panel rendered the account sections, display-name field, avatar affordance, provider linking buttons, and section navigation for Preferences, Workspace, Data, Billing, Security, and Keyboard Shortcuts. It behaved like a real settings surface rather than a dead modal shell. No product bug found.
- Status: пофикшено

### T028 - authenticated trash empty state
- Time: 2026-05-19 02:44
- Description: Opened the workspace trash panel as an authenticated user. The trash surface rendered a clear empty state with `Trash is empty` messaging and no loading collapse or broken overlay behavior. For a brand-new workspace, that empty-state handling felt coherent and intentional. No product bug found.
- Status: пофикшено

### T029 - new method draft survives workspace section switching
- Time: 2026-05-19 02:45
- Description: After typing a draft prompt into `New Method`, switched the workspace section chrome through `Files`, `Mindset Sets`, and `Tasks`, then returned to `Methods`. The pending prompt text stayed in the composer and the send button remained enabled, so the app did not lose the draft while I was exploring other sections. That feels right for a multitasking workspace. No product bug found.
- Status: пофикшено

### T030 - settings overlay closes back into the active method draft
- Time: 2026-05-19 02:45
- Description: Opened the authenticated settings overlay from the `New Method` route and then returned to the main workspace surface. The app brought me back to the same active composer instead of dumping me to a generic dashboard or clearing the pending message. That continuity is important and it held up in this pass. No product bug found.
- Status: пофикшено

### T031 - settings overlay -> Account tab
- Time: 2026-05-19 03:00
- Description: Reopened the authenticated settings overlay and switched into `Account`. The tab rendered a real profile management surface with display-name editing, avatar upload affordance, connected provider buttons, and the saved account identity instead of collapsing into an empty shell. No product bug found.
- Status: пофикшено

### T032 - settings overlay -> Preferences tab
- Time: 2026-05-19 03:01
- Description: Switched from `Account` into `Preferences` inside the same overlay. The surface showed privacy mode, receipt emails, completed-task ordering, chat send shortcut, pet personalization, and appearance controls with preserved sidebar state. The tab felt fully populated and coherent. No product bug found.
- Status: пофикшено

### T033 - settings overlay -> Workspace tab
- Time: 2026-05-19 03:02
- Description: Moved into the `Workspace` tab in settings. The panel loaded workspace identity, storage counters, file/folder totals, a note template preview, member listing, workspace switcher, and the guarded danger-zone input. For an owner account this reads like a real admin surface rather than a half-built stub. No product bug found.
- Status: пофикшено

### T034 - settings overlay -> Data tab
- Time: 2026-05-19 03:03
- Description: Opened the `Data` tab from the same authenticated settings overlay expecting exports, retention, import history, or some other account-data controls. Instead the whole content area went blank white except for the shared left sidebar and `Close` button. No heading, empty-state copy, loading message, or controls appeared, which feels broken because every adjacent settings tab renders real content. This reads like a missing panel rather than an intentional empty state. Retest 2026-05-19 03:06: after authenticating through the local verification link and reopening `/workspace?overlay=settings&settingsTab=data`, the settings dialog rendered the full `Data` panel with visible `Data Imports` and `Data Retention` sections, import source buttons for Google Drive and Notion, and the `Close` control instead of a blank content area. Retest 2026-05-19 03:21: on the rebuilt production-like runtime, the same route again rendered `Data Imports` and `Data Retention` cleanly, so the blank-panel behavior stayed non-reproducible on follow-up.
- Status: пофикшено

### T035 - settings overlay -> Billing tab
- Time: 2026-05-19 03:04
- Description: Switched from the broken `Data` tab into `Billing` to check whether the overlay recovered cleanly. Billing rendered plan name, credit balances, refill times, upgrade cards, receipt preferences, and subscription management controls without staying blank. The recovery into a populated billing surface was clean. No product bug found beyond T034.
- Status: пофикшено

### T036 - settings overlay -> Keyboard Shortcuts tab
- Time: 2026-05-19 03:05
- Description: Opened `Keyboard Shortcuts` from the authenticated settings overlay. The panel rendered a real searchable shortcut directory with grouped sections (`General`, `Workspace`, `Editing`) and visible bindings like `Command Palette`, `Open Files`, `Toggle Sidebar`, and `New Method`. No product bug found.
- Status: пофикшено

### T037 - keyboard shortcuts search filter
- Time: 2026-05-19 03:06
- Description: Used the shortcut search field inside `Keyboard Shortcuts` and entered `pet`. The list narrowed down to a single matching command, `Show or hide pet`, and the total count dropped to `1` instead of leaving stale results on screen. The filter behavior felt correct and responsive. No product bug found.
- Status: пофикшено

### T038 - refresh while deep-linked into Keyboard Shortcuts settings
- Time: 2026-05-19 03:07
- Description: While still on the explicit deep link `?overlay=settings&settingsTab=shortcuts`, I refreshed the page to check whether the same settings context survived a real browser reload. Instead of restoring the shortcuts panel, the app came back on `?overlay=settings&settingsTab=account` and dropped the current tab state entirely. This feels broken because the user-visible route changed under refresh and ignored the tab they were explicitly on. Retest 2026-05-19 03:22: after the settings-navigation fix and a fresh production-like rebuild, the same `?overlay=settings&settingsTab=shortcuts` route now survives browser refresh and comes back on the `Keyboard Shortcuts` panel with the grouped shortcut list still visible. The forced redirect to `account` no longer reproduces.
- Status: пофикшено

### T039 - close settings overlay after refresh regression
- Time: 2026-05-19 03:08
- Description: After the refresh kicked the overlay back to `Account`, I closed settings to see whether the user could at least recover cleanly. The app returned to the authenticated workspace home with the sidebar, task summary, calendar, and top-level action cards still intact. No new product bug found beyond T038.
- Status: пофикшено

### T040 - workspace home -> Files route with seeded folder state
- Time: 2026-05-19 03:09
- Description: From workspace home, opened `Files` again through the workspace action card. The app routed into the real workspace folder URL and surfaced the seeded file inventory with `Welcome to Avenire.md`, search, upload controls, sort controls, and card/list toggles instead of dropping into an empty shell. No product bug found.
- Status: пофикшено

### T041 - files view toggle to list layout
- Time: 2026-05-19 03:10
- Description: In the authenticated files route, switched the folder presentation from card-style layout into `List view`. The seeded `Welcome to Avenire.md` entry stayed visible with its size and modified-time metadata instead of disappearing during the view-mode change. No product bug found.
- Status: пофикшено

### T042 - files search filter with seeded file
- Time: 2026-05-19 03:11
- Description: Used the files search field and entered `Welcome`. The current folder stayed filtered down to the existing seeded note rather than clearing the list or returning irrelevant results. Search behaved consistently on the empty-ish workspace. No product bug found.
- Status: пофикшено

### T043 - refresh on deep files folder route
- Time: 2026-05-19 03:12
- Description: Refreshed the direct folder URL in the authenticated files surface to test whether the nested workspace route survived a real browser reload. The app stayed on the same folder path and re-rendered the same `Welcome to Avenire.md` entry after refresh, so the files route held its state cleanly. No product bug found.
- Status: пофикшено

### T044 - authenticated direct entry to /workspace/flashcards
- Time: 2026-05-19 03:13
- Description: Typed the deep route `/workspace/flashcards` directly into the browser while signed in. The app resolved it into the authenticated `Mindset Sets` review surface with sidebar context, search affordances, and the empty-state prompt to select a set, rather than throwing a 404 or losing auth. No product bug found.
- Status: пофикшено

### T045 - refresh on /workspace/flashcards deep link
- Time: 2026-05-19 03:14
- Description: Refreshed the authenticated `/workspace/flashcards` route to see whether the old flashcards alias stayed stable on reload. The page came back to the same `Mindset Sets` review empty state with the route intact and no auth bounce. No product bug found.
- Status: пофикшено

### T046 - public direct entry to /terms
- Time: 2026-05-19 03:15
- Description: Opened `/terms` directly in a clean browser session. The page rendered a readable legal shell with top navigation, a clear `Terms of Service` heading, short explanatory copy, and structured sections like `Use of the service`, `Accounts and security`, and `Content and ownership` instead of dumping raw text or a broken marketing wrapper. No product bug found.
- Status: пофикшено

### T047 - public direct entry to /privacy
- Time: 2026-05-19 03:16
- Description: Opened `/privacy` directly in the same clean browser context. The route returned a full `Privacy Policy` page with the same public-site navigation and long-form legal content rather than a missing route or unfinished placeholder. No product bug found.
- Status: пофикшено

### T048 - public blog index direct entry
- Time: 2026-05-19 03:17
- Description: Loaded `/blog` directly and verified the dedicated editorial shell. The route surfaced the `Thoughts & Updates` heading, supporting intro copy, and the featured post card with image, tags, date, reading-time metadata, and a clear `Read more` affordance. No product bug found.
- Status: пофикшено

### T049 - blog index -> featured article detail
- Time: 2026-05-19 03:18
- Description: From the blog index, opened the featured article `Introducing Avenire: Interactive AI Learning That Builds Understanding`. The route resolved to a full article detail page with the expected title instead of dropping into an empty slug shell or redirect loop. No product bug found.
- Status: пофикшено

### T050 - public invalid share link
- Time: 2026-05-19 03:19
- Description: Opened an invalid public share URL at `/share/not-a-real-token` to see whether the app fails gracefully. The route returned a dedicated 404-style screen with the heading `This page isn't here.`, short recovery copy, and visible `Go home` / `workspace` links. The console logged a single expected `404 Not Found`, but the UX itself stayed clear and intentional. No product bug found.
- Status: пофикшено

### T051 - mobile waitlist direct entry
- Time: 2026-05-19 03:20
- Description: Opened `/waitlist` in a narrow mobile-like viewport. The route rendered a compact invite-only screen with the `Join the waitlist` heading, short explanatory copy, and a visible primary CTA instead of collapsing the public auth shell. No product bug found.
- Status: пофикшено

### T052 - mobile register direct entry
- Time: 2026-05-19 03:21
- Description: Opened `/register` in the same mobile viewport. The page kept the full account-creation form usable on a narrow screen, including visible email, username, display-name, password, and confirm-password inputs plus the `Create account` button and social options. No product bug found.
- Status: пофикшено

### T053 - mobile anonymous direct entry to /workspace/tasks
- Time: 2026-05-19 03:22
- Description: Hit `/workspace/tasks` from an anonymous mobile session. The app redirected cleanly to `/login` and preserved a visible mobile sign-in form rather than showing a broken protected-page shell. No product bug found.
- Status: пофикшено

### T054 - mobile login -> workspace home
- Time: 2026-05-19 03:23
- Description: In a narrow mobile viewport, signed into `/login?callbackURL=/workspace` using `ux.qa+t016@avenire.local` and a valid password. The app did navigate to `/workspace`, but the page stayed stuck on `Loading workspace...` instead of rendering the authenticated mobile workspace. Playwright also captured a client-side console error with minified React error `#418`, which makes this feel like a real mobile hydration/render failure rather than just a slow load. Retest 2026-05-19 03:31: after the mobile hydration fix, the same narrow viewport no longer stayed on the loading placeholder and eventually rendered the authenticated workspace home. Retest 2026-05-19 03:37: after a later rebuild cycle, the fresh login step itself started failing with `/api/auth/sign-in/email` returning `500` because the local auth/database backend was unavailable, so the mobile workspace route could not be re-verified cleanly from a fresh session. Retest 2026-05-19 03:46: after restoring a fresh local pg17 auth DB with migrations and recreating a verified test user, a clean narrow session logged in through `/login?callbackURL=/workspace` and rendered the authenticated workspace home with the `Mobile` breadcrumb label, greeting copy, action row, and calendar instead of hanging on `Loading workspace...`.
- Status: пофикшено

### T055 - mobile login -> settings preferences deep link
- Time: 2026-05-19 03:24
- Description: In another clean mobile auth session, signed into `/login?callbackURL=/workspace?overlay=settings&settingsTab=preferences` to see whether a deep authenticated route bypassed the broken home load. The app navigated to the requested authenticated route, but again got stuck on `Loading workspace...` with a client-side console error instead of rendering the preferences panel. This suggests the failure is broader than one page and affects mobile authenticated workspace bootstrapping itself. Retest 2026-05-19 03:32: after the mobile hydration fix, the same narrow deep link eventually rendered the `Preferences` settings panel instead of staying on the loading placeholder. Retest 2026-05-19 03:37: after a later rebuild cycle, the fresh login step itself started failing with `/api/auth/sign-in/email` returning `500` because the local auth/database backend was unavailable, so this deep authenticated route could not be re-verified honestly from a new session. Retest 2026-05-19 03:46: after restoring a fresh local pg17 auth DB with migrations and recreating a verified test user, a clean narrow session logged in through `/login?callbackURL=/workspace?overlay=settings&settingsTab=preferences` and rendered the mobile `Preferences` settings panel with toggles, selectors, pet settings, and appearance controls instead of stalling on the loading placeholder.
- Status: пофикшено

### T056 - mobile authenticated direct entry to /workspace/files
- Time: 2026-05-19 03:50
- Description: Using an authenticated mobile session proxy, opened `/workspace/files` in a narrow viewport. The app resolved the route into the real workspace folder URL and rendered the seeded `Welcome to Avenire.md` entry with sort controls, card/list toggles, upload affordances, and the workspace title instead of hanging on the initial loading placeholder. No product bug found.
- Status: пофикшено

### T057 - mobile authenticated direct entry to /workspace/tasks
- Time: 2026-05-19 03:50
- Description: Opened `/workspace/tasks` in the same authenticated mobile context. After the short route placeholder, the page settled into the tasks workspace surface with list/kanban tabs, search, filters, `New Task`, and the empty-state message `No tasks match this view`. No product bug found.
- Status: пофикшено

### T058 - mobile authenticated direct entry to /workspace/flashcards
- Time: 2026-05-19 03:51
- Description: Opened `/workspace/flashcards` from the authenticated mobile proxy. The route loaded into the `Mindset Sets` review surface with `Go to mindset set`, `New Mindset Set`, and the expected empty-state copy instead of collapsing into auth or a broken workspace shell. No product bug found.
- Status: пофикшено

### T059 - mobile authenticated direct entry to /workspace/chats/new
- Time: 2026-05-19 03:51
- Description: Opened `/workspace/chats/new` in the authenticated mobile proxy session. The page rendered the `New Method` surface with the prompt textarea, file chooser, voice input affordance, and disabled send button before input after the initial placeholder cleared. No product bug found.
- Status: пофикшено

### T060 - mobile authenticated data settings header identity
- Time: 2026-05-19 03:52
- Description: Opened `/workspace?overlay=settings&settingsTab=data` in an authenticated mobile session proxy. The underlying page clearly knew the signed-in user and showed `Hey UX QA Mobile Fix`, but the mobile settings dialog header rendered generic identity copy (`User` and `—`) instead of the actual account name and email. The rest of the `Data Imports` and `Data Retention` panel loaded, so this feels like a real identity/hydration mismatch inside the mobile settings overlay rather than a general loading issue. Retest 2026-05-19 03:58: after adding the resolved-session-user fallback and rebuilding production-like output, the same authenticated mobile `settingsTab=data` route now renders the dialog header with `UX QA Mobile Fix` and `ux.qa+mobilefix@avenire.local` instead of the generic placeholder identity.
- Status: пофикшено

### T061 - mobile authenticated settings account route
- Time: 2026-05-19 05:22
- Description: Opened `/workspace?overlay=settings&settingsTab=account` through the local authenticated mobile session proxy. The mobile dialog header now showed the real signed-in identity (`UX QA Mobile Fix` and `ux.qa+mobilefix@avenire.local`), and the account panel rendered display-name editing, avatar upload, and connected-provider controls. The only visible error was `Unable to load linked accounts.`, but browser logs showed that was caused by proxy-origin CORS against `localhost:3000/api/auth/*`, not by the product's normal same-origin route, so I did not count it as a product defect.
- Status: пофикшено

### T062 - mobile authenticated settings workspace route
- Time: 2026-05-19 05:22
- Description: Opened `/workspace?overlay=settings&settingsTab=workspace` in the same authenticated mobile proxy context. The route rendered the full workspace-management panel with workspace identity, live usage stats, note template preview, member row, workspace switcher, and danger-zone input instead of a collapsed or clipped mobile sheet. No product bug found.
- Status: пофикшено

### T063 - mobile authenticated settings billing route
- Time: 2026-05-19 05:22
- Description: Opened `/workspace?overlay=settings&settingsTab=billing` on narrow mobile width. The billing sheet rendered the current plan, credit balances, refill timestamps, upgrade cards, receipt toggle, and `View Plans` affordance instead of dropping critical billing controls below an unusable fold. No product bug found.
- Status: пофикшено

### T064 - mobile authenticated settings security route
- Time: 2026-05-19 05:22
- Description: Opened `/workspace?overlay=settings&settingsTab=security` in the authenticated mobile proxy session. The route showed the security sheet with sudo verification status, passkeys section, active sessions action, and the account delete danger-zone input without breaking the mobile dialog layout. No product bug found.
- Status: пофикшено

### T065 - mobile authenticated settings shortcuts explicit deep link
- Time: 2026-05-19 05:22
- Description: Opened `/workspace?overlay=settings&settingsTab=shortcuts` directly on mobile, even though keyboard shortcuts are hidden from the mobile tab strip. The explicit deep link still rendered a usable searchable shortcuts sheet with grouped `General`, `Workspace`, and `Editing` bindings instead of redirecting away or blanking the panel. No product bug found.
- Status: пофикшено

### T066 - mobile authenticated refresh on settings account deep link
- Time: 2026-05-19 05:41
- Description: Opened `/workspace?overlay=settings&settingsTab=account` in an authenticated narrow mobile viewport, then forced a browser refresh in-place. After reload, the route stayed on the same deep link and the account sheet came back with the real mobile header identity, display-name field, avatar upload affordance, and provider controls instead of bouncing away from the requested tab. The console still showed proxy-origin auth noise because this run used the local session proxy, but the product surface itself recovered correctly. No product bug found.
- Status: пофикшено

### T067 - mobile authenticated refresh on settings workspace deep link
- Time: 2026-05-19 05:41
- Description: Reloaded `/workspace?overlay=settings&settingsTab=workspace` on narrow mobile width to stress the owner-management surface. The page returned to the same deep link and re-rendered the workspace-management panel with identity, stats, note template preview, members, workspace switcher, and danger zone intact after refresh. No product bug found.
- Status: пофикшено

### T068 - mobile authenticated refresh on settings billing deep link
- Time: 2026-05-19 05:41
- Description: Forced a browser refresh on `/workspace?overlay=settings&settingsTab=billing` in the authenticated mobile session. The app preserved the billing deep link and brought back the billing sheet with plan, credits, refill times, upgrade cards, receipt toggle, and subscription controls instead of dropping the overlay or tab state. No product bug found.
- Status: пофикшено

### T069 - mobile authenticated refresh on settings security deep link
- Time: 2026-05-19 05:41
- Description: Reloaded `/workspace?overlay=settings&settingsTab=security` on narrow mobile width. After refresh, the security sheet still rendered sudo verification, passkeys, active sessions, and the account delete danger zone without collapsing back to account or a blank overlay. No product bug found.
- Status: пофикшено

### T070 - mobile authenticated refresh on settings shortcuts deep link
- Time: 2026-05-19 05:41
- Description: Forced a browser refresh on `/workspace?overlay=settings&settingsTab=shortcuts` in the authenticated mobile flow. The explicit deep link survived refresh and came back on the searchable keyboard shortcuts sheet with grouped `General`, `Workspace`, and `Editing` bindings still visible, confirming that the earlier settings-tab reset bug is not resurfacing on mobile. No product bug found.
- Status: пофикшено

### T071 - desktop workspace home with seeded due tasks
- Time: 2026-05-19 06:17
- Description: Seeded three local tasks through the authenticated API, including one due today, one due tomorrow, and one completed item, then reopened the desktop workspace home. The `Today's Tasks` panel updated out of the empty state and surfaced the seeded task titles with a `1 pending` summary instead of staying stale after data changed. No product bug found.
- Status: пофикшено

### T072 - desktop student calendar with seeded due tasks
- Time: 2026-05-19 06:17
- Description: On the same seeded desktop workspace home, checked whether the student calendar reacted to the newly created dated tasks. The calendar showed visible due markers on `19` and `20` with the task titles `Review workspace banner copy` and `Audit mobile settings routes`, so dated task data now reaches the calendar surface instead of staying invisible. No product bug found.
- Status: пофикшено

### T073 - desktop tasks route with seeded active tasks
- Time: 2026-05-19 06:17
- Description: Reopened `/workspace/tasks` after seeding live task data. The left task summary rail and the main tasks page both rendered non-empty states: due and upcoming task cards on the rail, plus full task cards for `Review workspace banner copy` and `Audit mobile settings routes` in the main surface. No product bug found.
- Status: пофикшено

### T074 - desktop tasks route includes completed items alongside active tasks
- Time: 2026-05-19 06:17
- Description: Stayed on the non-empty desktop tasks route to see whether completed work had a visible representation rather than disappearing completely. The main task surface rendered a dedicated `Completed` group containing `Completed sample task`, while the rail continued to emphasize due and upcoming active work. That split felt coherent and intentional. No product bug found.
- Status: пофикшено

### T075 - desktop tasks list to kanban switch blocked by sidebar overlap
- Time: 2026-05-19 06:17
- Description: Tried to switch the non-empty desktop tasks view from `List` to `Kanban`. The click repeatedly failed because the sidebar's `Open Tasks` element intercepted pointer events over the main-pane `Kanban` tab, leaving the view stuck on `List`. This feels broken because a primary tab control in the tasks workspace becomes unreachable even though it is visibly enabled. Retest 2026-05-19 06:31: after the shared sidebar width fix and rebuilt `@avenire/ui` output, the seeded `/workspace/tasks` route no longer starts underneath the left rail, the `Kanban` tab is reachable, and the view successfully switches from `List` to `Kanban`.
- Status: пофикшено

### T076 - desktop seeded tasks kanban surface
- Time: 2026-05-19 06:33
- Description: On the fixed seeded desktop `/workspace/tasks` route, switched into `Kanban` and verified the board itself rather than just the clickability. The surface rendered real `Planned`, `Drafting`, `Polishing`, and `Completed` columns, with the seeded tasks appearing in the expected lanes instead of collapsing back to a list or flattening the workflow state. No product bug found.
- Status: пофикшено

### T077 - desktop seeded task card -> detail dialog
- Time: 2026-05-19 06:33
- Description: Opened the seeded `Review workspace banner copy` task card from the desktop `Kanban` surface. The route appended the `task=` param and opened a `Task Details` dialog with the saved title, assignee, due date, priority, notes, completion affordance, and save/delete controls rather than a blank editor. No product bug found.
- Status: пофикшено

### T078 - desktop task detail close returns to clean tasks route
- Time: 2026-05-19 06:33
- Description: Closed the seeded task detail dialog from the `Kanban` view to see whether route state unwound cleanly. The dialog dismissed and the URL returned from `/workspace/tasks?task=...` to the clean `/workspace/tasks` route without leaving a broken overlay or stale task selection behind. No product bug found.
- Status: пофикшено

### T079 - desktop seeded tasks search narrows to matching task
- Time: 2026-05-19 06:34
- Description: Returned to `List` view and typed `banner` into the main tasks search input. The seeded tasks surface narrowed down to the single matching `Review workspace banner copy` item instead of leaving unrelated `Drafting` and `Completed` cards in place, so non-empty search behaves correctly on real local data. No product bug found.
- Status: пофикшено

### T080 - desktop tasks -> workspace home with seeded state preserved
- Time: 2026-05-19 06:34
- Description: Used the desktop `Go home` control from the seeded tasks route. The app returned to workspace home and kept the seeded state visible there too: `Today's Tasks` still showed `1 pending`, and the student calendar still highlighted the due markers for `Review workspace banner copy` and `Audit mobile settings routes`. No product bug found.
- Status: пофикшено

### T081 - desktop authenticated files root resolves to seeded folder route
- Time: 2026-05-19 06:35
- Description: Opened `/workspace/files` in an authenticated session after seeding task data and keeping the seeded workspace intact. The route resolved into the concrete workspace folder URL and rendered the existing `Welcome to Avenire.md` entry instead of stalling on the top-level alias or dropping back to workspace home. No product bug found.
- Status: пофикшено

### T082 - desktop files seeded card view remains stable
- Time: 2026-05-19 06:35
- Description: Stayed on the authenticated seeded files route in its default card-style presentation. The workspace title, sort control, card-field toggle, upload buttons, and the single `Welcome to Avenire.md` card all remained visible and coherent on the loaded folder route. No product bug found.
- Status: пофикшено

### T083 - desktop files card to list view with seeded file
- Time: 2026-05-19 06:35
- Description: Toggled the seeded files surface into `List view` from the default card presentation. The same `Welcome to Avenire.md` item stayed visible with metadata instead of disappearing or breaking the folder route, so the file-presentation switch works on the seeded workspace. No product bug found.
- Status: пофикшено

### T084 - desktop files route remains stable across parallel loads
- Time: 2026-05-19 06:35
- Description: Opened the same authenticated files route in multiple fresh browser sessions to see whether the folder redirect and seeded file load behaved deterministically rather than only once. Each session resolved to the same workspace folder URL and rendered the same `Welcome to Avenire.md` file card without route drift or inconsistent empty states. No product bug found.
- Status: пофикшено

### T085 - desktop files -> tasks -> home chain with seeded state
- Time: 2026-05-19 06:36
- Description: Moved through a seeded route chain: started in the authenticated files folder route, then switched to the seeded tasks surface, then used `Go home` back into workspace home. The app kept both seeded surfaces coherent through the chain: files still resolved to the folder route, tasks stayed non-empty, and home still showed `1 pending` plus the due markers in the calendar. No product bug found.
- Status: пофикшено

### T086 - desktop direct deep link to planned task detail
- Time: 2026-05-19 06:38
- Description: Opened `/workspace/tasks?task=8d2484a3-6602-42d9-b6f8-8c5d7ca93b9e` directly instead of navigating there from the list. The route loaded the seeded tasks surface and immediately opened the `Task Details` dialog for `Review workspace banner copy` with title, assignee, due date, priority, notes, and action controls already populated. No product bug found.
- Status: пофикшено

### T087 - desktop refresh on planned task detail route
- Time: 2026-05-19 06:38
- Description: While on the explicit `?task=8d2484a3-6602-42d9-b6f8-8c5d7ca93b9e` route, forced a browser refresh. The page came back to the same seeded tasks route with the task-detail dialog still open for `Review workspace banner copy`, so the query-param deep link survives a real reload instead of dropping selection state. No product bug found.
- Status: пофикшено

### T088 - desktop direct deep link to completed task detail
- Time: 2026-05-19 06:39
- Description: Opened `/workspace/tasks?task=87fccbaf-ac2f-4143-ac27-59bce117137e` directly to check the completed-task path. The route opened the `Task Details` dialog for `Completed sample task` with `Completed` status visible and a `Reopen task` affordance instead of treating completed work as a dead-end record. No product bug found.
- Status: пофикшено

### T089 - desktop seeded tasks search with no matching result
- Time: 2026-05-19 06:39
- Description: On the non-empty seeded desktop tasks route, typed `zzzz-task` into the main search field to force a deliberate no-match state. The task surface swapped from the seeded lists into a clear `No tasks match this view` empty state with recovery copy instead of leaving stale cards visible. No product bug found.
- Status: пофикшено

### T090 - desktop tasks list-kanban-list roundtrip on seeded data
- Time: 2026-05-19 06:39
- Description: Starting from the seeded non-empty tasks surface, switched from `List` to `Kanban`, then back to `List`. The board changed modes cleanly both directions and preserved the same seeded tasks after the roundtrip rather than losing cards, duplicating them, or leaving the wrong tab selected. No product bug found.
- Status: пофикшено

### T091 - desktop direct file preview deep link
- Time: 2026-05-19 06:45
- Description: Opened the seeded file route directly with `?file=bea83f30-bc83-42e4-9ab8-c8d9b00265e5` on the authenticated workspace folder path. The page resolved into the markdown preview surface for `Welcome to Avenire`, with the note title, edited timestamp, body copy, and table of contents visible instead of ignoring the file query or staying on the card grid. No product bug found.
- Status: пофикшено

### T092 - desktop refresh on file preview deep link
- Time: 2026-05-19 06:45
- Description: Forced a browser refresh on the explicit seeded file-preview route with `?file=bea83f30-bc83-42e4-9ab8-c8d9b00265e5`. After reload, the route kept the same folder plus file query and re-rendered the `Welcome to Avenire` preview instead of dropping back to the plain folder grid or a blank shell. No product bug found.
- Status: пофикшено

### T093 - desktop file preview to workspace home
- Time: 2026-05-19 06:45
- Description: From the seeded markdown preview route, used the desktop `Go home` control. The app exited the file preview cleanly and returned to workspace home without leaving a dangling `file=` param or broken preview overlay behind. No product bug found.
- Status: пофикшено

### T094 - desktop history back from home returns to file preview
- Time: 2026-05-19 06:45
- Description: After navigating from the seeded file preview to workspace home, used browser history `Back`. The app returned to the same `Welcome to Avenire` preview route with the file query intact, so the home transition preserved meaningful history instead of flattening the preview state. No product bug found.
- Status: пофикшено

### T095 - desktop invalid file query on seeded folder route
- Time: 2026-05-19 06:45
- Description: Opened the live seeded folder route with an invalid `?file=not-a-real-file` query to see how the explorer degrades. The route stayed on the normal folder surface with the real `Welcome to Avenire.md` file card visible and did not crash, blank, or misroute into an error page just because the query referenced a missing file. No product bug found.
- Status: пофикшено

### T096 - anonymous shared file page
- Time: 2026-05-19 06:49
- Description: Created a real public share link for the seeded `Welcome to Avenire.md` note and opened it as an anonymous visitor on `/share/HL020orujCHAX_jfzQ1gBGma2ldfZypv`. The page rendered a dedicated `Shared file` surface with the file name and a clear `Open file` CTA instead of bouncing into auth or a generic not-found shell. No product bug found.
- Status: пофикшено

### T097 - anonymous shared folder page
- Time: 2026-05-19 06:49
- Description: Created a real public share link for the root workspace folder and opened it anonymously on `/share/00WZxV5x5m6qItvulqd7D7lK1ihMJc04`. The route rendered a `Shared folder` surface with the folder name, `No subfolders yet.` copy, and the shared `Welcome to Avenire.md` file link instead of failing open or redirecting unexpectedly. No product bug found.
- Status: пофикшено

### T098 - anonymous shared file refresh stability
- Time: 2026-05-19 06:49
- Description: Refreshed the anonymous shared file page in place. The route stayed on the same share token and re-rendered the same `Shared file` heading plus `Open file` action instead of downgrading into an error or losing the shared resource context after reload. No product bug found.
- Status: пофикшено

### T099 - anonymous shared folder refresh stability
- Time: 2026-05-19 06:49
- Description: Refreshed the anonymous shared folder page to stress the public folder viewer. The route kept the same token and returned to the same `Shared folder` surface with the seeded file link still visible, so reload does not poison the folder sharing surface. No product bug found.
- Status: пофикшено

### T100 - authenticated copy from shared file into workspace
- Time: 2026-05-19 06:50
- Description: Opened the shared file page in an authenticated session proxy and used the `Copy to my workspace` action. The product duplicated the shared note into the current workspace and redirected straight into the workspace file route with a new `file=` query for the copied file instead of silently doing nothing or losing the user in the sharing surface. No product bug found.
- Status: пофикшено

### T101 - anonymous waitlist route legal exits
- Time: 2026-05-19 06:52
- Description: Reopened `/waitlist` as an anonymous visitor after the deeper workspace passes and checked the page as a route node, not just a one-off screen. The page still anchored correctly around the single CTA and exposed the `Terms` and `Privacy Policy` exits inline in the footer copy, which keeps the legal escape hatches visible in the invite-only state. No product bug found.
- Status: пофикшено

### T102 - anonymous login route with share callback
- Time: 2026-05-19 06:52
- Description: Opened `/login?callbackURL=/share/HL020orujCHAX_jfzQ1gBGma2ldfZypv` directly as an anonymous visitor to see whether a shared-resource callback survives into auth entry. The sign-in route loaded with the same normal auth shell and did not strip or crash on the share callback parameter, so this callback form is at least accepted as a first-class login entry path. No product bug found.
- Status: пофикшено

### T103 - anonymous shared file page remains directly readable
- Time: 2026-05-19 06:52
- Description: Reopened the public shared file page after the authenticated duplication flow to make sure the original anonymous share still remained usable. The route still rendered a clean `Shared file` surface for `Welcome to Avenire.md` with the `Open file` action and did not regress into an auth wall after authenticated copying activity elsewhere. No product bug found.
- Status: пофикшено

### T104 - anonymous shared folder reflects new copied note
- Time: 2026-05-19 06:52
- Description: Reopened the public shared folder page after copying the shared file into the workspace. The folder now exposed two file links, `Welcome to Avenire.md` and `Welcome to Avenire (1).md`, which means the public folder surface reflects live underlying folder contents instead of serving a stale frozen snapshot. No product bug found.
- Status: пофикшено

### T105 - anonymous login route with workspace files callback
- Time: 2026-05-19 06:52
- Description: Opened `/login?callbackURL=/workspace/files` directly from an anonymous state to compare a protected-app callback against the shared-resource callback case. The route loaded the same sign-in shell without dropping the callback query or falling into a broken protected-route shell first, so the workspace-files callback path is accepted cleanly as an auth entry point. No product bug found.
- Status: пофикшено

### T106 - desktop tasks new-task dialog
- Time: 2026-05-19 06:56
- Description: Opened the desktop `New Task` action from the seeded non-empty tasks route. The product surfaced a full `New Task` dialog with title, assignee, resource linking, due date, status, priority, notes, and disabled `Create task` until the form had enough input, instead of jumping straight into a half-filled inline row. No product bug found.
- Status: пофикшено

### T107 - desktop create no-date task through UI
- Time: 2026-05-19 06:56
- Description: In the `New Task` dialog, created a fresh task named `UI created task` with notes and default priority but no due date. The dialog dismissed and the tasks surface updated immediately, adding the new item to the `Planned` group with `No date` metadata rather than dropping the task or forcing a due date. No product bug found.
- Status: пофикшено

### T108 - desktop seeded tasks search finds the UI-created task
- Time: 2026-05-19 06:57
- Description: Typed `UI created` into the main tasks search after creating the new task. The tasks surface narrowed down to the freshly created `UI created task` entry, showing that a task created entirely through the UI becomes discoverable by search immediately without a manual refresh. No product bug found.
- Status: пофикшено

### T109 - desktop UI-created task detail dialog
- Time: 2026-05-19 06:57
- Description: Opened the newly created no-date task from the filtered results. The route appended a new `task=` param and opened a task-detail dialog showing the saved title, `No date`, `Normal` priority, and the notes `Created through direct desktop UI flow`, so the create flow writes a coherent record the detail panel can read back. No product bug found.
- Status: пофикшено

### T110 - desktop delete UI-created task from detail dialog
- Time: 2026-05-19 06:57
- Description: Deleted the newly created task from its detail dialog and confirmed the destructive action. The dialog closed, the route returned to plain `/workspace/tasks`, and the filtered surface fell back to `No tasks match this view`, proving the task was actually removed instead of just hidden locally. No product bug found.
- Status: пофикшено

### T111 - copied note cold deep link from isolated browser session
- Time: 2026-05-19 07:07
- Description: Opened an isolated browser-like session directly on `/workspace/files?file=b7987b80-16da-40ab-861c-310ee0e492c0` to retest copied-note deep linking without touching a personal browser. The app did fetch the `?file=` route first, but the live surface settled on the plain folder route `/workspace/files/<workspace>/folder/<root-folder>` with both file cards visible and no note preview open, so the copied-note deep link fell out of preview state on a cold open instead of honoring the explicit target file. Product bug found. Retest after pane-history fixes: the cold entry behavior shifted slightly but was still wrong. The route oscillated through the root files shell and a folder-loading state before settling on the same plain folder surface without an editor, so the explicit `file=` intent was still lost on hard entry. Final retest after fixing pane bootstrap plus root-files client redirect preservation: the same cold deep link now settles on `/workspace/files/<workspace>/folder/<root-folder>?file=b7987b80-16da-40ab-861c-310ee0e492c0` with `Welcome to Avenire` title and a live `contenteditable` editor, so the explicit file intent survives hard entry again.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/retroactive-before-unavailable.svg
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T111-after-20260519-081715.png
- Status: пофикшено

### T112 - copied note open from seeded files grid
- Time: 2026-05-19 07:08
- Description: From the seeded files grid, double-clicked `Welcome to Avenire (1).md` after the cold deep-link drop. The app opened the copied note on `/workspace/files/<workspace>/folder/<root-folder>?file=b7987b80-16da-40ab-861c-310ee0e492c0`, switched the title to `Welcome to Avenire`, and exposed a live `contenteditable` ProseMirror editor rather than a dead read-only shell. No product bug found in this route.
- Status: пофикшено

### T113 - copied note append new tail line through live editor
- Time: 2026-05-19 07:09
- Description: In the live copied-note editor, focused the end of the note and appended a new tail marker line to simulate a real quick note edit. The product did issue `POST /api/notes/b7987b80-16da-40ab-861c-310ee0e492c0/sync -> 200`, but the saved markdown came back malformed: instead of a clean new line, the tail became `QA marker line 111QA` followed by a split `marker line 112` paragraph. The edit persisted, but the line structure was corrupted, which feels broken and unsafe for note editing. Product bug found. Stronger retest after the navigation fixes: using a more human-like path on the live note (`click` the visible last paragraph, `End`, `Enter`, then type `QA marker line 113`) still produced malformed editor state before persistence. The live `contenteditable` text became `marker line 112QA marker line 113`, and the backend markdown matched that broken structure after `POST /api/notes/.../sync -> 200`, so this is not just the route stack anymore; the editor/change pipeline itself is already emitting corrupted tail text. Final retest after fixing direct browser-route vs persisted-pane churn: with the QA note reset to a clean seeded baseline, the direct note route kept one stable editor node, a visual end-of-paragraph click plus `End`, `Enter`, and `QA appended at visual end 1779341336152` saved exactly as a new markdown paragraph after the final sentence. The backend returned `POST/GET /api/notes/.../sync -> 200` and the markdown tail was clean.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T113-before-20260519-081553.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T113-after-20260521-editor-tail-fixed.png
- Status: пофикшено

### T114 - copied note refresh then home/back history chain after edit
- Time: 2026-05-19 07:10
- Description: Reloaded the edited copied-note route, then used `Go home`, then the browser back action in the same isolated session. Refresh kept the corrupted tail visible as separate `QA marker line 111QA` and `marker line 112` paragraphs instead of recovering a clean line break, so the malformed save is durable. Then the `Go home -> browser back` chain landed on `about:blank` instead of returning to the previous copied-note route, which makes history feel broken after leaving a note preview. Product bug found. Retest after pane navigation fixes: the history part is now healthy again. In a fresh folder-first session, `folder -> note -> Go home -> browser back` returned to the copied-note route instead of `about:blank`. This scenario still stays red only because the refresh leg continues to preserve malformed tail content from `T113`, including the newer retest shape where the editor/backend tail collapsed into `marker line 112QA marker line 113` instead of a clean new paragraph. Final retest after the pane/browser cold-route fix and clean T113 append: reloading the note kept `QA appended at visual end 1779341336152` as a clean final paragraph, the title stayed `Welcome to Avenire — Avenire`, `Go home` reached `/workspace`, and browser back returned to the same direct note URL with the editor and clean tail restored.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T113-before-20260519-081553.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T114-after-20260521-refresh-history-fixed.png
- Status: пофикшено

### T115 - original seeded note remains isolated from copied-note edits
- Time: 2026-05-19 07:10
- Description: Queried the original seeded note `bea83f30-bc83-42e4-9ab8-c8d9b00265e5` after corrupting the copied note to make sure the edit did not leak across files. The original note still ended at the untouched onboarding copy with no `QA marker` tail at all, so the broken persistence stayed isolated to the duplicated note and did not contaminate the source note. No product bug found in this isolation check.
- Status: пофикшено

### T116 - copied note add-cover entry reveals note cover actions
- Time: 2026-05-19 15:33
- Description: Opened the copied note again and pressed `Add cover` from the note surface. The product converted the bare note header into a real cover surface with a banner image plus `Change`, `Upload`, and `Apply default cover` actions instead of freezing, reloading away from the note, or showing a dead CTA. No product bug found.
- Status: пофикшено

### T117 - copied note warm cover survives refresh but page title regresses
- Time: 2026-05-19 15:36
- Description: Opened the `Change` popover on the copied note cover, chose the `Warm` gallery cover, and then refreshed the note route. The visual cover itself survived and the note editor still re-opened, but the browser title stayed at generic `Files — Avenire` even after settle while the page heading clearly said `Welcome to Avenire`. That mismatch makes the route feel half-restored and breaks confidence in note-level page state after refresh. Product bug found. Final retest after the pane/browser cold-route fix and metadata cache invalidation: the refreshed direct note URL kept the Warm cover, the page metadata still had the Warm `bannerUrl`, and the browser title settled to `Welcome to Avenire — Avenire` instead of the generic files title.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T117-before-20260519-123620.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T117-after-20260521-cover-title-fixed.png
- Status: пофикшено

### T118 - copied note add-property action opens editable key/value row
- Time: 2026-05-19 15:38
- Description: Pressed `Add property` on the copied note surface. The note immediately exposed a focused `key` textbox plus a paired `value` textbox and a remove action inline above the document body, so the property editor does open as a real interactive flow instead of a dead affordance. No product bug found.
- Status: пофикшено

### T119 - copied note property draft disappears before or after reload
- Time: 2026-05-19 15:39
- Description: In the new property row, typed `topic` as the key and `ux` as the value, then waited and refreshed the page. The typed property vanished from the surface instead of stabilizing into a visible note property, and after reload there was no `topic` row at all. This feels broken because the editor lets you start a property but gives no visible persistence or save confirmation before dropping it. Product bug found. Final retest after draft auto-commit and note metadata cache invalidation: typed properties auto-saved through `PATCH /api/notes/<noteId> -> 200`, survived reload, and re-rendered as populated key/value inputs (`debug-1779341850600=ux`, `topic-1779342067294=ux`) while the workspace tree/folder/markdown caches all contained the same persisted properties.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T119-before-20260519-123941.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T119-diagnostic-20260521-property-inputs.png
- Status: пофикшено

### T120 - original note cold deep link opens clean editor after nav fixes
- Time: 2026-05-19 15:40
- Description: Opened the original seeded note directly through `/workspace/files?file=bea83f30-bc83-42e4-9ab8-c8d9b00265e5` after the note-navigation fixes. The route settled onto the concrete folder path with the same `file=` query, restored the `Welcome to Avenire` editor surface, and kept the original note free of the copied-note tail corruption. No product bug found.
- Status: пофикшено

### T121 - localhost mismatch on 127 register submit
- Time: 2026-05-21 07:56
- Description: Opened `http://127.0.0.1:3000/register`, filled a fully approved local signup form, and pressed `Create account`. The page changed into disabled `Creating account...` and stayed there, while the browser console reported that fetch to `http://localhost:3000/api/auth/sign-up/email` was blocked by CORS because the current origin was `http://127.0.0.1:3000`. This feels broken because both local hostnames are common during testing and the UI gives no visible failure or recovery; it just leaves the user stuck. Product bug found. Retest after the auth client/base-origin and server trusted-origin fixes: the same `127.0.0.1/register` path posted to `http://127.0.0.1:3000/api/auth/sign-up/email -> 200`, showed the `Verify your email` state for the approved account, and produced no CORS or invalid-origin console errors.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T121-before-20260521-0800-register-stuck.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T121-after-20260521-register-127-verified.png
- Status: пофикшено

### T122 - localhost approved signup -> verification -> workspace
- Time: 2026-05-21 08:00
- Description: Repeated the approved local signup flow from `http://localhost:3000/register` instead of `127.0.0.1`, submitted a complete form, opened the generated local verification URL, and landed on `/workspace`. The registration form moved to the clear `Verify your email` state, the verification URL redirected into the workspace, and the authenticated home showed sidebar navigation, quick actions, task summary, and calendar content for the new QA user. No product bug found.
- Status: пофикшено

### T123 - authenticated files root renders while route churns
- Time: 2026-05-21 08:04
- Description: Opened `/workspace/files` with the fresh authenticated QA session and waited for the seeded workspace to settle. The UI eventually showed the workspace title, sort controls, card fields, and `Welcome to Avenire.md`, but the browser URL stayed on the alias `/workspace/files` instead of the concrete folder route, and the network log filled with repeated aborted RSC requests between the alias and `/workspace/files/<workspace>/folder/<folder>`. This feels unstable because the visible files surface appears loaded while routing/history keeps churning underneath. Product bug found. Retest after routing the files-root redirect through the workspace pane router: the same alias now settles on `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc`, keeps the seeded file visible, and no longer remains on the stale alias while the UI is loaded.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T123-before-20260521-files-loading.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T123-after-20260521-files-root-concrete.png
- Status: пофикшено

### T124 - direct concrete folder route renders seeded file
- Time: 2026-05-21 08:07
- Description: Opened the concrete folder URL `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc` directly in the authenticated QA session. The browser stayed on the concrete folder URL, the title became `UX QA 2026-05-21 C's Workspace - Avenire`, and the seeded `Welcome to Avenire.md` card rendered with sort and card-field controls. Background RSC aborts still appeared as part of the broader T123 route churn, but this direct entry did not create a separate visible user-facing failure. No new product bug found beyond T123.
- Status: пофикшено

### T125 - direct note file deep link restores note surface
- Time: 2026-05-21 08:08
- Description: Opened the direct file query `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc?file=2d3281a2-1a6e-4530-852a-1b3482a444f3`. The route preserved the explicit `file=` query, updated the browser title to `Welcome to Avenire - Avenire`, and restored the note surface with `Add cover`, `Add property`, and the full welcome document content. No product bug found in the deep-link restoration itself.
- Status: пофикшено

### T126 - direct note reload keeps persisted frontmatter inputs
- Time: 2026-05-21 08:48
- Description: Opened the seeded note direct URL in a fresh authenticated browser context, reloaded the page, and inspected the frontmatter property rows as actual input values rather than body text. The previously saved properties reappeared as editable rows (`debug-1779341850600=ux` and `topic-1779342067294=ux`), the note title stayed on the note route, and the document body remained editable. No product bug found.
- Status: пофикшено

### T127 - files folder -> note -> pane back -> pane forward
- Time: 2026-05-21 08:48
- Description: Started from the concrete root folder URL with no `file=` query, opened `Welcome to Avenire.md` from the folder grid, then used the in-app pane `Go back` and `Go forward` toolbar buttons. Back returned to the same concrete folder URL without the file query and showed the file card again; forward restored the same note URL and editor instead of desynchronizing browser and pane state. No product bug found.
- Status: пофикшено

### T128 - note file actions menu opens and dismisses safely
- Time: 2026-05-21 08:48
- Description: Opened the note file-actions menu from the preview header. The menu exposed the expected actions (`Pin`, `Properties`, `Open in new tab`, `Rename`, `Duplicate`, `Share`, `Move To`, `Download`, `Hard Re-ingest`, `Split right`, `Close pane`, `Metadata`, `Delete`) and pressing `Escape` dismissed it without changing the URL or closing the note. No product bug found.
- Status: пофикшено

### T129 - note Ocean cover survives reload
- Time: 2026-05-21 08:48
- Description: Opened the cover `Change` popover, selected the `Ocean` gallery cover, waited for metadata save, then reloaded the direct note URL. The cover image still used the Ocean SVG source after reload and the browser title stayed on `Welcome to Avenire — Avenire`, so cover metadata now feels durable across a real refresh. No product bug found.
- Status: пофикшено

### T130 - note route header controls and file icon are clipped
- Time: 2026-05-21 08:48
- Description: On the direct note route, inspected the upper-left workspace header controls after opening the seeded note. The back/home/forward group and the note file icon did not reserve their real container widths: the right arrow looked cut by the next cell and the file icon/title cluster started too tightly, so the logo/arrow area felt cropped instead of intentionally laid out. Product bug found. Retest after the `WorkspaceHeader` grid/container fix: desktop shows a stable 86px navigation group, a 24px leading-icon slot, the title starts after those controls, and the right actions stay pinned on the far side. A 390px mobile retest also kept the sidebar toggle and back/home/forward group inside positive x positions with no clipped header controls.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T130-20260521-sidebar-collapse-note-route.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T130-after-20260521-workspace-header-fixed.png
- Status: пофикшено

### T131 - mobile note properties touch the viewport edge
- Time: 2026-05-21 10:02
- Description: Opened the direct note URL at a 390px mobile viewport after the header retest and inspected the persisted frontmatter rows. The note body text itself had comfortable left padding, but the property table did not: both key inputs and the `Add property` action started at `x=0`, making `debug-1779341850600`, `topic-1779342067294`, and the plus action feel cut against the glass edge. Product bug found. Retest after restoring frontmatter panel inline padding: the same key inputs now start at `x=16`, value inputs stay inside the viewport, `Add property` starts at `x=16`, and document scroll width remains 390px.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T131-before-20260521-mobile-properties-left-clipped.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T131-after-20260521-mobile-properties-padded.png
- Status: пофикшено

### T132 - mobile note file actions menu opens and dismisses
- Time: 2026-05-21 10:07
- Description: On the same 390px direct note route, opened the top-right `File actions` menu. The menu stayed within the viewport (`x=154`, `right=378`), exposed the expected actions including `Open in new tab` and `Delete`, and pressing `Escape` dismissed it without changing the note URL. No product bug found.
- Status: пофикшено

### T133 - mobile note sidebar toggle does not open navigation
- Time: 2026-05-21 10:07
- Description: On the 390px direct note route, pressed the visible `Toggle Sidebar` button in the header. The button only received a focus outline; the navigation drawer never appeared, `Open Tasks` was not visible, and the detected sidebar geometry sat below the viewport at `y=844` instead of opening over the screen. This feels broken because mobile users have a primary navigation affordance that appears tappable but does not reveal navigation. Product bug found. Retest after replacing the side-conditioned Sheet layout with explicit side classes: the drawer opens from the left at `x=0`, `y=0`, `height=844`, shows the Files navigation and current note, and closes on Escape.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T133-before-20260521-mobile-sidebar-drawer.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T133-after-20260521-mobile-sidebar-drawer-fixed.png
- Status: пофикшено

### T134 - desktop note Open in new tab opens raw API stream
- Time: 2026-05-21 10:08
- Description: From the desktop direct note route, opened `File actions` and clicked `Open in new tab`. A new tab did open, but it landed on `/api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/files/2d3281a2-1a6e-4530-852a-1b3482a444f3/stream` with raw monospace markdown and no Avenire chrome, title, cover, editor, or navigation. For an item literally labelled `Open in new tab`, this feels like an accidental API endpoint escape rather than a user-facing file view. Product bug found. Retest after making plain markdown files open their workspace route: the popup now lands on `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc?file=2d3281a2-1a6e-4530-852a-1b3482a444f3`, keeps Avenire chrome and file actions, and the note body includes `Your first three moves`.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T134-before-20260521-open-in-new-tab-api-stream.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T134-after-20260521-open-in-new-tab-route.png
- Status: пофикшено

### T135 - desktop note menu then folder and browser back recovers note
- Time: 2026-05-21 10:08
- Description: On desktop, opened the note file-actions menu, selected `Properties`, dismissed back to the note, navigated to the concrete folder URL, then used browser back. The route returned to the same direct note URL, browser title stayed `Welcome to Avenire — Avenire`, and the note body was visibly restored instead of leaving a blank pane or stale menu state. No product bug found.
- Status: пофикшено

### T136 - mobile sidebar Tasks tab exposes task navigation without route loss
- Time: 2026-05-21 10:23
- Description: Opened the mobile sidebar drawer from the direct note route, then switched the drawer from Files to the `Tasks` tab. The drawer stayed open on the same note URL, highlighted task content, exposed `Open Tasks`, `Due Tasks`, and `Upcoming Tasks`, and did not drop the underlying `file=` route. No product bug found.
- Status: пофикшено

### T137 - mobile sidebar close returns focus to note header
- Time: 2026-05-21 10:23
- Description: Opened the mobile sidebar drawer from the direct note route, then used its visible `Close` button. The sheet dismissed, the direct note URL and header title stayed intact, and the note body still contained `Your first three moves` rather than being left under a stuck overlay. No product bug found.
- Status: пофикшено

### T138 - note Properties dialog does not show existing properties
- Time: 2026-05-21 10:24
- Description: On the desktop direct note route, opened `File actions -> Properties` while the note surface itself clearly showed persisted properties `debug-1779341850600=ux` and `topic-1779342067294=ux`. The dialog opened, but it contained only `Properties`, `Add property`, and `Close`; both persisted properties were missing. This feels broken because the product exposes two property editors that disagree about the same note metadata. Product bug found. Retest after carrying `page` metadata through the note sync load path: the dialog now shows the same `debug-1779341850600=ux` and `topic-1779342067294=ux` rows as the inline table.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T138-before-20260521-properties-dialog.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T138-after-20260521-properties-dialog-fixed.png
- Status: пофикшено

### T139 - desktop note Metadata submenu stays visible in viewport
- Time: 2026-05-21 10:24
- Description: Opened `File actions`, hovered `Metadata`, and inspected both the parent menu and the metadata submenu on a 1440px desktop viewport. The parent menu stayed at `x=1187..1411`, the metadata submenu stayed at `x=968..1192`, and it showed useful info like file name, owner, file size, location, created time, and updated time without clipping. No product bug found.
- Status: пофикшено

### T140 - desktop note Download action emits a markdown file download
- Time: 2026-05-21 10:25
- Description: Opened `File actions -> Download` from the desktop direct note route and watched for a browser download event. The product emitted a download with suggested filename `Welcome to Avenire.md` and no download failure, rather than silently opening an API page or doing nothing. No product bug found.
- Status: пофикшено

### T141 - desktop tasks route list state
- Time: 2026-05-21 10:41
- Description: Opened `/workspace/tasks` on a 1280px desktop viewport. The route stayed on `/workspace/tasks`, the page title was `Tasks - Avenire`, and the task surface showed the List/Kanban controls plus the empty-state copy before new task creation. No product bug found.
- Status: пофикшено

### T142 - desktop tasks Kanban state
- Time: 2026-05-21 10:41
- Description: Switched the Tasks surface from `List` to `Kanban` while still on `/workspace/tasks`. The surface stayed usable and kept a coherent empty-state rather than blanking or changing routes unexpectedly. No product bug found.
- Status: пофикшено

### T143 - desktop new task dialog starts guarded
- Time: 2026-05-21 10:41
- Description: Opened `New Task` from the desktop Tasks route. The dialog showed title, assignee, resources, due date, status, priority, notes, reset, and create controls; `Create task` was disabled before entering a title, so the form starts guarded instead of allowing an empty task. No product bug found.
- Status: пофикшено

### T144 - desktop create due-today task through dialog
- Time: 2026-05-21 10:42
- Description: Created `UX due today 1779345628413` through the New Task dialog, selected `Today, Thursday, May 21st, 2026` in the date picker, and added notes. The Tasks route updated with the created task under `PLANNED`, showing `May 21`, normal priority, assignee initials, and the saved notes. No product bug found.
- Status: пофикшено

### T145 - workspace dashboard reflects due-today task
- Time: 2026-05-21 10:42
- Description: After creating `UX due today 1779345628413`, opened `/workspace`. The dashboard changed to `1 pending`, showed the created task under `Today's Tasks`, and also placed it on May 21 in the student calendar. No product bug found.
- Status: пофикшено

### T146 - desktop tasks search finds due-today task
- Time: 2026-05-21 10:46
- Description: Filtered the Tasks search for `due today 1779345628413` after creating the due-today task. The result list still contained `UX due today 1779345628413`, so search found a freshly created task without refresh or stale indexing. No product bug found.
- Status: пофикшено

### T147 - desktop task detail opens from search result
- Time: 2026-05-21 10:46
- Description: Clicked the searched task result. The URL changed to `/workspace/tasks?task=ee446d93-e06b-4683-b4e8-7a51be1dbf83`, and the detail surface showed the saved notes, May 21 due date, status, and priority controls. No product bug found.
- Status: пофикшено

### T148 - desktop tasks search no-match state after detail close
- Time: 2026-05-21 10:46
- Description: Closed the task detail, searched `not-a-real-task-1779345628413`, and stayed on `/workspace/tasks`. The product showed a clear no-match state instead of stale task rows or an empty blank pane. No product bug found.
- Status: пофикшено

### T149 - desktop delete created task from detail
- Time: 2026-05-21 10:47
- Description: Reopened `UX due today 1779345628413` detail from the filtered list, used the visible delete flow, returned to Tasks, and confirmed the created task disappeared from the list. No product bug found.
- Status: пофикшено

### T150 - workspace dashboard clears deleted due-today task
- Time: 2026-05-21 10:47
- Description: Opened `/workspace` after deleting `UX due today 1779345628413`. The dashboard no longer showed the task and returned to `0 pending`, so the dashboard task summary did not keep stale deleted data. No product bug found.
- Status: пофикшено

### T151 - desktop new method route loads empty composer
- Time: 2026-05-21 10:51
- Description: Opened `/workspace/chats/new` on desktop. The route stayed on `/workspace/chats/new`, the title was `New Method — Avenire`, the Methods sidebar showed `No methods yet`, and the main composer greeted the QA user instead of rendering a blank shell. No product bug found.
- Status: пофикшено

### T152 - desktop new method composer guards empty submit
- Time: 2026-05-21 10:51
- Description: On the New Method route, checked the composer send button empty, after typing `Explain this workspace in one sentence`, and after clearing the textarea. Send was disabled when empty, enabled after typing, and disabled again after clearing. No product bug found.
- Status: пофикшено

### T153 - desktop methods sidebar search stays coherent when empty
- Time: 2026-05-21 10:51
- Description: Opened Methods search from the desktop sidebar in an account with no methods. The sidebar stayed coherent, kept the no-methods state/search affordance visible, and did not navigate away from the New Method composer. No product bug found.
- Status: пофикшено

### T154 - desktop new method refresh restores composer
- Time: 2026-05-21 10:52
- Description: Reloaded `/workspace/chats/new`. The URL stayed on the same route, the title remained `New Method — Avenire`, and the greeting plus composer textarea restored after the refresh. No product bug found.
- Status: пофикшено

### T155 - mobile new method drawer exposes methods state
- Time: 2026-05-21 10:52
- Description: Opened `/workspace/chats/new` at 390px mobile width and toggled the sidebar. The drawer opened and exposed the Methods/New Method/no-methods state, so the fixed mobile sheet behavior also works outside Files. No product bug found.
- Status: пофикшено

### T156 - desktop mindset sets empty route loads
- Time: 2026-05-21 10:55
- Description: Opened `/workspace/flashcards` on desktop. The title was `Mindset Sets - Avenire`, and the body showed `Review Due`, `New Mindset Set`, and the empty selector copy `Select a mindset set to keep going`. No product bug found.
- Status: пофикшено

### T157 - desktop create mindset set dialog starts guarded
- Time: 2026-05-21 10:55
- Description: Opened `New Mindset Set`. The dialog exposed title, description, tags, and `Create mindset set`; the create button was disabled before a title, so the dialog starts guarded. No product bug found.
- Status: пофикшено

### T158 - desktop create mindset set appears in list
- Time: 2026-05-21 10:56
- Description: Created `UX Set 1779345922999` with description `Temporary UX testing mindset set.` and tags `ux, regression`. The Mindset Sets route showed the new set title and made it selectable immediately. No product bug found.
- Status: пофикшено

### T159 - desktop select newly created mindset set
- Time: 2026-05-21 10:56
- Description: Selected `UX Set 1779345922999` from the Mindset Sets list. The URL became `/workspace/flashcards/4d6382b7-b223-4209-9e38-578a7621113b`, and the selected-set surface kept the title visible instead of showing a stale empty selector. No product bug found.
- Status: пофикшено

### T160 - desktop Review Due handles empty new set safely
- Time: 2026-05-21 10:56
- Description: Opened `Review Due` after creating `UX Set 1779345922999`, which has no cards. The review route/title stayed coherent and rendered an empty review state rather than crashing or showing a broken selected-set route. No product bug found.
- Status: пофикшено

### T161 - desktop direct mindset set route loads created set
- Time: 2026-05-21 09:52
- Description: Opened `/workspace/flashcards/4d6382b7-b223-4209-9e38-578a7621113b` directly after creating `UX Set 1779345922999`. The page title became `UX Set 1779345922999 - Avenire`, the route stayed on the set id, and the body exposed the set profile, review area, card bank, and `Add Card` action. No product bug found.
- Status: пофикшено

### T162 - desktop reload direct mindset set route keeps selection
- Time: 2026-05-21 09:52
- Description: Reloaded the direct mindset set URL for `UX Set 1779345922999`. The selected set restored after refresh, kept the same id route, and still showed `Card bank` plus `Add Card` instead of dropping back to the set list or a blank shell. No product bug found.
- Status: пофикшено

### T163 - desktop mindset sets list keeps created set visible after return
- Time: 2026-05-21 09:52
- Description: Returned from the direct set route to `/workspace/flashcards` and inspected the set list state. The created `UX Set 1779345922999` stayed visible in the list and in the selected-set summary, with `Open mindset set` and `Go` actions still present. No product bug found.
- Status: пофикшено

### T164 - mobile mindset sets sidebar exposes review navigation
- Time: 2026-05-21 09:52
- Description: Opened `/workspace/flashcards` at 390px mobile width and pressed `Toggle Sidebar`. The left drawer opened over the viewport, exposed `Mindset Sets` and `Review Due`, and did not blank or displace the underlying created-set list. No product bug found.
- Status: пофикшено

### T165 - mobile mindset set detail then browser back restores list
- Time: 2026-05-21 09:52
- Description: On the 390px mobile Mindset Sets list, used the explicit `Open mindset set` action for `UX Set 1779345922999`, landed on `/workspace/flashcards/4d6382b7-b223-4209-9e38-578a7621113b` with `Add Card` visible, then used browser back. Back returned to `/workspace/flashcards`, the list was not blank, and the same set plus `Open mindset set` were visible again. No product bug found.
- Status: пофикшено

### T166 - desktop Files create trigger has no accessible name
- Time: 2026-05-21 09:56
- Description: Opened the desktop Files folder toolbar and inspected the create trigger that opens `New note`, `Import link`, `New folder`, and upload actions. Visually it is a small plus button, but the button itself has no text, `aria-label`, or `title`; the accessible button name is empty while nearby controls like `Filters`, `Name · Asc`, and `Card fields` are named. This makes the primary create affordance ambiguous for keyboard/screen-reader users and harder to target reliably. Product bug found. Retest after naming the create trigger: Playwright can now target `button[name="Create file or folder"]`, the DOM exposes `aria-label="Create file or folder"` and `title="Create"`, and the menu still opens normally.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T166-before-20260521-files-create-trigger-unlabeled.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T166-after-20260521-files-create-trigger-named.png
- Status: пофикшено

### T167 - desktop Create note dialog guards empty save
- Time: 2026-05-21 09:56
- Description: Opened the Files create menu, selected `New note`, and inspected the dialog before typing a name. The dialog showed `Create note`, the `Name` field, `Cancel`, and `Save`; `Save` was disabled while the name was empty. No product bug found.
- Status: пофикшено

### T168 - desktop new note save leaves folder pane visible on file URL
- Time: 2026-05-21 09:56
- Description: Created `UX temp note retry 1779346576824` from the Files `New note` dialog. The API returned `POST /api/workspaces/.../files/register -> 201`, the browser URL changed to the new `?file=d0c7db53-8a9d-4d9b-b774-15944d164e9f` route, and the browser title became `UX temp note retry 1779346576824 — Avenire`; however the visible surface stayed on the folder grid with cards instead of switching to the note preview/editor. This feels split-brained: URL and title say a note is open, but the user still sees the folder. Product bug found. Retest after refreshing folder/tree data before routing to the created note: creating `UX temp fixed 1779347118763` landed directly on the `?file=bcc18bac-3ef8-4771-baaf-9ed78c4a12f2` preview, with the note title, `Add cover`, and `Add property` visible and no stale folder-grid header.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T168-before-20260521-create-note-stale-folder-pane.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T168-after-20260521-create-note-opens-preview.png
- Status: пофикшено

### T169 - desktop direct link to created note opens editor
- Time: 2026-05-21 09:57
- Description: Opened the created note URL `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc?file=d0c7db53-8a9d-4d9b-b774-15944d164e9f` directly. The route restored the note preview/editor with `Add cover`, `Add property`, the note title, and the study-note affordance, so the cold deep-link path works even though the immediate post-create pane state in T168 is wrong. No product bug found.
- Status: пофикшено

### T170 - desktop note preview Rename action does nothing
- Time: 2026-05-21 09:57
- Description: From the direct created-note preview, opened `File actions`, clicked `Rename`, and waited for the rename dialog. The menu closed, but no `Rename file` dialog appeared, no `#item-name-input` was mounted, and the page remained on the same note with no visible feedback. Product bug found. Retest after mounting the shared edit dialog while the preview pane is active: `File actions -> Rename` now opens the `Rename file` dialog with `#item-name-input`, saving issues `PATCH /api/workspaces/.../files/<id> -> 200`, and the renamed file appears in the folder list as `UX temp retry renamed 1779347170350`.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T170-before-20260521-preview-rename-no-dialog.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T170-after-20260521-preview-rename-applied-list.png
- Status: пофикшено

### T171 - mobile Files root resolves to concrete folder
- Time: 2026-05-21 10:11
- Description: Opened `/workspace/files` on a 390px mobile viewport. The route resolved to the concrete workspace/folder URL, the title was the workspace name, and `Welcome to Avenire.md` plus its persisted note properties were visible. No product bug found.
- Status: пофикшено

### T172 - mobile Files create menu opens from named trigger
- Time: 2026-05-21 10:11
- Description: Pressed the mobile `Create file or folder` button in the Files toolbar. The trigger exposed `aria-label="Create file or folder"` and `title="Create"`, then opened a mobile create panel with `New note`, `Import link`, `New folder`, `Upload file`, and `Upload folder`. No product bug found.
- Status: пофикшено

### T173 - mobile Create note dialog guards empty save
- Time: 2026-05-21 10:11
- Description: From the mobile create panel, selected `New note`. The `Create note` dialog opened with a `Name` field and `Save` disabled while the name was empty, so the mobile creation form starts guarded. No product bug found.
- Status: пофикшено

### T174 - mobile new note save opens preview immediately
- Time: 2026-05-21 10:11
- Description: Created `UX mobile temp 1779347424646` from the mobile `Create note` dialog. The URL changed to the new `?file=f0aef50f-6253-4cba-aaed-765fe3399cbc` route and the visible surface immediately switched to the note preview with `Add cover`, `Add property`, and the note title. No product bug found after the T168 fix.
- Status: пофикшено

### T175 - mobile created note reload restores preview
- Time: 2026-05-21 10:11
- Description: Reloaded the mobile URL for `UX mobile temp 1779347424646`. The note preview restored on the same `?file=` route with the title and `Add property` visible; the temporary note was then cleaned up through the product bulk-delete endpoint. No product bug found.
- Status: пофикшено

### T176 - desktop upload activity opens with recent ingestion jobs
- Time: 2026-05-21 10:16
- Description: Opened Upload activity from the desktop Files sidebar after the temp note operations. The panel opened at the bottom-right of the viewport, showed recent queued ingestion jobs with an active count, and stayed on the same concrete Files route instead of navigating away. No product bug found.
- Status: пофикшено

### T177 - desktop upload activity close hides the panel
- Time: 2026-05-21 10:16
- Description: Pressed `Close upload activity` from the desktop upload activity panel. The panel text remains in the DOM because the component animates closed, but computed geometry changed to `opacity: 0` and `pointer-events: none`, while the Files grid stayed visible and interactive. No product bug found.
- Status: пофикшено

### T178 - desktop trash panel shows deleted temp files
- Time: 2026-05-21 10:16
- Description: Opened `Open trash` after deleting the temp UX notes. The trash panel appeared over the current Files route, showed four deleted temp files with `Restore` and `Delete now` actions, and did not crash despite recent file create/rename/delete churn. No product bug found.
- Status: пофикшено

### T179 - desktop trash close returns to Files surface
- Time: 2026-05-21 10:16
- Description: Closed the trash panel with its `Close` button. The concrete Files route remained unchanged, `Welcome to Avenire.md` was still visible, and no visible trash dialog remained. No product bug found.
- Status: пофикшено

### T180 - mobile upload activity opens from sidebar
- Time: 2026-05-21 10:16
- Description: On a 390px mobile Files route, opened the sidebar and pressed `Upload activity`. The mobile drawer opened with the upload activity title, explanatory copy, active count, queued job rows, and a close affordance without losing the underlying Files URL. No product bug found.
- Status: пофикшено

### T181 - desktop Workspace actions menu opens on Files folder
- Time: 2026-05-21 10:20
- Description: From the desktop concrete Files folder route, opened the top-right `Workspace actions` menu. The menu exposed folder-level actions such as `Pin`, `Properties`, `Rename`, `Duplicate`, `Share`, `Move To`, `Download`, `Split right`, `Metadata`, and `Delete` without navigating away or clipping. No product bug found.
- Status: пофикшено

### T182 - desktop Workspace actions dismisses with Escape
- Time: 2026-05-21 10:20
- Description: Pressed Escape after opening the `Workspace actions` menu. The menu dismissed, the URL stayed on the concrete folder route, and `Welcome to Avenire.md` remained visible. No product bug found.
- Status: пофикшено

### T183 - desktop settings overlay opens from Files sidebar
- Time: 2026-05-21 10:20
- Description: Pressed `Open settings` from the desktop Files sidebar. The URL gained `overlay=settings&settingsTab=account`, the settings overlay opened on Account with Preferences/Workspace/Data/Billing/Security/Keyboard Shortcuts navigation visible, and the underlying Files route stayed intact. No product bug found.
- Status: пофикшено

### T184 - desktop settings overlay closes back to Files
- Time: 2026-05-21 10:20
- Description: Pressed Escape from the desktop settings overlay. The URL returned to the concrete Files folder route, no visible settings dialog remained, and the seeded file grid stayed present. No product bug found.
- Status: пофикшено

### T185 - mobile settings opens from Files sidebar
- Time: 2026-05-21 10:20
- Description: On a 390px mobile Files route, opened the sidebar and pressed `Open settings`. The route gained the settings overlay query, the mobile settings surface showed Account/Profile controls plus section navigation, and it kept a visible close control. No product bug found.
- Status: пофикшено

### T186 - authenticated public root remains readable
- Time: 2026-05-21 10:24
- Description: Opened `/` while already authenticated. The marketing landing page loaded normally with navigation, CTA copy, pricing links, and product sections; it did not break the authenticated session or throw the user into a blank redirect loop. No product bug found.
- Status: пофикшено

### T187 - authenticated pricing route remains readable
- Time: 2026-05-21 10:24
- Description: Opened `/pricing` while already authenticated. The pricing page rendered monthly/yearly controls, Access/Core/Scholar plan cards, and comparison content without disrupting the session. No product bug found.
- Status: пофикшено

### T188 - authenticated login route redirects to workspace
- Time: 2026-05-21 10:24
- Description: Opened `/login` while already authenticated. The app redirected to `/workspace`, showed the dashboard, and did not expose a stale login form to the active user. No product bug found.
- Status: пофикшено

### T189 - authenticated register route redirects to workspace
- Time: 2026-05-21 10:24
- Description: Opened `/register` while already authenticated. The app redirected to `/workspace`, showed the dashboard, and did not expose a second signup form to the active user. No product bug found.
- Status: пофикшено

### T190 - authenticated waitlist route returns workspace user to workspace
- Time: 2026-05-21 10:24
- Description: Opened `/waitlist` while already authenticated with an existing workspace and normal access to `/workspace`. Before the fix, the route redirected to `/onboarding` and showed step 1 `Upload your first file`, which felt like a reset to first-run setup for a user who already has a seeded workspace and files. After the fix, the same authenticated route redirects to `/workspace`, shows the dashboard, and does not expose onboarding. Product bug fixed and retested.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T190-before-20260521-auth-waitlist-onboarding.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T190-after-20260521-auth-waitlist-workspace.png
- Status: пофикшено

### T191 - desktop note split right opens a second workspace pane
- Time: 2026-05-21 10:27
- Description: From the concrete note route, opened `File actions` and selected `Split right`. The left pane kept the selected `Welcome to Avenire` note, while the right pane opened the Workspace dashboard with quick actions and today's tasks visible. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T191-verified-20260521-split-right-two-panes.png
- Status: пофикшено

### T192 - right split pane can navigate to Files without replacing the left note
- Time: 2026-05-21 10:27
- Description: In the right split pane, pressed the dashboard `Files` action. The right pane navigated to the workspace Files grid with search, filters, sort, card fields, and the seeded note card visible; the left pane still showed the original note content. The browser URL followed the active right pane's folder route, which matched the active-pane navigation model. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T192-verified-20260521-right-pane-files.png
- Status: пофикшено

### T193 - right split pane back button restores its previous dashboard state
- Time: 2026-05-21 10:27
- Description: Pressed the right pane's `Go back` control after navigating that pane to Files. The right pane returned to the Workspace dashboard, while the left note remained open and readable. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T193-verified-20260521-right-pane-back.png
- Status: пофикшено

### T194 - right split pane forward button restores the Files grid
- Time: 2026-05-21 10:27
- Description: Pressed the right pane's `Go forward` control after T193. The right pane returned to the Files grid, including the workspace title, controls, and seeded card, without disturbing the left note. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T194-verified-20260521-right-pane-forward.png
- Status: пофикшено

### T195 - right split pane closes back to a single note pane
- Time: 2026-05-21 10:27
- Description: Opened the right pane `Workspace actions` menu and selected `Close pane`. The split closed, the note expanded back to the full content area, the concrete `?file=` route returned, and no right-pane Files UI remained visible. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T195-verified-20260521-close-right-pane.png
- Status: пофикшено

### T196 - mobile direct Tasks route renders task controls after refresh
- Time: 2026-05-21 10:29
- Description: Opened `/workspace/tasks` directly on a 390px viewport. The Tasks page rendered with the mobile header, `New Task` button, List/Kanban tabs, search, filter controls, and an empty-state card. The header controls stayed inside the viewport and the route did not fall back to a blank workspace. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T196-verified-20260521-mobile-direct-tasks.png
- Status: пофикшено

### T197 - mobile direct new chat route renders the New Method composer
- Time: 2026-05-21 10:29
- Description: Opened `/workspace/chats/new` directly on a 390px viewport. The route rendered as `New Method` with pane navigation controls, the greeting for the authenticated user, attachment and voice controls, an input placeholder, and a send button; no desktop sidebar content overlapped the composer. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T197-verified-20260521-mobile-direct-new-chat.png
- Status: пофикшено

### T198 - desktop direct Mindset Set route renders existing set state
- Time: 2026-05-21 10:29
- Description: Opened `/workspace/flashcards/4d6382b7-b223-4209-9e38-578a7621113b` directly on desktop. The `UX Set 1779345922999` detail view rendered with Edit mindset, Pause, Add Card, Delete set, review metrics, study profile, context, and card bank sections. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T198-verified-20260521-desktop-direct-mindset-set.png
- Status: пофикшено

### T199 - mobile direct Mindset Set route preserves controls and content
- Time: 2026-05-21 10:29
- Description: Opened the same Mindset Set route on a 390px viewport. The mobile detail page kept the set title, Manual mode, action buttons, review state, study profile, context, and card bank visible without horizontal clipping. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T199-verified-20260521-mobile-direct-mindset-set.png
- Status: пофикшено

### T200 - desktop Files root redirects to concrete workspace folder
- Time: 2026-05-21 10:29
- Description: Opened `/workspace/files` directly on desktop. The route redirected to `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc`, rendered the workspace Files grid, and showed the seeded `Welcome to Avenire.md` card with folder controls intact. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T200-verified-20260521-desktop-files-root-redirect.png
- Status: пофикшено

### T201 - backend-created note appears in Files after refresh
- Time: 2026-05-21 10:56
- Description: Created `UX backend trash 1779350170110` through `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/files/register`, then opened the concrete root folder route. The newly registered markdown note appeared as a card in Files after a normal page load, so API-created notes are visible to the user-facing Files surface. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T201-verified-20260521-api-created-note-visible.png
- Status: пофикшено

### T202 - backend-deleted note remains visible in Files after reload
- Time: 2026-05-21 10:56
- Description: Soft-deleted `UX backend trash 1779350170110` through `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/items/bulk` with `operation=delete`; the API returned `200` with `succeeded: 1`. Reloaded the concrete Files folder route, but the deleted note card was still visible in the grid next to `Welcome to Avenire.md`. This was confusing because the backend accepted the delete and the item also appeared in Trash, so Files and Trash disagreed about the same record. Product bug found. Retest after invalidating workspace read caches from successful bulk mutations: created `UX backend trash fixed 1779350700076`, soft-deleted it through the same endpoint, reloaded Files, and the deleted card disappeared while `Welcome to Avenire.md` remained visible. Product bug fixed and retested.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T202-before-20260521-api-deleted-note-still-visible.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T202-after-20260521-api-deleted-note-hidden-from-files.png
- Status: пофикшено

### T203 - Trash shows backend-deleted note with recovery actions
- Time: 2026-05-21 10:56
- Description: Opened `Open trash` after the backend soft-delete. The trash panel showed `UX backend trash 1779350170110` with `Restore` and `Delete now` actions available, confirming the backend mutation reached trash state even though the folder grid in T202 still showed the item. No separate product bug found beyond the folder/trash disagreement in T202.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T203-verified-20260521-trash-shows-deleted-note.png
- Status: пофикшено

### T204 - backend restore returns deleted note to Files
- Time: 2026-05-21 10:56
- Description: Restored `UX backend trash 1779350170110` through `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/trash`; the API returned `200` with `ok: true`. Reopened the concrete folder route and the note was visible in Files again. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T204-verified-20260521-restored-note-visible.png
- Status: пофикшено

### T205 - permanently deleted note deep link keeps stale note shell
- Time: 2026-05-21 10:56
- Description: Soft-deleted and then permanently deleted `UX backend trash 1779350170110` through `DELETE /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/trash`; the API returned `200` with `ok: true`. Opening the old `?file=0460c632-b0f0-4287-8812-ecad7898c665` deep link kept the deleted note title in the header and showed `Markdown file not found` in the content area. The route should fail coherently, clear the stale selected-file shell, or return to folder context instead of presenting a deleted note as half-open. Product bug found. Retest after invalidating workspace read caches from trash permanent-delete: permanently deleted `UX backend trash fixed 1779350700076`, opened its old `?file=551ee890-2905-4dc4-9ec6-a7413adef920` deep link, and the page resolved back to the normal Files folder context without the deleted title or half-open markdown shell. Product bug fixed and retested.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T205-before-20260521-hard-deleted-note-stale-shell.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T205-after-20260521-hard-deleted-note-cleared.png
- Status: пофикшено

### T206 - backend duplicate note is missing from Files after reload
- Time: 2026-05-21 11:07
- Description: Duplicated the seeded note through `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/items/duplicate`; the API returned `201` with file `565aea6c-8fc1-4013-b8c8-e939fd556c54` named `Welcome to Avenire (1).md`. Reloaded the concrete root folder route, but the duplicate file was not visible; only the original `Welcome to Avenire.md` card appeared. Product bug found. Retest after invalidating workspace read caches from duplicate handlers: duplicated the seeded note again, reloaded the root folder, and `Welcome to Avenire (1).md` appeared immediately next to the original note. Product bug fixed and retested.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T206-before-20260521-duplicate-note-missing-after-reload.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T206-after-20260521-duplicate-note-visible-after-reload.png
- Status: пофикшено

### T207 - duplicate note direct link falls back to folder grid
- Time: 2026-05-21 11:07
- Description: Opened `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc?file=565aea6c-8fc1-4013-b8c8-e939fd556c54` immediately after the duplicate API returned success. The route stayed on the duplicate `?file=...` URL, but the visible surface was just the folder grid with the original note; it did not open the duplicated note preview/editor. Product bug found. Retest after duplicate cache invalidation: opening the new duplicate `?file=c22974e1-70df-4571-9aa7-15e7d93ae4f6` URL opened the note preview/editor with `Add cover`, `Add property`, and the copied markdown body visible. The heading remains `Welcome to Avenire` because the duplicated markdown content intentionally copies the original H1. Product bug fixed and retested.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T207-before-20260521-duplicate-direct-link-shows-folder.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T207-after-20260521-duplicate-direct-link-opens-note.png
- Status: пофикшено

### T208 - backend-created folder appears in Files after reload
- Time: 2026-05-21 11:07
- Description: Created `UX backend move 1779350823091` through `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folders`, then reloaded the root folder route. The folder appeared in the grid with the folder label, confirming folder creation invalidates the Files/tree read views. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T208-verified-20260521-api-created-folder-visible.png
- Status: пофикшено

### T209 - backend bulk move hides moved note from source folder
- Time: 2026-05-21 11:07
- Description: Moved duplicated file `565aea6c-8fc1-4013-b8c8-e939fd556c54` into folder `UX backend move 1779350823091` through `POST /api/workspaces/.../items/bulk` with `operation=move`. Reloaded the source root folder, and the duplicate note disappeared while the target folder remained visible. No product bug found after the T202/T205 cache invalidation fix.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T209-verified-20260521-moved-note-hidden-from-root.png
- Status: пофикшено

### T210 - backend bulk move shows moved note in target folder
- Time: 2026-05-21 11:07
- Description: Opened the target folder route `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/a0aef9cf-c076-4aa9-ba6e-411b5723b134` after the bulk move. The folder page showed `UX backend move 1779350823091` and the moved `Welcome to Avenire (1).md` note. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T210-verified-20260521-moved-note-visible-in-target-folder.png
- Status: пофикшено

### T211 - backend file share link creates public share URL
- Time: 2026-05-21 11:13
- Description: Created `UX share file 1779351203397` through the note register API, then called `POST /api/workspaces/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/files/<fileId>/share/link`. The API returned `200`, a token, an expiry date, `permission: viewer`, and a localhost `/share/...` URL. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T211-verified-20260521-file-share-link-created.png
- Status: пофикшено

### T212 - anonymous shared file page opens from generated link
- Time: 2026-05-21 11:13
- Description: Opened the generated file share URL in a fresh anonymous browser context. The page returned `200` and showed `Shared file`, `UX share file 1779351203397`, and the `Open file` action without redirecting to login. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T212-verified-20260521-anon-shared-file-page.png
- Status: пофикшено

### T213 - deleted shared file link returns not found
- Time: 2026-05-21 11:13
- Description: Soft-deleted and permanently deleted `UX share file 1779351203397`, then reopened the same anonymous share URL. The response was `404` and the not-found page appeared instead of stale shared-file content. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T213-verified-20260521-deleted-shared-file-not-found.png
- Status: пофикшено

### T214 - anonymous shared folder page opens empty folder state
- Time: 2026-05-21 11:13
- Description: Created `UX share folder 1779351209290`, generated a folder share link, and opened it in the anonymous context. The page returned `200`, showed `Shared folder`, the folder name, `Folders`, `No subfolders yet`, `Files`, and `No files yet`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T214-verified-20260521-anon-shared-folder-page.png
- Status: пофикшено

### T215 - deleted shared folder link returns not found
- Time: 2026-05-21 11:13
- Description: Soft-deleted and permanently deleted `UX share folder 1779351209290`, then reopened its anonymous share URL. The response was `404` and the not-found page appeared rather than stale folder metadata. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T215-verified-20260521-deleted-shared-folder-not-found.png
- Status: пофикшено

### T216 - backend-created due task appears in Tasks UI
- Time: 2026-05-21 11:15
- Description: Created `UX backend task 1779351328319` through `POST /api/tasks` with status `planned`, high priority, description, and a due timestamp. Opening `/workspace/tasks` showed the task in the sidebar due list and in the main Tasks list under `PLANNED`, with the description, due date, priority, and assignee visible. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T216-verified-20260521-api-created-task-visible.png
- Status: пофикшено

### T217 - direct task detail query opens backend-created task
- Time: 2026-05-21 11:15
- Description: Opened `/workspace/tasks?task=68f33a99-e6a8-498a-9c7c-945c10473a2b` directly after API creation. The task details sheet opened with title, assignee, linked resources area, due date, status, priority, notes, `Mark complete`, `Delete`, `Reset`, and `Save changes` controls. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T217-verified-20260521-direct-task-detail.png
- Status: пофикшено

### T218 - backend-completed task moves to completed state in UI
- Time: 2026-05-21 11:15
- Description: Updated the task through `PATCH /api/tasks/68f33a99-e6a8-498a-9c7c-945c10473a2b` with `status=completed`; the API returned `200` and a `completedAt` timestamp. Reopening Tasks showed the due sidebar cleared and the main list moved the task into `COMPLETED`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T218-verified-20260521-completed-task-list-state.png
- Status: пофикшено

### T219 - backend-deleted task disappears from Tasks UI
- Time: 2026-05-21 11:15
- Description: Deleted `UX backend task 1779351328319` through `DELETE /api/tasks/68f33a99-e6a8-498a-9c7c-945c10473a2b`; the API returned `{ success: true }`. Reopening `/workspace/tasks` removed the task and showed the empty/no-match state. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T219-verified-20260521-deleted-task-hidden.png
- Status: пофикшено

### T220 - deleted task deep link clears stale task details
- Time: 2026-05-21 11:15
- Description: Opened `/workspace/tasks?task=68f33a99-e6a8-498a-9c7c-945c10473a2b` after deleting that task. The page did not show the deleted title or description; the details panel changed to `Select a task` while the list stayed empty. The URL still contains the stale query, but the UI does not expose stale task data. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T220-verified-20260521-deleted-task-deeplink-clears.png
- Status: пофикшено

### T221 - backend-created flashcard increments count but Card bank is blank
- Time: 2026-05-21 11:18
- Description: Created a card in `UX Set 1779345922999` through `POST /api/flashcards/sets/4d6382b7-b223-4209-9e38-578a7621113b/cards`; the API returned `201` with card `111163ae-efb0-49f1-85c4-fd742f1ddf69`. Reopened the set route and the profile correctly showed `1 cards` and `0 due · 1 new`, but the `Card bank` area itself stayed visually blank and did not show the new front/back text. Product bug found.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T221-before-20260521-card-bank-count-no-card.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T221-after-20260521-card-bank-renders-created-card.png
- Status: пофикшено

### T222 - backend-created flashcard appears in review queue API
- Time: 2026-05-21 11:18
- Description: Called `/api/flashcards/review/queue?setId=4d6382b7-b223-4209-9e38-578a7621113b&limit=10` after creating card `111163ae-efb0-49f1-85c4-fd742f1ddf69`. The API returned the card with front, back, source taxonomy, tags, and set metadata. No product bug found; this also confirms the blank card bank in T221 is a UI/rendering problem, not missing backend data.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T222-verified-20260521-flashcard-review-queue-context.png
- Status: пофикшено

### T223 - backend-updated flashcard still does not render in Card bank
- Time: 2026-05-21 11:18
- Description: Updated card `111163ae-efb0-49f1-85c4-fd742f1ddf69` through `PATCH /api/flashcards/cards/111163ae-efb0-49f1-85c4-fd742f1ddf69`; the API returned `200` with updated front text `UX flash front 1779351450868 updated`. Reopened the set route and the counters still showed `1 cards` and `1 new`, but Card bank remained blank and did not expose the updated card. Product bug found.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T223-before-20260521-updated-card-still-not-visible.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T223-after-20260521-card-bank-renders-updated-card.png
- Status: пофикшено

### T224 - backend-deleted flashcard clears set count
- Time: 2026-05-21 11:18
- Description: Archived/deleted card `111163ae-efb0-49f1-85c4-fd742f1ddf69` through `DELETE /api/flashcards/cards/111163ae-efb0-49f1-85c4-fd742f1ddf69`. Reopened the set route and the set showed `0 cards`, `1 killed`, and `No cards queued`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T224-verified-20260521-deleted-flashcard-hidden.png
- Status: пофикшено

### T225 - backend-deleted flashcard clears review queue
- Time: 2026-05-21 11:18
- Description: Called `/api/flashcards/review/queue?setId=4d6382b7-b223-4209-9e38-578a7621113b&limit=10` after deleting the card. The queue returned an empty array and did not include stale card `111163ae-efb0-49f1-85c4-fd742f1ddf69`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T225-verified-20260521-deleted-flashcard-queue-cleared.png
- Status: пофикшено

### T226 - flashcard recreate after archive reuses ordinal and 500s
- Time: 2026-05-21 11:28
- Description: During the Card bank retest, tried to create a new card in `UX Set 1779345922999` after the previous card had been archived/deleted. `POST /api/flashcards/sets/4d6382b7-b223-4209-9e38-578a7621113b/cards` returned `500`, and the server log showed `duplicate key value violates unique constraint "flashcard_card_set_ordinal_uidx"` for `(set_id, ordinal)=(4d6382b7-b223-4209-9e38-578a7621113b, 1)`. Product bug found: archived cards still occupy the unique `(set_id, ordinal)` history, but the allocator was only looking at non-archived cards. Fixed the allocator to compute the next ordinal across all cards in the set, then retested: the same recreate flow returned `201` with card `5beb21b4-531f-4180-8387-5a9ea2497b5c`, and the set page rendered the new row in Card bank.
- Evidence before fix: server log in the live retest: `flashcard_card_set_ordinal_uidx` duplicate on ordinal `1`.
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T226-after-20260521-flashcard-recreate-after-archive-succeeds.png
- Status: пофикшено

### T227 - updated flashcard is in review queue after recreate
- Time: 2026-05-21 11:33
- Description: Called `/api/flashcards/review/queue?setId=4d6382b7-b223-4209-9e38-578a7621113b&limit=10` after the recreate/patch retest. The API returned card `5beb21b4-531f-4180-8387-5a9ea2497b5c` with ordinal `2`, updated front/back text, normalized taxonomy, and tags, then the set page showed that same card in Card bank. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T227-verified-20260521-review-queue-card-visible-in-set.png
- Status: пофикшено

### T228 - Start review opens recreated card in study dialog
- Time: 2026-05-21 11:33
- Description: Pressed `Start review` on `UX Set 1779345922999` with the recreated card queued. The `Mindset Session` dialog opened, showed progress `1/1`, and rendered the updated front text `UX recreate after archive 1779352095841 updated` instead of opening an empty review shell. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T228-verified-20260521-review-dialog-front-card.png
- Status: пофикшено

### T229 - review rating buttons stay guarded before reveal
- Time: 2026-05-21 11:33
- Description: In the review dialog, checked the `3 · Good` rating before revealing the answer. The button was disabled while the answer side was hidden, so a user cannot accidentally submit a rating without seeing the back of the card. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T229-verified-20260521-review-ratings-disabled-before-reveal.png
- Status: пофикшено

### T230 - Reveal answer shows patched back text and enables rating
- Time: 2026-05-21 11:33
- Description: Pressed `Reveal answer` in the review dialog. The back text `Ordinal allocator retest 1779352095841 updated` appeared, and the `3 · Good` rating became enabled. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T230-verified-20260521-review-answer-revealed-rating-enabled.png
- Status: пофикшено

### T231 - Good rating completes one-card review and clears immediate queue
- Time: 2026-05-21 11:33
- Description: Submitted `3 · Good` for card `5beb21b4-531f-4180-8387-5a9ea2497b5c`. The dialog changed to `Session complete`, and a fresh `/api/flashcards/review/queue?setId=...&limit=10` call returned an empty queue for that set, so the reviewed card did not remain immediately due. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T231-verified-20260521-review-good-session-complete.png
- Status: пофикшено

### T232 - flashcard review counters persist after completed study
- Time: 2026-05-21 11:37
- Description: Reloaded `/workspace/flashcards/4d6382b7-b223-4209-9e38-578a7621113b` after submitting the `Good` review. The set summary rendered `0 due · 0 new · 1 studied today`, confirming the review write propagated back into the selected-set UX after a real reload. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T232-verified-20260521-flashcard-study-count-after-review.png
- Status: пофикшено

### T233 - user settings GET returns stable persisted preferences
- Time: 2026-05-21 11:37
- Description: Called `/api/user-settings` while authenticated. The endpoint returned `200` with a `settings` object including `emailReceipts`, `completedTasksAtTop`, onboarding state, pet name, and pet accessory instead of returning an auth loop or partial null payload. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T233-verified-20260521-user-settings-get-json.png
- Status: пофикшено

### T234 - user settings PUT persists completed-task ordering into Preferences UI
- Time: 2026-05-21 11:39
- Description: Sent `PUT /api/user-settings` with `{ completedTasksAtTop: false }`, received `200`, then opened `/workspace?overlay=settings&settingsTab=preferences`. The Preferences sheet showed the `Completed tasks` select value as `bottom`, so the backend preference write was visible in the deep-linked settings UI. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T234-verified-20260521-user-settings-bottom-visible.png
- Status: пофикшено

### T235 - invalid user settings payload fails closed without mutating preference
- Time: 2026-05-21 11:39
- Description: Sent `PUT /api/user-settings` with `{ completedTasksAtTop: "nope" }`. The endpoint returned `400` with `Provide at least one setting...`; a follow-up GET still had `completedTasksAtTop: false`, and the Preferences UI remained on `bottom`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T235-verified-20260521-user-settings-invalid-did-not-change.png
- Status: пофикшено

### T236 - restored user settings value propagates back to Preferences UI
- Time: 2026-05-21 11:39
- Description: Sent `PUT /api/user-settings` with `{ completedTasksAtTop: true }` to restore the test account default, then reopened the Preferences deep link. The `Completed tasks` select value returned to `top`, confirming the setting can round-trip in both directions without stale local state. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T236-verified-20260521-user-settings-restored-top-visible.png
- Status: пофикшено

### T237 - extension identity endpoint returns authenticated user
- Time: 2026-05-21 11:44
- Description: Opened `/api/extension/me` in the authenticated session. The endpoint returned `200` with the QA user's id, email, username, display username, and email verification state, giving extension clients a coherent signed-in identity payload. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T237-verified-20260521-extension-me-json.png
- Status: пофикшено

### T238 - extension workspace list includes the active workspace
- Time: 2026-05-21 11:44
- Description: Opened `/api/extension/workspaces` and verified a `200` response with workspace `919ed32c-fb5a-4fe1-98aa-db048a6e71cc`, its organization id, display name, and root folder id `784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc`. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T238-verified-20260521-extension-workspaces-json.png
- Status: пофикшено

### T239 - extension destinations endpoint handles empty preset state
- Time: 2026-05-21 11:44
- Description: Opened `/api/extension/destinations` with no saved extension presets. The endpoint returned `200` with an empty `destinations` array instead of a null body or error, which is the right backend UX for a first-run extension state. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T239-verified-20260521-extension-destinations-json.png
- Status: пофикшено

### T240 - imports providers endpoint exposes disconnected provider state
- Time: 2026-05-21 11:46
- Description: Opened `/api/imports/providers`. The endpoint returned `200` with `google` and `notion` provider objects, both configured/connected/ready false for this local account, plus an explicit `destination` key. That gives the import UI enough state to render a disconnected setup flow. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T240-verified-20260521-imports-providers-json.png
- Status: пофикшено

### T241 - imports destination endpoint handles unset destination state
- Time: 2026-05-21 11:46
- Description: Opened `/api/imports/destination` for the QA user before configuring an import target. The endpoint returned `200` with `destination: null`, making the unset state explicit instead of pretending a folder exists or returning a 500. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T241-verified-20260521-imports-destination-json.png
- Status: пофикшено

### T242 - invalid imports destination PUT fails closed
- Time: 2026-05-21 11:46
- Description: Sent `PUT /api/imports/destination` with invalid `workspaceId: "not-a-uuid"` and a real folder id. The endpoint returned `400` with `Invalid payload`; a follow-up destination GET still matched the previous unset destination state. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T242-verified-20260521-import-destination-invalid-400.png
- Status: пофикшено

### T243 - upload session invalid payload returns clear 400
- Time: 2026-05-21 11:46
- Description: Sent `POST /api/uploads/sessions` with an empty filename and negative `sizeBytes`. The route returned `400` with `Invalid payload`, so the upload pipeline rejects impossible sessions before creating backend state. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T243-verified-20260521-upload-session-invalid-400.png
- Status: пофикшено

### T244 - unknown upload session GET returns 404
- Time: 2026-05-21 11:46
- Description: Opened `/api/uploads/sessions/00000000-0000-0000-0000-000000000000`. The endpoint returned `404` with `Session not found`, which is a clear backend state response for stale upload resumptions. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T244-verified-20260521-upload-session-unknown-404.png
- Status: пофикшено

### T245 - unknown upload session parts POST returns 404
- Time: 2026-05-21 11:46
- Description: Sent `POST /api/uploads/sessions/00000000-0000-0000-0000-000000000000/parts` with part `1`. The endpoint returned `404` with `Session not found`, so multipart upload URL generation does not create phantom sessions. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T245-verified-20260521-upload-session-parts-unknown-404.png
- Status: пофикшено

### T246 - unknown upload session completion returns 404
- Time: 2026-05-21 11:46
- Description: Sent `POST /api/uploads/sessions/00000000-0000-0000-0000-000000000000/complete` with fake storage metadata. The endpoint returned `404` with `Session not found`, so completion cannot finalize or register files for a missing session. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T246-verified-20260521-upload-session-complete-unknown-404.png
- Status: пофикшено

### T247 - invalid workspace files deep link does not expose stale folder grid
- Time: 2026-05-21 11:52
- Description: Loaded the valid root files route first, then opened `/workspace/files/00000000-0000-0000-0000-000000000000/folder/784313d8-0fba-4a5c-a7ab-af1fc8d1cbcc`. After the stale snapshot fix, the Files shell stayed stable and did not show the previously loaded `Welcome to Avenire.md` card under the invalid workspace id. No product bug found after fix.
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T247-after-20260521-invalid-workspace-files-clears-stale-grid.png
- Status: пофикшено

### T248 - invalid folder deep link no longer leaves previous folder contents visible
- Time: 2026-05-21 11:52
- Description: Opened the valid workspace root folder, then navigated to `/workspace/files/919ed32c-fb5a-4fe1-98aa-db048a6e71cc/folder/00000000-0000-0000-0000-000000000000`. Before the fix, this stale-route path could keep the previous folder snapshot visible under the invalid URL. Product bug found and fixed by clearing visible explorer files/folders/breadcrumbs when no folder snapshot or folder payload exists. Retest confirmed `Welcome to Avenire.md` was not visible on the invalid folder URL.
- Screenshot before fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T248-verified-20260521-invalid-folder-route.png
- Screenshot after fix: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T248-after-20260521-invalid-folder-clears-stale-grid.png
- Status: пофикшено

### T249 - invalid flashcard set deep link shows not-found state
- Time: 2026-05-21 11:52
- Description: Opened `/workspace/flashcards/00000000-0000-0000-0000-000000000000` directly. The route stayed inside the Mindset Sets shell, showed `Mindset set not found.`, and gave recovery copy to go back to the set list rather than showing stale set details. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T249-verified-20260521-invalid-flashcard-set-route.png
- Status: пофикшено

### T250 - invalid method slug falls back to New Method without stale chat
- Time: 2026-05-21 11:52
- Description: Opened `/workspace/chats/not-a-real-method-slug-20260521` directly. The route settled on `New Method - Avenire`, kept the Methods sidebar empty state, and did not render any stale method transcript or runtime error. No product bug found.
- Screenshot: /Users/johnmacartew/Developer.nosync/aveniri/screenshots/T250-verified-20260521-invalid-method-slug-route.png
- Status: пофикшено
