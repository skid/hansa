/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/": {
    get: {
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/messages": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          content?: parameters["rowFilter.messages.content"];
          playerName?: parameters["rowFilter.messages.playerName"];
          createdAt?: parameters["rowFilter.messages.createdAt"];
          gameId?: parameters["rowFilter.messages.gameId"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["messages"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** messages */
          messages?: definitions["messages"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          content?: parameters["rowFilter.messages.content"];
          playerName?: parameters["rowFilter.messages.playerName"];
          createdAt?: parameters["rowFilter.messages.createdAt"];
          gameId?: parameters["rowFilter.messages.gameId"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          content?: parameters["rowFilter.messages.content"];
          playerName?: parameters["rowFilter.messages.playerName"];
          createdAt?: parameters["rowFilter.messages.createdAt"];
          gameId?: parameters["rowFilter.messages.gameId"];
        };
        body: {
          /** messages */
          messages?: definitions["messages"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/games": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.games.id"];
          state?: parameters["rowFilter.games.state"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["games"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** games */
          games?: definitions["games"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.games.id"];
          state?: parameters["rowFilter.games.state"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.games.id"];
          state?: parameters["rowFilter.games.state"];
        };
        body: {
          /** games */
          games?: definitions["games"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
}

export interface definitions {
  messages: {
    /**
     * Format: uuid
     * @description Note:
     * This is a Primary Key.<pk/>
     */
    id: string;
    /** Format: text */
    content: string;
    /** Format: text */
    playerName: string;
    /**
     * Format: timestamp without time zone
     * @default now()
     */
    createdAt: string;
    /**
     * Format: uuid
     * @description Note:
     * This is a Foreign Key to `games.id`.<fk table='games' column='id'/>
     */
    gameId: string;
  };
  games: {
    /**
     * Format: uuid
     * @description Note:
     * This is a Primary Key.<pk/>
     * @default extensions.uuid_generate_v4()
     */
    id: string;
    /** Format: json */
    state: unknown;
  };
}

export interface parameters {
  /**
   * @description Preference
   * @enum {string}
   */
  preferParams: "params=single-object";
  /**
   * @description Preference
   * @enum {string}
   */
  preferReturn: "return=representation" | "return=minimal" | "return=none";
  /**
   * @description Preference
   * @enum {string}
   */
  preferCount: "count=none";
  /** @description Filtering Columns */
  select: string;
  /** @description On Conflict */
  on_conflict: string;
  /** @description Ordering */
  order: string;
  /** @description Limiting and Pagination */
  range: string;
  /**
   * @description Limiting and Pagination
   * @default items
   */
  rangeUnit: string;
  /** @description Limiting and Pagination */
  offset: string;
  /** @description Limiting and Pagination */
  limit: string;
  /** @description messages */
  "body.messages": definitions["messages"];
  /** Format: uuid */
  "rowFilter.messages.id": string;
  /** Format: text */
  "rowFilter.messages.content": string;
  /** Format: text */
  "rowFilter.messages.playerName": string;
  /** Format: timestamp without time zone */
  "rowFilter.messages.createdAt": string;
  /** Format: uuid */
  "rowFilter.messages.gameId": string;
  /** @description games */
  "body.games": definitions["games"];
  /** Format: uuid */
  "rowFilter.games.id": string;
  /** Format: json */
  "rowFilter.games.state": string;
}

export interface operations {}

export interface external {}