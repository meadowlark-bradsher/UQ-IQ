# §14 framing — "a fold, not a belief"

> **Author framing note — a writing guide, not a published post.** This is the
> conceptual spine that connects the order-invariance theorem (Post 3 / §11) to the
> transcript-reorder experiment (§9) and to the two-legs thesis. Distill from it
> when writing the posts; don't ship it verbatim. Lives outside `src/content/` so it
> is never bundled or served.

**The one line.** The model has a fold, not a belief. Commutativity is the missing operation, and the mask is where we put it.

**Why it's exact.** The model isn't missing *an* operation — it has the autoregressive left-fold over the transcript, read in order. What it lacks is *commutativity* of that fold. Commutativity is the property that turns a function-of-the-sequence into a function-of-the-set — which is the same thing as turning a transcript-processor into a belief. So the one bit the model lacks is the bit that would make its sequence-processing into belief-maintenance.

**Why the mask is the answer, not a patch.** AND is the commutative fold. You don't replace the model's processing; you supply the commutativity it lacks and hold the belief somewhere that can actually hold one.

**How it binds the talk.** Order-invariance is the same property seen twice: the theorem your mask satisfies (Post 3 / §11) and the test the model fails (transcript reorder / §9). The formal section and the empirical section stop being two topics and become the prediction and the experiment of one claim.

**Why it's robust (relieves the nuance-anxiety).** The argument is existential, not statistical. Commutativity must hold for *every* reordering, so one *reproducible* flip refutes "the model holds a sound belief" — a sound belief would flip never. Unlike the ECD calibration claim, which lives or dies by effect sizes and elicitation, this one needs exactly one counterexample.

**Inversion to avoid.** Don't say "reordering changes the belief state" — that concedes a belief exists. Say: reordering changes the answer, and a coherent belief couldn't do that, so there is no coherent belief; what looks like one is rebuilt from context each time.

**Two legs of the thesis.** ECD is the *uncertainty* leg — confidence reports don't track reality (statistical). Order-invariance is the *belief* leg — commitments aren't path-independent (logical / existential). Both conclude: the epistemic state you want isn't in the model, so build it outside. The mask is the structure that has the property the model couldn't.
