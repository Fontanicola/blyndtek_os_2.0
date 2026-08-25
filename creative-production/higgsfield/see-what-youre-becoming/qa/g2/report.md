# G2 — asset lock QA

Date: 2026-08-25
Approved cap: 8 Higgsfield credits
Actual spend: 7.56 credits
Unused cap: 0.44 credits
Balance after batch: 686.36 credits

## Gate result

**G2 asset lock is complete.** The project now has one usable master location for each world, a clean order-compositing plate, a tray-to-metal-to-pallet material system and partial-identity operator blockings that avoid face-continuity risk. G3 may use only the selects and mandatory masks below.

## Selected system

| Need | Selected asset | Decision |
| --- | --- | --- |
| Food master | `food-location-clean.png` | Select partial; recover practical highlights in grade. |
| Manufacturing master | `manufacturing-location-clean.png` | Select partial; mask/defocus machine screens before animation. |
| Logistics master | `logistics-location-clean.png` | Select. |
| Food support | `food-location-angle.png` | Select partial; use a crop that excludes the foreground dough form. |
| Hero tray edge | `food-tray.png` | Select prop only; do not use its hands as continuity. |
| Clean food operator | `operator-food-blocking-v2.png` | Select. |
| Clean metal operator/prop | `operator-metal-blocking-v2.png` | Select partial; replace caliper face in post. |
| Clean logistics operator/load | `operator-logistics-blocking-v2.png` | Select partial; mask pallet-jack label. |
| Order duplication plate | `blank-order-set-v2.png` | Select; all final data is added deterministically in post. |

## Rejected assets

- `manufacturing-location-angle.png`: world and art direction diverge from the master.
- `blank-order-set.png`: invented order text is a hard fail.
- All three first-pass operator blockings: invented clothing marks; logistics also added an unwanted second operator.

Rejected files remain only for prompt provenance and must never enter an edit.

## Mandatory offline prep before G3

1. Grade down the food-location practicals while retaining shadow detail.
2. Create a clean screen mask for the manufacturing master.
3. Replace or mask the caliper face in the selected metal blocking.
4. Mask the pallet-jack label in the selected logistics blocking.
5. Use the logistics alternate only with a crop that excludes its sign.

These are deterministic post tasks and do not require more Higgsfield credits.

## Readiness

- Locations locked: 3/3.
- Material anchors locked: 3/3.
- Operator blockings locked: 3/3 with partial identity.
- Blank compositing surfaces locked: yes.
- Full faces or voice likeness required: no.
- Rights risk: no third-party brand is approved for use; all residual marks must be masked.
- Publication: not authorized.

## Next gate

G3 should test motion per narrative family rather than generate all eighteen shots: one wide operational route, one human/prop action, one fragmented-order beat and one hero match cut. Price and approval must be separate from this gate.
