define({
	type: "Test.A",

	constructor: function () {
		console.log("A.constructor");
	},

	method: function () {
		console.log("A.method");

        this.test();
	},

    test: function () {
        console.log("A.test");
    }
});