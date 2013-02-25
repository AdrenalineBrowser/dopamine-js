/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: utils
 *
 * This is a collection of misc functionality that we use for apps.
 * They are not really related to dopamine, but this seemed like a
 * useful place to put them.
 */

this.dopamine = this.dopamine || {};

dopamine.utils = (function(my, $) {

    /**
     * Function: isoTime()
     *
     * Returns:
     * An ISO time string
     */
    my.isoTime = function() {
        return JSON.parse(JSON.stringify(new Date()));
    };

    /**
     * Function: IsoDate()
     *
     * Returns:
     * An ISO date string
     */
    my.isoDate = function(now) {
        if (!now) {
            now = new Date();
        }

        // adjust for local time
        var year = now.getFullYear() + "";
        var month = (now.getMonth() + 1) + "";
        var date = now.getDate() + "";
        if (month.length === 1) {
            month = "0" + month;
        }
        if (date.length === 1) {
            date = "0" + date;
        }
        return year + "-" + month + "-" + date;
    };

    /**
     * Function: getNewId()
     *
     * Returns:
     * A new, unique, universial identifier
     */
    my.getNewId = function() {
        var str = "";
        if (window.crypto && window.crypto.getRandomValues) {
            var buf = new Uint32Array(8);
            window.crypto.getRandomValues(buf);
            for (var idx = 0; idx < buf.length; idx++) {
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
     * queryString - optional parameter for testing
     *
     * Returns:
     * The value of the requested key if found, or null otherwise.
     *
     */
    my.getUrlParam = function(key, queryString) {
        if (!queryString) {
            queryString = window.location.search.substring(1);
        }
        var pairs = queryString.split("&");
        for (var idx = 0; idx < pairs.length; idx++) {
            var k = pairs[idx].split("=")[0];
            if (k === key) {
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
    my.addShortcut = function(title, url, iconUrl) {
        if (!dopamine.getAdrenaline() || !dopamine.getAdrenaline().addShortCut) {
            return false;
        }

        if (url.substring(0, 8) === "https://") {
            url = "adrenalines://" + url.substring(8);
        }

        if (url.substring(0, 7) === "http://") {
            url = "adrenaline://" + url.substring(7);
        }

        dopamine.getAdrenaline().addShortCut(title, url, iconUrl);
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
    my.isAdrenalineAndroid = function() {
        // XXX if we ever implement a cordova interface for other
        // platforms than we need to check for something else
        return typeof window._cordovaExec !== "undefined";
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
    my.isAdrenalineIos = function(platform, userAgent) {
        if (!platform) {
            platform = navigator.platform;
        }
        if (!userAgent) {
            userAgent = navigator.userAgent;
        }

        var iDevice = ["iPad", "iPhone", "iPod", "iPhone Simulator", "iPad Simulator"];
        for (var idx = 0; idx < iDevice.length; idx++) {
            if (platform === iDevice[idx]) {
                return userAgent.indexOf("Adrenaline") >= 0;
            }
        }
        return false;
    };

    return my;
})(dopamine.utils || {}, jQuery);
