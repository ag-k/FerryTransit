// config/bus-feeds.json から生成。直接編集しないでください。
export type BusFeedId = "ama" | "nishinoshima" | "chibu" | "okinoshima" | "ichibata_bus_connection" | "hatsumi_bus_connection"

export const BUS_FEED_DEFINITIONS = [
  {
    "id": "ama",
    "sourceId": "ama-town",
    "basePath": "data/gtfs/bus/ama",
    "stopPrefix": "BUS_AMA_",
    "operatorId": "AMA_TOWN",
    "townLabelKey": "AMA_CHO",
    "tripName": "AMA_TOWN_BUS",
    "tripIdBase": 3000000,
    "fare": 200,
    "routeNameStrategy": "ama"
  },
  {
    "id": "nishinoshima",
    "sourceId": "nishinoshima-town",
    "basePath": "data/gtfs/bus/nishinoshima",
    "stopPrefix": "BUS_NISHINOSHIMA_",
    "operatorId": "NISHINOSHIMA_TOWN",
    "townLabelKey": "NISHINOSHIMA_CHO",
    "tripName": "NISHINOSHIMA_TOWN_BUS",
    "tripIdBase": 4000000,
    "fare": 200,
    "routeNameStrategy": "nishinoshima"
  },
  {
    "id": "chibu",
    "sourceId": "chibu-village",
    "basePath": "data/gtfs/bus/chibu",
    "stopPrefix": "BUS_CHIBU_",
    "operatorId": "CHIBU_VILLAGE",
    "townLabelKey": "CHIBU_MURA",
    "tripName": "CHIBU_VILLAGE_BUS",
    "tripIdBase": 5000000,
    "fare": 100,
    "routeNameStrategy": "chibu"
  },
  {
    "id": "okinoshima",
    "sourceId": "okinoshima-town",
    "basePath": "data/gtfs/bus/okinoshima",
    "stopPrefix": "BUS_OKINOSHIMA_",
    "operatorId": "OKINOSHIMA",
    "townLabelKey": "OKINOSHIMA_CHO",
    "tripName": "OKINOSHIMA_BUS",
    "tripIdBase": 6000000,
    "fare": 500,
    "routeNameStrategy": "okinoshima"
  },
  {
    "id": "ichibata_bus_connection",
    "sourceId": "ichibata-bus-connection",
    "basePath": "data/gtfs/bus/ichibata_bus_connection",
    "stopPrefix": "BUS_ICHIBATA_CONNECTION_",
    "operatorId": "ICHIBATA_BUS",
    "townLabelKey": "MAINLAND",
    "tripName": "ICHIBATA_BUS_CONNECTION",
    "tripIdBase": 7000000,
    "fare": 1200,
    "routeNameStrategy": "ichibata_bus_connection"
  },
  {
    "id": "hatsumi_bus_connection",
    "sourceId": "oki-kouiki-bus",
    "basePath": "data/gtfs/bus/hatsumi_bus_connection",
    "stopPrefix": "BUS_HATSUMI_CONNECTION_",
    "operatorId": "HATSUMI_BUS",
    "townLabelKey": "MAINLAND",
    "tripName": "HATSUMI_BUS_CONNECTION",
    "tripIdBase": 8000000,
    "fare": 500,
    "routeNameStrategy": "hatsumi_bus_connection"
  }
] as const

export const BUS_FEED_DEFINITION_BY_ID = Object.fromEntries(
  BUS_FEED_DEFINITIONS.map(feed => [feed.id, feed])
) as Record<BusFeedId, (typeof BUS_FEED_DEFINITIONS)[number]>
