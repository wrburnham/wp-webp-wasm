<?php
/**
 * @package WpWebpWasm
 */
/*
Plugin Name: WebP WASM
Plugin URI: https://github.com/wrburnham/wp-webp-wasm
Description: Client side JPEG and PNG conversions to webp and upload.
Version: 1.0
Author: wrburnham
Author URI: https://wrburnham.github.io
License: GPLv3
Text Domain: webp-wasm
*/
/*
This software works with a WebAssembly binary of Google's cwebp to convert 
images to webp in a web browser. 

See also: https://chromium.googlesource.com/webm/libwebp/

The following is taken from https://www.webmproject.org/license/software/
and included in this project as the webp.wasm file is a web assembly binary that
leverages libwebp:

Copyright (c) 2010, Google Inc. All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of Google nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

if (!function_exists('add_action')) {
    echo "Direct access not permitted.";
    exit;
}
defined("ABSPATH") or die("No script kiddies please!");

add_action("init", "ww_css_registry");
add_action("wp_ajax_ww_webp_upload", "ww_webp_upload");
add_action("wp_ajax_ww_webp_delete_all", "ww_webp_delete_all");
add_action("wp_ajax_ww_webp_fetch_images", "ww_webp_fetch_images");
add_action("admin_enqueue_scripts", "ww_init_resources");
add_action("edit_form_advanced", "ww_render_edit_form_ui");
add_action("admin_menu", "ww_admin_menu");
add_filter("the_content", "ww_render_post", 9999);

const __WW_VERSION__ = "1.0";
const __WW_CSS_HANDLE__ = "ww_css";
const __NONCE_KEY__ = "ww_nonce";

function ww_admin_menu() {
    add_management_page(
        "WebP WASM Options",
        "WebP WASM",
        "manage_options",
        "ww-options",
        "ww_render_admin_menu"
    );
}

function ww_render_admin_menu() {
    $post_id = 0;
    include(__DIR__ . DIRECTORY_SEPARATOR . "main.html.php");
}

function ww_render_edit_form_ui($post) {
    if (ww_is_valid($post) === false) {
        return;
    }
    $post_id = $post->ID;
    include(__DIR__ . DIRECTORY_SEPARATOR . "main.html.php");
}

function ww_render_post($content) {
    if( in_the_loop() && strpos( $_SERVER['HTTP_ACCEPT'], 'image/webp' ) !== false ) {
        require_once(__DIR__ . DIRECTORY_SEPARATOR . "simple_html_dom.php");
        $html = str_get_html($content);
        if ($html !== false) {
            foreach ($html->find("img") as $el) {
                $el->src = ww_webp_src($el->src);
                $el->srcset = ww_webp_srcset($el->srcset);
            }
            foreach ($html->find("source") as $el) {
                $el->srcset = ww_webp_srcset($el->srcset);
            }
            return (string) $html;
        }
    }
    return $content;
}

function ww_webp_src($src) {
    $webp_path = get_webp_image_file_path($src);
    if (file_exists($webp_path)) {
        $src = ww_get_webp_name($src);
    }
    return $src;
}

function ww_webp_srcset($srcset) {
    foreach (ww_get_srcset_images($srcset) as $src) {
        $ss_webp_path = get_webp_image_file_path($src);
        if (file_exists($ss_webp_path)) {
            $srcset = str_replace($src, ww_get_webp_name($src), $srcset);
        }
    }
    return $srcset;
}

function ww_get_srcset_images($raw) {
    $srcset_images = array();   
    foreach (explode(",", preg_replace("/\s+/", " ", $raw)) as $piece) {
        $srcset_images[] = ww_get_srcset_url($piece);
    }
    return $srcset_images;
}

function ww_get_srcset_url($raw) {
    $tmp = ltrim($raw);
    $space_pos = strpos($tmp, " ");
    if ($space_pos !== false) {
        $tmp = substr($tmp, 0, $space_pos);
    }
    return $tmp;
}

/**
 * Given a url, find the resource on the server
 */
function get_webp_image_file_path($src) {
    $dir = wp_get_upload_dir();
    $site_url = parse_url($dir['url']);
    $image_path = parse_url($src);

    // Force the protocols to match if needed.
    if (isset($image_path["scheme"]) && ( $image_path["scheme"] !== $site_url["scheme"] ) ) {
        $src = str_replace($image_path["scheme"], $site_url["scheme"], $src);
    }

    if (0 === strpos($src, $dir["baseurl"] . "/" )) {
        $src = substr($src, strlen($dir["baseurl"] . "/"));
    }

    $src = $dir["basedir"] . DIRECTORY_SEPARATOR . $src;
    $src = ww_get_webp_name($src);
    return $src;
}

function ww_css_registry() {
    wp_register_style(
        __WW_CSS_HANDLE__, 
        plugin_dir_url(__FILE__) . "/main.css",
        array(),
        __WW_VERSION__
    );
}

function ww_webp_all_media($post_id = 0) {
    $args = array(
        "post_type"      => "attachment",
        "post_mime_type" => "image/jpeg,image/jpg,image/png",
        "post_status"    => "inherit",
        "posts_per_page" => -1,
    );
    if ($post_id > 0) {
        $args["post__in"] = array($post_id);
    }
    $posts = new WP_Query($args);
    return $posts;
}

function ww_is_valid_post_id($post_id) {
    return ((int) $post_id) >= 0;
}

