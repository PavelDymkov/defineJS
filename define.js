!function () {

    function Type(path) {
        var tokens = path.split(".");

        this.type = tokens.pop();
        this.namespace = tokens;
    }

    Type.prototype.toString = function () {
        return this.namespace.concat(this.type).join(".");
    };

    Type.prototype.toUrl = function () {
        return this.namespace.concat(this.type + ".js").join("/");
    };

    Type.prototype.getType = function () {
        var namespace = requireNamespace(this.namespace);

        return namespace[this.type] ? namespace[this.type] : null;
    };


    function ScriptsManager() {
        this.loadedUrls = {};
        this.scriptsStack = null;
    }

    ScriptsManager.prototype.isLoaded = function (url) {
        return this.loadedUrls.hasOwnProperty(url);
    };

    ScriptsManager.prototype.markAsLoaded = function (url) {
        return this.loadedUrls[url] = null;
    };

    ScriptsManager.prototype.addScript = function (descriptor) {
        if (this.isLoaded(descriptor.url)) return;

        this.markAsLoaded(descriptor.url);

        if (!this.scriptsStack) {
            if (descriptor.type != SCRIPT_TYPE.ATTACH) throw new Error; // ???

            this.scriptsStack = [new Attach(descriptor)];
            return;
        }

        this.scriptsStack[0].addAsset(descriptor);
    };

    ScriptsManager.prototype.scriptReady = function () {
        var current = this.scriptsStack.shift();


        if (current instanceof Attach && typeof current.settings.onComplete == "function") {
            var emptyAttach = new EmptyAttach;
            this.scriptsStack.unshift(emptyAttach);
            current.settings.onComplete();
        }

        if (this.scriptsStack.length == 0) this.scriptsStack = null;
        else this.scriptsStack[0].checkAssets();
    };

    ScriptsManager.prototype.addAsset = function (asset) {
        this.scriptsStack.unshift(asset);
    }


    function Asset(descriptor) {
        this.assets = [];

        loadScript(descriptor.url, this.checkAssets.bind(this));
    }

    Asset.prototype.checkAssets = function () {
        if (this.assets.length == 0) {
            scriptsManager.scriptReady();
            return;
        }

        var asset = this.assets.shift();

        switch (asset.type) {
            case SCRIPT_TYPE.COMMON:
                scriptsManager.addAsset(new CommonScript(asset));
                break;
            case SCRIPT_TYPE.ATTACH:
                scriptsManager.addAsset(new Attach(asset));
                break;
        }
    };

    Asset.prototype.addAsset = function (descriptor) {
        this.assets.push(descriptor);
    };


    function CommonScript(descriptor) {
        CommonScript.base.constructor.call(this, descriptor);
    }
    extend(CommonScript, Asset);


    function Attach(descriptor) {
        this.settings = descriptor;

        Attach.base.constructor.call(this, descriptor);
    }
    extend(Attach, Asset);

    function EmptyAttach() {
        this.assets = [];
    }
    extend(EmptyAttach, Asset);


    var SCRIPT_TYPE = {
        ATTACH: 0x00,
        COMMON: 0x01
    };


	var global = this;

    var settings = {
        rootPath: ""
    };

    var scriptsManager = new ScriptsManager;
    global.scriptsManager = scriptsManager; // debug !!!

    if (typeof window !== "undefined" && window == global) {
        var currentScript = getCurrentScript();
        var scriptsContainer = currentScript.parentNode;

        !function (string) {
            try {
                var userSettings = JSON.parse(string);
                for (var key in userSettings) if (userSettings.hasOwnProperty(key)) {
                    settings[key] = userSettings[key];
                }
            } catch (error) {}
        } (currentScript.getAttribute("data-settings"));

    } else {
        var fs = require("fs");
        loadScript = function (url, callback) {
            fs.readFile(url, { encoding: "utf-8" }, function (error, code) {
                global.eval(code);
                callback();
            });
        };
    }

    var baseObject = {};
    defineBaseGetter();

    global.using = using;
    global.define = define;
	global.attach = attach;

	attach("main.js", {
        onComplete: function () {
            if (typeof global["main"] == "function") {
                global["main"]();
            }
        }
    });


	function using(path) {
        var type = new Type(path);

        scriptsManager.addScript({
            type: SCRIPT_TYPE.COMMON,
            url: settings.rootPath + type.toUrl()
        });
	}

	function define(description) {
        if (description.base) {
            var base = new Type(description.base);
            var baseType = base.getType();

            if (baseType) createType(description, baseType);
            else attach(base.toUrl(), baseTypeLoaded);
        } else {
            createType(description);
        }

        function baseTypeLoaded() {
            createType(description, base.getType());
        }
	}

    function createType(description, base) {
        var type = new Type(description.type);

        var constructor;

        if (description.hasOwnProperty("constructor") && typeof description.constructor == "function")
            constructor = description.constructor;
        else if (base)
            constructor = function () { this.base.constructor(); };
        else
            constructor = function () { };

        var prototype = Object.create(base ? base.prototype : baseObject);

        delete description.type;
        delete description.base;
        delete description.constructor;

        for (var key in description) if (description.hasOwnProperty(key)) {
            prototype[key] = description[key];
        }

        constructor.base = base || null;
        constructor.prototype = prototype;
        prototype.constructor = constructor;

        requireNamespace(type.namespace)[type.type] = constructor;

    }

	function attach(url, settings) {
        if (!settings) settings = {};
        if (typeof settings == "function") settings = { onComplete: settings };

        settings.type = SCRIPT_TYPE.ATTACH;
        settings.url = url;

        scriptsManager.addScript(settings);
	}


	function loadScript(url, callback) {
        var script = createScriptTag(url);
        script.onload = function () {
            this.onload = null;

            currentScript = this;

            callback();
        };
        insert(script);
    }

    function getCurrentScript() {
		var scripts = document.getElementsByTagName("script");
		return scripts[scripts.length - 1];
	}

    function createScriptTag(url) {
        var script = document.createElement("script");
        script.src = url;
        return script;
    }

    function insert(script) {
        if (currentScript.nextSibling) {
            scriptsContainer.insertBefore(script, currentScript.nextSibling);
        } else {
            scriptsContainer.appendChild(script);
        }
    }

    function extend(type, base) {
        type.base = base.prototype;
        type.prototype = Object.create(base.prototype);
        type.prototype.constructor = type;
    }

    function requireNamespace(namespaceList) {
        var context = global;

        for (var i = 0; i < namespaceList.length; i++) {
            var name = namespaceList[i];

            if (!context[name]) context[name] = {};

            context = context[name];
        }

        return context;
    }

    function defineBaseGetter() {
        Object.defineProperty(baseObject, "base", {
            get: function baseGetter() {
                if (!this["[[boundPrototypes]]"]) createBoundPrototypesChain(this);

                var boundPrototypes = this["[[boundPrototypes]]"];
                var base = baseGetter.caller && baseGetter.caller["[[owner]]"] ? baseGetter.caller["[[owner]]"].base : this.constructor.base;

                for (var i = 0; i < boundPrototypes.length; i++) {
                    var currentBoundPrototype = boundPrototypes[i];

                    if (currentBoundPrototype.type == base) {
                        return currentBoundPrototype.boundPrototype;
                    }
                }
            }
        });
    }

    function createBoundPrototypesChain(instance) {
        var prototypesChain = [];

        for (var currentConstructor = instance.constructor.base; currentConstructor; currentConstructor = currentConstructor.base) {
            prototypesChain.unshift(currentConstructor.prototype);
        }

        for (var i = 0; i < prototypesChain.length; i++) {
            var currentPrototype = prototypesChain[i];
            var currentBoundPrototype = Object.create(currentBoundPrototype || null); // or "baseObject"???

            for (var key in currentPrototype) if (currentPrototype.hasOwnProperty(key)) {
                var value = currentPrototype[key];

                if (typeof value == "function") {
                    value["[[owner]]"] = currentPrototype.constructor;
                    currentBoundPrototype[key] = value.bind(instance);
                }
            }

            prototypesChain[i] = {
                type: prototypesChain[i].constructor,
                boundPrototype: currentBoundPrototype
            };
        }

        instance["[[boundPrototypes]]"] = prototypesChain;
    }

} ();