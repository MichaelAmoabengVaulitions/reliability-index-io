# Reliability Index Explorer

A tool for risk analysts to view and understand a user's Reliability Index, a
credit score from 0 to 100 that the backend builds from a person's bank
transaction history. The score is meant for people who have little or no
ordinary credit history, so the transaction data is the main evidence.

The tool exists so an analyst can see how a score was reached, look at the
transactions behind it, spot anything unusual, and check that the scoring
behaves the way it should.

## What the app does

Pick a user from the top bar and the dashboard shows these things about them.

1. **Reliability score.** The headline score, the score band, where it sits
   on a 0 to 100 scale, how close it is to the next band, and the date range
   it covers.
2. **Why this score.** The reasons behind the score, sorted into what is
   helping and what is hurting, with the biggest point values first.
3. **Monthly Cashflow.** A chart of money in, money out, and the net result
   for every month the score covers.
4. **Key numbers and score breakdown.** Six key numbers, and the four parts
   that add up to the score.
5. **Transaction Explorer.** The full list of transactions used in scoring,
   with search, filters for category and for money in or out, sorting, and
   smooth scrolling even with thousands of rows.

The app also listens for live transaction updates and adds them into the
list and the chart as they arrive.

## Getting started

You need Node version 20 or newer and Yarn (the classic version 1).

```bash
yarn install
yarn dev
```

Open the address Vite prints, usually `http://localhost:5173`.

By default the app talks to the hosted backend. To point it somewhere else,
copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

Other commands:

```bash
yarn test          # run the test suite once
yarn lint          # check code style
yarn typecheck     # check the types
yarn run check     # run all three of the above together
yarn build         # build the app ready to deploy
```

A note on `yarn run check`: Yarn version 1 has its own built in `yarn check`
command, so the project script has to be called with `yarn run check`.

## Libraries chosen, and why

The brief asks for the library choices to be documented.

| Library                      | What it does here                                                                           | Why                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| React with TypeScript        | The app itself                                                                              | The combination the brief asks for. TypeScript catches mistakes before the code runs.                                                            |
| Vite                         | Runs the app while developing, and builds the final version                                 | Starts and rebuilds fast.                                                                                                                        |
| TanStack Query (React Query) | Fetches backend data, caches it, tracks loading and error states                            | Removes a large amount of fetching and caching code that would otherwise be written by hand.                                                     |
| Zod                          | Checks that every backend response has the fields the app expects, at the moment it arrives | If the backend sends something unexpected, the app says so at that exact spot with a clear message, instead of failing in a confusing way later. |
| React Router                 | Maps web addresses to screens, and holds the selected user, date and filters in the URL     | A filtered view can be shared by copying the link, and the back button works.                                                                    |
| Recharts                     | Draws the monthly cashflow chart                                                            | A solid chart library, quick to set up.                                                                                                          |
| TanStack Virtual             | Lets the transaction list hold thousands of rows                                            | Only the rows on screen are actually drawn, so scrolling stays smooth.                                                                           |
| Vitest with Testing Library  | Runs the tests                                                                              | Fast, and made for a Vite project.                                                                                                               |
| Tailwind CSS                 | Styling                                                                                     | Its small styling classes keep the look consistent.                                                                                              |
| lucide-react                 | Icons                                                                                       | A clean, light icon set.                                                                                                                         |

## How the code is organised

Each folder under `src` has one job.

