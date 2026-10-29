# Methodology

These rules are design choices. They are not a validated marketing science.

## Series preparation

- Dates must be `YYYY-MM-DD`.
- A blank or non-numeric signal is dropped. It is not stored as zero.
- Duplicate dates collapse to the last finite signal. The count of collapsed rows is reported.
- Points are sorted by date. Intervals may be irregular. Rates use the actual day span.

## Velocity

Requires two dates and a positive span.

Absolute change is `last − first`.

If the first signal is zero, absolute change is shown and the score is withheld. A percent change would be undefined.

Otherwise:

`relative per 30 days = (absolute change / |first|) × (30 / span days)`

`score = clamp(0.5 + relative per 30 days, 0, 1)`

A flat series scores 0.5. A move of about 50% per 30 days saturates the scale. That squash is for display. It is not a probability.

## Persistence

Requires three points and a positive peak.

Score = share of points still at or above half the peak.

## Half-life

Definition: the time required for the signal to decline by 50% from its peak, after that peak.

- Fewer than three points, a non-positive peak, a peak that is the last point, or a series that never reaches half the peak: **not estimable**.
- If a later point lands exactly on half the peak, the half-life is the day span from the peak to that point.
- Otherwise the crossing is linearly interpolated between the last point above the threshold and the first point at or below it.

The earliest maximum is the peak when several points share it.

## Lifecycle

Withheld below three points. The labels are “in this series” only:

- Post-peak decline: half-life is estimable and the latest point is at or below 60% of the peak.
- Rising: latest is at least 10% above the first and within 10% of the peak.
- Holding near peak: latest is within 15% of the peak.
- Otherwise: mixed. No label is forced.

## Other dimensions

- **Novelty.** Only a user assumption, 0–1. Otherwise not estimable.
- **Cultural resonance.** `min(behavior-or-meaning notes / 3, 1)`. Attention rows do not count.
- **Brand fit.** Only a user assumption. Otherwise not estimable.
- **Evidence quality.** `0.5·min(n/6, 1) + 0.3·min(sources/3, 1) + 0.2·min(span days/90, 1)`. Zero observations score 0 by this rule. Coverage is not truth.

## Opportunity score

Initial design weights: velocity 0.20, persistence 0.20, novelty 0.15, resonance 0.15, brand fit 0.15, evidence 0.15.

Dimensions without a score are excluded. They are not filled with zero. Remaining weights are renormalized to sum to 1. If fewer than two dimensions remain, the score is withheld.

The number is not a probability of commercial success.

## Simulator

`units = audience reached × conversion rate × scenario factor`

Factors: pessimistic 0.5, baseline 1, optimistic 1.6.

`revenue = units × price`

`contribution per unit = price − variable cost`

`fixed = marketing budget + other fixed costs`

`profit = units × contribution per unit − fixed`

`break-even units = fixed / contribution per unit` only when contribution per unit is positive.

`cost per acquired customer = marketing budget / units` only when units are positive. Other fixed costs are excluded, so this is not a full cost to serve.

Sensitivity is a one-at-a-time +10% relative shock on the baseline, ranked by absolute profit change.

Stop rules, also design choices: stop if contribution per unit is not positive, or if the pessimistic profit is below the negative of the marketing budget.

## What the lab will not do

It will not classify a trend as emerging, saturated, or fading from one or two points. It will not treat a sample-case card as a measured history. It will not present synthetic series as platform data.
