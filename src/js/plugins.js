/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: Plugins
 *
 * This is a collection of plugins we made available on the adrenaline
 * browser platform to extend html5.
 */

this.dopamine = this.dopamine || {};

(function($) {
    /*
     * Initializes Plugins.
     * Not meant to be used except from dopamine's main constructor
     *
     * Must be called with 'new'
     */
    function Plugins() {
        if(arguments.callee._singletonInstance)
            return arguments.callee._singletonInstance;
        arguments.callee._singletonInstance = this;
    }

    /**
     * Function: requestFullscreen()
     *
     * Enter fullscreen mode
     */
    Plugins.prototype.requestFullscreen = function(toast) {
        var args = {
            toast : true,
            button : true
        };

        if (typeof toast !== 'undefined') {
            args.toast = toast;
        }

        dopamine.exec(null, null, 'FullScreenPlugin', 'requestFullscreen', [args]);
    };

    /**
     * Function: cancelFullscreen()
     *
     * Exit fullscreen mode
     */
    Plugins.prototype.cancelFullscreen = function() {
        dopamine.exec(null, null, 'FullScreenPlugin', 'cancelFullscreen', []);
    };

    Object.defineProperty(dopamine, "plugins", {
        get: function() { return new Plugins(); }
    });
})(jQuery);
