define({
    type: "Test.C",
    base: "Test.B",

    method: function () {
        console.log("C.method");
        this.base.method();
    }
});