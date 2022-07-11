import { GameMap } from "./model";

/**
 * A small map for development purposes
 */
export const DevMap: GameMap = {
  cities: {
    Stade: {
      name: "Stade",
      offices: [{ color: 0, point: true, merch: true }],
      position: [125, 125],
      upgrade: "privilege",
    },
    Hamburg: {
      name: "Hamburg",
      offices: [{ color: 0 }, { color: 1 }, { color: 3 }],
      position: [450, 125],
    },
    Lubeck: {
      name: "Lubeck",
      offices: [{ color: 0, point: true }, { color: 2 }],
      position: [800, 125],
      upgrade: "bank",
    },
    Luneburg: {
      name: "Luneburg",
      offices: [{ color: 0 }],
      position: [500, 500],
    },
  },
  routes: [
    { from: "Stade", to: "Hamburg", posts: 3 },
    { from: "Lubeck", to: "Hamburg", posts: 3 },
    { from: "Luneburg", to: "Hamburg", posts: 4 },
  ],
};

/**
 * The standard 3 player map
 */
// export const Standard3: GameMap = {
//   cities: [
//     {
//       name: "Groningen",
//       offices: [
//         { color: 0, point: true },
//         { color: 1, merch: true },
//       ],
//     },
//     {
//       name: "Emden",
//       offices: [{ color: 0, merch: true }, { color: 2 }],
//     },
//     {
//       name: "Osnabruck",
//       offices: [{ color: 0 }, { color: 1 }, { color: 3 }],
//     },
//     {
//       name: "Kampen",
//       offices: [{ color: 1 }, { color: 3 }],
//     },
//     {
//       name: "Bremen",
//       offices: [{ color: 3 }],
//     },
//     {
//       name: "Hannover",
//       offices: [{ color: 0 }, { color: 2 }],
//     },
//     {
//       name: "Hamburg",
//       offices: [{ color: 0 }, { color: 1 }, { color: 3 }],
//     },
//     {
//       name: "Stade",
//       offices: [{ color: 0, merch: true, point: true }],
//     },
//     {
//       name: "Lubeck",
//       offices: [{ color: 0, point: true }, { color: 2 }],
//     },
//     {
//       name: "Luneburg",
//       offices: [{ color: 0, merch: true }],
//     },
//     {
//       name: "Perleberg",
//       offices: [{ color: 0 }, { color: 2 }, { color: 3, merch: true }],
//     },
//     {
//       name: "Stendal",
//       offices: [{ color: 0 }, { color: 0, merch: true }, { color: 1 }, { color: 2 }],
//     },
//   ],
//   routes: [
//     { from: "Groningen", to: "Emden", posts: 3 },
//     { from: "Emden", to: "Osnabruck", posts: 4 },
//   ],
// };