function ww_webp_fetch_images() {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $data = isset( $_POST ) ? $_POST : array();
        if (!isset($data[__NONCE_KEY__])
            || !isset($data["overwrite"])
            || !isset($data["post_id"])
            || !ww_is_valid_post_id($data["post_id"])
            || !wp_verify_nonce($data[__NONCE_KEY__], __NONCE_KEY__)) {
            http_response_code(400);
        } else {
            $posts = ww_webp_all_media((int) $data["post_id"]);
            $results = array();
            $results["total"] = 0;
            foreach ($posts->posts as $post) {
                $post_files = array();
                $images = ww_get_images($post);
                $baseurl = $images["baseurl"];
                foreach ($images["files"] as $file) {
                    $source = $baseurl . "/" . $file;
                    if ($data["overwrite"] === "true" || !file_exists(ww_get_dest_path($post, $source))) {
                        $post_files[] = $file;
                    }
                }
                $total = (int) sizeof($post_files);
                if ($total > 0) {
                    $results[$post->ID]["baseurl"] = $baseurl;
                    $results["total"] += $total;
                    $results[$post->ID]["files"] = $post_files;
                }
            }
            echo json_encode($results);
            http_response_code(200);
        }
    } else {
        http_response_code(400);
    }
    die();    
}

function ww_webp_delete_all() {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $data = isset( $_POST ) ? $_POST : array();
    
        if (!isset($data[__NONCE_KEY__]) 
            || !isset($data["post_id"])
            || !ww_is_valid_post_id($data["post_id"])
            || !wp_verify_nonce($data[__NONCE_KEY__], __NONCE_KEY__)) {
            http_response_code(400);
        } else {
            $results = array();
            $posts = ww_webp_all_media((int) $data["post_id"]);
            foreach ($posts->posts as $post) {
                $images = ww_get_images($post);
                $baseurl = $images["baseurl"];
                foreach ($images["files"] as $file) {
                    $source = $baseurl . "/" . $file;
                    $key = ww_get_webp_name($source);
                    $dest = ww_get_dest_path($post, $source);
                    if (file_exists($dest)) {
                        $results[$key] = unlink($dest);
                    }
                }
            }
            echo json_encode($results);
            http_response_code(200);
        }
    } else {
        http_response_code(400);
    }
    die();
}

function ww_get_images($post) {
    $meta = get_post_meta($post->ID, "_wp_attachment_metadata", true);
    $results = array();
    $upload_dir = ww_get_upload_dir($post);
    $baseurl = $upload_dir["url"];
    $basefile = substr($post->guid, strlen($baseurl . "/"));
    $files = array($basefile);
    if (isset($meta["sizes"])) {
        foreach ($meta["sizes"] as $size) {
            $files[] = $size["file"];
        }
    }    
    $results["files"] = array_unique($files);
    $results["baseurl"] = $baseurl;
    return $results;
}

// see also https://www.ibenic.com/wordpress-file-upload-with-ajax/, https://wordpress.stackexchange.com/questions/231797/what-is-nonce-and-how-to-use-it-with-ajax-in-wordpress
function ww_webp_upload() {
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $posted_data = isset( $_POST ) ? $_POST : array();
        $file_data = isset( $_FILES ) ? $_FILES : array();
        $data = array_merge( $posted_data, $file_data );

        if (!isset($data["post_id"])
            || !isset($data["webp"]) 
            || !isset($data["src"])
            || !isset($data[__NONCE_KEY__])
            || !wp_verify_nonce($data[__NONCE_KEY__], __NONCE_KEY__)) {
            http_response_code(400);
        } else {
            $post = get_post($data["post_id"]);
            $src = $data["src"];
            $dest = ww_get_dest_path($post, $src);
            move_uploaded_file($data["webp"]["tmp_name"], $dest);
            http_response_code(200);
        }
    } else {
        http_response_code(400);
    }
    die();
}

function ww_get_upload_dir($post) {
    $year = substr($post->post_date_gmt, 0, 4);
    $month = substr($post->post_date_gmt, 5, 2);
    $time = $year . "/" . $month;
    return wp_upload_dir($time, false);
}

function ww_get_dest_path($post, $guid = null) {
    $upload_dir = ww_get_upload_dir($post);
    if ($guid === null) {
        $guid = $post->guid;
    }
    $orig_filename = wp_basename($guid);
    $filename = ww_get_webp_name($orig_filename);
    $destPath = $upload_dir["path"] . DIRECTORY_SEPARATOR . $filename;
    return $destPath;
}

function ww_get_webp_name($orig_filename) {
    return substr($orig_filename, 0, strrpos($orig_filename, ".")) . ".webp";
}

/**
 * Check if the post is valid for the plugin.
 * @return TRUE if the post is an attachment and is either jpeg or png, FALSE otherwise.
 */
function ww_is_valid($post) {
    if ($post->post_type !== "attachment") {
        return false;
    }
    if ($post->post_mime_type === "image/jpeg" || $post->post_mime_type === "image/png") {
        return true;
    }
    return false;
}

function ww_init_resources() {
    $webp_js_handle = "ww-webp-js";
    $main_js_handle = "ww-main-js";
    // enqueue webp.js
    wp_enqueue_script(
        $webp_js_handle,
        plugin_dir_url(__FILE__) . "/webp.js", 
        array(), 
        __WW_VERSION__, 
        true);
    
    // enqueue js
    wp_enqueue_script(
        $main_js_handle,
        plugin_dir_url(__FILE__) . "/main.js", 
        array("jquery", $webp_js_handle),
        __WW_VERSION__, 
        true);

    wp_localize_script(
        $main_js_handle,
        "wwAjax", 
        array(
            "url" => admin_url("admin-ajax.php"),
            "nonce" => wp_create_nonce(__NONCE_KEY__)
        ));

    wp_enqueue_style(__WW_CSS_HANDLE__);
}
