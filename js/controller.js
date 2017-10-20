function mainCtrl($scope, $uibModal, $http, SharedStateService, $filter, $location, $anchorScroll) {
    var MAX_NEXT_CHAIN = 5;
    $scope.portMaps = { "HONDO": '<iframe src="https://www.google.com/maps/d/embed?mid=10LYdFfHjM-C6lq36egqxMuDIiMg" width="640" height="480"></iframe>',
        "HONDO_SAKAIMINATO": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2292.317150965745!2d133.22227226073633!3d35.54509842041033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x355655ad5deb0d71%3A0x177b9c28785fc8a3!2z6Zqg5bKQ5rG96Ii5IOWig-a4ryDjg5Xjgqfjg6rjg7zjgr_jg7zjg5_jg4rjg6s!5e0!3m2!1sja!2sjp!4v1508490999479" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
        "HONDO_SHICHIRUI": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3245.2782127375426!2d133.22755195027142!3d35.57152434349223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3556547244a8948d%3A0xd6870c7a99239d6c!2z5LiD6aGe5riv!5e0!3m2!1sja!2sjp!4v1508490937348" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
        "KURI": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3226.807196887792!2d133.03717155028508!3d36.0250013185523!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d02204625465%3A0x79e1cdd47cbe20cd!2z5p2l5bGF5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491503665" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
        "BEPPU": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.417639692854!2d133.03936811472514!3d36.107681714074126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d73e33b20b8f%3A0xaf30d22cfc266131!2z6KW_44OO5bO25Yil5bqc5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508490887500" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
        "HISHIURA": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.532279545968!2d133.07474405028748!3d36.10488801413124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d6f346eb8e25%3A0x99246dba291fb735!2z6I-x5rWm5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491452795" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>',
        "SAIGO": '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3219.4725184532863!2d133.33284095029055!3d36.20370830865085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5ffd77b679a1e833%3A0x3375700953b9cf6e!2z6KW_6YO35riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491478099" width="600" height="450" frameborder="0" style="border:0" allowfullscreen></iframe>'
    };
    $scope.showPort = function (port) {
        if ((port != 'DEPARTURE') && (port != 'ARRIVAL')) {
            $uibModal.open({
                template: '<div class="modal-title"><h4>{{"' + port + '"| translate}}</h4></div>'
                    + '<div class="ggmap">' + $scope.portMaps[port] + '</div>'
            }).result.then(function () { }, function (res) { });
        }
    };
    $scope.showShip = function (ship) {
        $uibModal.open({
            template: '<div class="modal-title"><h4>{{"' + ship + '"| translate}}</h4></div>'
                + '<img src="./images/' + ship + '.jpg" width="100%"><br>'
        }).result.then(function () { }, function (res) { });
    };
    $scope.showShipOrPort = function (shipOrPort) {
        if (shipOrPort in $scope.portMaps == true) {
            $scope.showPort(shipOrPort);
        }
        else {
            $scope.showShip(shipOrPort);
        }
    };
    $scope.alerts = [];
    $scope.closeAlert = function (index) {
        $scope.alerts.splice(index, 1);
    };
    //時刻入力
    $scope.hstep = 1;
    $scope.mstep = 15;
    //もっと見るボタンは隠しておく
    $scope.hideMore = true;
    $scope.data = SharedStateService;
    var dt = $scope.data.date;
    dt.setMinutes(Math.round(dt.getMinutes() / $scope.mstep) * $scope.mstep);
    dt.setSeconds(0);
    dt.setMilliseconds(0);
    $scope.daytimeModel = "departureTime";
    try {
        $scope.departure = localStorage.getItem('departure');
    }
    catch (e) { }
    if ($scope.departure == null) {
        $scope.departure = 'DEPARTURE';
    }
    try {
        $scope.arrival = localStorage.getItem('arrival');
    }
    catch (e) { }
    if ($scope.arrival == null) {
        $scope.arrival = 'ARRIVAL';
    }
    var restoreDateObjects = function () {
        //JSONでシリアライズされた日付をDateオブジェクトに復元
        angular.forEach($scope.rawTimetable, function (value, key) {
            var dateStr = $filter('date')($scope.data.date, 'yyyy/MM/dd ', '+0900');
            value.departure_time = new Date(dateStr + value.departure_time + ':00');
            value.arrival_time = new Date(dateStr + value.arrival_time + ':00');
        });
    };
    $http.get('https://naturebot-lab.com/ferry_transit/timetable.php').then(function (res) {
        $scope.rawTimetable = res.data;
        try {
            localStorage.setItem('rawTimetable', JSON.stringify($scope.rawTimetable));
        }
        catch (e) { }
        restoreDateObjects();
        $scope.updateTimetable();
    }, function (res) {
        //Error handling
        console.log("Failed to get timetable.");
        try {
            $scope.rawTimetable = JSON.parse(localStorage.getItem('rawTimetable'));
        }
        catch (e) { }
        //TODO:オフライン時のアラートを出す
        restoreDateObjects();
        $scope.updateTimetable();
    });
    $scope.ismeridian = false;
    $scope.toggleMode = function () {
        $scope.ismeridian = !$scope.ismeridian;
    };
    $scope.timeChanged = function () {
        //console.log('Time changed to: ' + $scope.data.date);
    };
    $scope.clear = function () {
        $scope.data.date = null;
    };
    $scope.status = {
        departureIsOpen: false,
        arrivalIsOpen: false,
        tableDepartureIsOpen: false,
        tableArrivalIsOpen: false
    };
    $scope.toggled = function (open) {
        //console.log('Dropdown is now: ', open);
    };
    $scope.hondoPorts = [
        "HONDO", "HONDO_SAKAIMINATO", "HONDO_SHICHIRUI"
    ];
    $scope.dozenPorts = [
        "KURI", "BEPPU", "HISHIURA"
    ];
    $scope.dogoPorts = [
        "SAIGO"
    ];
    $scope.filteredTimetable = null;
    $scope.changeTransitDeparture = function (name) {
        try {
            localStorage.setItem('departure', name);
        }
        catch (e) { }
        $scope.departure = name;
    };
    $scope.changeTransitArrival = function (name) {
        try {
            localStorage.setItem('arrival', name);
        }
        catch (e) { }
        $scope.arrival = name;
    };
    $scope.updateTimetable = function () {
        $scope.timetable = null;
        //期間でフィルタリング
        var validTimetable = $filter("omit")($scope.rawTimetable, $scope.nodepart);
        //出発地でフィルタリング
        var departureTimetable = $filter("filter")(validTimetable, { departure: $scope.departure });
        //出発地と目的地が指定どおりのパスを抽出
        var onePathTimetable = $filter("filter")(departureTimetable, { arrival: $scope.arrival });
        var resultTimetable = [];
        if (($scope.departure === "HONDO") || ($scope.arrival === "HONDO")) {
            angular.forEach(onePathTimetable, function (trip, index) {
                var departure;
                var arrival;
                if (trip.departure === "HONDO_SHICHIRUI") {
                    departure = "TIMETABLE_SUP_SHICHIRUI";
                }
                else if (trip.departure === "HONDO_SAKAIMINATO") {
                    departure = "TIMETABLE_SUP_SAKAIMINATO";
                }
                else {
                    departure = "";
                }
                if (trip.arrival === "HONDO_SHICHIRUI") {
                    arrival = "TIMETABLE_SUP_SHICHIRUI";
                }
                else if (trip.arrival === "HONDO_SAKAIMINATO") {
                    arrival = "TIMETABLE_SUP_SAKAIMINATO";
                }
                else {
                    arrival = "";
                }
                resultTimetable.push({
                    trip_id: trip.trip_id,
                    name: trip.name,
                    departure: departure,
                    departure_time: trip.departure_time,
                    arrival: arrival,
                    arrival_time: trip.arrival_time
                });
            });
        }
        else {
            angular.forEach(onePathTimetable, function (trip, index) {
                resultTimetable.push({
                    trip_id: trip.trip_id,
                    name: trip.name,
                    departure: "",
                    departure_time: trip.departure_time,
                    arrival: "",
                    arrival_time: trip.arrival_time
                });
            });
        }
        //有効なパスリストからすでに抽出済みのパスを削除
        departureTimetable = $filter("xor")(departureTimetable, resultTimetable, 'trip_id');
        angular.forEach(departureTimetable, function (trip, index) {
            var departure;
            var arrival;
            if ($scope.departure === "HONDO") {
                if (trip.departure === "HONDO_SHICHIRUI") {
                    departure = "TIMETABLE_SUP_SHICHIRUI";
                }
                else if (trip.departure === "HONDO_SAKAIMINATO") {
                    departure = "TIMETABLE_SUP_SAKAIMINATO";
                }
                else {
                    departure = "";
                }
            }
            if (trip.next_id != "") {
                var getNextTrip = function (srcTimetable, nextId) {
                    var trips = $filter("filter")(srcTimetable, { trip_id: nextId }, true);
                    return trips[0];
                };
                var nextId = trip.next_id;
                for (var i = 0; i < MAX_NEXT_CHAIN; i++) {
                    var nextTrip = getNextTrip(validTimetable, nextId);
                    if (nextTrip != null) {
                        //出発地を経由するパスは省く
                        if (nextTrip.departure == trip.departure)
                            break;
                        //本土経由ルートは省く
                        if ((nextTrip.arrival === "HONDO_SHICHIRUI")
                            || (nextTrip.arrival === "HONDO_SAKAIMINATO")) {
                            if ((trip.departure === "HONDO_SHICHIRUI")
                                || (trip.departure === "HONDO_SAKAIMINATO")) {
                                break;
                            }
                        }
                        if ($scope.arrival === "HONDO") {
                            if ((nextTrip.arrival === "HONDO_SHICHIRUI")
                                || (nextTrip.arrival === "HONDO_SAKAIMINATO")) {
                                if (nextTrip.arrival === "HONDO_SHICHIRUI") {
                                    arrival = "TIMETABLE_SUP_SHICHIRUI";
                                }
                                else if (nextTrip.arrival === "HONDO_SAKAIMINATO") {
                                    arrival = "TIMETABLE_SUP_SAKAIMINATO";
                                }
                                else {
                                    arrival = "";
                                }
                                resultTimetable.push({
                                    name: trip.name,
                                    departure: departure,
                                    departure_time: trip.departure_time,
                                    arrival: arrival,
                                    arrival_time: nextTrip.arrival_time
                                });
                                break;
                            }
                        }
                        else if (nextTrip.arrival == $scope.arrival) {
                            resultTimetable.push({
                                name: trip.name,
                                departure: departure,
                                departure_time: trip.departure_time,
                                arrival: arrival,
                                arrival_time: nextTrip.arrival_time
                            });
                            break;
                        }
                        if (nextTrip.next_id == "")
                            break;
                        nextId = nextTrip.next_id;
                    }
                    else {
                        break;
                    }
                }
            }
        });
        $scope.timetable = resultTimetable;
    };
    $scope.changeTimetableDeparture = function (name) {
        $scope.departure = name;
        $scope.updateTimetable();
    };
    $scope.changeTimetableArrival = function (name) {
        $scope.arrival = name;
        $scope.updateTimetable();
    };
    $scope.reversal = function () {
        var newdep = $scope.arrival;
        $scope.arrival = $scope.departure;
        $scope.departure = newdep;
        $scope.updateTimetable();
    };
    $scope.$watch('data.date', function (newvalue, oldvalue) {
        $scope.updateTimetable();
    });
    //時刻表Omitフィルタ
    $scope.nodepart = function (e) {
        var dt = $scope.data.date.getTime();
        var sdt = new Date(e.start_date).getTime();
        var edtDate = new Date(e.end_date);
        edtDate.setDate(edtDate.getDate() + 1);
        var edt = edtDate.getTime();
        if ((sdt <= dt) && (dt <= edt)) {
            //console.log("OK >" + e.name + ":" + e.start_date + "-" + e.end_date)
            return false;
        }
        else {
            //console.log("NG >" + e.name + ":" + e.start_date + "-" + e.end_date)
            return true;
        }
    };
    $scope.tblBgClr = {
        odd: "tbl-bg-clr-odd",
        even: "tbl-bg-clr-even"
    };
    //条件パネル
    $scope.status = {
        isFirstOpen: true,
        isFirstDisabled: false
    };
    $scope.selectDepartureTime = function () {
        $scope.daytimeModel = "departureTime";
    };
    $scope.selectArrivalTime = function () {
        $scope.daytimeModel = "arrivalTime";
    };
    $scope.searchRoute = function () {
        //期間でフィルタリング
        var validTimetable = $filter("omit")($scope.rawTimetable, $scope.nodepart);
        var specifiedDate = new Date($scope.data.date.getTime());
        var dTime = new Date(specifiedDate.getTime());
        var aTime = new Date(specifiedDate.getTime());
        if ($scope.daytimeModel == 'departureTime') {
            //出発時刻でフィルタリング
            var omitBeforeTime = function (trip) {
                dTime.setHours(trip.departure_time.getHours());
                dTime.setMinutes(trip.departure_time.getMinutes());
                if (dTime.getTime() < specifiedDate.getTime()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            validTimetable = $filter("omit")(validTimetable, omitBeforeTime);
        }
        else {
            //到着時刻でフィルタリング
            var omitAfterTime = function (trip) {
                aTime.setHours(trip.arrival_time.getHours());
                aTime.setMinutes(trip.arrival_time.getMinutes());
                if (specifiedDate.getTime() < aTime.getTime()) {
                    return true;
                }
                else {
                    return false;
                }
            };
            validTimetable = $filter("omit")(validTimetable, omitAfterTime);
        }
        //出発地でフィルタリング
        var departureTimetable = $filter("filter")(validTimetable, { departure: $scope.departure });
        //目的地でフィルタリング
        var singlePassTimetable = $filter("filter")(departureTimetable, { arrival: $scope.arrival });
        var results = [];
        angular.forEach(singlePassTimetable, function (trip, index) {
            results.push({
                routes: [trip],
                departureTime: trip.departure_time,
                arrivalTime: trip.arrival_time
            });
        });
        //有効なパスリストからすでに抽出済みのパスを削除
        departureTimetable = $filter("xor")(departureTimetable, singlePassTimetable, 'trip_id');
        //乗換なしで目的地に到達できるパスを抽出
        /*
        angular.forEach(departureTimetable, function(trip, key) {
          //var tempRoute = [trip];
          var getNextTrip = function(srcTimetable, nextId) {
            var trips = $filter("filter")(srcTimetable, {trip_id:nextId}, true);
            return trips[0];
          }
    
          if (trip.next_id != "") {
            var nextId = trip.next_id;
            for (var i = 0; i < MAX_NEXT_CHAIN; i++) {
              var nextTrip = getNextTrip(validTimetable, nextId);
              if (nextTrip != null) {
                //出発地を経由するパスは省く
                if (nextTrip.departure == trip.departure) break;
                //tempRoute.push(nextTrip);
                if (nextTrip.arrival == $scope.arrival) {
                  results.push({
                    routes: [{
                      name: trip.name,
                      departure: trip.departure,
                      departure_time: trip.departure_time,
                      arrival: nextTrip.arrival,
                      arrival_time: nextTrip.arrival_time
                    }],
                    departureTime: trip.departure_time,
                    arrivalTime: nextTrip.arrival_time
                  });
                  break;
                } else {
                  if (nextTrip.next_id == "") break;
                  nextId = nextTrip.next_id;
                }
              } else {
                //console.error("nextTrip is not found.");
                break;
              }
            }
          }
        });
        */
        if (results.length <= 5) {
            //乗換ルートを検索
            angular.forEach(departureTimetable, function (rootTrip, index) {
                var arrivalTime = new Date(specifiedDate.getTime());
                arrivalTime.setHours(rootTrip.arrival_time.getHours());
                arrivalTime.setMinutes(rootTrip.arrival_time.getMinutes());
                var nestCount = 0;
                var nestMax = 1;
                var findRoute = function (currentTrip, route) {
                    //出発地でフィルタリング
                    var nextTimetable = $filter('filter')(validTimetable, { departure: currentTrip.arrival }, true);
                    //出発時刻でフィルタリング
                    arrivalTime.setHours(currentTrip.arrival_time.getHours());
                    arrivalTime.setMinutes(currentTrip.arrival_time.getMinutes());
                    var omitBeforeTime = function (trip) {
                        dTime.setHours(trip.departure_time.getHours());
                        dTime.setMinutes(trip.departure_time.getMinutes());
                        return (dTime.getTime() < arrivalTime.getTime());
                    };
                    nextTimetable = $filter("omit")(nextTimetable, omitBeforeTime);
                    //本土経由ルートを排除
                    if ((rootTrip.departure === "HONDO_SHICHIRUI") || (rootTrip.departure === "HONDO_SAKAIMINATO")) {
                        var omitMainlandRoute = function (trip) {
                            return ((trip.departure === "HONDO_SHICHIRUI") || (trip.departure === "HONDO_SAKAIMINATO"));
                        };
                        nextTimetable = $filter("omit")(nextTimetable, omitMainlandRoute);
                    }
                    //目的地でフィルタリング
                    var arrivedTimetable = $filter('filter')(nextTimetable, { arrival: $scope.arrival });
                    //目的地に到達したルートを保存
                    angular.forEach(arrivedTimetable, function (nextTrip, index) {
                        //ルートを正規化
                        var tempRoute = route.concat();
                        tempRoute.push(nextTrip);
                        if (tempRoute.length > 1) {
                            var normarizedRoute = [];
                            var startTrip = tempRoute[0];
                            var endTrip = tempRoute[0];
                            var lastId = startTrip.next_id;
                            for (var i = 1; i < tempRoute.length; i++) {
                                if (tempRoute[i].trip_id === lastId) {
                                    endTrip = tempRoute[i];
                                }
                                else {
                                    normarizedRoute.push({
                                        name: startTrip.name,
                                        departure: startTrip.departure,
                                        departure_time: startTrip.departure_time,
                                        arrival: endTrip.arrival,
                                        arrival_time: endTrip.arrival_time
                                    });
                                    startTrip = tempRoute[i];
                                    endTrip = tempRoute[i];
                                }
                                lastId = endTrip.next_id;
                            }
                            normarizedRoute.push({
                                name: startTrip.name,
                                departure: startTrip.departure,
                                departure_time: startTrip.departure_time,
                                arrival: endTrip.arrival,
                                arrival_time: endTrip.arrival_time
                            });
                            tempRoute = normarizedRoute;
                        }
                        results.push({
                            routes: tempRoute,
                            departureTime: tempRoute[0].departure_time,
                            arrivalTime: tempRoute[tempRoute.length - 1].arrival_time
                        });
                    });
                    //到達したルートを削除
                    nextTimetable = $filter("xor")(nextTimetable, arrivedTimetable, 'trip_id');
                    //目的地に未達のルートを掘り下げる
                    if (nestCount < nestMax) {
                        nestCount++;
                        angular.forEach(nextTimetable, function (nextTrip, index) {
                            var newRoute = route.concat();
                            newRoute.push(nextTrip);
                            findRoute(nextTrip, newRoute);
                        });
                    }
                };
                findRoute(rootTrip, [rootTrip]);
            });
        }
        if ($scope.daytimeModel == 'departureTime') {
            //早く到達可能な上位5ルートを抽出
            results = $filter('orderBy')(results, "arrivalTime");
        }
        else {
            //出発時間が遅い上位5ルートを抽出
            results = $filter('orderBy')(results, "departureTime", true);
        }
        var getPrice = function (name, departure, arrival) {
            var isDogo = function (port) {
                return (port == 'SAIGO');
            };
            var isDozen = function (port) {
                return ((port == 'KURI') || (port == 'BEPPU') || (port == 'HISHIURA'));
            };
            var isMainland = function (port) {
                return ((port == 'HONDO_SAKAIMINATO') || (port == 'HONDO_SHICHIRUI'));
            };
            if ((name == 'FERRY_OKI') || (name == 'FERRY_SHIRASHIMA') || (name == 'FERRY_KUNIGA')) {
                if (isDozen(departure)) {
                    if (isDozen(arrival)) {
                        if ((departure == 'KURI') || (arrival == 'KURI')) {
                            return 640;
                        }
                        else {
                            return 340;
                        }
                    }
                    else if (isDogo(arrival)) {
                        return 1330;
                    }
                    else if (isMainland(arrival)) {
                        return 2920;
                    }
                    else {
                        console.error("Invalid 'arrival'");
                    }
                }
                else if (isDogo(departure)) {
                    if (isDozen(arrival)) {
                        return 1330;
                    }
                    else if (isMainland(arrival)) {
                        return 2920;
                    }
                    else {
                        console.error("Invalid 'arrival'");
                    }
                }
                else if (isMainland(departure)) {
                    if ((isDozen(arrival)) || (isDogo(arrival))) {
                        return 2920;
                    }
                    else {
                        console.error("Invalid 'arrival'");
                    }
                }
                else {
                    console.error("Invalid 'departure'");
                }
            }
            else if (name == 'RAINBOWJET') {
                if (isDozen(departure)) {
                    if (isDozen(arrival)) {
                        return 340;
                    }
                    else if (isDogo(arrival)) {
                        return 2630;
                    }
                    else if (isMainland(arrival)) {
                        return 5760;
                    }
                    else {
                        console.error("Invalid 'arrival'");
                    }
                }
                else if (isDogo(departure)) {
                    if (isDozen(arrival)) {
                        return 2630;
                    }
                    else if (isMainland(arrival)) {
                        return 5760;
                    }
                    else {
                        console.error("Invalid 'arrival'");
                    }
                }
                else if (isMainland(departure)) {
                    return 5760;
                }
                else {
                    console.error("Invalid 'departure'");
                }
            }
            else if ((name == 'ISOKAZE') || (name == 'FERRY_DOZEN')) {
                return 300;
            }
            else {
                console.error("Invalid 'name'");
            }
            return 0;
        };
        //検索結果が0件だった場合にアラートを表示
        if (results.length > 0) {
            $scope.alerts = [];
        }
        else {
            $scope.alerts.push({ msg: $filter('translate')('NO_RESULT_ERROR') });
        }
        //View 用にコンバート
        $scope.searchResults = [];
        $scope.resultPool = [];
        angular.forEach(results, function (result, index) {
            var tempResults = [];
            var prevRoute = null;
            for (var i = 0; i < result.routes.length; i++) {
                var route = result.routes[i];
                if (prevRoute != null) {
                    tempResults.push({
                        time: $filter('date')(prevRoute.arrival_time, 'H:mm', '+0900')
                            + "-" + $filter('date')(route.departure_time, 'H:mm', '+0900'),
                        port: route.departure,
                        price: ""
                    });
                }
                else {
                    tempResults.push({
                        time: $filter('date')(route.departure_time, 'H:mm', '+0900'),
                        port: route.departure,
                        price: ""
                    });
                }
                var duration = (route.arrival_time.getTime() - route.departure_time.getTime()) / 1000 / 60;
                var hours = Math.floor(duration / 60);
                var minutes = duration % 60;
                tempResults.push({
                    time: ((hours > 0) ? hours + $filter('translate')('HOURS') : "") + " " + minutes + $filter('translate')('MINUTES'),
                    port: route.name,
                    price: getPrice(route.name, route.departure, route.arrival) + $filter('translate')('CURRENCY_UNIT')
                });
                prevRoute = route;
            }
            tempResults.push({
                time: $filter('date')(route.arrival_time, 'H:mm', '+0900'),
                port: route.arrival,
                price: ""
            });
            $scope.resultPool.push(tempResults);
        });
        var array = $scope.resultPool.splice(0, 5);
        $scope.searchResults = $scope.searchResults.concat(array);
        $scope.hideMore = ($scope.resultPool.length > 0) ? false : true;
        $location.hash('searchButton');
        $anchorScroll();
    };
    $scope.showMore = function () {
        var array = $scope.resultPool.splice(0, 5);
        $scope.searchResults = $scope.searchResults.concat(array);
        $scope.hideMore = ($scope.resultPool.length > 0) ? false : true;
    };
}
function datePickerCtrl($scope, SharedStateService) {
    $scope.data = SharedStateService;
    $scope.today = function () {
        var dt = new Date();
        $scope.data.date.setFullYear(dt.getFullYear());
        $scope.data.date.setMonth(dt.getMonth());
        $scope.data.date.setDate(dt.getDate());
    };
    $scope.today();
    $scope.clear = function () {
        $scope.data.date = null;
    };
    $scope.inlineOptions = {
        customClass: getDayClass,
        minDate: new Date(),
        showWeeks: false,
    };
    $scope.dateOptions = {
        dateDisabled: null,
        formatYear: 'yy',
        formatDay: 'd',
        maxDate: new Date(9999, 12, 30),
        minDate: new Date(),
        startingDay: 0,
        showWeeks: false,
    };
    $scope.toggleMin = function () {
        $scope.inlineOptions.minDate = $scope.inlineOptions.minDate ? null : new Date();
        $scope.dateOptions.minDate = $scope.inlineOptions.minDate;
    };
    $scope.toggleMin();
    $scope.open1 = function () {
        $scope.popup1.opened = true;
    };
    $scope.open2 = function () {
        $scope.popup2.opened = true;
    };
    $scope.setDate = function (year, month, day) {
        $scope.data.date = new Date(year, month, day);
    };
    $scope.format = 'yyyy/MM/dd';
    $scope.altInputFormats = ['M!/d!/yyyy'];
    $scope.popup1 = {
        opened: false
    };
    $scope.popup2 = {
        opened: false
    };
    function getDayClass(data) {
        var date = data.date, mode = data.mode;
        if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);
            for (var i = 0; i < $scope.events.length; i++) {
                var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);
                if (dayToCheck === currentDay) {
                    return $scope.events[i].status;
                }
            }
        }
        return '';
    }
}
var app = angular.module('ferryTransit', ['ui.bootstrap', 'ui.bootstrap.datepicker', 'angular.filter', 'pascalprecht.translate']);
app.factory("SharedStateService", function () {
    return {
        date: new Date(),
    };
});
app.controller('mainCtrl', mainCtrl);
app.controller('datePickerCtrl', datePickerCtrl);
app.config(['$translateProvider', function ($translateProvider) {
        $translateProvider.translations('ja', {
            'TITLE': '隠岐航路案内',
            'CURRENCY_UNIT': '円',
            'HOURS': '時間',
            'MINUTES': '分',
            'ROUTE': '経路',
            'TIME': '時刻',
            'FARE': '運賃',
            'DEPARTURE': '出発地',
            'ARRIVAL': '目的地',
            'DEPARTURE_TIME': '出発時刻',
            'ARRIVAL_TIME': '到着時刻',
            'TIMETABLE': '時刻表',
            'TRANSIT': '乗換案内',
            'DATE': '日時',
            '_FROM': '',
            'FROM_': 'から',
            '_TO': '',
            'TO_': 'へ',
            'SHIP': '船名',
            'DO_NOT_USE_FAST_FERRY': '高速船を利用しない',
            'VIA_CAR': '車で乗船する',
            'ADD_CONDITIONS': '条件を追加',
            'SEARCH_ROUTE': '経路検索',
            'TODAY': '今日',
            'CLEAR': '削除',
            'CLOSE': '閉じる',
            'HONDO': '七類(松江市)または境港(境港市)',
            'HONDO_SHICHIRUI': '七類(松江市)',
            'HONDO_SAKAIMINATO': '境港(境港市)',
            'KURI': '来居(知夫村)',
            'BEPPU': '別府(西ノ島町)',
            'HISHIURA': '菱浦(海士町)',
            'SAIGO': '西郷(隠岐の島町)',
            'MAINLAND': '本土',
            'DOZEN': '島前',
            'DOGO': '島後',
            'FERRY_OKI': 'フェリーおき',
            'FERRY_SHIRASHIMA': 'フェリーしらしま',
            'FERRY_KUNIGA': 'フェリーくにが',
            'FERRY_DOZEN': 'フェリーどうぜん(内航船)',
            'ISOKAZE': 'いそかぜ(内航船)',
            'RAINBOWJET': 'レインボージェット',
            'NO_RESULT_ERROR': '条件に一致する経路がありません。',
            'TIMETABLE_SUP_SHICHIRUI': '(七類)',
            'TIMETABLE_SUP_SAKAIMINATO': '(境港)',
            'MORE_BUTTON': 'もっと見る',
            'SHIP_STATUS': '運航状況',
            'OKI_KISEN': '隠岐汽船',
            'OKI_KISEN_STATUS_URL': 'http://www.oki-kisen.co.jp/situation/',
            'OKI_KANKO': '隠岐観光',
            'CONTACT': 'お問い合わせ',
            'COMPANY': '(株)',
            'KUNIGA_SIGHTSEEING_BOAT': '国賀めぐり定期観光船',
            'NISHINOSHIMA_CHO': '西ノ島町',
            'AMA_CHO': '海士町',
            'CHIBU_MURA': '知夫村',
            'OKINOSHIMA_CHO': '隠岐の島町'
        });
        $translateProvider.translations('en', {
            'TITLE': 'Oki Islands Sea Line Information',
            'CURRENCY_UNIT': 'yen',
            'HOURS': 'hours',
            'MINUTES': 'mins',
            'ROUTE': 'Route',
            'TIME': 'Time',
            'FARE': 'Fare',
            'DEPARTURE': 'Departure',
            'ARRIVAL': 'Arrival',
            'DEPARTURE_TIME': 'Depart at',
            'ARRIVAL_TIME': 'Arrive by',
            'TIMETABLE': 'Timetable',
            'TRANSIT': 'Transit',
            'DATE': 'Date',
            '_FROM': 'From:',
            'FROM_': '',
            '_TO': 'To:',
            'TO_': '',
            'SHIP': 'Ship',
            'DO_NOT_USE_FAST_FERRY': 'Except Fast Ferry',
            'VIA_CAR': 'Via car',
            'ADD_CONDITIONS': 'Add conditions',
            'SEARCH_ROUTE': 'Search Route',
            'TODAY': 'Today',
            'CLEAR': 'Clear',
            'CLOSE': 'Close',
            'HONDO': 'Shichirui or Sakaiminato',
            'HONDO_SHICHIRUI': 'Shichirui',
            'HONDO_SAKAIMINATO': 'Sakaiminato',
            'KURI': 'Kurī (Chibu)',
            'BEPPU': 'Beppu (Nishinoshima)',
            'HISHIURA': 'Hishiura (Ama)',
            'SAIGO': 'Saigō (Okinoshima)',
            'MAINLAND': 'Mainland',
            'DOZEN': 'Dōzen',
            'DOGO': 'Dōgo',
            'FERRY_OKI': 'Ferry Oki',
            'FERRY_SHIRASHIMA': 'Ferry Shirashima',
            'FERRY_KUNIGA': 'Ferry Kuniga',
            'FERRY_DOZEN': 'Ferry Dōzen (Inter-Island Ferry)',
            'ISOKAZE': 'Isokaze (Inter-Island Ferry)',
            'RAINBOWJET': 'Rainbow Jet (Fast Ferry)',
            'NO_RESULT_ERROR': 'No Routes have been found.',
            'TIMETABLE_SUP_SHICHIRUI': '(Shichirui)',
            'TIMETABLE_SUP_SAKAIMINATO': '(Sakaiminato)',
            'MORE_BUTTON': 'See more',
            'SHIP_STATUS': 'Service Status',
            'OKI_KISEN': 'Oki Kisen ',
            'OKI_KISEN_STATUS_URL': 'http://www.oki-kisen.co.jp/m/m_situation/',
            'OKI_KANKO': 'Oki Kankō ',
            'CONTACT': 'Contact',
            'COMPANY': 'Co., Ltd.',
            'KUNIGA_SIGHTSEEING_BOAT': 'Kuniga Coast Sightseeing Boat',
            'NISHINOSHIMA_CHO': 'Nishinoshima',
            'AMA_CHO': 'Ama',
            'CHIBU_MURA': 'Chibu',
            'OKINOSHIMA_CHO': 'Okinoshima'
        });
        $translateProvider.determinePreferredLanguage(function () {
            // define a function to determine the language
            // and return a language key
            var lang = (window.navigator['userLanguage']
                || window.navigator['language']
                || window.navigator['browserLanguage']).substr(0, 2) == "ja" ? "ja" : "en";
            return lang;
        });
        $translateProvider.useSanitizeValueStrategy('escape');
    }]);
