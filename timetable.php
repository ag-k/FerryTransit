<?php
$jsonUrl = "timetable.json";
if (file_exists($jsonUrl)) {
    if ($json = @file_get_contents($jsonUrl)) {
        header('Access-Control-Allow-Origin: *');
        echo $json;
    } else {
        echo "Error: Timetable file not found.";
    }
} else {
    echo "Error: Timetable file not found.";
}
