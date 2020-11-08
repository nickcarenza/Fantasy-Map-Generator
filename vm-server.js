const { Script } = require("vm");
const genericPool = require("generic-pool");

const saveMapScript = new Script('saveMap()');

const domFactory = {
    create: function() {
        console.log('creating new dom instance');
        return require('./vm').runInVM();
    },
    destroy: function(client) {
        console.log('destroying dom instance');
        client.window.close();
    },
};

const domPool = genericPool.createPool(domFactory, {
    max: 10, // maximum size of the pool
    min: 2 // minimum size of the pool
});

const express = require('express');
const app = express();
const port = 3000;

function createObjectURL(res) {
    return (blob) => {
        const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
        const buffer = Buffer.from(impl._buffer);
        res.set('Content-Type',impl.type);
        res.end(buffer);
        return 'download';
    };
};

app.get('/map', async (req, res) => {
    const dom = await domPool.acquire();
    dom.window.URL.createObjectURL = createObjectURL(res);
    const vmContext = dom.getInternalVMContext();
    saveMapScript.runInContext(vmContext);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});