| Folder           | What lives there                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api`        | Everything that talks to the backend: the fetch functions, the Zod checks that describe each response, and the two kinds of error the app reports.                                                                              |
| `src/domain`     | Small helper functions with no link to React or the network: money formatting, date maths, the scoring helpers, the merchant category names.                                                                                    |
| `src/data`       | The link between the backend and the screens: the parts that fetch and cache backend data, and the shared transaction data that live updates are combined into.                                                                 |
| `src/features`   | One folder per dashboard feature: overview, breakdown, cashflow, explanation, transactions. Each folder also holds the logic only that feature needs: the cashflow card's monthly totals, the explorer's filtering and sorting. |
| `src/routes`     | The page frame: the top bar, the user picker, the date picker, and the dashboard that arranges the feature cards.                                                                                                               |
| `src/ui`         | Small building blocks reused across features: the card, the loading placeholder, the empty state, the error state, and the error catcher.                                                                                       |
| `src/config.ts`  | Every number worth adjusting in one place: page sizes, retry counts, the scoring window length, and the scores where each band starts.                                                                                          |
| `src/theme.ts`   | Every colour in one place. Both the styling system and the chart read from it.                                                                                                                                                  |
| `src/test-utils` | The fake data builders and the mock backend used by the tests.                                                                                                                                                                  |

One rule keeps the feature folders from tangling: a feature folder never
imports from another feature folder. So a feature folder holds only the code
that one feature uses, and anything two or more features need lives in a
shared folder instead: `data`, `domain` or `ui`.

This is why the cashflow totals and the transaction filtering each sit with
the one feature that uses them, while the code that talks to the backend
stays in `src/data`. That backend code is kept together even when only one
screen uses a given piece today, because its job is looking after backend
data, not drawing one screen. The live updates connection is the clearest
example: the dashboard switches it on, and it keeps the shared transaction
data fresh for both the transaction explorer and the cashflow chart.

## How data flows through the app

```mermaid
flowchart TD
  Backend[Backend API]
  Client[api: fetch, then check the response with Zod]
  Hooks[data: fetch and cache backend data]
  Shapers[features: prepare the data for each card]
  Features[features: the five dashboard cards]
  URL[Address bar: user, date and filters]
  Live[Live transaction updates]

  Backend --> Client
  Client --> Hooks
  Hooks --> Shapers
  Shapers --> Features
  URL <--> Features
  Live --> Hooks
  Hooks --> Features
