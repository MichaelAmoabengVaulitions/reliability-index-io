# Reliability Index Explorer

## What it is

Many people have little or no traditional credit history, so the usual credit
checks say almost nothing about them. The Reliability Index fills that gap. The
backend looks at a person's bank transactions and works out a score from 0 to
100 that says how reliably they manage their money.

Reliability Index Explorer is the internal tool for looking at that score. It
is for risk analysts and the product team, and it lets them:

- see how a score was worked out
- look at the transactions behind it
- spot anything unusual in how someone handles money
- check that the scoring behaves the way it should

The data sets can be large and the scoring signals are not simple, so the tool
has to stay clear and easy to inspect however much data it is showing.

## The backend

The API lives at:

```
https://wydokyegph.execute-api.eu-central-1.amazonaws.com/
```

A `GET` on the base URL returns a discovery document. It lists the available
users, the endpoints, and the base URL of the separate streaming host that
serves live transaction events. The full specification is an OpenAPI 3.0
document, published at `/openapi.yaml` on the API and kept in this repo at
`docs/openapi.yaml`.

## Features

### Reliability overview

The headline view for a user. It shows the score, the score band, the scoring
window, the key metrics, and the drivers behind the score.

### Score breakdown

The score is made of four signals, and each one is shown on its own:

- income regularity
- income coverage ratio
- essential payments consistency
- resilience adjustments

Someone looking at it should be able to see how those four add up to the
score.

### Transaction explorer

The transactions used in scoring, in a list an analyst can work with. It
supports:

- sorting
- filtering by category
- filtering by money in or money out
- searching by merchant
- smooth scrolling through thousands of rows

The API can return transactions out of order, so the explorer never relies on
the order they arrive in.

### Monthly cashflow

Money in, money out and the net result for each month in the scoring window,
so an analyst can see whether someone's finances are steady or not.

### Score explanation

The drivers behind the score, split into what is helping and what is hurting,
and written so someone without a technical background can follow them.

### Live updates

The backend streams transaction events (added, updated and deleted). When one
arrives, the transaction list, the filters, the cashflow chart and anything
else worked out from the transactions update to match, without losing what
the analyst has selected or how far they have scrolled.

## How it should behave

- **Every view handles loading, empty and error states.** Nothing shows a
  blank card or a misleading "no data" while a request is still running, and
  a failed request offers a retry.
- **Large data sets stay fast.** The explorer, the filters and the chart stay
  responsive with thousands of transactions, and the design has a clear path
  to much larger numbers.
- **The URL describes the view.** The selected user, the scoring window, the
  filters and the sort live in the address bar, so a link reopens exactly the
  same view.

## Questions that shape the design

These aren't features. They're the questions the architecture has to answer
as the product grows.

- **API changes.** How does the app cope when the API changes, or breaks?
  How do we add new scoring signals over time without reworking the screens?
- **Frontend and backend boundaries.** What is the backend's job and what is
  the frontend's? The score itself always comes from the backend. The
  frontend should only work out things that are simple to derive from data
  it already has.
- **Correctness.** How do we keep the data right when transactions arrive out
  of order, only part of the data has loaded, or updates come in quickly?
- **Scale.** What changes at 100,000 transactions or more, or with very
  frequent updates?
- **Real-time consistency.** How do we keep the screen consistent while
  updates stream in?
- **Caching.** What gets cached, for how long, and what makes a cached copy
  out of date?
- **Incidents.** If the app becomes slow or shows the wrong numbers in
  production, how would we find out why?
