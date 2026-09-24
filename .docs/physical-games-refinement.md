# Physical game refinement

24 September 2026. The first pass covers Penny shove, Row to the jetty and Gone fishing.
The second pass covers the fifteen remaining games, in the approved order below.

Existing artwork, numbers, denominations, weight targets, phase definitions and generated
configuration pools are preserved. This pass changes handling and feedback, not the curriculum.

## Shared engine

Action pointer input now carries a one-step release velocity in world squares per second. It uses
the existing gesture velocity estimator over the last 100 ms of actual pointer samples, rather
than deriving speed from render frames. The shared Pad clears it after consumption. Old drag
and keyboard controls remain available. Coin flicks cap launch speed, and a pause/cancel restores
the held object without firing a shot. Command key bindings are dispatched by the action host,
with modifier shortcuts and text fields excluded.

`engine/motion/reel.ts` owns bounded effort/load response, line speed and tension. Fishing is its
first consumer; the model is independent of fish, drawing and input devices. A future crane or
winch can use the same response without importing a fishing game.

Games whose physical handling changed have a separate mechanics revision in `gameRulesVersion`.
Their older saved challenge selections are reopened through current configurations. Layout and
feedback-only changes retain the rules revision. Attempt history remains intact. The future progress projection checks the per-game
revision before treating attempts as current evidence.

## Penny shove

- Flick a coin toward the felt, or retain the existing pull-back-and-release gesture.
- Mouse and touch release include the final position even between simulation frames.
- Q/E and the two turn controls rotate the keyboard aim, enabling deliberate off-centre shots.
  Up/down still choose a piece; left/right still adjust power; space releases it.
- Existing rigid-body collision, coin mass, rebound and damping remain authoritative. The new
  flick uses those same bodies, so a shot may move another coin into or out of the scoring area.
- Settled pieces on the felt have a small outline; moving pieces do not count. The amount and
  maximum piece count remain unchanged. Existing notes have rectangular outlines.

## Row to the jetty

A complete drive no longer behaves as if its blade is still pushing indefinitely while the key
is held. The blade feathers and recovers above the water; a completed drive may coast gently into
the jetty. Partial drives still cannot dock while actively pulling. Back-water strokes reverse the
oar direction; finer pose steps improve the animation. Early/late rhythm, water drag, currents,
bumps and the required target all remain active. Release and press again for another stroke.

## Gone fishing

Casting, fish selection, scale arithmetic and returning fish are retained. Once hooked, a fish
applies a gentle periodic load. Hold space or the water to reel faster; release for assisted gentle
reeling; hold down or Ease the line to stop hauling after a short deceleration. A bent rod, tauter
line and small lateral fish movement communicate resistance. The line does not snap and a child
is not penalized for releasing the control. Reel effort does not alter the fish's recorded weight.
Arrow input while reeling does not accidentally change the next cast's aim.

## Verification and manual QA

Model checks cover directional flicks, inventory conservation, cancellation, full-stroke docking,
reel resistance/easing and finite bounded values. Existing authored models, generated coin shots,
all eighteen generated rowing arrangements and all eighteen generated fishing arrangements are
rechecked. Fishing witnesses now use casts, reeling and returning unwanted fish rather than
assuming a fixed sequence of catches under the old timing. These are sampled winning controls,
not a proof of every physical input sequence.

Browser checks cover keyboard angle commands, mouse and real touch flicks, fishing controls,
interrupted casts, layout and the existing shared play/pause/retry flow. Manual QA should compare
short and strong coin flicks, aim a collision with a resting coin, try partial/full rowing strokes
and backing water, and alternate fast/gentle/paused reeling through each fish weight phase.


## Second pass: fifteen games

The shared `engine/motion/suspension.ts` helper follows a support with a bounded, damped spring.
Harbour cargo uses it for a hanging crate. It accepts positions and time rather than crane, game,
or DOM objects. Existing `Hands` sessions, legal move sequences, surface marks, aim projection,
springs and fixed-step action input continue to provide the other shared building blocks.

These refinements deliberately vary in size. Games with sound underlying physics keep it;
feedback and direct manipulation make those mechanics easier to use. No extra difficulty menus,
new scoring systems or learning targets are introduced.

