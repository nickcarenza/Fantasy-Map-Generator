const { Script } = require("vm");
const genericPool = require("generic-pool");
const { Image, createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

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

function imageToCanvas(img, {svgWidth = 1024, svgHeight = 768, resolution = 1}) {
    const canvas = createCanvas(svgWidth * resolution, svgHeight * resolution);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

const express = require('express');
const app = express();
const port = 3000;

const saveMapScript = new Script('saveMap()');
app.get('/map.map', async (req, res) => {
    const dom = await domPool.acquire();
    dom.window.URL.createObjectURL = (blob) => {
        const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
        const buffer = Buffer.from(impl._buffer);
        res.set('Content-Type',impl.type);
        res.end(buffer);
    };
    const vmContext = dom.getInternalVMContext();
    saveMapScript.runInContext(vmContext);
    domPool.release(dom);
});

const saveMapSVGScript = new Script('saveSVG()');
app.get('/map.svg', async (req, res) => {
    const dom = await domPool.acquire();
    dom.window.URL.createObjectURL = (blob) => {
        const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
        const buffer = Buffer.from(impl._buffer);
        res.set('Content-Type',impl.type);
        res.end(buffer);
    };
    const vmContext = dom.getInternalVMContext();
    saveMapSVGScript.runInContext(vmContext);
    domPool.release(dom);
});

// function imgToPng(img, {svgWidth = 1024, svgHeight = 768, resolution = 1}) {
//     const canvas = createCanvas(svgWidth * resolution, svgHeight * resolution);
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//     return canvas.createPNGStream({resolution});
// }

const saveMapPNGScript = new Script('savePNG()');
app.get('/map.png', async (req, res) => {
    const dom = await domPool.acquire();
    dom.window.URL.createObjectURL = async (blob) => {
        const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
        const buffer = Buffer.from(impl._buffer);
        const img = new Image();
        img.src = buffer;

        res.set('Content-Type','image/png');

        // const data = imgToPNG(img, {});
        // data.pipe(res);

        const canvas = imageToCanvas(img, {});
        canvas.createPNGStream({quality:1}).pipe(res);
    };
    const vmContext = dom.getInternalVMContext();
    saveMapPNGScript.runInContext(vmContext);
    domPool.release(dom);
});



// function imgToJPEG(img, {svgWidth = 1024, svgHeight = 768, resolution = 1, quality = 1}) {
//     const canvas = createCanvas(svgWidth * resolution, svgHeight * resolution);
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//     return canvas.createJPEGStream({quality});
// }

const saveMapJPEGScript = new Script('saveJPEG()');
app.get('/map.jpeg', async (req, res) => {
    const dom = await domPool.acquire();
    dom.window.URL.createObjectURL = (blob) => {
        const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
        const buffer = Buffer.from(impl._buffer);
        const img = new Image();
        img.src = buffer;
        res.set('Content-Type','image/jpeg');
        // const data = imgToJPEG(img, {});
        // data.pipe(res);
        const canvas = imageToCanvas(img, {});
        canvas.createJPEGStream({quality:1}).pipe(res);
    };
    const vmContext = dom.getInternalVMContext();
    saveMapSVGScript.runInContext(vmContext);
    domPool.release(dom);
});

app.listen(port, () => {
  console.log(`Fantasy Map Generator listening at http://localhost:${port}`)
});