jQuery(document).ready(function() {
    const webpPage = function() {
        return jQuery(".ww").length;
    }

    if (!webpPage()) {
        return;
    }

    WebP().then(Module => {

        const setViewDisabled = function(elements, isDisabled) {
            elements.each(function() {
                jQuery(this).prop("disabled", isDisabled);
            });
        };

        const PluginPanelView = {
            panel: jQuery("#ww_panel"),
            btnConvertAll: jQuery("#ww_panel_action"),
            notSuported: jQuery(".ww--not-supported"),
            allCtrlEl: jQuery(".ww"),
            logText: jQuery("#ww_log"),
            overwriteExisting: jQuery("#ww_panel_overwrite"),
            txtQuality: jQuery("#ww_panel_quality"),
            btnDeleteAll: jQuery("#ww_panel_delete"),
            enable: function() {
                setViewDisabled(this.allCtrlEl, false);
            },
            disable: function() {
                setViewDisabled(this.allCtrlEl, true);
            },
            clearLog: function() {
                this.logText.empty();
            },
            log: function(msg) {
                this.logText.append("<li>" + msg + "</li>");
            }
        };

        const PluginPanelModel = {
            quality: function() { return parseInt(PluginPanelView.txtQuality.val()) },
            isOverwrite: function() {
                return PluginPanelView.overwriteExisting.is(":checked");
            },
            postId: function() {
                return parseInt(PluginPanelView.panel.data("postid"));
            }
        };

        const init = function() {
            PluginPanelView.btnConvertAll.click(function() {
                PluginPanelView.disable();
                PluginPanelView.clearLog();
                let qty = PluginPanelModel.quality();
                if (!isValidQuality(qty)) {
                    wwLog("Quality must be between 1 and 100, cannot convert");
                    PluginPanelView.enable();
                } else {
                    let isOverwrite = PluginPanelModel.isOverwrite();
                    let curPostId = PluginPanelModel.postId();
                    wwLog("Fetching list of images");
                    jQuery.ajax({
                        type: "POST",
                        method: "POST",
                        url: wwAjax.url,
                        dataType: "json",
                        data: {
                            action: "ww_webp_fetch_images",
                            overwrite: isOverwrite,
                            wwNonce: wwAjax.nonce,
                            postId: curPostId
                        },
                    }).done(function(data) {
                        const Progress = {
                            total: data.total,
                            loadImgFail: 0,
                            convertImgFail: 0,
                            convertImgSuccess: 0,
                            handleLoadImgFail: function(value) {
                                this.loadImgFail++;
                                wwLog(this.progress() + ": " + value + " - Could not load image");
                                this.enableIfFinished();
                            },
                            handleConvertImgFail: function(value) {
                                this.convertImgFail++;
                                wwLog(this.progress() + ": " + value + " - An error occurred and the webp image may not have been created or updated");
                                this.enableIfFinished();
                            },
                            handleConvertImgSuccess: function(value) {
                                this.convertImgSuccess++;
                                wwLog(this.progress() + ": " + value + " - OK");
                                this.enableIfFinished();
                            },
                            handled: function() {
                                return this.loadImgFail + this.convertImgFail + this.convertImgSuccess;
                            },
                            progress: function() {
                                return this.handled() + " of " + this.total;
                            },
                            enableIfFinished: function() {
                                if (this.handled() === this.total) {
                                    wwLog("Finished");
                                    PluginPanelView.enable();
                                }
                            }
                        };
                        wwLog("Found " + Progress.total + " images");
                        if (Progress.total === 0) {
                            PluginPanelView.enable();
                        } else {
                            wwLog("Converting...");
                            jQuery.each(data, function(postId, postImages) {
                                jQuery.each(postImages.files, function(key, filename) {
                                    let value = postImages.baseurl + "/" + filename;
                                    handleConvert(
                                        value, 
                                        postId, 
                                        qty,
                                        () => Progress.handleLoadImgFail(value),
                                        () => Progress.handleConvertImgSuccess(value),
                                        () => Progress.handleConvertImgFail(value));
                                });
                            });
                        }
                    }).fail(function(data, text, xhr) {
                        wwLog("Could not fetch images");
                        PluginPanelView.enable();
                    });
                }
            });

            PluginPanelView.btnDeleteAll.click(function() {
                let curPostId = PluginPanelModel.postId();
                let msg = null;
                if (curPostId > 0) {
                    msg = "Delete webp images associated with this media library image and its thumbnails?";
                } else {
                    msg = "Delete all webp images associated with all media library images and their thumbnails?";
                }
                let proceed = confirm(msg);
                if (proceed == true) {
                    PluginPanelView.disable();
                    PluginPanelView.clearLog();
                    wwLog("Deleting webp images...");
                    jQuery.ajax({
                        type: "POST",
                        method: "POST",
                        dataType: "json",
                        url: wwAjax.url,
                        data: {
                            action: "ww_webp_delete_all",
                            wwNonce: wwAjax.nonce,
                            postId: curPostId
                        },
                        dataType: "json"
                    }).done(function(data) {
                        let numDeleted = 0;
                        jQuery.each(data, function(key, value) {
                            let msg = key + " - ";
                            if (value === true) {
                                msg += "DELETED";
                                numDeleted++;
                            } else {
                                msg += "ERROR";
                            }
                            wwLog(msg);
                        });
                        wwLog("Deleted " + numDeleted + " images.");
                    }).fail(function(data, text, xhr) {
                        wwLog("An error occurred and the WebP images may not have been deleted.");
                    });
                    PluginPanelView.enable();
                }
            });

            PluginPanelView.notSuported.addClass("ww--hidden");
            PluginPanelView.panel.removeClass("ww--hidden");
        };

        // TODO refactor

        const wwSuccess = function(msg) {
            View.updateStatus(msg, 0, true);
        };

        const wwError = function(msg) {
            View.updateStatus(msg, 1, true);
        };

        const wwInProgress = function(msg) {
            View.updateStatus(msg, 2, false);
        };

        const wwLog = function(msg) {
            PluginPanelView.log(msg);
        };

        const isValidQuality = function(value) {
            return Number.isInteger(value) && value > 1 && value <= 100;
        };

        function handleConvert(src, postId, quality, loadFail, convertSuccess, convertFail) {
            let img = new Image();
            img.onload = function() {
                if (img.width + img.height === 0) {
                    loadFail();
                } else {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    const image = ctx.getImageData(0, 0, img.width, img.height);
                    delete canvas;
                    wwEncode(Module, image, quality, result => {
                        let blob = new Blob([result], {type: "image/webp"});
                        let fd = new FormData();
                        fd.append("postId", postId);
                        fd.append("src", src);
                        fd.append("webp", blob);
                        fd.append("action", "ww_webp_upload");
                        fd.append("wwNonce", wwAjax.nonce);
                        jQuery.ajax({
                            type: "POST",
                            method: "POST",
                            url: wwAjax.url,
                            data: fd,
                            processData: false,
                            contentType: false
                        }).done(function(data) {
                            convertSuccess();
                        }).fail(function(data, text, xhr) {
                            convertFail();
                        });
                    });
                }
            }
            img.src = src;
            delete img;
        }

        function wwEncode(Module, image, quality, success) {
            const api = {
                version: Module.cwrap('version', 'number', []),
                create_buffer: Module.cwrap('create_buffer', 'number', ['number', 'number']),
                destroy_buffer: Module.cwrap('destroy_buffer', '', ['number']),
                encode: Module.cwrap('encode', '', ['number', 'number', 'number', 'number']),
                get_result_pointer: Module.cwrap('get_result_pointer', 'number', ''),
                get_result_size: Module.cwrap('get_result_size', 'number', ''),
                free_result: Module.cwrap('free_result', '', ['number']),
            };

            const p = api.create_buffer(image.width, image.height);
              
            Module.HEAP8.set(image.data, p);
              
            api.encode(p, image.width, image.height, quality);
              
            const resultPointer = api.get_result_pointer();
            const resultSize = api.get_result_size();
            const resultView = new Uint8Array(Module.HEAP8.buffer, resultPointer, resultSize);
            const converted = new Uint8Array(resultView);
              
            api.free_result(resultPointer);
            api.destroy_buffer(p);

            success(converted);
        }

        init();
    });
});