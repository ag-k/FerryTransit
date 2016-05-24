<?php
try {
    $db = new PDO('sqlite:timetable.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    header('Access-Control-Allow-Origin: *');
    echo json_encode($db->query('SELECT * FROM timetable')->fetchAll(PDO::FETCH_ASSOC));
} catch (PDOException $e) {
    die ('Connection failed : '.$e->getMessage());
}
