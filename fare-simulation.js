/**
 * 隠岐汽船フェリー 別府〜菱浦ルート 料金計算シミュレーション
 * Oki Kisen Ferry Beppu-Hishiura Route Fare Calculation Simulation
 */

// 料金データ (fare-master.json より抜粋)
const FARE_DATA = {
  // 別府〜菱浦ルートの基本料金
  beppuHishiura: {
    adult: 410,      // 大人料金
    child: 205,      // 子供料金
    seatClass: {
      class2: 410,        // 2等
      class2Special: 630, // 2等特別
      class1: 650,        // 1等
      classSpecial: 830,  // 特別室
      specialRoom: 1150   // 個室
    },
    vehicle: {
      under3m: 950,    // 3m以下
      under4m: 1260,   // 4m以下
      under5m: 1590,   // 5m以下
      under6m: 1900,   // 6m以下
      under7m: 2230,   // 7m以下
      under8m: 2560,   // 8m以下
      under9m: 2870,   // 9m以下
      under10m: 3200,  // 10m以下
      under11m: 3510,  // 11m以下
      under12m: 3810,  // 12m以下
      over12mPer1m: 310 // 12m超過: 1mあたり310円
    }
  },
  
  // 割引率
  discounts: {
    roundTrip: 0.9,      // 往復割引: 10%引き
    group: 0.85,         // 団体割引: 15%引き (15名以上)
    disability: 0.5,     // 障害者割引: 50%引き
    student: 0.8         // 学生割引: 20%引き
  }
};

// 通貨フォーマット関数
function formatCurrency(amount) {
  return `\xA5${amount.toLocaleString('ja-JP')}`;
}

// 10円単位に切り上げる関数
function roundUpToTen(amount) {
  return Math.ceil(amount / 10) * 10;
}

// 旅客料金計算
class PassengerFareCalculator {
  constructor(routeData) {
    this.routeData = routeData;
  }
  
  // 基本旅客料金計算
  calculateBaseFare(passengerType, seatClass = 'class2') {
    const baseFare = passengerType === 'adult' 
      ? this.routeData.adult 
      : roundUpToTen(this.routeData.adult / 2); // 子供料金は大人の半額を10円単位に切り上げ
    
    const seatClassFare = this.routeData.seatClass[seatClass] || this.routeData.seatClass.class2;
    const finalFare = passengerType === 'adult'
      ? seatClassFare
      : roundUpToTen(seatClassFare / 2); // 子供の等級料金も半額を10円単位に切り上げ
    
    return {
      baseFare,
      seatClassFare: finalFare,
      total: finalFare
    };
  }
  
  // 割引適用後の料金計算
  calculateWithDiscount(baseFare, discountType, passengerCount = 1) {
    let discountRate = 1;
    let discountName = 'なし';
    
    switch (discountType) {
      case 'roundTrip':
        if (passengerCount >= 1) {
          discountRate = FARE_DATA.discounts.roundTrip;
          discountName = '往復割引 (10%引き)';
        }
        break;
      case 'group':
        if (passengerCount >= 15) {
          discountRate = FARE_DATA.discounts.group;
          discountName = '団体割引 (15%引き, 15名以上)';
        }
        break;
      case 'disability':
        discountRate = FARE_DATA.discounts.disability;
        discountName = '障害者割引 (50%引き)';
        break;
      case 'student':
        discountRate = FARE_DATA.discounts.student;
        discountName = '学生割引 (20%引き)';
        break;
    }
    
    const discountedFare = roundUpToTen(baseFare * discountRate);
    
    return {
      originalFare: baseFare,
      discountRate,
      discountName,
      discountedFare,
      savings: baseFare - discountedFare
    };
  }
}

// 車両料金計算
class VehicleFareCalculator {
  constructor(routeData) {
    this.routeData = routeData;
  }
  
