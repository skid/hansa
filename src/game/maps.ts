import { GameMap } from "./model";

/**
 * The standard 3-player map with no neighbors added.
 * Basis for creating the actual Standard 3 and 4/5 player maps.
 */
const BaseMap: GameMap = {
  coellen: [100, 708],
  cities: {
    Groningen: {
      name: "Groningen",
      offices: [
        { color: 0, point: true },
        { color: 1, merch: true },
      ],
      position: [100, 80],
      upgrade: "book",
      color: "yellow",
      neighbors: [],
    },
    Kampen: {
      name: "Kampen",
      offices: [{ color: 1 }, { color: 3 }],
      position: [100, 250],
      neighbors: [],
    },
    Arnheim: {
      name: "Arnheim",
      offices: [{ color: 0 }, { color: 0, merch: true }, { color: 1 }, { color: 2 }],
      position: [150, 450],
      color: "red",
      neighbors: [],
    },
    Duisburg: {
      name: "Duisburg",
      offices: [{ color: 0 }],
      position: [100, 650],
      neighbors: [],
    },
    Coellen: {
      name: "Coellen",
      offices: [{ color: 0, point: true }, { color: 2 }],
      position: [100, 800],
      color: "yellow",
      neighbors: [],
    },
    Emden: {
      name: "Emden",
      offices: [{ color: 0, merch: true }, { color: 2 }],
      position: [500, 80],
      neighbors: [],
    },
    Osnabruck: {
      name: "Osnabruck",
      offices: [{ color: 0 }, { color: 1 }, { color: 3 }],
      position: [390, 320],
      neighbors: [],
    },
    Munster: {
      name: "Munster",
      offices: [{ color: 0, merch: true }, { color: 1 }],
      position: [500, 500],
      neighbors: [],
    },
    Dortmund: {
      name: "Dortmund",
      offices: [{ color: 0, merch: true }, { color: 1 }],
      position: [450, 650],
      neighbors: [],
    },
    Stade: {
      name: "Stade",
      offices: [{ color: 0, point: true, merch: true }],
      position: [800, 80],
      upgrade: "privilege",
      color: "yellow",
      neighbors: [],
    },
    Bremen: {
      name: "Bremen",
      offices: [{ color: 2 }],
      position: [720, 250],
      neighbors: [],
    },
    Minden: {
      name: "Minden",
      offices: [{ color: 0 }, { color: 1 }, { color: 2 }, { color: 3 }],
      position: [850, 450],
      neighbors: [],
    },
    Paderborn: {
      name: "Paderborn",
      offices: [{ color: 0 }, { color: 3, merch: true }],
      position: [850, 650],
      neighbors: [],
    },
    Warburg: {
      name: "Warburg",
      offices: [{ color: 1, point: true }, { color: 2 }],
      position: [600, 800],
      neighbors: [],
    },
    Hamburg: {
      name: "Hamburg",
      offices: [{ color: 0 }, { color: 1 }, { color: 3 }],
      position: [1200, 120],
      neighbors: [],
    },
    Hannover: {
      name: "Hannover",
      offices: [{ color: 0 }, { color: 2 }],
      position: [1130, 300],
      neighbors: [],
    },
    Hildesheim: {
      name: "Hildesheim",
      offices: [{ color: 0 }, { color: 3 }],
      position: [1150, 580],
      neighbors: [],
    },
    Gottingen: {
      name: "Gottingen",
      offices: [{ color: 0 }, { color: 1 }],
      position: [1050, 800],
      neighbors: [],
      upgrade: "actions",
      color: "yellow",
    },
    Lubeck: {
      name: "Lubeck",
      offices: [{ color: 0, point: true }, { color: 2 }],
      position: [1550, 100],
      upgrade: "bank",
      color: "yellow",
      neighbors: [],
    },
    Luneburg: {
      name: "Luneburg",
      offices: [{ color: 0 }],
      position: [1450, 300],
      neighbors: [],
    },
    Brunswick: {
      name: "Brunswick",
      offices: [{ color: 1 }],
      position: [1300, 450],
      neighbors: [],
    },
    Goslar: {
      name: "Goslar",
      offices: [{ color: 0 }],
      position: [1480, 580],
      neighbors: [],
    },
    Quedlinburg: {
      name: "Quedlinburg",
      offices: [
        { color: 1, merch: true },
        { color: 2, merch: true },
      ],
      position: [1340, 800],
      neighbors: [],
    },
    Perleberg: {
      name: "Perleberg",
      offices: [{ color: 0 }, { color: 2 }, { color: 3, merch: true }],
      position: [1750, 220],
      neighbors: [],
    },
    Stendal: {
      name: "Stendal",
      offices: [{ color: 0 }, { color: 0, merch: true }, { color: 1 }, { color: 2 }],
      position: [1750, 450],
      color: "red",
      neighbors: [],
    },
    Magdeburg: {
      name: "Magdeburg",
      offices: [{ color: 0, merch: true }, { color: 1 }],
      position: [1750, 650],
      neighbors: [],
    },
    Halle: {
      name: "Halle",
      offices: [{ color: 0, point: true }, { color: 1 }],
      position: [1750, 800],
      upgrade: "keys",
      color: "yellow",
      neighbors: [],
    },
  },
  routes: [
    { from: "Groningen", to: "Emden", posts: 3 },
    { from: "Emden", to: "Osnabruck", posts: 4 },
    { from: "Kampen", to: "Osnabruck", posts: 2 },
    { from: "Kampen", to: "Arnheim", posts: 3 },
    { from: "Arnheim", to: "Duisburg", posts: 3 },
    { from: "Arnheim", to: "Munster", posts: 3 },
    { from: "Duisburg", to: "Dortmund", posts: 2 },
    { from: "Osnabruck", to: "Bremen", posts: 3, tavern: true },
    { from: "Munster", to: "Minden", posts: 3 },
    { from: "Bremen", to: "Minden", posts: 3 },
    { from: "Minden", to: "Paderborn", posts: 3 },
    { from: "Dortmund", to: "Paderborn", posts: 3 },
    { from: "Coellen", to: "Warburg", posts: 4 },
    { from: "Paderborn", to: "Warburg", posts: 3 },
    { from: "Stade", to: "Hamburg", posts: 3 },
    { from: "Bremen", to: "Hamburg", posts: 4 },
    { from: "Minden", to: "Hannover", posts: 3 },
    { from: "Bremen", to: "Hannover", posts: 3 },
    { from: "Paderborn", to: "Hildesheim", posts: 3 },
    { from: "Hannover", to: "Luneburg", posts: 3 },
    { from: "Minden", to: "Brunswick", posts: 4 },
    { from: "Lubeck", to: "Hamburg", posts: 3 },
    { from: "Luneburg", to: "Hamburg", posts: 4 },
    { from: "Luneburg", to: "Perleberg", posts: 3, tavern: true },
    { from: "Stendal", to: "Perleberg", posts: 3 },
    { from: "Stendal", to: "Brunswick", posts: 4 },
    { from: "Stendal", to: "Magdeburg", posts: 3 },
    { from: "Goslar", to: "Magdeburg", posts: 2 },
    { from: "Goslar", to: "Quedlinburg", posts: 4 },
    { from: "Goslar", to: "Hildesheim", posts: 3, tavern: true },
    { from: "Halle", to: "Quedlinburg", posts: 4 },
    { from: "Gottingen", to: "Quedlinburg", posts: 3 },
  ],
};

export const addNeighbors = (map: GameMap): GameMap => {
  for (const city of Object.values(map.cities)) {
    city.neighbors = [];
    for (const route of map.routes) {
      if (route.from === city.name) {
        city.neighbors.push(route.to);
      }
      if (route.to === city.name) {
        city.neighbors.push(route.from);
      }
    }
  }
  return map;
};

export const Standard3P = addNeighbors(BaseMap);
