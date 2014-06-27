using("Test.C");
attach("some_script.js");
using("Test.D");
attach("attach_in_attach.js", { onComplete: function () { attach_in_attach(); } });
using("Test.G");

console.log("  attach.js");

function $attach() {
    console.log('  "$attach" called');
}