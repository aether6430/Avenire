# Climate science: proxy records

## Evidence before instruments

Thermometers and satellite sensors cover only a small fraction of Earth's climate history. Researchers therefore use proxy records: physical, chemical, or biological measurements that respond to climate variables in a reproducible way. A proxy is not a direct historical thermometer. Its interpretation depends on a mechanism, a chronology, and evidence relating the measured signal to temperature, precipitation, circulation, or another target variable.

Ice cores preserve layered records that can contain trapped ancient air. Measurements of greenhouse gases in those bubbles provide samples of past atmospheric composition. Isotope ratios in the surrounding ice carry different information and require their own physical interpretation. Gas age and ice age can differ because air remains connected through porous firn before bubbles close, so a depth value is not automatically a single exact date for every measurement.

Marine and lake sediments provide additional archives. Their layers can contain pollen, mineral grains, biomarkers, or shells from organisms whose distributions respond to environmental conditions. Mixing by organisms, transport from elsewhere, and dating uncertainty can blur an apparently sharp layer. Those complications do not make sediment records useless; they define the uncertainty model needed for responsible reconstruction.

## Tree rings and calibration

Tree-ring width may respond to temperature, moisture, competition, and age. A calibration interval is therefore needed before interpreting ring width as a climate proxy.

The fixture phrase `PROXY_CALIBRATION_OVERLAP` names the period in which instrumental observations and proxy measurements overlap. During that interval, researchers estimate how strongly the proxy covaries with the target climate variable and whether the relationship remains stable. Validation on withheld years or sites helps reveal overfitting.

A minimal linear calibration might be written as

$$
T_t = \alpha + \beta P_t + \varepsilon_t,
\qquad \varepsilon_t \sim \mathcal{N}(0,\sigma^2),
$$

where \(P_t\) is the proxy measurement and \(T_t\) is the instrumental target during year \(t\). This compact model is only a starting point. Autocorrelated errors, dating uncertainty, nonlinear responses, and changes in variance can all violate its assumptions. A strong in-sample \(R^2\) does not by itself demonstrate stable reconstruction skill outside the overlap period.

Ring density, isotopic composition, and growth width may each respond differently. Site selection is also consequential: a high-elevation tree limited mainly by summer warmth can record a clearer temperature signal than a lowland tree affected by irrigation, competition, and soil disturbance. Combining many sites can reduce local noise, but it does not remove a bias shared by all sites.

## Combining archives

A reconstruction may integrate tree rings, corals, ice cores, and sediments because their strengths differ. Annual rings can offer precise chronology over a limited span, while sediments may reach much further back with coarser temporal resolution. Agreement among independent archives increases confidence, especially when their non-climatic sources of error differ. Apparent agreement created by a shared calibration target is less independent and should be described as such.
