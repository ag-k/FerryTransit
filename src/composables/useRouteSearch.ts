import { onMounted } from "vue";
import { useI18n } from "#imports";
import { useFerryStore } from "@/stores/ferry";
import { useFareStore } from "@/stores/fare";
import { useFerryData } from "@/composables/useFerryData";
import { useTimetableLoader } from "@/composables/useTimetableLoader";
import type { Trip, TransitRoute, TransitSegment } from "@/types";
import type { FareRoute, VesselType } from "@/types/fare";
import { createLogger } from "~/utils/logger";
import { isTodayJst } from "@/utils/jstDate";
import {
  DEFAULT_VEHICLE_LENGTH_METERS,
  calculateVehicleFareForShip,
  isOkiKisenVehicleFerry,
  isVehicleSearchShip,
  normalizeVehicleLengthMeters,
} from "@/utils/vehicleFare";
import {
  getAllPortConnectedBusStopCodes,
  getBusStopConnectedPortId,
  getConnectedBusStopsForPort,
  isBusStopCode,
  isTripActiveOnDate,
  loadBusTripsForRoute,
} from "@/utils/gtfsBusTimetable";

const WALK_TRANSFER_MINUTES = 3;
const WALK_SEGMENT_SHIP = "WALK";
const MAX_INTERMODAL_SEGMENTS = 5;

