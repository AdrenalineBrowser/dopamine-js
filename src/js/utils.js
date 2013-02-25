/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: DopamineUtils
 *
 * This is a collection of misc functionality that we use for apps.
 * They are not really related to dopamine, but this seemed like a
 * useful place to put them.
 */

this.dopamine = this.dopamine || {};

(function($) {
    /* Initializes DopamineUtils.
     * Not meant to be used except from dopamine's main constructor
     *
     * Must be called with 'new'
     */
    function DopamineUtils() {
        if(arguments.callee._singletonInstance)
            return arguments.callee._singletonInstance;
        arguments.callee._singletonInstance = this;
    }



    /**
     * Function: isoTime()
     *
     * Returns:
     * An ISO time string
     */
    DopamineUtils.prototype.isoTime = function() {
        return JSON.parse(JSON.stringify(new Date()));
    };

    /**
     * Function: IsoDate()
     *
     * Returns:
     * An ISO date string
     */
    DopamineUtils.prototype.isoDate = function() {
        // adjust for local time
        var now = new Date();
        var year = now.getFullYear() + "";
        var month = (now.getMonth() + 1) + "";
        var date = now.getDate() + "";
        if(month.length === 1)
            month = "0" + month;
        if(date.length === 1)
            date = "0" + date;
        return year + "-" + month + "-" + date;
    };

    /**
     * Function: getNewId()
     *
     * Returns:
     * A new, unique, universial identifier
     */
    DopamineUtils.prototype.getNewId = function() {
        var str = "";
        if(typeof window.crypto !== 'undefined' &&
           typeof window.crypto.getRandomValues !== 'undefined') {
            var buf = new Uint32Array(8);
            window.crypto.getRandomValues(buf);
            for(idx = 0; idx < buf.length; idx++) {
                str += buf[idx].toString(16);
            }
        } else {
            var hexDigits = "0123456789abcdef";
            for (var i = 0; i < 36; i++) {
                str += hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
        }

        return str;
    };

    /**
     * Function: getUrlParam
     * Lookup a URL Parameter from the current page's URL
     *
     * Parameters:
     * key - The key we are looking for
     *
     * Returns:
     * The value of the requested key if found, or null otherwise.
     *
     */
    DopamineUtils.prototype.getUrlParam = function(key) {
        var queryString = window.location.search.substring(1);
        var pairs = queryString.split("&");
        for(var idx = 0; idx < pairs.length; idx++) {
            var k = pairs[idx].split("=")[0];
            if(k === key) {
                return decodeURIComponent(pairs[idx].split("=")[1]);
            }
        }

        return null;
    };

    /**
     * Function: addShortcut
     * Add a shortcut for the given url to the desktop.
     *
     * _Adrenaline Browser Only_
     *
     * Parameters:
     *
     *  Title - The title of the shortcut
     *  URL - The URL that the shortcut links to
     *  iconURL - The URL of the icon that the shrotcut will use.
     *
     * Returns:
     * - True if the shortcut was created successfully
     * - False otherwise
     *
     */
    DopamineUtils.prototype.addShortcut = function(title, url, iconUrl) {
        if(dopamine._adrenaline === null)
            return false;

        if(typeof dopamine._adrenaline.addShortCut === 'undefined')
            return false;

        if(url.substring(0, 8) === "https://")
            url = "adrenalines://" + url.substring(8);

        if(url.substring(0, 7) === "http://")
            url = "adrenaline://" + url.substring(7);

        dopamine._adrenaline.addShortCut(title, url, iconUrl);
        return true;
    };

    /**
     * Function: isAdrenalineAndroid
     *
     * Check if we are running on Adrenaline on Android
     *
     * Returns:
     * - True if Dopamine is running on Adrenaline on Android
     * - False otherwise
     */
    DopamineUtils.prototype.isAdrenalineAndroid = function() {
        // XXX if we ever implement a cordova interface for other
        // platforms than we need to check for something else
        return typeof window._cordovaExec !== 'undefined';
    };

    /**
     * Function: isAdrenalineIos
     *
     * Check if we are running on Adrenaline on Android
     *
     * Returns:
     * - True if Dopamine is running on Adrenaline on iOS
     * - False otherwise
     */
    DopamineUtils.prototype.isAdrenalineIos = function() {
        var iDevice = ["iPad", "iPhone", "iPod", "iPhone Simulator", "iPad Simulator"];
        for(var idx = 0; idx < iDevice.length; idx++) {
            if(navigator.platform === iDevice[idx]) {
                return navigator.userAgent.indexOf("Adrenaline") >= 0;
            }
        }
        return false;
    };

    Object.defineProperty(dopamine, "utils", {
        get: function() { return new DopamineUtils(); }
    });
})(jQuery);
