/**
 * Copyright 2013 Adrenaline Mobility.  All rights reserved.
 *
 * See the AUTHORS and LICENSE files for additional information on
 * contributors and the software license agreement.
 */

/**
 * Module: updateStream
 *
 * This class provides a consistent way for applications to share
 * state between multiple clients. This is viewed as a "low level" API
 * and developers are encouraged to layer abstractions on top of it.
 *
 * Internally, each UpdateStream can be thought of as an append-only
 * data store. There is a unique, consistent ordering of updates.
 *
 * Conceptually, each update should represent the change in state
 * since the last update.  By getting the latest full state and then
 * handling all updates since, the clients should have a accurate and
 * up to date version of the full state.
 *
 * Optionally, some updates may be marked 'FullState' indicating that
 * instead of just the new changes, they are the complete state. A new
 * subscriber will receive the latest 'FullState' and all updates
 * since.
 *
 * Permissions are managed through a series of tokens. Every client is
 * required to receive a separate token. Tokens are unique, and should
 * be treated a secret knowledge. All tokens expire eventually.
 *
 */

this.dopamine = this.dopamine || {};

dopamine.updateStream = (function(my, $) {
    my.UPDATESTREAM_URL = "http://release-0-2.adrenalinemobility.appspot.com/updatestream";
    my.INTERNAL_API = "1";

    /**
     * Google Channel API Helpers
     */

    var channelSendMessage = function(token, messageType, messageData) {
        return $.ajax({
            url: my.UPDATESTREAM_URL + "/channelComms",
            type: "POST",
            data: {data: JSON.stringify({
                   api: my.INTERNAL_API,
                   tokenValue: token,
                   type: messageType,
                   mData: messageData
                   })}
        });
    };

    // Call in the context of an UpdateStream object
    var channelOnConnect = function () {
        var that = this;
        console.log("channel connected");
        this.connected = true;

        /* Fire callbacks before informing the server.
         The server might be *very quick* and send a message before it's well handled. */
        this.onConnect.fire();
        this.onConnect = $.Callbacks();

        // announce connection to server
        channelSendMessage(that.token, "connected", that.index);
    };

    var channelReceiveMessage = function(message) {
        var data, innerData,
            decodedMessage = {};
        try {
            data = JSON.parse(message.data);
            decodedMessage.data = JSON.parse(data.data);
            decodedMessage.type = data.type;
            decodedMessage.index = data.index;
        } catch (x) {
            console.log("failed to decode message: " + x);
            return;
        }

        if (decodedMessage.index !== this.index) {
            console.log("Message received out of order! OH SNAP");
            console.log("received: " + decodedMessage.index + " instead of " + this.index);
            console.log(decodedMessage);

            this.receiveBuffer[decodedMessage.index] = decodedMessage;
            return;
        }

        console.log("Message received in order.");
        console.log("received: " + decodedMessage.index + " (which is) " + this.index);

        handleMessage.call(this, decodedMessage);

        while (this.index in this.receiveBuffer) {
            decodedMessage = this.receiveBuffer[this.index];
            delete this.receiveBuffer[this.index];
            handleMessage.call(this, decodedMessage);
        }
    };

    var handleMessage = function(message) {
        console.log("Handling message with index: " + message.index);

        var numBuf = 0;
        for (var i in this.receiveBuffer) {
            if (!isNaN(i)) {
                numBuf++;
            }
        }

        console.log("buffer size: " + numBuf);
        this.index++;

        if ("type" in message && message.type !== undefined) {
            if (message.type === "error") {
                console.log(this.name + ": Error message received: ");
                console.error(message.data);
            } else if (message.type === "rollup" && this.fullCB) {
                this.fullCB(true, true, message.data);
            } else if (message.type === "normal" && this.updateCB) {
                this.updateCB(false, true, message.data);
            }
        } else {
            console.log(this.name + ": bad message received" + message);
        }
    };

    // Hide the internal UpdateStream constructor from the world

    /**
     * createUpdateStream creates a UpdateStream from a token directly
     */
    (function( module ) {
        function UpdateStream(data) {
            this.token = data.tokenValue;
            this.updateCB = null;
            this.fullCB = null;
            this.isSubscribed = false;
            this.canWrite = data.canWrite || false;
            this.name = "Unnamed UpdateStream";
            this.index = 0;
            this.receiveBuffer = [];
        }

        /**
         * Method: setName
         *
         * Required Parameters:
         * name - a new name for this UpdateStream
         *
         * For debugging purposes, only.
         * will be used whenever the stream outputs to console.
         */
         UpdateStream.prototype.setName = function(newName) {
             this.name = newName;
         };


        /**
         * Method: getMyToken
         *
         * Returns: A string representation of the UpdateStream's token.
         * Remember, this is to be treated as secret data. Calling
         * UpdateStream.createFromToken() on this token will give you an
         * equivalent UpdateStream object to the current one.
         */

        UpdateStream.prototype.getMyToken = function() {
            return this.token;
        };


        /**
         * Method: createNewToken
         *
         * Parameters:
         * options - an object literal containing:
         *
         * Options:
         * canWrite - true if you wish to delegate write privileges.
         *     Default: false
         * canDelegate - true if you wish to allow the new token to further
         *     create tokens. Default: false.
         *
         * Returns:
         * A Deferred Promise object.
         *
         * Resolved with:
         * A string representation of the new token
         *
         * Rejected with:
         * > {"error_type": "err_no_connection", "error_details": str)
         *
         */

         UpdateStream.prototype.createNewToken = function(options) {
             var def = $.Deferred(),
                 post;

             options = options || {};

             post = $.ajax({
                 url: my.UPDATESTREAM_URL + "/createNewToken",
                 type: "POST",
                 data: {data: JSON.stringify({
                         api: my.INTERNAL_API,
                         tokenValue: this.token,
                         canWrite: options.canWrite || false,
                         canDelegate: options.canDelegate || false
                       })}
             }).done(function(data) {
                 if (data && data["return"] === "ok") {
                     def.resolveWith(this, [data.data.tokenValue]);
                 } else {
                     def.rejectWith(this, [data]);
                 }
             }).fail(function(data) {
                 def.rejectWith(this, [data]);
             });

             return def;

         };

        /**
         * Method: subscribe
         *
         * Actually begin to recieve updates from an UpdateStream.
         *
         * If you supply null for any of the update callbacks, you will not
         * recieve those updates.
         *
         * It is perfectly acceptable to use the same function for two or three of the callbacks.
         *
         * Required Parameters:
         * updateCallback - will be called for every update (not including FullState updates)
         * fullStateCallback - will be called every 'FullState' update
         *
         * update/rollup Data:
         * isRollup - True/False
         * isMine - True if the update was sent using the same token as this UpdateStream uses.
         * data - the data sent along with the update
         */


         UpdateStream.prototype.subscribe = function(update, full) {
            var def = $.Deferred(), // This is the def we return
                defSubscribe = $.Deferred(),
                that = this;

            if (this.isSubscribed) {
                console.log(this.name + ": re-subscribing to a UpdateStream is not allowed");
                def.rejectWith(this, ["err_resubscribe",
                                      "re-subscribing is not allowed"]);
                return def.promise();
            }

             console.log(this.name + ": called subscribe. 'this' is set to: ");
             console.log(this);

            this.isSubscribed = true;

            if (update != null) {
                this.updateCB = update;
            }

            if (full != null) {
                this.fullCB = full;
            }

            $.ajax({
                    url: my.UPDATESTREAM_URL + "/subscribe",
                    type: "POST",
                    data: {
                        data: JSON.stringify({
                            api: my.INTERNAL_API,
                            tokenValue: this.token})
                    }
            }).done(function (data) {
                if (data && data["return"] === "ok") {
                    defSubscribe.resolveWith(this, [data.data]);
                } else {
                    defSubscribe.rejectWith(this, [data]);
                }
            }).fail(function (data) {
                defSubscribe.rejectWith(this, [data]);
            });

            $.when(defSubscribe).done(function (data) {
                var channel, socket;

                that.channelToken = data.channelToken;
                channel = new goog.appengine.Channel(that.channelToken);

                that.onConnect = $.Callbacks();
                that.onConnect.add(def.resolve);

                console.log("opening channel");
                socket = channel.open({
                    onopen: $.proxy(channelOnConnect, that),
                    onmessage: $.proxy(channelReceiveMessage, that)
                });

                socket.onerror = function (error) {
                    console.log("channel error");
                };
                socket.onclose = function () {
                    that.connected = false;
                    console.log(that.name + ": onClose, unexpected");
                };

                console.log("Channel token: " + that.channelToken);

                that.socket = socket;

            })
            .fail(function (data) {
                console.log("subscribe failed");
                console.log(data);
                def.rejectWith(this, ["subscribe failed", data]);
            });

             return def.promise();
        };

        /** Method: unsubscribe
         *
         * No longer recieve updates to any of your callbacks.
         *
         * Returns a Promise that resolves when channel is confirmed closed.
         */

        UpdateStream.prototype.unsubscribe = function() {
            var def = $.Deferred(),
                that = this;

            console.log("unsub");

            if (this.isSubscribed) {
                console.log(this.name + ": unsubscribed");
                this.socket.onclose = function() {
                    console.log(that.name + ": closed");
                    that.connected = false;
                    that.isSubscribed = false;
                    def.resolve();
                };
                this.socket.close();
            } else {
                def.reject();
                console.log(this.name + ": unsubscribed when not subscribed");
            }

            return def.promise();
        };

        /**
         * Method: sendFullState
         *
         * RequiredParameters:
         * update - The state to send. It can be anything that will
         *   JSON.stringify well.
         *
         * Returns:
         * A jQuery Deffered object.
         *
         */


        /**
         * Method: sendUpdate
         *
         * RequiredParameters:
         * update - The update to send. It can be anything that will
         *   JSON.stringify well.
         *
         * Returns:
         * A jQuery Differed object.
         *
         */
        UpdateStream.prototype.sendUpdate = function(update){
            var def = $.Deferred();

            if (!this.isSubscribed) {
                def.rejectWith(this, ["err_not_subscribed",
                                      "Stream not subscribed"]);
                return def.promise();
            }

            if (!this.canWrite) {
                def.rejectWith(this, ["err_illegal",
                                      "This token is not allowed to write"]);
                return def.promise();
            }

            channelSendMessage(this.token, "update", JSON.stringify(update))
                .done(function(data) {
                    if (data && data["return"] === "ok") {
                        def.resolve();
                    } else {
                        def.reject(data);
                    }
                })
                .fail(function(data) {
                    def.reject("Failed to send update message");
                });

            return def.promise();
        };


        var createUpdateStream = function(tokenData) {
            return new UpdateStream(tokenData);
        };

        module.createUpdateStream = createUpdateStream;
    })( my );

    /**
     * Constructor: createNew
     *
     * Returns:
     * A Deferred Promise object.
     *
     * Resolved With:
     *
     * us - A new UpdateStream object representing the created UpdateStream
     *
     * Rejected With:
     *
     * > {"error_type": "err_no_connection", "error_details": str)
     *
     */
    my.createNew = function () {
        var def = $.Deferred();

        $.ajax({
            url: my.UPDATESTREAM_URL + "/createNew",
            type: "POST",
            data: {
                data: JSON.stringify({
                    api: my.INTERNAL_API
                })
            }
        }).done(function(data) {
            // Filter out AJAX successes that we consider errors
            if (data && data["return"] === "ok") {
                def.resolveWith(this,
                    [my.createUpdateStream(data.data)]);
            } else {
                def.rejectWith(this, [data]);
            }
        }).fail(def.reject);

        return def.promise();
    };

    /**
     * Constructor: retrieveFromToken
     *
     * Required Parameters:
     * Token - A string with the token value
     *
     * Returns:
     * A jQuery Deferred Promise.
     *
     * Resolved With:
     *
     * us - A new UpdateStream object representing the created
     * UpdateStream for your token
     *
     * Rejected With:
     *
     * > {"error_type": "err_no_connection", "error_details": str)
     *
     */

    my.retrieveFromToken = function(token) {
        var def = $.Deferred(),
            post;

        post = $.ajax({
            url: my.UPDATESTREAM_URL + "/retrieveToken",
            type: "POST",
            data: {data: JSON.stringify({
                    api: my.INTERNAL_API,
                    token: token}
            )}
        }).done(function(data) {
            if (data && data["return"] === "ok") {
                def.resolveWith(this,
                    [my.createUpdateStream(data.data)]);
            } else {
                def.rejectWith(this, [data]);
            }
        }).fail(function(data) {
            def.rejectWith(this, [data]);
        });

        return def;
    };

    /**
     * Method: createNewTokenURL
     *
     * Has the same parameters as createNewToken.
     *
     * Return value is a URL that will dispense new tokens for every visit
     *
     * Currently Unimplemented
     */

    /**
     * Method: expireToken
     *
     * Expires the passed in token.
     *
     * Required Parameters:
     * Token - the string representation of the token
     *
     * Currently Unimplemented
     *
     */

    return my;
})(dopamine.updateStream || {}, jQuery);
