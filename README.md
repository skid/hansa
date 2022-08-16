# Hansa Teutonica online

## Run it

- Just clone and `yarn` and `yarn dev`
- Play with your console open
- Obviously stuff are missing

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
- Their moves overwrite the game state, so they can fuck up (or hack) the game for everyone. This is a dev server, not a final app.
- If supabase supports pub/sub, changes to the game state are pushed to all other users

## Known Bugs

- If a player ends the game by completing a route between two cities, they can not use the "place extra office" as the game will end before they have a chance to flip it.

## Contribute / Roadmap

What we need to do:

- Testing / debugging
- Not chat

Here's a good image of the map that can help you:
![Hansa](https://user-images.githubusercontent.com/240319/178597097-9775a589-22a8-411c-ad8e-3003734e750f.jpeg)
