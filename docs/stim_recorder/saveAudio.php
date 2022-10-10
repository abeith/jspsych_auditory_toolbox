<?php

$post = file_get_contents('php://input');

$name = '/var/data/recordings/audio/' . hash('sha256', $post) . '.wav';

file_put_contents($name, $post);

echo $name;

?>
