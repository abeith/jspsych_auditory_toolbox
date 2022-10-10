<?php
$post_json = json_decode(file_get_contents('php://input'), true);
$expt_name = $post_json['expt_name'];
$subj_id = $post_json['subj_id'];
$data = $post_json['trials'];
$data = json_encode($data);
$filename = "/var/data/recordings/json/";
$filename .= $expt_name . "_" . $subj_id;
// $filename .= date("YmdHis");
$filename .= "_trial_data.json";
$file = fopen($filename, 'w');
fwrite($file, $data);
fclose($file);
header('Content-Type: application/json');
echo json_encode(array('success' => TRUE));
?>
