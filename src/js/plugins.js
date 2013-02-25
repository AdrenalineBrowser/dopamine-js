/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: plugins
 *
 * This is a collection of plugins we made available on the adrenaline
 * browser platform to extend html5.
 */

this.dopamine = this.dopamine || {};

dopamine.plugins = (function(my, $) {
    /**
     * Function: requestFullscreen()
     *
     * Enter fullscreen mode
     */
    my.requestFullscreen = function(toast) {
        var args = {
            toast : true,
            button : true
        };

        if (typeof toast !== "undefined") {
            args.toast = toast;
        }

        dopamine.exec(null, null, "FullScreenPlugin", "requestFullscreen", [args]);
    };

    /**
     * Function: cancelFullscreen()
     *
     * Exit fullscreen mode
     */
    my.cancelFullscreen = function() {
        dopamine.exec(null, null, "FullScreenPlugin", "cancelFullscreen", []);
    };

    return my;
})(dopamine.plugins || {}, jQuery);
