jQuery(document).ready(function() {
    const webpPage = function() {
        return jQuery(".webpwasm").length;
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
            panel: jQuery("#webpwasm_panel"),
            btnConvertAll: jQuery("#webpwasm_panel_action"),
            notSuported: jQuery(".webpwasm--not-supported"),
            allCtrlEl: jQuery(".webpwasm"),
            logText: jQuery("#webpwasm_log"),
            overwriteExisting: jQuery("#webpwasm_panel_overwrite"),
            txtQuality: jQuery("#webpwasm_panel_quality"),
            btnDeleteAll: jQuery("#webpwasm_panel_delete"),
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
                    webpwasmLog("Quality must be between 1 and 100, cannot convert");
                    PluginPanelView.enable();
                } else {
                    let isOverwrite = PluginPanelModel.isOverwrite();
                    let curPostId = PluginPanelModel.postId();
                    webpwasmLog("Fetching list of images");
                    jQuery.ajax({
                        type: "POST",
                        method: "POST",
                        url: webpwasmAjax.url,
                        dataType: "json",
                        data: {
                            action: "webpwasm_webp_fetch_images",
                            overwrite: isOverwrite,
                            webpwasm_nonce: webpwasmAjax.nonce,
                            post_id: curPostId
                        },
                    }).done(function(data) {
                        const Progress = {
                            total: data.total,
                            loadImgFail: 0,
                            convertImgFail: 0,
                            convertImgSuccess: 0,
                            handleLoadImgFail: function(value) {
                                this.loadImgFail++;
                                webpwasmLog(this.progress() + ": " + value + " - Could not load image");
                                this.enableIfFinished();
                            },
                            handleConvertImgFail: function(value) {
                                this.convertImgFail++;
                                webpwasmLog(this.progress() + ": " + value + " - An error occurred and the webp image may not have been created or updated");
                                this.enableIfFinished();
                            },
                            handleConvertImgSuccess: function(value) {
                                this.convertImgSuccess++;
                                webpwasmLog(this.progress() + ": " + value + " - OK");
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
                                    webpwasmLog("Finished");
                                    PluginPanelView.enable();
                                }
                            }
                        };
                        webpwasmLog("Found " + Progress.total + " images");
                        if (Progress.total === 0) {
                            PluginPanelView.enable();
                        } else {
                            webpwasmLog("Converting...");
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
                        webpwasmLog("Could not fetch images");
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
                    webpwasmLog("Deleting webp images...");
                    jQuery.ajax({
                        type: "POST",
                        method: "POST",
                        dataType: "json",
                        url: webpwasmAjax.url,
                        data: {
                            action: "webpwasm_webp_delete_all",
                            webpwasm_nonce: webpwasmAjax.nonce,
                            post_id: curPostId
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
                            webpwasmLog(msg);
                        });
                        webpwasmLog("Deleted " + numDeleted + " images.");
                    }).fail(function(data, text, xhr) {
                        webpwasmLog("An error occurred and the WebP images may not have been deleted.");
                    });
                    PluginPanelView.enable();
                }
            });

            PluginPanelView.notSuported.addClass("webpwasm--hidden");
            PluginPanelView.panel.removeClass("webpwasm--hidden");
        };

        // TODO refactor

        const webpwasmSuccess = function(msg) {
            View.updateStatus(msg, 0, true);
        };

        const webpwasmError = function(msg) {
            View.updateStatus(msg, 1, true);
        };

        const webpwasmInProgress = function(msg) {
            View.updateStatus(msg, 2, false);
        };

        const webpwasmLog = function(msg) {
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
                    webpwasmEncode(Module, image, quality, result => {
                        let blob = new Blob([result], {type: "image/webp"});
                        let fd = new FormData();
                        fd.append("post_id", postId);
                        fd.append("src", src);
                        fd.append("webp", blob);
                        fd.append("action", "webpwasm_webp_upload");
                        fd.append("webpwasm_nonce", webpwasmAjax.nonce);
                        jQuery.ajax({
                            type: "POST",
                            method: "POST",
                            url: webpwasmAjax.url,
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

        function webpwasmEncode(Module, image, quality, success) {
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