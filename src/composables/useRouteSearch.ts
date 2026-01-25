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
    isArrivalMode: boolean = false
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
    const [hours, minutes] = searchTime.split(":").map(Number);
    searchDateTime.setHours(hours, minutes, 0, 0);
    const applyLiveStatus = isTodayJst(searchDate);

    // Debug logging
    logger.debug("Search params", {
      departure,
      arrival,
      searchDate,
      searchTime,
      isArrivalMode,
      applyLiveStatus,
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
    const directRoutes = await findDirectRoutes(
      dayTimetable,
      departure,
      arrival,
      searchDateTime,
      isArrivalMode,
      applyLiveStatus
    );

    routes.push(...directRoutes);

    // Find transfer routes if direct routes are limited
    if (directRoutes.length < 5) {
      const transferRoutes = await findTransferRoutes(
        dayTimetable,
        departure,
        arrival,
        searchDateTime,
        isArrivalMode,
        applyLiveStatus
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
    applyLiveStatus: boolean
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

        const fare = await calculateFare(
          trip.name,
          trip.departure,
          trip.arrival,
          departureTime
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
  const findTransferRoutes = async (
    timetable: Trip[],
    departure: string,
    arrival: string,
    searchTime: Date,
    isArrivalMode: boolean,
    applyLiveStatus: boolean
  ): Promise<TransitRoute[]> => {
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

      for (const secondTrip of timetable) {
        if (secondTrip.departure !== firstTrip.arrival) continue;

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

            const depTime = prevArrival
              ? new Date(prevArrival)
              : new Date(searchTime);
            depTime.setHours(depH, depM, 0, 0);
            if (prevArrival && depTime <= prevArrival) {
              depTime.setDate(depTime.getDate() + 1);
            }

            const arrTime = new Date(depTime);
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

            const status = getTripStatus(t);
            if (status === 2) {
              resumeSegments.length = 0;
              break;
            }

            const fare = await calculateFare(
              t.name,
              t.departure,
              t.arrival,
              depTime
            );
            totalFare += fare;
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
              fare,
            });

            prevArrival = arrTime;
          }

          if (resumeSegments.length === 0) {
            continue;
          }

          if (isArrivalMode) {
            const finalArrival =
              resumeSegments[resumeSegments.length - 1].arrivalTime;
            if (finalArrival > searchTime) {
              continue;
            }
          }

          const resumeKey = `resume-${resumeTrips
            .map((t) => t.tripId)
            .join("_")}`;
          if (processedRoutes.has(resumeKey)) continue;
          processedRoutes.add(resumeKey);

          routes.push({
            segments: resumeSegments,
            departureTime: resumeSegments[0].departureTime,
            arrivalTime: resumeSegments[resumeSegments.length - 1].arrivalTime,
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
          const fare = await calculateFare(
            firstTrip.name,
            firstTrip.departure,
            finalTrip.arrival,
            firstDepartureTime
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
          const fare1 = await calculateFare(
            firstTrip.name,
            firstTrip.departure,
            firstTrip.arrival,
            firstDepartureTime
          );

          const fare2 = await calculateFare(
            secondTrip.name,
            secondTrip.departure,
            finalTrip.arrival,
            secondDepartureTime
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
            fare: fare1,
          };

          const segment2: TransitSegment = {
            tripId:
              chain.length === 1
                ? String(secondTrip.tripId)
                : `${chain[0].tripId}-${finalTrip.tripId}`,
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

  // Calculate fare for a trip with date consideration
  const calculateFare = async (
    ship: string,
    departure: string,
    arrival: string,
    date?: Date
  ): Promise<number> => {
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

    // Try to find route by direct match first
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

    // If route found, return adult fare
    if (route && route.fares) {
      // Try to get adult fare from various sources
      let adultFare = route.fares.adult;

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
