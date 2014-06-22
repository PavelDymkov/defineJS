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
        this.scriptsStack.shift();

        if (this.scriptsStack.length == 0) {
            this.scriptsStack = null;
        } else {
            this.scriptsStack[0].checkAssets();
        }
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
            this.assetReady();
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

    Asset.prototype.assetReady = function () {
        scriptsManager.scriptReady();
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

    Attach.prototype.assetReady = function () {
        if (this.settings.callback && typeof global[this.settings.callback] == "function") {
            global[this.settings.callback]();
        }

        scriptsManager.scriptReady();
    };


    var SCRIPT_TYPE = {
        ATTACH: 0x00,
        COMMON: 0x01
    };


	var global = this;

    var scriptsManager = new ScriptsManager;
    global.scriptsManager = scriptsManager; // debug !!!

    var currentScript = getCurrentScript();
    var scriptsContainer = currentScript.parentNode;

    global.using = using;
    global.define = define;
	global.attach = attach;

	attach("main.js", {
        callback: "main"
    });


	function using(path) {
        var type = new Type(path);

        scriptsManager.addScript({
            type: SCRIPT_TYPE.COMMON,
            url: type.toUrl()
        });
	}

	function define() {

	}

	function attach(url, settings) {
        if (!settings) settings = {};

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

} ();