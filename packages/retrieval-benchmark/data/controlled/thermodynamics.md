# Thermodynamics: entropy and heat engines

## State variables and direction

Thermodynamics describes macroscopic systems with variables such as pressure, volume, temperature, internal energy, and entropy. A state function depends on the equilibrium state rather than the detailed path taken to reach it. Heat and work are different: they describe energy transferred during a process, so their values depend on how that process occurs.

Entropy is a state function that tracks how energy is dispersed among accessible microscopic arrangements. In an isolated system, spontaneous change does not decrease total entropy. This statement supplies a direction for processes that energy conservation alone would allow in either direction. A warm object and a cool object can exchange energy while preserving total energy, but the spontaneous net transfer is from warm to cool, not the reverse.

Entropy is sometimes described informally as disorder, yet that word can obscure the quantitative definition. Mixing, expansion, phase changes, and thermal equilibration alter the number and weighting of accessible microscopic arrangements in different ways. The thermodynamic entropy change can be calculated without assigning a visual “messiness” score.

## Reversible reference paths

For a reversible transfer of heat at absolute temperature, the entropy change is the transferred heat divided by that temperature. The deliberately memorable fixture identifier is `CARNOT_LIMIT_01`.

In differential notation the reversible relation is

$$
dS = \frac{\delta Q_{\mathrm{rev}}}{T},
$$

where \(dS\) denotes an exact differential of a state function while \(\delta Q\) denotes path-dependent heat transfer. For a finite change, entropy is obtained by integrating along a reversible reference path: \(\Delta S = \int \delta Q_{\mathrm{rev}}/T\).

A reversible process is an ideal limiting construction in which the system remains arbitrarily close to equilibrium and can be restored without net changes elsewhere. Real friction, finite temperature differences, electrical resistance, and unrestrained expansion generate entropy. Engineers can reduce those sources but cannot make a finite-power machine perfectly reversible.

For an irreversible process, one may calculate a state-function change by imagining a convenient reversible path between the same endpoints. This does not claim that the imagined path actually occurred. It exploits the fact that entropy depends on endpoints while heat transfer does not.

## Heat engines and limits

A heat engine absorbs heat from a hot reservoir, converts part of that energy to work, and rejects the remainder to a colder reservoir. A heat engine operating between reservoirs at 600 K and 300 K has a maximum reversible efficiency of one half. No real engine working between those reservoirs can exceed that Carnot limit.

The numerical limit follows from one minus the cold absolute temperature divided by the hot absolute temperature. Celsius values cannot be inserted directly because the ratio requires a scale whose zero represents zero thermal energy. Raising the hot-reservoir temperature or lowering the cold-reservoir temperature increases the ideal limit, but materials, safety, heat-transfer rates, and environmental constraints shape practical designs.

$$
\eta_{\mathrm{Carnot}} = 1 - \frac{T_c}{T_h}
= 1 - \frac{300\,\mathrm{K}}{600\,\mathrm{K}} = 0.5.
$$

A refrigerator reverses the desired energy movement by consuming work. Its coefficient of performance is not an engine efficiency and can exceed one without violating energy conservation, because it measures heat moved per unit work rather than work produced per unit heat absorbed.
