drop table timetable;
vacuum;
create table timetable(trip_id, next_id,  start_date, end_date, name, departure, departure_time, arrival, arrival_time);

.separator ","
.import timetable-2021v3-result_oki-kisen.csv timetable
.import timetable-2021v2-result_oki-kanko.csv timetable
