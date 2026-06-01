# CueUp Product Spec

## Product Direction

CueUp is a reminder app where short, character-driven cues help the user restart a task.
The app should feel useful, calm, and polished, with enough personality to make reminders
memorable without looking like generic AI output.

## Character Design Tone

Existing built-in characters and Character Pack characters use abstract pixel-art avatars.
This is the canonical visual language for character icons.

- Icons are symbolic pixel portraits, not photos, realistic portraits, or AI-generated headshots.
- Personas inspired by familiar roles are expressed as archetypes, not as named public figures or likenesses.
- Pixel icons use crisp square cells, hard edges, strong outline color, and a distinct accent palette.
- The avatar system should render deterministically in the app so the same character always has the same icon.
- Custom characters may still accept user-provided HTTPS icons, but default and preview states should use the local pixel avatar style.

## Mobile Visual Style

The mobile UI should be clean and premium, with a restrained pixel-game accent rather than a full retro game skin.

- Use white surfaces, cool neutral backgrounds, high-contrast ink text, and accent colors per character.
- Keep cards at small radii and pair them with crisp borders, not soft decorative gradients.
- Character rows, reminder rows, chat headers, and pack store items should show pixel avatars near the relevant text.
- Avoid blurred illustration, stock-photo treatment, celebrity likeness, and decorative AI-art backgrounds.
- Buttons and controls stay modern and readable; pixel styling is concentrated in avatars and small identity details.

## Dependency Policy

The current React Native / Expo implementation should prefer local View-based pixel rendering over adding image or native dependencies.
Swift Package Manager can be used later for iOS-only polish if it solves a concrete native problem, but it is not required for the current pixel avatar direction.
