import { useFerryStore } from "@/stores/ferry";
import { useFareStore } from "@/stores/fare";
import { useFerryData } from "@/composables/useFerryData";
import type { Trip, TransitRoute, TransitSegment } from "@/types";
import type { FareRoute, VesselType } from "@/types/fare";
import { createLogger } from "~/utils/logger";

export const useRouteSearch = () => {
  const ferryStore = process.client ? useFerryStore() : null;
  const fareStore = process.client ? useFareStore() : null;
  const { getTripStatus, initializeData } = useFerryData();
  const logger = createLogger("useRouteSearch");

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
    isArrivalMode: boolean = false
  ): Promise<TransitRoute[]> => {
    // Ensure data is loaded
    if (ferryStore && ferryStore.timetableData.length === 0) {
      await initializeData();
    }
    if (fareStore) {
      await fareStore.loadFareMaster();
    }

    const routes: TransitRoute[] = [];
    const searchDateTime = new Date(searchDate);
    const [hours, minutes] = searchTime.split(":").map(Number);
    searchDateTime.setHours(hours, minutes, 0, 0);

    // Debug logging
    logger.debug("Search params", {
      departure,
      arrival,
      searchDate,
      searchTime,
      isArrivalMode,
    });
    logger.debug("Total timetable data", ferryStore?.timetableData.length || 0);

    // Get filtered timetable for the date based on start_date and end_date
    // Format date as YYYY-MM-DD in JST
    const year = searchDate.getFullYear();
    const month = String(searchDate.getMonth() + 1).padStart(2, "0");
    const day = String(searchDate.getDate()).padStart(2, "0");
    const searchDateStr = `${year}-${month}-${day}`;

    const dayTimetable = (ferryStore?.timetableData || []).filter((trip) => {
      // Parse start and end dates
      const startDate = trip.startDate.replace(/\//g, "-");
      const endDate = trip.endDate.replace(/\//g, "-");

      // Check if search date is within the trip's valid period
      return searchDateStr >= startDate && searchDateStr <= endDate;
    });

    logger.debug("Filtered timetable for date range", {
      count: dayTimetable.length,
      searchDate: searchDateStr,
    });

    // Find direct routes
    const directRoutes = findDirectRoutes(
      dayTimetable,
      departure,
      arrival,
      searchDateTime,
      isArrivalMode
    );

    routes.push(...directRoutes);

    // Find transfer routes if direct routes are limited
    if (directRoutes.length < 5) {
      const transferRoutes = findTransferRoutes(
        dayTimetable,
        departure,
        arrival,
        searchDateTime,
        isArrivalMode
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

    return routes;
  };

  // Find direct routes
  const findDirectRoutes = (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean
  ): TransitRoute[] => {
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

    for (const trip of timetable) {
      if (
        departurePorts.includes(trip.departure) &&
        arrivalPorts.includes(trip.arrival)
      ) {
        logger.debug("Found matching trip", trip);
        // Create date objects using the search date and trip times
        const [depHours, depMinutes] = trip.departureTime
          .split(":")
          .map(Number);
        const [arrHours, arrMinutes] = trip.arrivalTime.split(":").map(Number);

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

        // Check if trip is cancelled
        const status = getTripStatus(trip);
        if (status === 2) continue; // Skip cancelled trips

        const fare = calculateFare(
          trip.name,
          trip.departure,
          trip.arrival,
          departureTime
        );

        const segment: TransitSegment = {
          tripId: String(trip.tripId),
          ship: trip.name,
          departure: trip.departure,
          arrival: trip.arrival,
          departureTime,
          arrivalTime,
          status,
          fare,
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

  // Find transfer routes
  const findTransferRoutes = (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean
  ): TransitRoute[] => {
    const routes: TransitRoute[] = [];
    const processedRoutes = new Set<string>();
    const tripMap = new Map<string, Trip>();

    for (const trip of timetable) {
      tripMap.set(String(trip.tripId), trip);
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

    const parseTimeParts = (timeValue: string | Date): [number, number] => {
      if (timeValue instanceof Date) {
        return [timeValue.getHours(), timeValue.getMinutes()];
      }

      const parts = String(timeValue).split(":");
      const hours = Number(parts[0]);
      const minutes = Number(parts[1] || 0);
      return [hours, minutes];
    };

    const collectTripChain = (
      startTrip: Trip
    ): { trips: Trip[]; maxStatus: number } | null => {
      const chain: Trip[] = [startTrip];
      let current = startTrip;
      let maxStatus = getTripStatus(startTrip);

      if (maxStatus === 2) {
        return null;
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

        if (nextTrip.name !== current.name) {
          return null;
        }

        if (nextTrip.departure !== current.arrival) {
          return null;
        }

        const nextStatus = getTripStatus(nextTrip);
        if (nextStatus === 2) {
          return null;
        }

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

      const firstStatus = getTripStatus(firstTrip);
      if (firstStatus === 2) continue;

      if (arrivalPorts.includes(firstTrip.arrival)) continue;

      for (const secondTrip of timetable) {
        if (secondTrip.departure !== firstTrip.arrival) continue;

        const chainResult = collectTripChain(secondTrip);
        if (!chainResult) continue;

        const { trips: chain, maxStatus: chainStatus } = chainResult;
        const finalTrip = chain[chain.length - 1];

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

        if (
          !isMainlandPort(departure) &&
          !isMainlandPort(arrival) &&
          (isMainlandPort(firstTrip.arrival) || isMainlandPort(secondTrip.departure))
        ) {
          continue;
        }

        const routeKey = `${firstTrip.tripId}-${chain
          .map((trip) => trip.tripId)
          .join("_")}`;
        if (processedRoutes.has(routeKey)) continue;
        processedRoutes.add(routeKey);

        if (shouldNormalizeTrips(firstTrip, secondTrip)) {
          const fare = calculateFare(
            firstTrip.name,
            firstTrip.departure,
            finalTrip.arrival,
            firstDepartureTime
          );

          const segment: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            departure: firstTrip.departure,
            arrival: finalTrip.arrival,
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            status: Math.max(firstStatus, chainStatus),
            fare,
          };

          routes.push({
            segments: [segment],
            departureTime: firstDepartureTime,
            arrivalTime: secondArrivalTime,
            totalFare: segment.fare,
            transferCount: 0,
          });
        } else {
          const fare1 = calculateFare(
            firstTrip.name,
            firstTrip.departure,
            firstTrip.arrival,
            firstDepartureTime
          );

          const fare2 = calculateFare(
            secondTrip.name,
            secondTrip.departure,
            finalTrip.arrival,
            secondDepartureTime
          );

          const segment1: TransitSegment = {
            tripId: String(firstTrip.tripId),
            ship: firstTrip.name,
            departure: firstTrip.departure,
            arrival: firstTrip.arrival,
            departureTime: firstDepartureTime,
            arrivalTime: firstArrivalTime,
            status: firstStatus,
            fare: fare1,
          };

          const segment2: TransitSegment = {
            tripId:
              chain.length === 1
                ? String(secondTrip.tripId)
                : `${chain[0].tripId}-${finalTrip.tripId}`,
            ship: secondTrip.name,
            departure: secondTrip.departure,
            arrival: finalTrip.arrival,
            departureTime: secondDepartureTime,
            arrivalTime: secondArrivalTime,
            status: chainStatus,
            fare: fare2,
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
    return trip1.name === trip2.name && trip1.nextId === trip2.tripId;
  };

  // Check if port is on mainland
  const isMainlandPort = (port: string): boolean => {
    return ferryStore?.hondoPorts?.includes(port) || port === "HONDO";
  };

  // Calculate fare for a trip with date consideration
  const calculateFare = (
    ship: string,
    departure: string,
    arrival: string,
    date?: Date
  ): number => {
    // Ensure fare data is loaded
    if (fareStore && !fareStore.fareMaster) {
      fareStore.loadFareMaster();
    }

    const toFarePortVariants = (port: string): string[] => {
      if (port === "HONDO") {
        return ["HONDO", "HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"];
      }
      if (port === "HONDO_SHICHIRUI" || port === "HONDO_SAKAIMINATO") {
        return [port, "HONDO"];
      }
      return [port];
    };

    const departureCandidates = toFarePortVariants(departure);
    const arrivalCandidates = toFarePortVariants(arrival);

    let route: FareRoute | undefined;
    let vesselType: VesselType;
    
    // Determine vessel type based on ship name
    if (ship === "RAINBOWJET") {
      vesselType = "highspeed";
    } else if (ship === "ISOKAZE" || ship === "ISOKAZE_EX" || ship === "FERRY_DOZEN") {
      vesselType = "local";
    } else {
      vesselType = "ferry";
    }

    for (const dep of departureCandidates) {
      for (const arr of arrivalCandidates) {
        const candidate = fareStore?.getFareByRoute(dep, arr, {
          date,
          vesselType,
        });
        if (candidate) {
          route = candidate;
          break;
        }
      }
      if (route) {
        break;
      }
    }

    if (route) {
      let baseFare = route.fares.adult;

      // For high-speed ferry (Rainbow Jet), use the actual fare
      const isHighSpeed = ship === "RAINBOWJET";
      if (isHighSpeed) {
        // Rainbow Jet fare is 6,680 yen (according to official website)
        baseFare = 6680;
      }

      // For local vessels (ISOKAZE, FERRY_DOZEN), use inner island fare if available
      const isLocalVessel = ship === "ISOKAZE" || ship === "ISOKAZE_EX" || ship === "FERRY_DOZEN";
      if (isLocalVessel && fareStore?.fareMaster?.innerIslandFare) {
        // Check if this is an inner island route
        const innerIslandPorts = ["HISHIURA", "KURI", "SAIGO"];
        const isInnerIslandRoute = innerIslandPorts.includes(departure) && innerIslandPorts.includes(arrival);
        
        if (isInnerIslandRoute) {
          baseFare = fareStore.fareMaster.innerIslandFare.adult;
        }
      }

      return baseFare;
    }

    // Return 0 if fare not found in fare master (no fallback)
    logger.warn(`Fare not found for route: ${departure} -> ${arrival} (${ship})`);
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
    const { $i18n } = useNuxtApp();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}${$i18n.t('HOURS')}${minutes}${$i18n.t('MINUTES')}`;
    }
    return `${minutes}${$i18n.t('MINUTES')}`;
  };

  // Get display name for HONDO ports
  const getPortDisplayName = (port: string): string => {
    const { $i18n } = useNuxtApp();

    if (port === "HONDO_SHICHIRUI") {
      return `${$i18n.t("HONDO")} (${$i18n.t("HONDO_SHICHIRUI")})`;
    } else if (port === "HONDO_SAKAIMINATO") {
      return `${$i18n.t("HONDO")} (${$i18n.t("HONDO_SAKAIMINATO")})`;
    }
    return $i18n.t(port);
  };

  return {
    searchRoutes,
    formatTime,
    calculateDuration,
    getPortDisplayName,
  };
};
