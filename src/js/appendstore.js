/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: AppendStore
 *
 * this class provides a thin wrapper around the Dopamine append-only
 * data structure.  It does not queue requests -- rather, it fires off
 * ajax requests as a result of method call invocations.
 *
 * The append-only data structure uses web push on the server side to
 * send notifications to listeners when a client invokes the "append"
 * function.
 *
 * Dependencies: jquery
 */

this.dopamine = this.dopamine || {};

(function($) {
    var APPEND_PATH = "/objstore/append/append";
    var APPEND_GET_PATH = "/objstore/append/get";
    var APPEND_ADD_PUSH_URL_PATH = "/objstore/append/add_push_url";
    var APPEND_REM_PUSH_URL_PATH = "/objstore/append/rem_push_url";

    /* Initializes the AppendStore.
     * Not meant to be used except from dopamine's main constructor.
     *
     * Must be called with 'new'
     */

    function AppendStore() {
        if(arguments.callee._singletonInstance)
            return arguments.callee._singletonInstance;
        arguments.callee._singletonInstance = this;
    }

    /**
     * Function: append
     *
     * Add "values" to object named "key".
     *
     * Required Parameters:
     * key - the key that identifies the object to be appended to
     * values - the values to be appended
     * successCb - A callback to be called upon success
     * errorCb - A callback to be called upon failure
     *
     * Optional Parameters:
     *
     * Setting "action_url", "title", and "message" will cause the
     * server to send web push messages to anyone listening on the object,
     * and setting my_push_url will ensure that the server does not send a
     * web push message to this browser.
     *
     * Success Callback data:
     *
     * > {"return": "ok"|"err_???", "start_index": int}
     *
     * where start_index is the start_index is the index of the first item
     * appended.  For an append with values = [], start_index will be the
     * index of where the first item would have gone.
     */
    AppendStore.prototype.append = function(key, values, successCb, errorCb,
                                            action_url, title, message, my_push_url) {
        var data = {"key": key, "values": JSON.stringify(values)};
        if(typeof action_url !== 'undefined') {
            data.action_url = action_url;
            data.title = title;
            data.message = message;
            if(typeof my_push_url !== 'undefined' && my_push_url !== null) {
                data.my_push_url = my_push_url;
            }
        }

        var request = $.ajax({
            url: APPEND_PATH,
            type: "POST",
            data: data,
            dataType: "json",
            success: successCb,
            error: errorCb
        });
    };

    /**
     * Function: get
     *
     * Get all of the values starting at startIdx.
     *
     * Parameters:
     * key - The key that the values are stored under
     * startIdx - the index to start at
     * successCb - A callback to be called upon success
     * errorCb - A callback to be called upon failure
     *
     * Success Callback data:
     *
     * > {"return": "ok"|"err_bad_index"|"err_object_not_found",
     * >  "values": [...],
     * >  "start_index": startIdx}
     */

    AppendStore.prototype.get = function(key, startIdx, successCb, errorCb) {
        if(typeof startIdx === 'undefined' || startIdx === null || startIdx === "") {
            startIdx = 0;
        }

        var request = $.ajax({
            url: APPEND_GET_PATH,
            type: "POST",
            data: {"key": key, "start_index": startIdx},
            dataType: "json",
            success: successCb,
            error: errorCb
        });
    };

    /**
     * Function: addPushUrl
     *
     * Registers for notification on appends to an object.
     *
     * If the object does not exist, the server will create a new object.
     *
     * Parameters:
     * key - The key that the object is stored under.
     * pushUrl - The pushUrl that notificaitons will be sent to
     * successCb - A callback to be called upon success
     * errorCb - A callback to be called upon failure
     *
     * Note: callers can pass the same pushUrl to the server multiple
     * times and they will only receive a single web push message upon
     * notification.
     *
     * Success Callback data:
     *
     * > {"return": "ok"}
     */
    AppendStore.prototype.addPushUrl = function(key, pushUrl,
                                                successCb, errorCb) {
        this._addRemPushUrl(APPEND_ADD_PUSH_URL_PATH, key, pushUrl, successCb, errorCb);
    };


    /**
     * Function: removePushUrl
     *
     * Removes a pushUrl from push notification.
     *
     * If the object doesn't have the pushUrl registered, this function
     * will still return "ok".
     *
     * Parameters:
     * key - The key that the object is stored under.
     * pushUrl - The pushUrl that will no longer recieve notificaitons
     * successCb - A callback to be called upon success
     * errorCb - A callback to be called upon failure
     *
     * Success Callback data:
     *
     * > {"return": "ok"|"err_object_not_found"}
     */
    AppendStore.prototype.removePushUrl = function(key, pushUrl,
                                                   successCb, errorCb) {
        this._addRemPushUrl(APPEND_REM_PUSH_URL_PATH, key, pushUrl, successCb, errorCb);
    };


    AppendStore.prototype._addRemPushUrl = function(path, key, pushUrl,
                                                    successCb, errorCb) {
        var request = $.ajax({
            url: path,
            type: "POST",
            data: {"key": key, "push_url": pushUrl},
            dataType: "json",
            success: successCb,
            error: errorCb
        });
    };

    Object.defineProperty(dopamine, "appendStore", {
        get: function() { return new AppendStore(); }
    });
})(jQuery);
