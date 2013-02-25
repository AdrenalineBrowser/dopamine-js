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
 * Class: WebPush
 *
 * Someone should write a class description.
 */

this.dopamine = this.dopamine || {};

(function($) {
    var PERM_ALLOW = 0;
    var PERM_NOT_ALLOW = 1;
    var PERM_DENY = 2;

    var WEBPUSH_URL_KEY = ".adrenaline.webpush.pushurl";
    var PERM_CB_STR = "dopamine.webPush._requestPermissionCb";
    var PUSH_CB_STR = "dopamine.webPush._requestPushUrlCb";

    /* Initializes the WebPush object.
     * Not meant to be used except from dopamine's main constructor
     *
     * Must be caleld with 'new'
     */

    function WebPush() {
        if(arguments.callee._singletonInstance)
            return arguments.callee._singletonInstance;
        arguments.callee._singletonInstance = this;

        if(typeof window.webPush !== 'undefined') {
            this._webPush = window.webPush;
        } else {
            this._webPush = null;
        }

        this._pushUrlCbQueue = [];
    }

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
    WebPush.prototype.requestPushUrl = function(callback) {
        if(this.hasPush()) {
            if(dopamine.utils.isAdrenalineIos()) {
                var url = localStorage.getItem(WEBPUSH_URL_KEY);
                if((typeof url !== 'undefined') && (url !== null) && (url !== "")) {
                    setTimeout(function() {callback(url);}, 0);
                } else {
                    dopamine.exec(function(url) {
                        localStorage.setItem(WEBPUSH_URL_KEY, url);
                        callback(url);}, null, "WebPush", "requestPushUrl", []);
                }
            } else if(this._webPush !== null) {
                this._handleCheckPermission(true);
                this._pushUrlCbQueue.push(callback);
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
    WebPush.prototype.hasPush = function() {
        return this._webPush !== null || dopamine.utils.isAdrenalineIos();
    };

    WebPush.prototype._invokeCallbacks = function(url) {
        while(this._pushUrlCbQueue.length > 0) {
            var cb = this._pushUrlCbQueue.shift();
            localStorage.setItem(WEBPUSH_URL_KEY, url);
            cb(url);
        }
    };

    WebPush.prototype._requestPermissionCb = function() {
        this._handleCheckPermission(false);
    };

    WebPush.prototype._requestPushUrlCb = function(result) {
        this._invokeCallbacks(result);
    };

    WebPush.prototype._invokeInBackground = function(url) {
        var push = this;
        setTimeout(function() {
            push._invokeCallbacks(url);
        }, 0);
    };

    WebPush.prototype._handleCheckPermission = function(issueRequest) {
        var url = localStorage.getItem(WEBPUSH_URL_KEY);
        if((typeof url !== 'undefined') && (url !== null) && (url !== "")) {
            this._invokeInBackground(url);
            return;
        }

        var perm = this._webPush.checkPermission();
        if(perm === PERM_NOT_ALLOW) {
            if(issueRequest) {
                this._webPush.requestPermission(PERM_CB_STR);
            }
        } else if(perm === PERM_ALLOW) {
            this._webPush.requestPushUrl(PUSH_CB_STR);
        } else if(perm === PERM_DENY) {
            this._invokeInBackground(null);
        }
    };

    Object.defineProperty(dopamine, "webPush", {
        get: function() { return new WebPush(); }
    });
})(jQuery);
