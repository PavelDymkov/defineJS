define({
    type: "Test.A",

    getB: function () {
        attach("Test/B.js", function () {
            console.log(new Test.B);
        });
    }
});