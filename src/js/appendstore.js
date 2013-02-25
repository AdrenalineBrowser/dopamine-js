/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: appendStore
 *
 * this class provides a thin wrapper around the Dopamine append-only
 * data structure.  It does not queue requests -- rather, it fires off
 * ajax requests as a result of method call invocations.
 *
 * The append-only data structure uses web push on the server side to
 * send notifications to listeners when a client invokes the "append"
 * function.
 *
 * Dependencies: jQuery
 */

this.dopamine = this.dopamine || {};

dopamine.appendStore = (function(my, $) {
    my.BASE_URL = "http://release-0-2.adrenalinemobility.appspot.com/objstore/append";
    var APPEND_PATH = "/append";
    var APPEND_GET_PATH = "/get";
    var APPEND_ADD_PUSH_URL_PATH = "/add_push_url";
    var APPEND_REM_PUSH_URL_PATH = "/rem_push_url";

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
     * Setting "actionUrl", "title", and "message" will cause the
     * server to send web push messages to anyone listening on the object,
     * and setting myPushUrl will ensure that the server does not send a
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
    my.append = function(key, values, successCb, errorCb,
                         actionUrl, title, message, myPushUrl) {
        var data = {"key": key, "values": JSON.stringify(values)};
        if (actionUrl) {
            data.actionUrl = actionUrl;
            data.title = title;
            data.message = message;
            if (myPushUrl) {
                data.myPushUrl = myPushUrl;
            }
        }

        var request = $.ajax({
            url: my.BASE_URL + APPEND_PATH,
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

    my.get = function(key, startIdx, successCb, errorCb) {
        if (!startIdx) {
            startIdx = 0;
        }

        var request = $.ajax({
            url: my.BASE_URL + APPEND_GET_PATH,
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
    my.addPushUrl = function(key, pushUrl, successCb, errorCb) {
        useRemPushUrl(my.BASE_URL + APPEND_ADD_PUSH_URL_PATH, key, pushUrl, successCb, errorCb);
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
     * pushUrl - The pushUrl that will no longer recieve notifications
     * successCb - A callback to be called upon success
     * errorCb - A callback to be called upon failure
     *
     * Success Callback data:
     *
     * > {"return": "ok"|"err_object_not_found"}
     */
    my.removePushUrl = function(key, pushUrl, successCb, errorCb) {
        useRemPushUrl(my.BASE_URL + APPEND_REM_PUSH_URL_PATH, key, pushUrl, successCb, errorCb);
    };

    var useRemPushUrl = function(path, key, pushUrl, successCb, errorCb) {
        var request = $.ajax({
            url: path,
            type: "POST",
            data: {"key": key, "push_url": pushUrl},
            dataType: "json",
            success: successCb,
            error: errorCb
        });
    };

    return my;
})(dopamine.appendStore || {}, jQuery);
