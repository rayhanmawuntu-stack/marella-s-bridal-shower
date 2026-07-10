# Dinosaur Birthday Card

A lightweight, mobile-friendly birthday card that begins with a playable dinosaur runner game. The recipient jumps over cacti, catches a gift, and unlocks the birthday message.

## Personalize the card

The app supports URL parameters, so the same hosted page can be customized without editing code:

```text
?name=Alex&from=Rayhan&message=Hope%20your%20year%20is%20amazing!
```

Example:

```text
https://your-site.example/birthday-card/?name=Alex&from=Rayhan
```

You can also change the default text near the top of `script.js`.

## Controls

- Desktop: `Space` or `Arrow Up`
- Mobile: tap the game or the **JUMP** button
- The card can also be opened using **Skip to the card**

## Files

- `index.html` — app structure
- `styles.css` — responsive visual design
- `script.js` — game, personalization, confetti, and sound

No build step or external framework is required. Open `index.html` directly or host the folder on GitHub Pages.
