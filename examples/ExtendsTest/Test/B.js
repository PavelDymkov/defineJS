define({
	type: "Test.B",
	base: "Test.A",

    test: function () {
        console.log("B.test");
        this.base.test();
    }
});