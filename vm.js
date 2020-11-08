const fs = require('fs');
const { URL } = require('url');
const jsdom = require('jsdom');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", console.error);
virtualConsole.on("warn", console.warn);
virtualConsole.on("info", console.info);
virtualConsole.on("log", console.log);
virtualConsole.on("dir", console.dir);
virtualConsole.on('jsdomError', (err) => console.error('jsdom error:',err.message));
// virtualConsole.sendTo(console);

const rootURL = 'http://localhost/';

// const cacheDir = 'exports';
const cacheDir = 'node_modules/.cache';

class LocalResourceLoader extends jsdom.ResourceLoader {
    fetch(url, options) {
        if (url.indexOf(rootURL) === 0) {
            url = new URL(url);
            return fs.promises.readFile('.'+url.pathname);
        }
        console.log(url);
        throw new Error('External url requested');
    }
}

module.exports = {
    runInVM() {
        process.on('uncaughtException', (err) => console.error('Uncaught Exception',err.message));
        return jsdom.JSDOM.fromFile('./index.html', {
            virtualConsole,
            url: rootURL,
            runScripts: "dangerously",
            // resources: "usable",
            resources: new LocalResourceLoader(),
            // pretendToBeVisual: true,
            beforeParse(window) {

                window.location = new URL(rootURL);
                window.location.reload = () => {};

                window.fetch = function() {
                    return Promise.reject(new Error('Fetch not supported'));
                };

                // TODO Layout methods (i.e. .getComputedTextLength, .getBBox, .getTotalLength)
                // https://github.com/jsdom/jsdom/issues/1664
                window.Element.prototype.getComputedTextLength = function() {
                    return 0;
                };
                window.Element.prototype.getBBox = function() {
                    return {
                        x: 0,
                        y: 0,
                        width: 0,
                        height: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                    };
                };
                window.Element.prototype.getTotalLength = function() {
                    return 0;
                };

                const objectURLMap = new Map();
                window.URL.createObjectURL = (blob) => {
                    const uuid = Math.random().toString(36).slice(2);
                    const impl = blob[Object.getOwnPropertySymbols(blob)[0]];
                    const buffer = Buffer.from(impl._buffer);
                    const type = impl.type;
                    let path;
                    switch (impl.type) {
                        case 'image/svg+xml;charset=utf-8':
                            path = `${cacheDir}/${uuid}.svg`;
                            break;
                        case 'image/png':
                            path = `${cacheDir}/${uuid}.png`;
                            break;
                        case 'image/jpeg':
                            path = `${cacheDir}/${uuid}.png`;
                            break;
                        case 'text/plain':
                            path = `${cacheDir}/${uuid}.map`;
                            break;
                        case 'application/json':
                            path = `${cacheDir}/${uuid}.json`;
                            break;
                        default:
                            console.warn('Unexpected type',impl.type);
                            path = `${cacheDir}/${uuid}`;
                    }
                    console.log(`Saving file to ${path}`);
                    fs.writeFileSync(path, buffer);
                    // fs.writeFile(path, buffer, (err) => {
                    //     if (err) console.error(err,path);
                    //     else console.log('The file has been saved!',path);
                    // });
                    const url = `${rootURL}${path}`;
                    console.log('objectURL',url)
                    objectURLMap.set(url,path);
                    return url;
                };
                window.URL.revokeObjectURL = (url) => {
                    // console.warn('revokeObjectURL not implemented', url);
                    // return;
                    console.log('unlinking',url);
                    if (!objectURLMap.has(url)) {
                        return console.warn('object missing',url)
                    }
                    fs.unlinkSync(objectURLMap[url]);
                    objectURLMap.delete(url);
                };
            },
        });
    },
};