export const useRouteSearch = () => {
  const ferryStore = process.client ? useFerryStore() : null;
  const fareStore = process.client ? useFareStore() : null;
  const { getTripStatus, initializeData } = useFerryData();
  const { ensureTimetableLoaded } = useTimetableLoader();
  const i18n = useI18n() as any;
  const logger = createLogger("useRouteSearch");

  const getStatusForSearchDate = (trip: Trip, applyLiveStatus: boolean): number => {
    if (!applyLiveStatus) {
      return Number((trip as any).status ?? 0) || 0;
    }
    return getTripStatus(trip);
  };

  const buildRouteSignature = (route: TransitRoute): string => {
    return route.segments
      .map((s) => `${s.departure}->${s.arrival}@${s.mode ?? 'FERRY'}:${s.ship}`)
      .join("|");
  };

  const calculateTotalTransferWaitMs = (route: TransitRoute): number => {
    if (route.segments.length <= 1) {
      return 0;
    }

    let total = 0;
    for (let i = 0; i < route.segments.length - 1; i++) {
      const prev = route.segments[i];
      const next = route.segments[i + 1];
      if (!prev || !next) continue;
      const diff = next.departureTime.getTime() - prev.arrivalTime.getTime();
      total += Math.max(0, diff);
    }
    return total;
  };

  const getRouteTripIdsKey = (route: TransitRoute): string => {
    return route.segments.map((s) => s.tripId).join("|");
  };

  const isBetterTransferCandidate = (
    candidate: TransitRoute,
    current: TransitRoute
  ): boolean => {
    const candidateWait = calculateTotalTransferWaitMs(candidate);
    const currentWait = calculateTotalTransferWaitMs(current);
    if (candidateWait !== currentWait) {
      return candidateWait < currentWait;
    }

    const candidateDeparture = candidate.departureTime.getTime();
    const currentDeparture = current.departureTime.getTime();
    if (candidateDeparture !== currentDeparture) {
      return candidateDeparture < currentDeparture;
    }

    const candidateArrival = candidate.arrivalTime.getTime();
    const currentArrival = current.arrivalTime.getTime();
    if (candidateArrival !== currentArrival) {
      return candidateArrival < currentArrival;
    }

    return getRouteTripIdsKey(candidate) < getRouteTripIdsKey(current);
  };

  const dedupeTransferRoutesByWaitTime = (
    routes: TransitRoute[]
  ): TransitRoute[] => {
    const directRoutes = routes.filter((r) => r.segments.length <= 1);
    const transferRoutes = routes.filter((r) => r.segments.length >= 2);

    const bestBySignature = new Map<string, TransitRoute>();
    for (const route of transferRoutes) {
      const signature = buildRouteSignature(route);
      const currentBest = bestBySignature.get(signature);
      if (!currentBest || isBetterTransferCandidate(route, currentBest)) {
        bestBySignature.set(signature, route);
      }
    }

    return [...directRoutes, ...Array.from(bestBySignature.values())];
  };

  // Initialize fare data
  onMounted(async () => {
    if (fareStore) {
      await fareStore.loadFareMaster();
    }
  });

  // Search for routes between ports
  const searchRoutes = async (
    departure: string,
    arrival: string,
    searchDate: Date,
    searchTime: string,
    isArrivalMode: boolean = false,
    withCar: boolean = false,
    vehicleLengthMeters: number = DEFAULT_VEHICLE_LENGTH_METERS
  ): Promise<TransitRoute[]> => {
    // Ensure data is loaded
    if (ferryStore) {
      await ensureTimetableLoaded();
      if (ferryStore.timetableData.length === 0) {
        await initializeData();
      }
    } else {
      await initializeData();
    }
    if (fareStore) {
      await fareStore.loadFareMaster();
    }

    const routes: TransitRoute[] = [];
    const searchDateTime = new Date(searchDate);
    const [hours = 0, minutes = 0] = searchTime.split(":").map(Number);
    searchDateTime.setHours(hours, minutes, 0, 0);
    const applyLiveStatus = isTodayJst(searchDate);
    const normalizedVehicleLengthMeters = normalizeVehicleLengthMeters(
      vehicleLengthMeters
    );

    // Debug logging
    logger.debug("Search params", {
      departure,
      arrival,
      searchDate,
      searchTime,
      isArrivalMode,
      applyLiveStatus,
      withCar,
      vehicleLengthMeters: normalizedVehicleLengthMeters,
    });
    logger.debug("Total timetable data", ferryStore?.timetableData.length || 0);

    // Get filtered timetable for the date based on start_date and end_date
    // Format date as YYYY-MM-DD in JST
    const year = searchDate.getFullYear();
    const month = String(searchDate.getMonth() + 1).padStart(2, "0");
    const day = String(searchDate.getDate()).padStart(2, "0");
    const searchDateStr = `${year}-${month}-${day}`;

    const dayTimetable = (ferryStore?.timetableData || []).filter((trip) => {
      return isTripActiveOnDate(trip, searchDate, searchDateStr);
    });
    let busDirectTrips: Trip[] = [];
    if (!withCar) {
      try {
        busDirectTrips = await loadBusTripsForRoute(departure, arrival, searchDateStr);
      } catch (error) {
        logger.warn("Failed to load bus search data", error);
      }
    }
    const searchableTimetable = withCar
      ? dayTimetable.filter((trip) => isVehicleSearchShip(trip.name))
      : [...dayTimetable, ...busDirectTrips];

    logger.debug("Filtered timetable for date range", {
      count: dayTimetable.length,
      busDirectCount: busDirectTrips.length,
      searchableCount: searchableTimetable.length,
      searchDate: searchDateStr,
    });

    // Find direct routes
    const directRoutes = await findDirectRoutes(
      searchableTimetable,
      departure,
      arrival,
      searchDateTime,
      isArrivalMode,
      applyLiveStatus,
      withCar,
      normalizedVehicleLengthMeters
    );

    routes.push(...directRoutes);

    if (!withCar && (isBusStopCode(departure) || isBusStopCode(arrival))) {
      const intermodalRoutes = await findIntermodalRoutes(
        dayTimetable,
        departure,
        arrival,
        searchDateTime,
        isArrivalMode,
        applyLiveStatus,
        normalizedVehicleLengthMeters,
        searchDateStr
      );
      routes.push(...intermodalRoutes);
    }

    // Find transfer routes if direct routes are limited
    if (directRoutes.length < 5) {
      const transferRoutes = await findTransferRoutes(
        searchableTimetable,
        departure,
        arrival,
        searchDateTime,
        isArrivalMode,
        applyLiveStatus,
        withCar,
        normalizedVehicleLengthMeters
      );
      routes.push(...transferRoutes);
    }

    // Sort routes
    if (isArrivalMode) {
      routes.sort((a, b) => b.arrivalTime.getTime() - a.arrivalTime.getTime());
    } else {
      routes.sort(
        (a, b) => a.departureTime.getTime() - b.departureTime.getTime()
      );
    }

    // De-duplicate transfer routes that have the same path + vessel sequence
    // and differ only by transfer wait time.
    const dedupedRoutes = dedupeTransferRoutesByWaitTime(routes);

    // Keep existing sort behavior after de-duplication
    if (isArrivalMode) {
      dedupedRoutes.sort(
        (a, b) => b.arrivalTime.getTime() - a.arrivalTime.getTime()
      );
    } else {
      dedupedRoutes.sort(
        (a, b) => a.departureTime.getTime() - b.departureTime.getTime()
      );
    }

    return dedupedRoutes;
  };

  // Find direct routes
  const findDirectRoutes = async (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean,
    applyLiveStatus: boolean,
    withCar: boolean,
    vehicleLengthMeters: number
  ): Promise<TransitRoute[]> => {
    const routes: TransitRoute[] = [];

    // Handle special HONDO port mapping
    const departurePorts =
      departure === "HONDO"
        ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
        : [departure];
    const arrivalPorts =
      arrival === "HONDO"
        ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
        : [arrival];

    logger.debug("Direct route search", { departurePorts, arrivalPorts });

    // 本土の港を判定する関数
    const isMainlandPort = (port: string | undefined): boolean => {
      return port === "HONDO_SHICHIRUI" || port === "HONDO_SAKAIMINATO";
    };

    for (const trip of timetable) {
      if (
        departurePorts.includes(trip.departure) &&
        arrivalPorts.includes(trip.arrival)
      ) {
        // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
        if (trip.via && isMainlandPort(trip.via)) {
          // 出発地または目的地が本土の港の場合は除外しない
          if (
            !isMainlandPort(trip.departure) &&
            !isMainlandPort(trip.arrival)
          ) {
            continue;
          }
        }

        logger.debug("Found matching trip", trip);
        // Create date objects using the search date and trip times
        const [depHours, depMinutes] = parseTimeParts(trip.departureTime);
        const [arrHours, arrMinutes] = parseTimeParts(trip.arrivalTime);

        const departureTime = new Date(searchTime);
        departureTime.setHours(depHours, depMinutes, 0, 0);

        const arrivalTime = new Date(searchTime);
        arrivalTime.setHours(arrHours, arrMinutes, 0, 0);

        // Check time constraints
        if (isArrivalMode) {
          if (arrivalTime > searchTime) continue;
        } else if (departureTime < searchTime) {
          continue;
        }

        // 欠航等の「運航状況（ライブ）」は当日の検索結果にのみ反映する
        const status = getStatusForSearchDate(trip, applyLiveStatus);
        // NOTE: 時刻表と合わせて欠航便も表示対象にする（status=2 のまま返す）

        const fareFields = await calculateSegmentFareFields(
          trip.name,
          trip.departure,
          trip.arrival,
          departureTime,
          withCar,
          vehicleLengthMeters
        );

        const segment: TransitSegment = {
          tripId: String(trip.tripId),
          ship: trip.name,
          mode: trip.mode ?? "FERRY",
          operatorId: trip.operatorId,
          serviceId: trip.serviceId,
          vehicleId: trip.vehicleId,
          departure: trip.departure,
          departureType: trip.departureType,
          arrival: trip.arrival,
          arrivalType: trip.arrivalType,
          departureTime,
          arrivalTime,
          platform: trip.platform,
          terminal: trip.terminal,
          gate: trip.gate,
          status,
          ...fareFields,
        };

        routes.push({
          segments: [segment],
          departureTime,
          arrivalTime,
          totalFare: segment.fare,
          transferCount: 0,
        });
      }
    }

    return routes;
  };

  const getLocationTypeForSearch = (locationId: string): "PORT" | "STOP" => {
    return isBusStopCode(locationId) ? "STOP" : "PORT";
  };

  const expandHondoPort = (portId: string): string[] => {
    return portId === "HONDO"
      ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
      : [portId];
  };

  const matchesLocation = (actual: string, expected: string): boolean => {
    return expandHondoPort(expected).includes(actual);
  };

  const createDateForTripTime = (timeValue: string | Date, baseDate: Date): Date => {
    const [hours, minutes] = parseTimeParts(timeValue);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };

  const shouldSkipMainlandVia = (trip: Trip): boolean => {
    if (!trip.via || !isMainlandPort(trip.via)) return false;
    return !isMainlandPort(trip.departure) && !isMainlandPort(trip.arrival);
  };

  const createScheduledSegment = async (
    trip: Trip,
    currentTime: Date,
    applyLiveStatus: boolean,
    vehicleLengthMeters: number
  ): Promise<TransitSegment | null> => {
    const departureTime = createDateForTripTime(trip.departureTime, currentTime);
    if (departureTime < currentTime) return null;

    const arrivalTime = createDateForTripTime(trip.arrivalTime, departureTime);
    if (arrivalTime < departureTime) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }

    const fareFields = await calculateSegmentFareFields(
      trip.name,
      trip.departure,
      trip.arrival,
      departureTime,
      false,
      vehicleLengthMeters
    );

    return {
      tripId: String(trip.tripId),
      ship: trip.name,
      mode: trip.mode ?? "FERRY",
      operatorId: trip.operatorId,
      serviceId: trip.serviceId,
      vehicleId: trip.vehicleId,
      departure: trip.departure,
      departureType: trip.departureType,
      arrival: trip.arrival,
      arrivalType: trip.arrivalType,
      departureTime,
      arrivalTime,
      platform: trip.platform,
      terminal: trip.terminal,
      gate: trip.gate,
      status: getStatusForSearchDate(trip, applyLiveStatus),
      ...fareFields,
    };
  };

  const createWalkSegment = (
    departure: string,
    arrival: string,
    departureTime: Date
  ): TransitSegment => {
    const arrivalTime = new Date(
      departureTime.getTime() + WALK_TRANSFER_MINUTES * 60 * 1000
    );

    return {
      tripId: `${WALK_SEGMENT_SHIP}_${departure}_${arrival}_${departureTime.getTime()}`,
      ship: WALK_SEGMENT_SHIP,
      mode: "WALK",
      departure,
      departureType: getLocationTypeForSearch(departure),
      arrival,
      arrivalType: getLocationTypeForSearch(arrival),
      departureTime,
      arrivalTime,
      status: 0,
      fare: 0,
      passengerFare: 0,
    };
  };

  const isFerrySearchTrip = (trip: Trip): boolean => {
    return (trip.mode ?? "FERRY") !== "BUS" && (trip.mode ?? "FERRY") !== "WALK";
  };

  const findIntermodalRoutes = async (
    ferryTimetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean,
    applyLiveStatus: boolean,
    vehicleLengthMeters: number,
    searchDateStr: string
  ): Promise<TransitRoute[]> => {
    const connectedStops = getAllPortConnectedBusStopCodes();
    const connectedPorts = Array.from(
      new Set(
        connectedStops
          .map(stop => getBusStopConnectedPortId(stop))
          .filter((portId): portId is string => Boolean(portId))
      )
    );
    const busTripCache = new Map<string, Promise<Trip[]>>();
    const routeResults: TransitRoute[] = [];
    const routeKeys = new Set<string>();
    const startTime = new Date(searchTime);
    const ferryTripById = new Map<string, Trip>();

    for (const trip of ferryTimetable) {
      ferryTripById.set(String(trip.tripId), trip);
    }

    if (isArrivalMode) {
      startTime.setHours(0, 0, 0, 0);
    }

    const getBusTrips = (from: string, to: string): Promise<Trip[]> => {
      const key = `${from}->${to}`;
      const cached = busTripCache.get(key);
      if (cached) return cached;

      const promise = loadBusTripsForRoute(from, to, searchDateStr)
        .catch((error) => {
          logger.warn("Failed to load bus trips for intermodal route", {
            from,
            to,
            error,
          });
          return [];
        });
      busTripCache.set(key, promise);
      return promise;
    };

    const getWalkSegments = (node: string, currentTime: Date): TransitSegment[] => {
      const connectedPort = getBusStopConnectedPortId(node);
      if (connectedPort) {
        return [createWalkSegment(node, connectedPort, currentTime)];
      }

      return getConnectedBusStopsForPort(node)
        .map(stop => createWalkSegment(node, stop, currentTime));
    };

    const getBusSegments = async (
      node: string,
      currentTime: Date
    ): Promise<TransitSegment[]> => {
      if (!isBusStopCode(node)) return [];

      const targets = new Set<string>();
      if (isBusStopCode(arrival)) targets.add(arrival);
      for (const stop of connectedStops) targets.add(stop);
      targets.delete(node);

      const segments: TransitSegment[] = [];
      for (const target of targets) {
        const trips = await getBusTrips(node, target);
        for (const trip of trips) {
          const segment = await createScheduledSegment(
            trip,
            currentTime,
            applyLiveStatus,
            vehicleLengthMeters
          );
          if (!segment) continue;
          if (isArrivalMode && segment.arrivalTime > searchTime) continue;
          segments.push(segment);
        }
      }

      return segments.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime());
    };

    const getFerrySegments = async (
      node: string,
      currentTime: Date
    ): Promise<TransitSegment[]> => {
      if (isBusStopCode(node)) return [];

      const targetPorts = new Set<string>(connectedPorts);
      if (!isBusStopCode(arrival)) {
        for (const port of expandHondoPort(arrival)) targetPorts.add(port);
      }
      for (const port of expandHondoPort(node)) targetPorts.delete(port);

      const departurePorts = expandHondoPort(node);
      const segments: TransitSegment[] = [];

      for (const trip of ferryTimetable) {
        if (!isFerrySearchTrip(trip)) continue;
        if (!departurePorts.includes(trip.departure)) continue;
        if (!targetPorts.has(trip.arrival)) continue;
        if (shouldSkipMainlandVia(trip)) continue;

        const segment = await createScheduledSegment(
          trip,
          currentTime,
          applyLiveStatus,
          vehicleLengthMeters
        );
        if (!segment) continue;
        if (isArrivalMode && segment.arrivalTime > searchTime) continue;
        segments.push(segment);
      }

      return segments.sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime());
    };

    type IntermodalState = {
      node: string;
      time: Date;
      segments: TransitSegment[];
      visited: Set<string>;
    };

    const getSourceTripForSegment = (segment: TransitSegment): Trip | undefined => {
      const tripIds = String(segment.tripId).split("-");

      for (let i = tripIds.length - 1; i >= 0; i--) {
        const tripId = tripIds[i];
        if (!tripId) continue;
        const trip = ferryTripById.get(tripId);
        if (trip) return trip;
      }

      return undefined;
    };

    const isMergeableThroughShipSegment = (segment: TransitSegment): boolean => {
      return (segment.mode ?? "FERRY") === "FERRY";
    };

    const canMergeThroughShipSegments = (
      previous: TransitSegment,
      next: TransitSegment
    ): boolean => {
      if (
        !isMergeableThroughShipSegment(previous) ||
        !isMergeableThroughShipSegment(next)
      ) {
        return false;
      }
      if (previous.ship !== next.ship || previous.arrival !== next.departure) {
        return false;
      }

      const previousTrip = getSourceTripForSegment(previous);
      const nextTrip = getSourceTripForSegment(next);
      if (!previousTrip || !nextTrip) return false;

      return shouldNormalizeTrips(previousTrip, nextTrip);
    };

    const normalizeThroughShipSegments = async (
      segments: TransitSegment[]
    ): Promise<TransitSegment[]> => {
      if (segments.length <= 1) return segments;

      const normalized: TransitSegment[] = [];
      let group: TransitSegment[] = [];

      const flushGroup = async () => {
        if (group.length === 0) return;
        if (group.length === 1) {
          normalized.push(group[0]!);
          group = [];
          return;
        }

        const first = group[0]!;
        const last = group[group.length - 1]!;
        const fareFields = await calculateSegmentFareFields(
          first.ship,
          first.departure,
          last.arrival,
          first.departureTime,
          false,
          vehicleLengthMeters
        );

        normalized.push({
          ...first,
          tripId: group.map(segment => segment.tripId).join("-"),
          arrival: last.arrival,
          arrivalType: last.arrivalType,
          arrivalTime: last.arrivalTime,
          status: Math.max(...group.map(segment => segment.status)),
          ...fareFields,
        });
        group = [];
      };

      for (const segment of segments) {
        if (group.length === 0) {
          group = [segment];
          continue;
        }

        const previous = group[group.length - 1]!;
        if (canMergeThroughShipSegments(previous, segment)) {
          group.push(segment);
          continue;
        }

        await flushGroup();
        group = [segment];
      }

      await flushGroup();
      return normalized;
    };

    const pushRouteIfComplete = async (state: IntermodalState): Promise<boolean> => {
      if (
        state.segments.length > 0 &&
        state.segments.some(segment => segment.mode === "WALK") &&
        matchesLocation(state.node, arrival)
      ) {
        const segments = await normalizeThroughShipSegments(state.segments);
        const routeKey = segments
          .map(segment => `${segment.tripId}:${segment.departure}->${segment.arrival}`)
          .join("|");
        if (!routeKeys.has(routeKey)) {
          routeKeys.add(routeKey);
          routeResults.push({
            segments,
            departureTime: segments[0]!.departureTime,
            arrivalTime: state.time,
            totalFare: segments.reduce((sum, segment) => sum + segment.fare, 0),
            transferCount: Math.max(0, segments.length - 1),
          });
        }
        return true;
      }

      return false;
    };

    let states: IntermodalState[] = [{
      node: departure,
      time: startTime,
      segments: [],
      visited: new Set([departure]),
    }];

    for (let depth = 0; depth < MAX_INTERMODAL_SEGMENTS; depth++) {
      const nextStates: IntermodalState[] = [];

      for (const state of states) {
        if (await pushRouteIfComplete(state)) {
          continue;
        }

        const candidates = [
          ...getWalkSegments(state.node, state.time),
          ...(await getBusSegments(state.node, state.time)),
          ...(await getFerrySegments(state.node, state.time)),
        ];

        for (const segment of candidates) {
          if (segment.arrival === state.node) continue;
          if (state.visited.has(segment.arrival)) {
            continue;
          }

          const nextVisited = new Set(state.visited);
          nextVisited.add(segment.arrival);
          const nextState = {
            node: segment.arrival,
            time: segment.arrivalTime,
            segments: [...state.segments, segment],
            visited: nextVisited,
          };
          if (await pushRouteIfComplete(nextState)) continue;
          nextStates.push(nextState);
        }
      }

      states = nextStates;
      if (states.length === 0) break;
    }

    return routeResults;
  };

  // Find transfer routes
  const findTransferRoutes = async (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean,
    applyLiveStatus: boolean,
    withCar: boolean,
    vehicleLengthMeters: number
  ): Promise<TransitRoute[]> => {
    const routes: TransitRoute[] = [];
    const processedRoutes = new Set<string>();
    const tripMap = new Map<string, Trip>();
    const tripsByDeparture = new Map<string, Trip[]>();

    for (const trip of timetable) {
      tripMap.set(String(trip.tripId), trip);
      const departures = tripsByDeparture.get(trip.departure) ?? [];
      departures.push(trip);
      tripsByDeparture.set(trip.departure, departures);
    }

    // Handle special HONDO port mapping
    const departurePorts =
      departure === "HONDO"
        ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
        : [departure];
    const arrivalPorts =
      arrival === "HONDO"
        ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
        : [arrival];

    const collectTripChain = (
      startTrip: Trip
    ): { trips: Trip[]; maxStatus: number } | null => {
      const chain: Trip[] = [startTrip];
      let current = startTrip;
      let maxStatus = getStatusForSearchDate(startTrip, applyLiveStatus);

      // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
      if (current.via && isMainlandPort(current.via)) {
        if (
          !isMainlandPort(current.departure) &&
          !isMainlandPort(current.arrival)
        ) {
          return null;
        }
      }

      if (arrivalPorts.includes(current.arrival)) {
        return { trips: chain, maxStatus };
      }

      while (current.nextId) {
        if (isMainlandPort(current.arrival)) {
          return null;
        }

        const nextTrip = tripMap.get(String(current.nextId));
        if (!nextTrip) {
          return null;
        }

        // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
        if (nextTrip.via && isMainlandPort(nextTrip.via)) {
          const endpointsNonMainland =
            !isMainlandPort(nextTrip.departure) &&
            !isMainlandPort(nextTrip.arrival);

          // 例: KURI→HONDO→KURI→(KURI→BEPPU/SAIGO...) のように
          // 本土から出発地へ戻った“直後”の区間は、via が本土になっていても
          // 「2回目の出発地→目的地」区間として結果に含めたい
          const canIgnoreViaAfterReturnToDeparture =
            endpointsNonMainland &&
            isMainlandPort(current.departure) &&
            departurePorts.includes(current.arrival) &&
            departurePorts.includes(nextTrip.departure);

          if (endpointsNonMainland && !canIgnoreViaAfterReturnToDeparture) {
            return null;
          }
        }

        if (nextTrip.name !== current.name) {
          return null;
        }

        if (nextTrip.departure !== current.arrival) {
          return null;
        }

        const nextStatus = getStatusForSearchDate(nextTrip, applyLiveStatus);
        // NOTE: 欠航便もチェーンに含める（maxStatus に反映）

        chain.push(nextTrip);
        maxStatus = Math.max(maxStatus, nextStatus);
        current = nextTrip;

        if (arrivalPorts.includes(current.arrival)) {
          return { trips: chain, maxStatus };
        }
      }

      return null;
    };

    // First leg trips
    for (const firstTrip of timetable) {
      if (!departurePorts.includes(firstTrip.departure)) continue;

      // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
      if (firstTrip.via && isMainlandPort(firstTrip.via)) {
        // 出発地または目的地が本土の港の場合は除外しない
        if (
          !isMainlandPort(firstTrip.departure) &&
          !isMainlandPort(firstTrip.arrival)
        ) {
          continue;
        }
      }

      const [firstDepHours, firstDepMinutes] = parseTimeParts(
        firstTrip.departureTime
      );
      const [firstArrHours, firstArrMinutes] = parseTimeParts(
        firstTrip.arrivalTime
      );

      const firstDepartureTime = new Date(searchTime);
      firstDepartureTime.setHours(firstDepHours, firstDepMinutes, 0, 0);

      const firstArrivalTime = new Date(searchTime);
      firstArrivalTime.setHours(firstArrHours, firstArrMinutes, 0, 0);

      if (!isArrivalMode && firstDepartureTime < searchTime) continue;

      const firstStatus = getStatusForSearchDate(firstTrip, applyLiveStatus);
      // NOTE: 欠航便も候補に含める（status=2 のまま返す）

      if (arrivalPorts.includes(firstTrip.arrival)) continue;

      for (const secondTrip of tripsByDeparture.get(firstTrip.arrival) ?? []) {
        // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
        if (secondTrip.via && isMainlandPort(secondTrip.via)) {
          // 出発地または目的地が本土の港の場合は除外しない
          if (
            !isMainlandPort(secondTrip.departure) &&
            !isMainlandPort(secondTrip.arrival)
          ) {
            continue;
          }
        }

        const chainResult = collectTripChain(secondTrip);
        if (!chainResult) continue;

        const { trips: chain, maxStatus: chainStatus } = chainResult;
        const finalTrip = chain[chain.length - 1];
        if (!finalTrip) continue;

        const [secondDepHours, secondDepMinutes] = parseTimeParts(
          secondTrip.departureTime
        );
        const secondDepartureTime = new Date(firstArrivalTime);
        secondDepartureTime.setHours(secondDepHours, secondDepMinutes, 0, 0);

        const [secondArrHours, secondArrMinutes] = parseTimeParts(
          finalTrip.arrivalTime
        );
        const secondArrivalTime = new Date(secondDepartureTime);
        secondArrivalTime.setHours(secondArrHours, secondArrMinutes, 0, 0);

        if (secondDepartureTime <= firstArrivalTime) continue;

        if (isArrivalMode && secondArrivalTime > searchTime) continue;

        if (
          isMainlandPort(departure) &&
          isMainlandPort(firstTrip.arrival) &&
          isMainlandPort(arrival)
        ) {
          continue;
        }

        // 本土に寄っていったん出発地へ戻る便（例: KURI→HONDO→KURI→BEPPU / KURI→HONDO→KURI→SAIGO）
        // この場合は「本土を含む区間」は表示せず、出発地に戻った後の区間（2回目の KURI→...）だけを結果に含める
        const isDetourToMainland =
          !isMainlandPort(departure) &&
          !isMainlandPort(arrival) &&
          isMainlandPort(firstTrip.arrival) &&
          isMainlandPort(secondTrip.departure);

        if (isDetourToMainland) {
          // chain は secondTrip を先頭に含むので、idx>0 で「本土から戻った後」の区間を探す
          const resumeIdx = chain.findIndex(
            (t, idx) => idx > 0 && departurePorts.includes(t.departure)
          );

          // 出発地へ戻らない本土経由（例: SAIGO→HONDO→BEPPU）は除外
          if (resumeIdx === -1) {
            continue;
          }

          const resumeTrips = chain.slice(resumeIdx);
          const resumeFinalTrip = resumeTrips[resumeTrips.length - 1];
          if (!resumeFinalTrip) {
            continue;
          }
          if (!arrivalPorts.includes(resumeFinalTrip.arrival)) {
            continue;
          }

          // 再開区間のセグメントを構築（1本だけの場合は直行扱い）
          const resumeSegments: TransitSegment[] = [];
          let prevArrival: Date | null = null;
          let totalFare = 0;
          let maxStatus = 0;

          for (const t of resumeTrips) {
            const [depH, depM] = parseTimeParts(t.departureTime);
            const [arrH, arrM] = parseTimeParts(t.arrivalTime);

            const depTime: Date = prevArrival
              ? new Date(prevArrival)
              : new Date(searchTime);
            depTime.setHours(depH, depM, 0, 0);
            if (prevArrival && depTime <= prevArrival) {
              depTime.setDate(depTime.getDate() + 1);
            }

            const arrTime: Date = new Date(depTime);
            arrTime.setHours(arrH, arrM, 0, 0);
            if (arrTime < depTime) {
              arrTime.setDate(arrTime.getDate() + 1);
            }

            // 検索時刻条件
            if (
              !isArrivalMode &&
              resumeSegments.length === 0 &&
              depTime < searchTime
            ) {
              // 再開区間の出発が検索時刻より前なら、この候補は無効
              resumeSegments.length = 0;
              break;
            }

            const status = getStatusForSearchDate(t, applyLiveStatus);
            if (status === 2) {
              resumeSegments.length = 0;
              break;
            }

            const fareFields = await calculateSegmentFareFields(
              t.name,
              t.departure,
              t.arrival,
              depTime,
              withCar,
              vehicleLengthMeters
            );
            totalFare += fareFields.fare;
            maxStatus = Math.max(maxStatus, status);

            resumeSegments.push({
              tripId: String(t.tripId),
              ship: t.name,
              mode: t.mode ?? "FERRY",
              operatorId: t.operatorId,
              serviceId: t.serviceId,
              vehicleId: t.vehicleId,
              departure: t.departure,
              departureType: t.departureType,
              arrival: t.arrival,
              arrivalType: t.arrivalType,
              departureTime: depTime,
              arrivalTime: arrTime,
              platform: t.platform,
              terminal: t.terminal,
              gate: t.gate,
              status,
              ...fareFields,
            });

            prevArrival = arrTime;
          }

          if (resumeSegments.length === 0) {
            continue;
          }

          if (isArrivalMode) {
            const finalSegment = resumeSegments[resumeSegments.length - 1];
            if (!finalSegment) {
              continue;
            }
            const finalArrival = finalSegment.arrivalTime;
            if (finalArrival > searchTime) {
              continue;
            }
          }

          const resumeKey = `resume-${resumeTrips
            .map((t) => t.tripId)
            .join("_")}`;
          if (processedRoutes.has(resumeKey)) continue;
          processedRoutes.add(resumeKey);

          const firstResumeSegment = resumeSegments[0];
          const lastResumeSegment = resumeSegments[resumeSegments.length - 1];
          if (!firstResumeSegment || !lastResumeSegment) {
            continue;
          }

          routes.push({
            segments: resumeSegments,
            departureTime: firstResumeSegment.departureTime,
            arrivalTime: lastResumeSegment.arrivalTime,
            totalFare,
            transferCount: Math.max(0, resumeSegments.length - 1),
          });

          continue;
        }

        const routeKey = `${firstTrip.tripId}-${chain
          .map((trip) => trip.tripId)
          .join("_")}`;
        if (processedRoutes.has(routeKey)) continue;
        processedRoutes.add(routeKey);

        if (shouldNormalizeTrips(firstTrip, secondTrip)) {
          const fareFields = await calculateSegmentFareFields(
            firstTrip.name,
            firstTrip.departure,
            finalTrip.arrival,
            firstDepartureTime,
            withCar,
            vehicleLengthMeters
          );

          const segment: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            mode: firstTrip.mode ?? "FERRY",
            operatorId: firstTrip.operatorId,
            serviceId: firstTrip.serviceId,
            vehicleId: firstTrip.vehicleId,
            departure: firstTrip.departure,
            departureType: firstTrip.departureType,
            arrival: finalTrip.arrival,
            arrivalType: finalTrip.arrivalType,
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            platform: firstTrip.platform,
            terminal: firstTrip.terminal,
            gate: firstTrip.gate,
            status: Math.max(firstStatus, chainStatus),
            ...fareFields,
          };

          routes.push({
            segments: [segment],
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            totalFare: segment.fare,
            transferCount: 0,
          });
        } else {
          const fareFields1 = await calculateSegmentFareFields(
            firstTrip.name,
            firstTrip.departure,
            firstTrip.arrival,
            firstDepartureTime,
            withCar,
            vehicleLengthMeters
          );

          const fareFields2 = await calculateSegmentFareFields(
            secondTrip.name,
            secondTrip.departure,
            finalTrip.arrival,
            secondDepartureTime,
            withCar,
            vehicleLengthMeters
          );

          const segment1: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            mode: firstTrip.mode ?? "FERRY",
            operatorId: firstTrip.operatorId,
            serviceId: firstTrip.serviceId,
            vehicleId: firstTrip.vehicleId,
            departure: firstTrip.departure,
            departureType: firstTrip.departureType,
            arrival: firstTrip.arrival,
            arrivalType: firstTrip.arrivalType,
            departureTime: firstDepartureTime,
            arrivalTime: firstArrivalTime,
            platform: firstTrip.platform,
            terminal: firstTrip.terminal,
            gate: firstTrip.gate,
            status: firstStatus,
            ...fareFields1,
          };

          const firstChainTrip = chain[0];
          const segment2: TransitSegment = {
            tripId:
              chain.length === 1 || !firstChainTrip
                ? String(secondTrip.tripId)
                : `${firstChainTrip.tripId}-${finalTrip.tripId}`,
            ship: secondTrip.name,
            mode: secondTrip.mode ?? "FERRY",
            operatorId: secondTrip.operatorId,
            serviceId: secondTrip.serviceId,
            vehicleId: secondTrip.vehicleId,
            departure: secondTrip.departure,
            departureType: secondTrip.departureType,
            arrival: finalTrip.arrival,
            arrivalType: finalTrip.arrivalType,
            departureTime: secondDepartureTime,
            arrivalTime: secondArrivalTime,
            platform: secondTrip.platform,
            terminal: secondTrip.terminal,
            gate: secondTrip.gate,
            status: chainStatus,
            ...fareFields2,
          };

          routes.push({
            segments: [segment1, segment2],
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            totalFare: segment1.fare + segment2.fare,
            transferCount: 1,
          });
        }
      }
    }

    return routes;
  };

  // Check if two trips should be normalized (same ship, connected)
  const shouldNormalizeTrips = (trip1: Trip, trip2: Trip): boolean => {
    return (
      trip1.name === trip2.name &&
      trip1.nextId !== undefined &&
      String(trip1.nextId) === String(trip2.tripId)
    );
  };

  // Check if port is on mainland
  const isMainlandPort = (port: string): boolean => {
    return ferryStore?.hondoPorts?.includes(port) || port === "HONDO";
  };

  // Parse time parts from string or Date
  const parseTimeParts = (timeValue: string | Date): [number, number] => {
    if (timeValue instanceof Date) {
      return [timeValue.getHours(), timeValue.getMinutes()];
    }

    const parts = String(timeValue).split(":");
    const hours = Number(parts[0]);
    const minutes = Number(parts[1] || 0);
    return [hours, minutes];
  };

  const toFarePortVariants = (port: string): string[] => {
    if (port === "HONDO") {
      return ["HONDO", "HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"];
    }
    if (port === "HONDO_SHICHIRUI" || port === "HONDO_SAKAIMINATO") {
      return [port, "HONDO"];
    }
    return [port];
  };

  const findFareRoute = (
    departure: string,
    arrival: string,
    date: Date | undefined,
    vesselType: VesselType
  ): FareRoute | undefined => {
    if (!fareStore?.fareMaster) return undefined;

    const departureCandidates = toFarePortVariants(departure);
    const arrivalCandidates = toFarePortVariants(arrival);

    for (const dep of departureCandidates) {
      for (const arr of arrivalCandidates) {
        const route = fareStore.getFareByRoute(dep, arr, {
          date,
          vesselType,
        });
        if (route) {
          return route;
        }
      }
    }

    return undefined;
  };

  const calculateVehicleFare = async (
    ship: string,
    departure: string,
    arrival: string,
    date: Date | undefined,
    vehicleLengthMeters: number
  ): Promise<number | null> => {
    if (!fareStore) {
      logger.warn(`FareStore is not available (server-side rendering?)`);
      return null;
    }

    if (!fareStore.fareMaster) {
      await fareStore.loadFareMaster();
    }

    if (!fareStore.fareMaster) {
      logger.warn(`FareMaster is not available after loading attempt`);
      return null;
    }

    const fareRoute = isOkiKisenVehicleFerry(ship)
      ? findFareRoute(departure, arrival, date, "ferry")
      : undefined;

    return calculateVehicleFareForShip(
      ship,
      fareRoute,
      fareStore.fareMaster,
      vehicleLengthMeters
    );
  };

  const calculateSegmentFareFields = async (
    ship: string,
    departure: string,
    arrival: string,
    date: Date | undefined,
    withCar: boolean,
    vehicleLengthMeters: number
  ): Promise<Pick<TransitSegment, "fare" | "passengerFare" | "vehicleFare">> => {
    const passengerFare = await calculateFare(ship, departure, arrival, date);

    if (!withCar) {
      return {
        fare: passengerFare,
        passengerFare,
      };
    }

    const vehicleFare = await calculateVehicleFare(
      ship,
      departure,
      arrival,
      date,
      vehicleLengthMeters
    );

    return {
      fare: vehicleFare ?? 0,
      passengerFare,
      vehicleFare: vehicleFare ?? undefined,
    };
  };

  // Calculate fare for a trip with date consideration
  const calculateFare = async (
    ship: string,
    departure: string,
    arrival: string,
    date?: Date
  ): Promise<number> => {
    if (ship === "AMA_TOWN_BUS") {
      return 200;
    }
    if (ship === "NISHINOSHIMA_TOWN_BUS") {
      return 200;
    }
    if (ship === "CHIBU_VILLAGE_BUS") {
      return 100;
    }
    if (ship === "OKI_ICHIBATA_BUS") {
      return 500;
    }
    if (ship === "OKINOSHIMA_TOWN_BUS") {
      return 300;
    }
    if (ship === "ICHIBATA_BUS_CONNECTION") {
      return 1200;
    }

    // Ensure fare data is loaded
    if (!fareStore) {
      logger.warn(`FareStore is not available (server-side rendering?)`);
      return 0;
    }

    if (!fareStore.fareMaster) {
      await fareStore.loadFareMaster();
    }

    // If still not loaded after attempting to load, return 0
    if (!fareStore.fareMaster) {
      logger.warn(`FareMaster is not available after loading attempt`);
      return 0;
    }

    let vesselType: VesselType;

    // Determine vessel type based on ship name
    if (ship === "RAINBOWJET") {
      vesselType = "highspeed";
    } else if (
      ship === "ISOKAZE" ||
      ship === "ISOKAZE_EX" ||
      ship === "FERRY_DOZEN"
    ) {
      vesselType = "local";
    } else {
      vesselType = "ferry";
    }

    // For local vessels (ISOKAZE, FERRY_DOZEN), use inner island fare regardless of route
    const isLocalVessel =
      ship === "ISOKAZE" || ship === "ISOKAZE_EX" || ship === "FERRY_DOZEN";
    if (isLocalVessel) {
      // 内航船はルートに関わらず一定料金
      // /fare ページと同じように、fareMaster.innerIslandFare を直接参照
      const innerIslandFare = fareStore.fareMaster.innerIslandFare;

      if (
        innerIslandFare?.adult !== undefined &&
        innerIslandFare.adult !== null
      ) {
        return innerIslandFare.adult;
      }

      // フォールバック: getFareByRoute から取得を試みる
      const fallbackRoute = fareStore.getFareByRoute(departure, arrival, {
        date,
        vesselType: "local",
      });
      if (
        fallbackRoute?.fares?.adult !== undefined &&
        fallbackRoute.fares.adult !== null
      ) {
        return fallbackRoute.fares.adult;
      }

      return 0;
    }

    const route = findFareRoute(departure, arrival, date, vesselType);

    // If route found, return adult fare
    if (route && route.fares) {
      // Try to get adult fare from various sources
              let adultFare: number | undefined = route.fares.adult;

      // If adult fare is not available, try to get from seatClass (class2 is typically the base fare)
      if (adultFare === undefined || adultFare === null || adultFare === 0) {
        adultFare = route.fares.seatClass?.class2;
      }

      // If still not available, try to get from route.fares directly
      if (adultFare === undefined || adultFare === null || adultFare === 0) {
        adultFare = (route as any).adult;
      }

      return adultFare ?? 0;
    }

    // Return 0 if fare not found in fare master (no fallback)
    logger.warn(
      `Fare not found for route: ${departure} -> ${arrival} (${ship})`
    );
    return 0;
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Calculate duration between two times
  const calculateDuration = (start: Date, end: Date): string => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}${i18n.t("HOURS")}${minutes}${i18n.t("MINUTES")}`;
    }
    return `${minutes}${i18n.t("MINUTES")}`;
  };

  // Get display name for port
  const getPortDisplayName = (port: string): string => {
    if (!port) return "";

    // Handle special case for HONDO (legacy port ID)
    if (port === "HONDO") {
      return i18n.t("HONDO");
    }

    // Get port from ferryStore
    if (ferryStore) {
      const locationLabel = ferryStore.getLocationLabel(port);
      if (locationLabel) {
        return locationLabel;
      }

      const portData = ferryStore.ports.find((p) => p.PORT_ID === port);
      if (portData) {
        return i18n.locale.value === "ja"
          ? portData.PLACE_NAME_JA
          : portData.PLACE_NAME_EN;
      }
    }

    // Fallback to translation key
    return i18n.t(port);
  };

  return {
    searchRoutes,
    formatTime,
    calculateDuration,
    getPortDisplayName,
  };
};
