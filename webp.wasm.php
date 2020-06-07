<?php
if ($_SERVER["REQUEST_METHOD"] === "GET") {
	header("Content-Type: application/wasm");
	echo file_get_contents(dirname(__FILE__) . DIRECTORY_SEPARATOR . "webp.wasm");
	http_response_code(200);
} else {
	http_response_code(400);
}
die();