```

The journey of a score, step by step:

1. The analyst picks a user. The user id goes into the address bar as part of
   the path, and the route's loader starts fetching that user's data straight
   away, without waiting for the page to draw.
2. The app asks the backend for that user's score. The response passes through
   the Zod check, which confirms it has the expected fields, then React Query
   caches it.
3. The app asks the backend for the transaction history. The backend returns
   the data one page at a time, so the app asks for each page in turn until
   there are no more. The cards show their loading state until every page is in.
4. The transactions are stored in a lookup table that finds each one by its
   id, which makes later updates quick and removes any duplicates.
5. The address bar holds what the analyst has narrowed down to. The explorer
   filters and sorts the stored transactions and shows the result.
6. The cashflow card sums the same transactions into monthly totals.
7. If a live update arrives, it is applied straight to the cached data, and
   every card reading that cache redraws on its own.

## State management decisions

State is split into two kinds, each kept where it belongs.

**Backend data** (the score, the transactions) lives in React Query. React
Query owns fetching, caching, retrying, and the loading and error states. A
component never keeps its own copy of backend data.

**State the analyst controls** (the chosen user, the date, the filters and the
sort) lives in the URL, and nowhere else. Components read it through
`useDashboardParams`, so there is only one copy of each value. Opening a saved
link restores the same view, and the back button works. Anything in the URL
that doesn't make sense falls back to its default.

The search box keeps what is being typed in local state, and updates the URL
after a short pause, so a burst of typing counts as one change.

NOTE: THERE ARE CUSTOM HOOKS WHICH SHOULD BE RATHER UTILITY FUNCTIONS. IT DOES NOT HURT THE PROJECT BUT THEY FOLLOW THE RULES OF CUSTOM HOOK WHICH IN PRACTICE TJEY SHOULD NOT

## Component design

The five features are each a self contained folder. Each one is wrapped in an
error catcher tied to the selected user, so if one feature hits an unexpected
error the other four keep working, and picking a different user clears it.

Repeated layout pieces are pulled into `src/ui` as small building blocks: a
card, a loading placeholder, an empty state, an error state, and the error
catcher. A feature builds itself out of these rather than restating the same
layout.

Every feature handles three states on its own: it shows a loading placeholder
while the data is on its way, an error state with a retry button if the
request fails, and an empty state if there is genuinely nothing to show.

## Testing

There are 393 tests. They run with `yarn test`.

For the helper functions (the API client, the date and money and scoring
helpers, the functions that prepare the data) the test was written before the
function, watched fail, and then made to pass. These are the parts where a quiet mistake would be hardest to notice
later, so they have close coverage.

For the React components the bar is lighter: each one has a test that draws
it and checks the important text and behaviour appear. A small fake `fetch`
answers the network calls during tests, so the tests are fast and do not
depend on the real backend being up.

## Assumptions

- The scoring window is six months and ends on the chosen date. This is
  confirmed in the backend's API specification.
- The discovery address lists users under the name `available_users`. The
  app also accepts two other common names in case the backend changes, and
  falls back to a single sample user if it recognises none of them.
- The income coverage ratio can come back empty when a user has no essential
  expenses, because there is nothing to divide by. The app shows a dash in
  that case rather than treating it as an error.
- Each user's transactions are all in one currency.

## Seeing live updates

Live events are served from their own host, not the REST API. The discovery
response gives its address as `sse.base_url`, and the app connects there.

The hosted stream sends a short scripted set of events dated today, then ends
after about 30 seconds. The browser reconnects and the same events are sent
again. The app recognises them by their ids and ignores the repeats, so you
will see the rows change once. Events dated outside the scoring window are
ignored, so with an older `from` date nothing changes.

Pick a user from the top bar and look at:

- **The Live badge**, at the top right of the Transactions card. A green dot
  and the word "Live" mean the stream is connected.
- **The transaction table**. Rows are added, changed or removed.
- **The count line below the table**. It reads "Showing X of Y transactions",
  followed by a "live updates" counter.
- **The Monthly Cashflow chart**. It re-sums the months the events land in.

The score is fetched again a couple of seconds after the last update.

## Tradeoffs and limitations

- **The transaction list loads every page up front and scrolls as one
  continuous view.** The brief asks for pagination or virtualization; this app
  uses virtualization, so there are no page-by-page controls. The list draws
  only the rows on screen and you scroll the whole set. Loading all pages up
  front keeps filtering, sorting and the chart simple, since every calculation
  runs over the full set the app already holds. For very large histories this
  would move the filtering to the backend, returning pages as needed; see the
  Scalability note below.
- **Cursor pagination would suit live updates better.** It keeps scrolling
  consistent when items are inserted or removed while scrolling.
- **Merchant category names come from the backend.** A code the backend has
  no name for shows as the raw number, so the tool never invents a label.
- **The scoring window has limits.** The date picker runs from 2026-02-28,
  the first month-end with six full months of data, up to today. A date
  outside that range in the URL falls back to today.
- **A malformed transaction is skipped.** One bad row doesn't stop the rest
  loading. It's logged to the console, and nothing on screen says a row is
  missing.
- **Only Resilience Adjustments shows earned points.** The API gives points
  for the resilience lines but not for income regularity, income coverage or
  essential payments, so those cards show their value and range. The frontend
  doesn't work out points the backend didn't send.
- **Some reasons are sorted by their wording.** The backend gives most reasons
  no points, so the app reads the wording to place them. A count of at least
  half, like 3/6, counts as helping. Wording the app doesn't recognise goes in
  Notes.
- **The transaction list was tested with 2000 rows of sample data.** The
  list only ever draws the rows on screen, so it is built to go well past
  that, but it has not been tried at 100,000 rows.

## AI usage disclosure

The brief explicitly permits using AI, so this is a plain account of how it
was used.

The work was planned before any code was written, and the plan itself went
through several rounds of review and revision. The direction was the
developer's throughout: which libraries to use, how to structure the app,
what to build and in what order, and where to change course.

Claude, an AI coding assistant, then wrote the code to that plan. Every change
was watched closely: each change was read, run through the type checks, the
linter and the tests, and corrected wherever Claude made a mistake or missed
the mark. The developer led the work and made the decisions; Claude was the
assistant carrying them out under close review.

Two examples of that review shaping the result: Claude's first comments were
rewritten several times because they used jargon a reader would have to look
up, and several backend problems (the way pages of data are requested, a
field that can be empty, the score band cut-offs) were caught by checking
against the live backend and the API specification rather than trusting the
first build.

## Discussion topics

These are the topics the brief lists for the interview. They are not built
into the app; the notes below are how the current design would approach them.

### API design and evolution

Every backend response is checked against a Zod description the moment it
arrives. If the backend changes a field, the app reports it at that exact
spot with a clear message, instead of failing somewhere deep in the screen.
This already paid off twice while building: the transactions address split
its data into pages differently than first assumed, and one number could come
back empty. Both were caught by the response check and fixed in one place.

For new reasons behind a score: the list of reasons is plain text from the
backend, and the app shows whatever arrives, so a brand new reason needs no
frontend change. A new number would need a new tile on the overview, which is
a small, contained addition.

### Data ownership and boundaries

The score, the band, the key numbers and the plain language reasons are all
worked out by the backend. The frontend never recomputes the score. The
frontend owns presentation, plus the filtering, sorting and searching of the
transaction list, and the monthly cashflow totals, which are simply sums of
transactions already fetched.

Keeping the score on the backend means it is worked out in just one place, so
the scoring rule cannot fall out of step between the two sides. The cashflow
totals are kept on the frontend only because they are simple sums of data the
app already holds; if the rule for them grew complex they would move to the
backend too.

### Data consistency and correctness

Transactions can arrive in any order. The app sorts them when displaying, so
the order they arrive in does not matter. They are stored in a lookup table
that finds each one by its id, so the same transaction arriving twice replaces
the old copy rather than showing twice.

Live updates use the same lookup table: add, change or remove by id. Applying
the same update twice produces the same result as applying it once, so if the
connection drops and the backend replays updates when it reconnects, nothing
is double counted or scrambled.

While transactions are still loading, the cards show their loading state, so
a partly loaded list never looks like the finished one.

### Scalability

The transaction list only ever draws the rows on screen, so the cost of
showing it does not grow with the number of rows.

The weak point at very large counts is that all pages are loaded in advance
and filtered inside the app. At 100,000 transactions and beyond, the
filtering, sorting and searching would move to the backend, which would return
one page of already filtered results at a time, and the cashflow totals would
be worked out by the backend rather than summed on the frontend. The frontend
structure would not change much, because fetching is already kept separate
from display.

Live updates are already collected and applied in small batches a few times a
second, rather than redrawing once per update.

### Real time updates

Live updates are applied to one shared copy of the transaction data, and
every view reads from that one copy, so the chart and the table can never
disagree with each other.

Keeping the screen calm when updates arrive fast is a matter of batching, as
noted above. Because each update is safe to apply more than once, a
reconnection that replays missed updates is safe. A visible indicator shows
whether the live connection is open or still connecting, so the analyst knows
whether they are looking at fresh data. If the browser gives up on the stream,
the app reconnects by itself, waiting a little longer each time.

### Caching and performance

React Query caches the score and transaction responses, each labelled with the
user and the date window. Returning to a view shows the cached copy at once; if
that copy has gone stale a fresh one is also loaded quietly in the background,
and if it is still fresh no request is made. Cached copies are considered fresh
for a set time and are dropped after a longer idle time.

When a live update arrives, the cached copy is updated directly, so the screen
updates without a new request to the backend. If a stronger guarantee of
freshness were needed, the relevant cached copy would be marked as out of date
so React Query fetches it again.

### Incident thinking

If the screen looked slow or wrong once the app is live, the first move is to
narrow down which part is at fault, and the clear split between fetching the
data, preparing it, and drawing it makes that quick.

If the data looks wrong, the response check is the first place to look,
because a change in the layout of the backend's response would already have
been reported there. If the screen is slow, the likely causes are a long list
that is no longer drawing only the rows on screen, or a heavy calculation
running on every redraw instead of only when its inputs change.

To support this, logging would sit where data is fetched, to record what the
backend returned, and the heavier calculations would be timed, so a slow step
shows up in numbers rather than guesswork.