  // 車両料金計算
  calculateVehicleFare(vehicleLength) {
    let fare = 0;
    let category = '';
    
    if (vehicleLength <= 3) {
      fare = this.routeData.vehicle.under3m;
      category = '3m以下';
    } else if (vehicleLength <= 4) {
      fare = this.routeData.vehicle.under4m;
      category = '4m以下';
    } else if (vehicleLength <= 5) {
      fare = this.routeData.vehicle.under5m;
      category = '5m以下';
    } else if (vehicleLength <= 6) {
      fare = this.routeData.vehicle.under6m;
      category = '6m以下';
    } else if (vehicleLength <= 7) {
      fare = this.routeData.vehicle.under7m;
      category = '7m以下';
    } else if (vehicleLength <= 8) {
      fare = this.routeData.vehicle.under8m;
      category = '8m以下';
    } else if (vehicleLength <= 9) {
      fare = this.routeData.vehicle.under9m;
      category = '9m以下';
    } else if (vehicleLength <= 10) {
      fare = this.routeData.vehicle.under10m;
      category = '10m以下';
    } else if (vehicleLength <= 11) {
      fare = this.routeData.vehicle.under11m;
      category = '11m以下';
    } else if (vehicleLength <= 12) {
      fare = this.routeData.vehicle.under12m;
      category = '12m以下';
    } else {
      // 12m超過の場合
      fare = this.routeData.vehicle.under12m;
      const extraLength = Math.ceil(vehicleLength - 12);
      fare += extraLength * this.routeData.vehicle.over12mPer1m;
      category = `${Math.ceil(vehicleLength)}m (${extraLength}m超過分)`;
    }
    
    return {
      vehicleLength,
      category,
      fare,
      includesDriver: true // 運転手料金含む
    };
  }
}

