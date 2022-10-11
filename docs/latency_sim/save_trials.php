<?php
$post = file_get_contents('php://input');
$filename = "/var/data/recordings/json/";
$filename .= date("YmdHis");
$filename .= "_latency_sim_trial_data.json";
$file = fopen($filename, 'w');
fwrite($file, $post);
fclose($file);
header('Content-Type: application/json');
echo json_encode(array('success' => TRUE));
?>
