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

this.dopamine = (function(dopamine, $) {

    /* Internal */
    dopamine.getAdrenaline = function() {
        if (typeof window.adrenaline !== "undefined") {
            return window.adrenaline;
        } else {
            return null;
        }
    };

    /* __ means this variable is used by native code */
    dopamine.__commandQueue = [];

    // We don't need this to be random because the browser keeps track
    // of things to avoid firing on the wrong ID, but we'll leave it
    // this way anyway.
    var callbackId = Math.floor(Math.random() * 2000000000);
    var callbacks = {};
    var callbackStatus = {
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

    var iframe;

    /**
     * Called by native code when returning successful result from an action.
     *
     * @param callbackId
     * @param args
     */
    dopamine.__callbackSuccess = function(id, args) {
        if (callbacks[id]) {

            // If result is to be sent to callback
            if (args.status === callbackStatus.OK) {
                try {
                    if (callbacks[id].success) {
                        callbacks[id].success(args.message);
                    }
                } catch (e) {
                    console.log("Error in success callback: "+id+" = "+e);
                }
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete callbacks[id];
            }
        }
    };

    /**
     * Called by native code when returning error from an action.
     *
     * @param callbackId
     * @param args
     */
    dopamine.__callbackError = function(id, args) {
        if (callbacks[id]) {

            try {
                if (callbacks[id].fail) {
                    callbacks[id].fail(args.message);
                }
            } catch (e) {
                console.log("Error in success callback: " + id + " = " + e);
            }

            // Clear callback if not expecting any more results
            if (!args.keepCallback) {
                delete callbacks[id];
            }
        }
    };

    /* This is a testing only API .. i think. --murph */
    dopamine._getExecIframe = function() {
        if (iframe) {
            return iframe;
        }

        iframe = document.createElement("IFRAME");
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        return iframe;
    };

    function iOSExec (success, fail, service, action, args) {
        try {
            var thisId = service + callbackId++;
            var argsJson = JSON.stringify(args);
            if (success || fail) {
                callbacks[thisId] = {success:success, fail:fail};
            }

            var command = [thisId, service, action, argsJson];

            // Stringify and queue the command. We stringify to command now to
            // effectively clone the command arguments in case they are mutated before
            // the command is executed.
            dopamine.__commandQueue.push(JSON.stringify(command));

            dopamine._getExecIframe().src = "adrenaline://ready";
        } catch (e) {
            console.log("iOSExec error: " + e);
        }
    }

    dopamine.exec = function(success, fail, service, action, args) {
        if (dopamine.utils.isAdrenalineIos()) {
            iOSExec(success, fail, service, action, args);
            return;
        }

        try {
            var newCallbackId = service + callbackId++;
            var argsJson = JSON.stringify(args);
            if (success || fail) {
                callbacks[newCallbackId] = {success:success, fail:fail};
            }

            window._cordovaExec.exec(service, action, callbackId, argsJson);
        } catch (e) {
            console.log("dopamine.exec error: " + e);
        }
    };

    return dopamine;

})(this.dopamine || {}, jQuery);
