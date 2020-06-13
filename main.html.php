<?php 
/** 
 * If $post_id is more than zero it's an edit post page, otherwise it's admin panel
 * the ww--not-supported classes are hidden with javascript by adding the ww--hidden class if the plugin is supported
 * other variables for use in html can be defined here
 */
$label_create_all = esc_html__('Create', 'webp-wasm');
$label_delete_all = esc_html__('Delete', 'webp-wasm');
?>

<p class="ww ww--not-supported"><?php esc_html_e('The WebP WASM plugin is active but cannot be used in this browser.', 'webp-wasm'); ?></p>

<div id="ww_panel" class="ww--hidden" data-postid="<?php echo $post_id ?>">
    <h1>WebP WASM</h1>
    
    <div class="ww_generate_section">
        <h2 class="ww_generate_section_title"><?php esc_html_e('Generate', 'webp-wasm'); ?></h2>

        <?php if ($post_id > 0) { ?>
            <p><?php esc_html_e('Click', 'webp-wasm'); ?> <em><?php echo $label_create_all ?></em> <?php esc_html_e('to create WebP images for this image and its thumbnails. This could take a while.', 'webp-wasm'); ?></p>
        <?php } else { ?>
            <p><?php esc_html_e('Click', 'webp-wasm'); ?> <em><?php echo $label_create_all ?></em> <?php esc_html_e('to create WebP images for all media library images and their thumbnails. This could take a while.', 'webp-wasm'); ?></p>
        <?php } ?>
        
        <div class="ww_settings_section">
            <h3><?php esc_html_e('Settings', 'webp-wasm'); ?>:</h3>
            
            <p>
                <label><?php esc_html_e('WebP Image Quality', 'webp-wasm'); ?>:</label>
                <input id="ww_panel_quality" type="number" min="0" max="100" value="80" class="ww_panel_quality">
            </p>

            <p>
                <label>
                    <input id="ww_panel_overwrite" type="checkbox" class="ww">
                    <?php esc_html_e('Overwrite existing WebP files', 'webp-wasm'); ?>
                </label>
            </p>
        </div>
        
        <p class="ww_notice"><strong><?php esc_html_e('Notice: Since images are converted on the client and then sent to the server, be mindful not to use a connection with limited data.', 'webp-wasm'); ?></strong></p>

        <p>
            <input id="ww_panel_action" type="button" class="button button-primary ww_button_generate" value="<?php echo $label_create_all ?>">
        </p>
    </div>
    
    <hr>
    
    <div class="ww_restore_section">
        <h2 class="ww_restore_section_title"><?php esc_html_e('Restore', 'webp-wasm'); ?></h2>

        <?php if ($post_id > 0) { ?>
            <p><?php esc_html_e('Click', 'webp-wasm'); ?> <em><?php echo $label_delete_all ?></em> <?php esc_html_e('to delete all WebP images for this image and its thumbnails. This will leave originals unchanged (JPEG and PNG).', 'webp-wasm'); ?></p>
        <?php } else { ?>
            <p><?php esc_html_e('Click', 'webp-wasm'); ?> <em><?php echo $label_delete_all ?></em> <?php esc_html_e('to delete all WebP images for all media library images and their thumbnails. This will leave originals unchanged (JPEG and PNG).', 'webp-wasm'); ?></p>
        <?php } ?>

        <p>
            <input id="ww_panel_delete" type="button" class="button ww_button_delete" value="<?php echo $label_delete_all ?>"/>
        </p>
    </div>
    
    <hr>
    
    <ul id="ww_log"></ul>
</div>