// シミュレーション実行関数
function runSimulation() {
  console.log('='.repeat(80));
  console.log('隠岐汽船フェリー 別府〜菱浦ルート 料金計算シミュレーション');
  console.log('Oki Kisen Ferry Beppu-Hishiura Route Fare Calculation Simulation');
  console.log('='.repeat(80));
  console.log();
  
  const passengerCalc = new PassengerFareCalculator(FARE_DATA.beppuHishiura);
  const vehicleCalc = new VehicleFareCalculator(FARE_DATA.beppuHishiura);
  
  // 1. 基本旅客料金シミュレーション
  console.log('1. 基本旅客料金 (Basic Passenger Fares)');
  console.log('-'.repeat(50));
  
  const passengerTypes = ['adult', 'child'];
  const seatClasses = ['class2', 'class2Special', 'class1', 'classSpecial', 'specialRoom'];
  
  passengerTypes.forEach(type => {
    console.log(`\n${type === 'adult' ? '大人' : '子供'}料金:`);
    seatClasses.forEach(seatClass => {
      const fare = passengerCalc.calculateBaseFare(type, seatClass);
      const seatClassName = {
        class2: '2等',
        class2Special: '2等特別',
        class1: '1等',
        classSpecial: '特別室',
        specialRoom: '個室'
      }[seatClass];
      console.log(`  ${seatClassName}: ${formatCurrency(fare.total)}`);
    });
  });
  
  // 2. 割引適用シミュレーション
  console.log('\n\n2. 割引適用例 (Discount Examples)');
  console.log('-'.repeat(50));
  
  const baseAdultFare = passengerCalc.calculateBaseFare('adult', 'class2').total;
  const discountTypes = ['roundTrip', 'group', 'disability', 'student'];
  
  discountTypes.forEach(discountType => {
    const result = passengerCalc.calculateWithDiscount(baseAdultFare, discountType, 20);
    console.log(`\n${result.discountName}:`);
    console.log(`  通常料金: ${formatCurrency(result.originalFare)}`);
    console.log(`  割引後料金: ${formatCurrency(result.discountedFare)}`);
    console.log(`  割引額: ${formatCurrency(result.savings)}`);
  });
  
  // 3. 車両料金シミュレーション
  console.log('\n\n3. 車両料金 (Vehicle Fares)');
  console.log('-'.repeat(50));
  console.log('※運転手料金含む (Includes driver ticket)');
  console.log();
  
  const vehicleLengths = [2.5, 3.5, 4.8, 6.2, 8.5, 10.5, 13.5];
  
  vehicleLengths.forEach(length => {
    const result = vehicleCalc.calculateVehicleFare(length);
    console.log(`${result.category}: ${formatCurrency(result.fare)}`);
  });
  
  // 4. 具体的な利用シナリオ
  console.log('\n\n4. 具体的な利用シナリオ (Specific Scenarios)');
  console.log('-'.repeat(50));
  
  // シナリオ1: 家族4人+普通車
  console.log('\nシナリオ1: 家族4人(大人2人+子供2人) + 普通車(4.5m)');
  const adultFare = passengerCalc.calculateBaseFare('adult', 'class2').total;
  const childFare = passengerCalc.calculateBaseFare('child', 'class2').total;
  const vehicleFare = vehicleCalc.calculateVehicleFare(4.5).fare;
  const totalScenario1 = (adultFare * 2) + (childFare * 2) + vehicleFare;
  
  console.log(`  大人2人: ${formatCurrency(adultFare)} × 2 = ${formatCurrency(adultFare * 2)}`);
  console.log(`  子供2人: ${formatCurrency(childFare)} × 2 = ${formatCurrency(childFare * 2)}`);
  console.log(`  普通車: ${formatCurrency(vehicleFare)}`);
  console.log(`  合計: ${formatCurrency(totalScenario1)}`);
  
  // シナリオ2: カップル往復+1等
  console.log('\nシナリオ2: カップル往復 + 1等室');
  const firstClassFare = passengerCalc.calculateBaseFare('adult', 'class1').total;
  const roundTripDiscount = passengerCalc.calculateWithDiscount(firstClassFare, 'roundTrip');
  const totalScenario2 = roundTripDiscount.discountedFare * 2;
  
  console.log(`  大人1人往復(1等): ${formatCurrency(firstClassFare)} → ${formatCurrency(roundTripDiscount.discountedFare)}`);
  console.log(`  カップル2人: ${formatCurrency(roundTripDiscount.discountedFare)} × 2 = ${formatCurrency(totalScenario2)}`);
  
  // シナリオ3: 団体旅行
  console.log('\nシナリオ3: 団体旅行(20人) + 2台のバス(12m)');
  const groupDiscount = passengerCalc.calculateWithDiscount(adultFare, 'group', 20);
  const busFare = vehicleCalc.calculateVehicleFare(12).fare;
  const totalScenario3 = (groupDiscount.discountedFare * 20) + (busFare * 2);
  
  console.log(`  大人20人: ${formatCurrency(adultFare)} → ${formatCurrency(groupDiscount.discountedFare)} × 20 = ${formatCurrency(groupDiscount.discountedFare * 20)}`);
  console.log(`  バス2台: ${formatCurrency(busFare)} × 2 = ${formatCurrency(busFare * 2)}`);
  console.log(`  合計: ${formatCurrency(totalScenario3)}`);
  
  // 5. 料金計算ロジックの説明
  console.log('\n\n5. 料金計算ロジック (Fare Calculation Logic)');
  console.log('-'.repeat(50));
  console.log('• 旅客料金は等級によって異なる (Passenger fares vary by class)');
  console.log('• 子供料金は大人料金の半額 (Child fare is half of adult fare)');
  console.log('• 割引は10円単位に切り上げ (Discounts are rounded up to 10 yen)');
  console.log('• 車両料金は長さに応じて階段状に増加 (Vehicle fares increase stepwise by length)');
  console.log('• 車両料金には運転手1名分の旅客料金含む (Vehicle fare includes 1 driver ticket)');
  console.log('• 往復割引は10%引き (Round trip discount is 10% off)');
  console.log('• 団体割引は15名以上で15%引き (Group discount is 15% off for 15+ people)');
  console.log('• 障害者割引は50%引き (Disability discount is 50% off)');
  console.log('• 学生割引は20%引き (Student discount is 20% off)');
  
  console.log('\n' + '='.repeat(80));
  console.log('シミュレーション完了 (Simulation Complete)');
  console.log('='.repeat(80));
}

// シミュレーション実行
runSimulation();
