define({
	type: "Test.B",
	base: "Test.A",

	method: function () {
		console.log("B.method");
        this.base.method();
	},

    test: function () {
        console.log("B.test");
        this.base.test();
    }
});