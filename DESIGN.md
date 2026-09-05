# Play Together interface direction

## Silver console / game-first launcher

Audience: friends in a living room moving between phone and television. The console hardware shell is light titanium; the actual game preview is the dark display. This replaces the rejected navy-gradient card stack rather than recoloring it.

The signature is a large real-game viewport with a horizontal cartridge selector. Configuration occupies a plain, narrow side column on desktop. On a phone, Set up room replaces the library with a full-height configuration task; Back to library restores browsing. No nested marketing cards, ornamental eyebrow labels, fake statistics or invented games.

Tokens live only in `styles/tokens.css`: titanium background, clean panels, graphite text, cobalt reserved for actions and selection. Barlow Condensed600 is self-hosted and used only for the boot wordmark and selected game title; interface controls use the system UI face. Inputs/buttons6px; game viewport6px; no repeated pill-shaped panels. Motion is restrained160ms selection/focus feedback; reduced-motion remains supported.

Auth and pairing are task interfaces, not marketing pages. Camera permission is requested only after a user action. Manual code entry, photo decoding and explicit consent all remain visible. Phone scanning is local; there is no remote camera, video upload or session in a QR.

## Reviewed design guidance

- Taste Skill / redesign-existing-projects: https://github.com/Leonxlnx/taste-skill/blob/main/skills/redesign-skill/SKILL.md. Used its audit-first layout, typography and generic-pattern guidance.
- Impeccable4.0.4: https://github.com/pbakaus/impeccable/tree/main/.claude/skills/impeccable. Used Operate-mode interaction clarity, craft-floor contrast and bounded desktop/mobile inspection.
- Anthropic frontend-design: https://github.com/anthropics/skills/tree/main/skills/frontend-design. Used subject-led identity and purposeful copy.

These sources were read as design references. No remote installer, executable skill hook, randomized decision script, fake data recommendation or repository-wide automation was adopted. Taste's landing-page guidance does not override authentication or functional product-UI constraints. The source code, screenshots and tests are the evidence of implementation; invoking a skill is not proof that the owner will approve the design.
