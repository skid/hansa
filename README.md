# Hansa Teutonica online

## Run it

- Just clone and `yarn` and `yarn dev`
- Play with your console open

## Frontend

- State managed with immer.js
- Game logic runs entirely on frontend
- Graphics done with simple React SVG

## Backend

- The backend is handled by supabase.
- When you create a game, you get a UUID (the game's id). Use this URL (`hansa-teutonica.com/games/<game-uuid>`) to get the invite links for each player. If you forget the game's ID, it's lost - create a new one.
- Each player gets a unique link to the game `hansa-teutonica.com/play/<player-uuid>`.
- A game is directly created from the React frontend. You get a redirect to the game details page, and you can share links to other players.
- Other players load the game via their unique player link.
- Their moves overwrite the game state, so they can fuck up (or hack) the game for everyone.

## TODO

- Alert when it's your turn to make a move (either place displaced tokens or your turn has started)
