const { Script } = require("vm");
const repl = require('repl');

require('./vm').runInVM().then(dom => {

    // Don't delete the files
    dom.window.URL.revokeObjectURL = (url) => {
        return;
    };

    const vmContext = dom.getInternalVMContext();

    function runInVMContext(cmd, context, filename, callback) {
        const script = new Script(cmd);
        callback(null, script.runInContext(vmContext));
    }

    repl.start({ prompt: '> ', eval: runInVMContext });

});
