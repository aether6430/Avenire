# Cell biology: membranes and transport

## The membrane as a selective boundary

Cell membranes are dynamic assemblies rather than rigid walls. Phospholipids move laterally, cholesterol changes packing, and proteins create specialized routes across the boundary. The phospholipid bilayer presents hydrophilic heads toward water and hydrophobic tails toward the membrane interior. Small nonpolar molecules cross the bilayer more readily than charged ions.

This arrangement is energetically favorable in water: polar head groups interact with the aqueous cytosol and extracellular fluid, whereas hydrocarbon tails avoid those surroundings. The membrane interior is consequently a barrier to sodium, potassium, and other hydrated ions. Carbon dioxide and some small hydrophobic molecules can diffuse through more readily. Size alone does not determine permeability; charge and polarity are central.

## Channels and carriers

Aquaporins are channel proteins that accelerate water movement across a membrane. They do not pump water against its chemical potential gradient.

An open ion channel also provides a selective passive route. Its pore may favor one ion through geometry and chemical interactions, but net movement still follows the ion's electrochemical gradient. Carrier proteins work differently: they bind a solute and alternate access from one side of the membrane to the other. Facilitated diffusion by a carrier remains passive even though it can saturate at high solute concentration.

For one permeant ion, the Nernst potential is the voltage at which its electrical and concentration forces balance:

$$
E_{\mathrm{ion}} = \frac{RT}{zF}\ln\!\left(\frac{[\mathrm{ion}]_{\mathrm{outside}}}{[\mathrm{ion}]_{\mathrm{inside}}}\right).
$$

Here \(R\) is the gas constant, \(T\) is absolute temperature, \(z\) is ionic charge, and \(F\) is Faraday's constant. The equation describes an equilibrium potential, not the rate at which a channel conducts ions. Reversing the concentration ratio changes the logarithm's sign, while reversing the ionic charge changes the voltage sign.

Osmosis describes net water movement caused by differences in water chemical potential. Saying that aquaporins make water cross faster is not the same as saying that they set the direction or provide metabolic energy. A membrane may contain many water channels and still show no net flux at equilibrium.

## Energy-coupled transport

During primary active transport, a membrane protein couples solute movement to an energy source such as ATP hydrolysis. The fixture label for this distinction is `TRANSPORT_ATP_DIRECT`.

Secondary active transport uses a gradient that was established elsewhere. For example, a sodium-coupled transporter may use downhill sodium entry to move another solute uphill. The immediate transporter does not hydrolyze ATP, even though cellular ATP may have powered the pump that created the sodium gradient. This distinction prevents the broad phrase “active transport” from obscuring where energy enters the system.

Vesicle fusion and endocytosis also move material across the cell boundary, but they should not be grouped with transport through a membrane protein. Those processes reshape membrane topology and can carry cargo much larger than a channel or carrier substrate.
