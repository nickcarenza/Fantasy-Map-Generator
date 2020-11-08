const { Script } = require("vm");
const repl = require('repl');

require('./vm').runInVM().then(dom => {

    const vmContext = dom.getInternalVMContext();

    function runInVMContext(cmd, context, filename, callback) {
        const script = new Script(cmd);
        callback(null, script.runInContext(vmContext));
    }

    repl.start({ prompt: '> ', eval: runInVMContext });

});
