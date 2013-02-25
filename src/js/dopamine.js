/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */


/**
 * This is the high level dopamine object.  It is the main entry point
 * into dopamine libraries and handles the low level interaction with
 * the browser, when needed.
 *
 *
 * About: License
 * Dopamine, and it's documentation, are licensed under the Modified BSD License
 *
 */

/**
 * Initializes the top level Dopamine object.
 *
 * Automatically called when you load dopamine.js
 */

this.dopamine = this.dopamine || {};

(function($) {
    /**
     * Note: we don't know what order the modules will be loaded in,
     * so each module has to check if the dopamine object has been
     * formed and defer allocation until first access to make sure
     * that the dopamine namespace has been fully formed before trying
     * to access features from it.
     */

    // XXX FIXME move this to the UI module...
    Object.defineProperty(dopamine, "ui", {
        get: function() { return new Ui(); }
    });

    // some basic dopamine top level interfaces that the browser uses
    if(typeof window.adrenaline !== 'undefined') {
        dopamine._adrenaline = window.adrenaline;
    } else {
        dopamine._adrenaline = null;
    }

    dopamine.__commandQueue = [];

    // We don't need this to be random because the browser keeps track
    // of things to avoid firing on the wrong ID, but we'll leave it
    // this way anyway.
    dopamine._callbackId = Math.floor(Math.random() * 2000000000);
    dopamine._callbacks = {};
    dopamine._callbackStatus = {
        NO_RESULT: 0,
        OK: 1,
        CLASS_NOT_FOUND_EXCEPTION: 2,
        ILLEGAL_ACCESS_EXCEPTION: 3,
        INSTANTIATION_EXCEPTION: 4,
        MALFORMED_URL_EXCEPTION: 5,
        IO_EXCEPTION: 6,
        INVALID_ACTION: 7,
        JSON_EXCEPTION: 8,
        ERROR: 9
    };
    dopamine._execIframe = null;


    /**
     * Called by native code when returning successful result from an action.
     *
     * @param callbackId
     * @param args
     */
    dopamine.__callbackSuccess = function(callbackId, args) {
        if (dopamine._callbacks[callbackId]) {

            // If result is to be sent to callback
            if (args.status == dopamine._callbackStatus.OK) {
                try {
                    if (dopamine._callbacks[callbackId].success) {
                        dopamine._callbacks[callbackId].success(args.message);
                    }
                } catch (e) {
                    console.log("Error in success callback: "+callbackId+" = "+e);
                }
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete dopamine._callbacks[callbackId];
            }
        }
    };

    /**
     * Called by native code when returning error from an action.
     *
     * @param callbackId
     * @param args
     */
    dopamine.__callbackError = function(callbackId, args) {
        if (dopamine._callbacks[callbackId]) {

            try {
                if (dopamine._callbacks[callbackId].fail) {
                    dopamine._callbacks[callbackId].fail(args.message);
                }
            } catch (e) {
                console.log("Error in success callback: "+callbackId+" = "+e);
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete dopamine._callbacks[callbackId];
            }
        }
    };

    dopamine.addConstructor = function(func) {
        try {
            func();
        } catch (e) {
            console.log("Failed to run constructor: " + e);
        }
    };

    dopamine.getExecIframe = function() {
        if (dopamine._execIframe)
            return dopamine._execIframe;

        var iframe = document.createElement("IFRAME");
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        dopamine._execIframe = iframe;
        return iframe;
    };

    dopamine.iOSExec = function(success, fail, service, action, args) {
        try {
            var callbackId = service + dopamine._callbackId++;
            var argsJson = JSON.stringify(args);
            if (success || fail) {
                dopamine._callbacks[callbackId] = {success:success, fail:fail};
            }

            var command = [callbackId, service, action, argsJson];

            // Stringify and queue the command. We stringify to command now to
            // effectively clone the command arguments in case they are mutated before
            // the command is executed.
            dopamine.__commandQueue.push(JSON.stringify(command));

            dopamine.getExecIframe().src = "adrenaline://ready";
        } catch (e) {
            console.log("iOSExec error: " + e);
        }
    };

    dopamine.exec = function(success, fail, service, action, args) {
        if (dopamine.utils.isAdrenalineIos()) {
            return dopamine.iOSExec(success, fail, service, action, args);
        }

        try {
            var callbackId = service + dopamine._callbackId++;
            var argsJson = JSON.stringify(args);
            if (success || fail) {
                dopamine._callbacks[callbackId] = {success:success, fail:fail};
            }

            window._cordovaExec.exec(service, action, callbackId, argsJson);
        } catch (e) {
            console.log("iOSExec error: " + e);
        }
    };

})(jQuery);