| Order | Game | Change to play | What remains authoritative |
|---|---|---|---|
| 1 | Rabbit crossing | Crouches while aiming; an end marker clarifies the intended landing; introductory stones tolerate near-edge landings; faster recovery after a miss. | Actual stone width, number-line distance, later tipping and sinking stones. |
| 2 | The road | Holding the brake stops first, then gently reverses after a short pause; releasing stops reverse; acceleration resumes forward travel. A small marker previews stopping distance. | Number-line position, lane collision and front-of-car target. |
| 3 | Paper plane | The drawn nose eases into climbs and dives, with a shorter trail. | Existing lift, gravity, flight speed and hoop-crossing calculations. |
| 4 | Rafts | A landing marker supplements the short aiming arc; a settled raft holding its requested count receives a small ring. | Existing buoyancy, sheep collisions, tipping, balance and counting. The marker projects to water height; moving rafts still affect the actual landing. |
| 5 | Bead string | Holding a point on the paper steers towards it; buffered legal turns remain; an edge stop marks the head so recovery is clear. | Grid movement, counting sequence and prohibition on reversing through the body. |
| 6 | Harbour cargo | Carried crates lag and settle gently beneath the hook; the suspension line shows the connection and a nearby pickup is marked. | Crate weight, collisions, boat balance, release and delivery checks. |
| 7 | Marble workshop | Drag a ramp's middle to move, or its end to rotate; live preview commits as one undoable edit. A short-lived last path helps adjustment, and a stuck marble returns to building. | Quantized construction controls, marble physics, required ramps, gate and tray goals. |
| 8 | Shunting yard | Acceleration and changes of direction build over time instead of instantly changing speed; the engine coupling is marked when stationary. | Track collisions, coupling, lift restrictions and required carriage order. |
| 9 | See-saw | Heavier bags follow the hand more slowly; a placement guide connects a held bag to its beam position. | Actual weight-distance torque, plank response and settled balance. |
| 10 | Cut the cake | A downward knife stroke makes one cut; placing and releasing still works; keyboard aim is visible. Cancelling a held knife never cuts. | Continuous cut position, portion sizes, serving and fairness checks. |
| 11 | Measure it out | A receiving spout, tap or flower is marked during a drag, with the existing stream and synchronized liquid levels. | Exact capacity and volume conservation, legal fills, pours and empties. |
| 12 | Take the corner | Aiming shows current momentum separately from the proposed movement, with a landing marker and existing ghost car. | Discrete acceleration, legal paths, lap marker and finish rules. |
| 13 | Shut the box | A parked die marks its waiting tile; a roll-ready ring helps identify the next physical action. | Dice results, combinations, undo, hinge animation and legal closures. |
| 14 | Find the rule | The machine's receiving hopper or rule slot is marked while carrying an item; wide layouts place cards beside the machine. | The hidden rule, input/output evidence and legal guesses. |
| 15 | Spell the picture | Sound tiles can be tapped or dragged into boxes, rearranged, or returned to the tray. Wide layouts put the picture beside the tiles. | Legal take-out/put-in moves, sound count and the pictured word. |

The spelling session uses the same `Hands` controller as jugs, dice and the rule machine.
Rearranging tiles produces an ordered sequence of existing legal moves, so the model, undo and
attempt recording remain consistent. The ordinary move tray remains available for keyboard use.

## Second-pass verification

Regression coverage includes introductory versus later rabbit edge landings, brake-before-reverse,
one-edit ramp rotation and undo, cut-once/cancelled knife gestures, pointer turns, sound removal and
reordering, and bounded suspension settling. Workshop winning witnesses wait for their carried
loads before release and still solve the authored and generated configurations.

The school suite checks all game models and the generated challenge pools. Browser coverage opens
each of these fifteen games on desktop and phone, verifies the visible art, viewport fit and
pause/resume, and retains the shared input, phase selection and completion checks. Direct spelling
tile interaction is checked separately. Visual review includes the landscape and phone tabletop
layouts. Winning witnesses certify the configurations exercised, not every possible player action.

For manual QA, go through this table in order. In particular try a rabbit edge landing, brake past
a road target then reverse, release cargo after letting it settle, rotate both ends of a ramp and
undo, cancel a knife gesture with Escape, and rearrange an incorrect spelling without restarting.


Final validation on 24 September: `npm run check` passed, including 538 engine tests and 422 school
tests. Desktop and phone checks cover all fifteen games plus the shared shell. The spelling tile
layering correction passed click/removal and mouse/touch rearrangement checks; held-point bead
steering and the road's brake/reverse controls passed their targeted browser checks. The single
intentional browser skip is the touch-only plane test in the desktop project.
