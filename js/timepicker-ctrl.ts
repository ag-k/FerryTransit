/// <reference path="../typings/tsd.d.ts" />

interface TimePickerPopController{
    time1:Date;
    showMeridian:boolean;
}

class TimePickerPopController {

  constructor() {
    this.time1 = new Date();
    this.showMeridian = true;
  }
}

angular.module('ferryTransit').controller('TimePickerPopController', TimePickerPopController);
