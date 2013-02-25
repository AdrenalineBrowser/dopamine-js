/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: objStore
 *
 * Dopamine's ObjStore presents a basic key/value interface.  This library will
 * store objects in localStorage immedately, and will push them to the server
 * in the background.
 *
 * Behind the scenes the library tags all objects with a
 * browser-specific uuid to avoid namespace clutter and to enable the
 * server-side object store too look up all items belonging to this
 * particular <browser,origin> tuple.
 *
 * One side effect of tagging objects with a uuid is that these
 * objects are private to the entity that knows the uuid.
 *
 * This library perserves the write order when pushing objects to the
 * server.  In our current implementation, it does some write
 * combining for handling several writes to the same object in a row.
 *
 * Dependencies: utils.js, jquery
 */

this.dopamine = this.dopamine || {};

dopamine.objStore = (function(my, $) {
    var OBJSTORE_SERVER_QUEUE = ".adrenaline.objstore.serverQueue";
    var OBJSTORE_DEVICEID = ".adrenaline.objstore.deviceid";
    var OBJSTORE_METADATA_VERSION = ".adrenaline.objstore.metadata.version";
    var OBJSTORE_VERSION = 1;

    my.OBJSTORE_POST_URL = "http://release-0-2.adrenalinemobility.appspot.com/objstore/set_item";

    var flushOnWrite = false;
    var deviceId = null;
    var workerRunning = false;

    my.onobjectposted = null;

    function onUpdate(oldVersion) {
        if (oldVersion === OBJSTORE_VERSION) {
            return;
        }

        if (oldVersion > OBJSTORE_VERSION) {
            console.log("ERROR: Object store newer than this copy of dopamine. Not proceeding.");
            dopamine.objStore = null;
            throw "This version of the Object Store is incompatible " +
                "with the data stored locally. Try a newer version.";
        }

        // Add any fixup code for new versions here
        if (oldVersion === 0) {
            // 0 is a non-existent version representing a non-existent datastore.
        }
        localStorage.setItem(OBJSTORE_METADATA_VERSION, OBJSTORE_VERSION);
    }

    function flushThread() {
        var item = squeueFront();
        var serverQueue;
        if (item === null) {
            workerRunning = false;
            return;
        }

        workerRunning = true;

        // prep item for ajax request
        item.value = JSON.stringify(item.value);

        var request = $.ajax({
            url: my.OBJSTORE_POST_URL,
            type: "POST",
            data: item,
            dataType: "json",
            success: function(data) {
                if (data["return"] === "ok") {
                    if (data.key === item.key) {
                        /* Remove from server queue */
                        serverQueue = readServerQueue();
                        serverQueue.shift();
                        writeServerQueue(serverQueue);
                    }
                    if (my.onobjectposted !== null) {
                        my.onobjectposted(data.key, false, false);
                    }
                    flushThread();
                    } else {
                    // server returned an error on this call
                    /* DISCARD the data! Notice the 3rd parameter is true here. */
                    serverQueue = readServerQueue();
                    serverQueue.shift();
                    writeServerQueue(serverQueue);
                    workerRunning = false;

                    if (my.onobjectposted !== null) {
                        my.onobjectposted(data.key, true, true);
                    }

                    flushThread();
                }
            },
            error: function(xhr, errorType) {
                // server or network error
                // It's best to do this BEFORE calling the callback.
                workerRunning = false;
                if (my.onobjectposted !== null) {
                    my.onobjectposted(item.key, true, false);
                }
            }
        });
    }

    function flush() {
        if (workerRunning) {
            return;
        }

        flushThread();
    }

    function getUpdatedUuid(uuid) {
        if (typeof uuid === "undefined") {
            uuid = getDeviceId();
        }

        return uuid;
    }

    function createLocalKey(key, uuid) {
        uuid = getUpdatedUuid(uuid);
        return uuid + "-" + key;
    }

    /* Basically the inverse of createLocalKey */
    /*function getBaseKey(key) {
        return key.split("-")[1];
    }*/

    function getDeviceId() {
        if (deviceId != null) {
            return deviceId;
        }

        deviceId = localStorage.getItem(OBJSTORE_DEVICEID);
        if (deviceId == null) {
            deviceId = dopamine.utils.getNewId();
            localStorage.setItem(OBJSTORE_DEVICEID, deviceId);
        }

        return deviceId;
    }

    /* Testing only */
    my._setDeviceId = function(idVal) {
        if (idVal != null) {
            deviceId = idVal;
        } else { // Setting it to null will trigger a reload from localStorage
            deviceId = null;
        }
    };

    /**
     * Function: getDefaultUuid
     *
     * Returns the UUID the objStore uses for namespacing objects
     */

    my.getDefaultUuid = getDeviceId;

    /* COMPAT for version 0.1 */
    my._getDeviceId = getDeviceId;

    /* testing only currently */
    my._flush = flush;

    /**
     * Function: setItem
     *
     * Sets the value of an item in the object store
     *
     * Parameters:
     * key - the key that the item is stored under
     * value - the value you want to change it to
     *
     * Optional Parameters:
     * uuid - The uuid of a specific global store to write to.
     */

     my.setItem = function(key, value, uuid) {
        var localKey = createLocalKey(key, uuid);
        uuid = getUpdatedUuid(uuid);

        localStorage.setItem(localKey, JSON.stringify(value));
        squeuePush({"key": key, "value": value, "uuid": uuid});

        if (flushOnWrite) {
            flush();
        }
    };

    /**
     * Function: getItem
     *
     * Gets the value of an item in the object store
     *
     * Parameters:
     * key - the key that the item is stored under
     *
     * Optional Parameters:
     * uuid - The uuid of a specific global store to read from
     */


    my.getItem = function(key, uuid) {
        var localKey = createLocalKey(key, uuid);

        var jsonValue = localStorage.getItem(localKey);
        if (jsonValue == null) {
            return null;
        }

        return JSON.parse(jsonValue);
    };

    /**
     * Function: removeItem
     *
     * Removes an item from the ObjStore
     *
     * Parameters:
     * key - the key to remove
     *
     * Optional Parameters:
     * uuid - The uuid of a specific global store that the key is stored under
     *
     */
    my.removeItem = function(key, uuid) {
        var localKey = createLocalKey(key, uuid);
        localStorage.removeItem(localKey);
    };

    // XXX FIXME consider overriding localstorage.clear to save our data

    /**
     * Function: disableFlushOnWrite
     *
     * Disables the flush on write behavior.
     */

    my.disableFlushOnWrite = function() {
        flushOnWrite = false;
    };

    /**
     * Function: enableFlushOnWrite
     *
     * Enables the flush on write behavior
     */

    my.enableFlushOnWrite = function() {
        flushOnWrite = true;
        flush();
    };

    /*
      ObjStore.prototype.takeCheckpoint = function() {

      };

      ObjStore.prototype.commitCheckpoint = function() {

      };

      ObjStore.prototype.rollbackCheckpoint = function() {

      };
    */


    /**
     * These squeue functions should be safe despite potential race
     * conditions with other windows.  Browsers are supposed to implement
     * a "storageMutex" that the browser would hold during this operation
     * (see the w3c specification) because we re-read the queue from local
     * storage before writing it instead of keeping a copy in memory.
     * There is a chance that the browser doesn't implement the
     * storageMutex -- we could be in trouble in this case.
     */

    /**
     * Function: hasPendingData
     *
     * Returns:
     * - True if there are pending writes to the server
     * - False otherwise
     */

    my.hasPendingData = function() {
        return my.pendingDataCount() > 0;
    };

    /**
     * Function: pendingDataCount
     *
     * Returns:
     * - The number of pending writes
     */

    my.pendingDataCount = function() {
        var serverQueue = readServerQueue();
        return serverQueue.length;
    };

    function readServerQueue() {
        var ret = localStorage.getItem(OBJSTORE_SERVER_QUEUE);
        if (ret === null) {
            return [];
        }

        return JSON.parse(ret);
    }

    function writeServerQueue(q) {
        localStorage.setItem(OBJSTORE_SERVER_QUEUE, JSON.stringify(q));
    }

    function squeuePush(item) {
        var serverQueue = readServerQueue();

        // check if the last item on the queue has the same key as this
        // push AND it hasn't been processed by the flush thread already,
        // then update the last item instead of pushing a new item
        var updated = false;
        if (serverQueue.length >= 2) {
            var idx = serverQueue.length - 1;
            if (serverQueue[idx].key === item.key && serverQueue[idx].uuid === item.uuid) {
                serverQueue[idx].value = item.value;
                updated = true;
            }
        }

        if (!updated) {
            serverQueue.push(item);
        }

        writeServerQueue(serverQueue);
    }

    function squeueFront() {
        var serverQueue = readServerQueue();
        if (serverQueue.length === 0) {
            return null;
        }
        return serverQueue.shift();
    }

    /*function squeuePop() {
        var serverQueue = readServerQueue();
        if (serverQueue.length === 0) {
            return;
        }

        var item = serverQueue.shift();
        writeServerQueue(serverQueue);
    }*/

    function init() {
        /* Check for old data and update if needed */
        var version = localStorage.getItem(OBJSTORE_METADATA_VERSION);
        onUpdate(Number(version) || 0);
    }

    dopamine._initCallbacks = dopamine._initCallbacks || $.Callbacks();
    dopamine._initCallbacks.add(init);

    init();

    return my;
})(dopamine.objStore || {}, jQuery);
