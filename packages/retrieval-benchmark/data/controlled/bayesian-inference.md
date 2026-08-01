# Bayesian inference: evidence and updating

## From assumptions to an updated distribution

Statistical inference begins before any new observation is collected. A prior distribution records uncertainty about a parameter using earlier measurements, domain constraints, or an intentionally broad starting position. The likelihood is a model of how probable the observed data would be under each possible parameter value. Bayes' rule combines a prior distribution with a likelihood. Their product is proportional to the posterior distribution, and the normalizing constant is the marginal likelihood or evidence.

The posterior is therefore not a simple average of two opinions. A concentrated likelihood can move a diffuse prior substantially, while a small or noisy sample may leave a well-supported prior largely intact. Analysts should inspect sensitivity to plausible prior choices instead of treating one convenient prior as immutable truth. The marginal likelihood has another role in some model comparisons, but it should not be confused with the likelihood evaluated at a single best-fitting parameter.

Using \(\theta\) for a parameter and \(y\) for observed data, the normalized update is

$$
p(\theta \mid y) = \frac{p(y \mid \theta)\,p(\theta)}{\int p(y \mid \vartheta)\,p(\vartheta)\,d\vartheta}.
$$

The denominator integrates over possible parameter values and is often written \(p(y)\). In an odds form, posterior odds equal prior odds multiplied by a Bayes factor; neither expression says that the prior and likelihood receive equal weight.

## A screening example

Suppose a screening test has 90 percent sensitivity, 95 percent specificity, and the condition prevalence is 1 percent. A positive result does not imply a 90 percent posterior probability because false positives arise from the much larger unaffected population.

Imagine testing ten thousand people. Roughly one hundred have the condition, and about ninety of them test positive. Of the 9,900 unaffected people, a five percent false-positive rate produces about 495 positive results. The positive group consequently contains far more unaffected people than affected people. Sensitivity answers a conditional question about people who already have the condition; it is not the posterior probability requested by a patient who has received a positive result.

Changing the prevalence changes that posterior even if the laboratory characteristics remain fixed. This is why estimates from a high-risk clinic cannot be copied mechanically to population-wide screening. Specificity, sensitivity, prevalence, and the costs of follow-up all matter, although only the first three determine this numerical posterior.

## Checking the fitted model

Posterior predictive checks compare replicated observations drawn under the fitted model with observed data. Useful comparisons include tail behavior, zero counts, group-level variation, and statistics that were not directly optimized during fitting. The fixture code `PPC_REPLICATE_COMPARE` identifies this model-checking step.

A close match does not prove that a model is correct, because several inadequate models can reproduce the same summary. A severe mismatch is more informative: it points to a feature the model cannot explain. Predictive checking should also be distinguished from selecting the model with the largest marginal likelihood. One examines implications of a fitted model; the other aggregates fit across its parameter space.
