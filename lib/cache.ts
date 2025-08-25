import NodeCache from "node-cache";

// Cache with a 1-hour TTL
export const scrapeCache = new NodeCache({ stdTTL: 3600 });
