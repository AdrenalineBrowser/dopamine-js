/**
 * Copyright 2012 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Class: ObjStore
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

(function($) {
    var OBJSTORE_SERVER_QUEUE = ".adrenaline.objstore.serverQueue";
    var OBJSTORE_DEVICEID = ".adrenaline.objstore.deviceid";
    var OBJSTORE_METADATA = ".adrenaline.objstore.metadata";
    var OBJSTORE_VERSION = 1;

    var OBJSTORE_POST_URL = "/objstore/set_item";

    /* Initializes the ObjStore.
     * Not meant to be used except from dopamine's main constructor.
     *
     * Must be called with 'new'
     */

    function ObjStore() {
        if(arguments.callee._singletonInstance)
            return arguments.callee._singletonInstance;
        arguments.callee._singletonInstance = this;

        this._flushOnWrite = false;
        this._deviceId = null;
        this._workerRunning = false;
        this.onobjectposted = null;

        var metadataJson = localStorage.getItem(OBJSTORE_METADATA);
        var metadata = {};
        if((metadataJson === null) || (typeof metadataJson === 'undefined')) {
            this._onUpdate(0, OBJSTORE_VERSION, metadata);
        } else {
            metadata = JSON.parse(metadataJson);
            if(metadata.version !== OBJSTORE_VERSION) {
                this._onUpdate(metadata.version, OBJSTORE_VERSION, metadata);
            }
        }

        // just in case there is any data left over
        this._flush();
    }


    ObjStore.prototype._onUpdate = function(oldVersion, newVersion, metadata) {
        // Add any fixup code for new versions here
        if(oldVersion === 0) {
            // update the location of deviceId on localStorage
            var deviceId = localStorage.getItem("deviceid");
            if(deviceId !== null) {
                localStorage.setItem(OBJSTORE_DEVICEID, deviceId);
                this._deviceId = null;
            }

            // copy any pending data from old queue to new one
            var squeueJson = localStorage.getItem("adrenalineServerQueue");
            if(squeueJson !== null) {
                var oldSqueue = JSON.parse(squeueJson);
                for(var idx = 0; idx < oldSqueue.length; idx++) {
                    var item = oldSqueue[idx];
                    this.setItem(item.key, item.value);
                }
            }
        }

        metadata.vesrion = newVersion;
        var metadataJson = JSON.stringify(metadata);
        localStorage.setItem(OBJSTORE_METADATA, metadataJson);
    };

    ObjStore.prototype._flushThread = function() {
        var item = this._squeueFront();
        if(item === null) {
            this._workerRunning = false;
            return;
        }

        this._workerRunning = true;

        // prep item for ajax request
        item.value = JSON.stringify(item.value);

        var objstore = this;
        var request = $.ajax({
            url: OBJSTORE_POST_URL,
            type: "POST",
            data: item,
            dataType: "json",
            success: function(data) {
                if(data["return"] === "ok") {
                    if(data.key === item.key) {
                        objstore._squeuePop();
                    }
                    if(objstore.onobjectposted !== null) {
                        objstore.onobjectposted(data.key, false);
                    }
                    objstore._flushThread();
                } else {
                    // server returned an error on this call
                    if(objstore.onobjectposted !== null) {
                        objstore.onobjectposted(data.key, true);
                    }
                    objstore._workerRunning = false;
                }
            },
            error: function(xhr, errorType) {
                // server or network error
                if(objstore.onobjectposted !== null) {
                    objstore.onobjectposted(item.key, true);
                }
                objstore._workerRunning = false;
            }
        });
    };

    ObjStore.prototype._flush = function() {
        if(this._workerRunning) {
            return;
        }

        this._flushThread();
    };

    ObjStore.prototype._getUpdatedUuid = function(uuid) {
        if (typeof uuid === "undefined") {
            uuid = this._getDeviceId();
        }

        return uuid;
    };

    ObjStore.prototype._createLocalKey = function(key, uuid) {
        uuid = this._getUpdatedUuid(uuid);
        return uuid + "-" + key;
    };

    ObjStore.prototype._getDeviceId = function() {
        if(this._deviceId !== null)
            return this._deviceId;

        var deviceid = localStorage.getItem(OBJSTORE_DEVICEID);
        if (deviceid === null) {
            deviceid = dopamine.utils.getNewId();
            localStorage.setItem(OBJSTORE_DEVICEID, deviceid);
        }

        this._deviceId = deviceid;
        return deviceid;
    };

    /**
     * Function: getDefaultUuid
     *
     * Returns the UUID the objStore uses for namespacing objects
     */

    ObjStore.prototype.getDefaultUuid = function() {
        return this._getDeviceId();
    };

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

    ObjStore.prototype.setItem = function(key, value, uuid) {
        var localKey = this._createLocalKey(key, uuid);
        uuid = this._getUpdatedUuid(uuid);

        localStorage.setItem(localKey, JSON.stringify(value));
        this._squeuePush({"key": key, "value": value, "uuid": uuid});

        if(this._flushOnWrite)
            this._flush();
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


    ObjStore.prototype.getItem = function(key, uuid) {
        var localKey = this._createLocalKey(key, uuid);

        var jsonValue = localStorage.getItem(localKey);
        if((jsonValue === null) || (typeof jsonValue === 'undefined')) {
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
    ObjStore.prototype.removeItem = function(key, uuid) {
        var localKey = this._createLocalKey(key, uuid);
        localStorage.removeItem(localKey);
    };

    // XXX FIXME consider overriding localstorage.clear to save our data

    /**
     * Function: disableFlushOnWrite
     *
     * Disables the flush on write behavior.
     */

    ObjStore.prototype.disableFlushOnWrite = function() {
        this._flushOnWrite = false;
    };

    /**
     * Function: enableFlushOnWrite
     *
     * Enables the flush on write behavior
     */

    ObjStore.prototype.enableFlushOnWrite = function() {
        this._flushOnWrite = true;
        this._flush();
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

    ObjStore.prototype.hasPendingData = function() {
        return this.pendingDataCount() > 0;
    };

    /**
     * Function: pendingDataCount
     *
     * Returns:
     * - The number of pending writes
     */

    ObjStore.prototype.pendingDataCount = function() {
        var serverQueue = this._readServerQueue();
        return serverQueue.length;
    };

    ObjStore.prototype._readServerQueue = function() {
        ret = localStorage.getItem(OBJSTORE_SERVER_QUEUE);
        if(ret === null)
            return [];

        return JSON.parse(ret);
    };

    ObjStore.prototype._writeServerQueue = function(q) {
        localStorage.setItem(OBJSTORE_SERVER_QUEUE, JSON.stringify(q));
    };

    ObjStore.prototype._squeuePush = function(item) {
        var serverQueue = this._readServerQueue();

        // check if the last item on the queue has the same key as this
        // push AND it hasn't been processed by the flush thread already,
        // then update the last item instead of pushing a new item
        var updated = false;
        if(serverQueue.length >= 2) {
            var idx = serverQueue.length - 1;
            if(serverQueue[idx].key === item.key && serverQueue[idx].uuid === item.uuid) {
                serverQueue[idx].value = item.value;
                updated = true;
            }
        }

        if(!updated)
            serverQueue.push(item);
        this._writeServerQueue(serverQueue);
    };

    ObjStore.prototype._squeueFront = function() {
        var serverQueue = this._readServerQueue();
        if(serverQueue.length === 0) {
            return null;
        }
        return serverQueue.shift();
    };

    ObjStore.prototype._squeuePop = function() {
        var serverQueue = this._readServerQueue();
        if(serverQueue.length === 0) {
            return;
        }

        var item = serverQueue.shift();
        this._writeServerQueue(serverQueue);
    };

    Object.defineProperty(dopamine, "objStore", {
        get: function() { return new ObjStore(); }
    });
})(jQuery);
