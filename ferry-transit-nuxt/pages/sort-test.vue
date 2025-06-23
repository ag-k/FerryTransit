<template>
  <div class="container py-4">
    <h1>時刻表ソート確認</h1>
    
    <div class="mt-4">
      <h2>モックデータの時刻表（発時刻昇順）</h2>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>船名</th>
            <th>出発地</th>
            <th>発時刻</th>
            <th>目的地</th>
            <th>着時刻</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trip in sortedTimetable" :key="trip.tripId">
            <td>{{ trip.name }}</td>
            <td>{{ trip.departure }}</td>
            <td class="fw-bold text-primary">{{ trip.departureTime }}</td>
            <td>{{ trip.arrival }}</td>
            <td>{{ trip.arrivalTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
// モックデータ
const mockTimetable = [
  {
    tripId: 1,
    name: 'フェリーしらしま',
    departure: '西郷',
    arrival: '七類',
    departureTime: '14:25',
    arrivalTime: '16:50'
  },
  {
    tripId: 2,
    name: 'フェリーおき',
    departure: '西郷',
    arrival: '七類',
    departureTime: '09:00',
    arrivalTime: '11:25'
  },
  {
    tripId: 3,
    name: 'フェリーくにが',
    departure: '西郷',
    arrival: '七類',
    departureTime: '17:30',
    arrivalTime: '19:55'
  },
  {
    tripId: 4,
    name: 'フェリーしらしま',
    departure: '西郷',
    arrival: '七類',
    departureTime: '06:00',
    arrivalTime: '08:25'
  },
  {
    tripId: 5,
    name: 'フェリーおき',
    departure: '西郷',
    arrival: '七類',
    departureTime: '11:40',
    arrivalTime: '14:05'
  }
]

// 発時刻の昇順でソート
const sortedTimetable = computed(() => {
  return [...mockTimetable].sort((a, b) => {
    const timeA = new Date(`2000-01-01T${a.departureTime}`).getTime()
    const timeB = new Date(`2000-01-01T${b.departureTime}`).getTime()
    return timeA - timeB
  })
})
</script>