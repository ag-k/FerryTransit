/// <reference path="../typings/tsd.d.ts" />
var TimePickerPopController = /** @class */ (function () {
    function TimePickerPopController() {
        this.time1 = new Date();
        this.showMeridian = true;
    }
    return TimePickerPopController;
}());
angular.module('ferryTransit').controller('TimePickerPopController', TimePickerPopController);
