/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Note: for now, Android and iOS use different interfaces.  We are in
 * the process of unifying this, but they will be separate for a
 * little bit.
 */

/**
 * Class: webPush
 *
 * Someone should write a class description.
 */

this.dopamine = this.dopamine || {};

dopamine.webPush = (function (my, $) {
    var PERM_ALLOW = 0;
    var PERM_NOT_ALLOW = 1;
    var PERM_DENY = 2;

    var WEBPUSH_URL_KEY = ".adrenaline.webpush.pushurl";
    var PERM_CB_STR = "dopamine.webPush._requestPermissionCb";
    var PUSH_CB_STR = "dopamine.webPush._requestPushUrlCb";

    var pushUrlCbQueue;

    var webPush;

    /**
     * This is a helper function to reset this object to the state it
     * would be in when the page first loads.  It shouldn't be used by
     * production code, only by unit tests.
     */
    my._reset = function() {
        localStorage.removeItem(WEBPUSH_URL_KEY);

        if (typeof window.webPush !== "undefined") {
            webPush = window.webPush;
        } else {
            webPush = null;
        }

        pushUrlCbQueue = [];
    };

    /* And call reset once to initialize things */
    my._reset();

    /**
     * Function: requestPushUrl
     *
     * This function is the main (only) entry point into the web push
     * functionality.  Client code will call this function and supply a
     * callback.  The code will either return the web push url from
     * localstorage or it will ask the browser to get one.
     *
     * If the platform doesn't support web push, it fails silently.
     * However, you can use the hasPush function to check.
     *
     * Parameters:
     * callback - the function that will be called with the resulting url
     *
     */
    my.requestPushUrl = function(callback) {
        if (my.hasPush()) {
            if (dopamine.utils.isAdrenalineIos()) {
                var url = localStorage.getItem(WEBPUSH_URL_KEY);
                if (url) {
                    setTimeout(function() {callback(url);}, 0);
                } else {
                    dopamine.exec(function(url) {
                        localStorage.setItem(WEBPUSH_URL_KEY, url);
                        callback(url);}, null, "WebPush", "requestPushUrl", []);
                }
            } else if (webPush !== null) {
                handleCheckPermission(true);
                pushUrlCbQueue.push(callback);
            }
        }
    };

    /**
     * Function: hasPush
     *
     * Simple helper to see if your browser supports webpush
     *
     * Returns:
     * - True if browser supports webpush
     * - False if it doesn't
     */
    my.hasPush = function() {
        return webPush !== null || dopamine.utils.isAdrenalineIos();
    };

    function invokeCallbacks(url) {
        var cb;

        while (pushUrlCbQueue.length > 0) {
            cb = pushUrlCbQueue.shift();
            localStorage.setItem(WEBPUSH_URL_KEY, url);
            cb(url);
        }
    }

    my._requestPermissionCb = function() {
        handleCheckPermission(false);
    };

    my._requestPushUrlCb = function(result) {
        invokeCallbacks(result);
    };

    function invokeInBackground(url) {
        setTimeout(function() {
            invokeCallbacks(url);
        }, 0);
    }

    function handleCheckPermission(issueRequest) {
        var url = localStorage.getItem(WEBPUSH_URL_KEY);
        if (url) {
            invokeInBackground(url);
            return;
        }

        var perm = webPush.checkPermission();
        if (perm === PERM_NOT_ALLOW) {
            if (issueRequest) {
                webPush.requestPermission(PERM_CB_STR);
            }
        } else if (perm === PERM_ALLOW) {
            webPush.requestPushUrl(PUSH_CB_STR);
        }
    }

    return my;
})(dopamine.webPush || {}, jQuery);
