const fs = require('fs');
const { URL } = require('url');
const jsdom = require('jsdom');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", console.error);
virtualConsole.on("warn", console.warn);
virtualConsole.on("info", console.info);
virtualConsole.on("dir", console.dir);
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
        return jsdom.JSDOM.fromFile('./index.html', {
            virtualConsole,
            url: rootURL,
            runScripts: "dangerously",
            // resources: "usable",
            resources: new LocalResourceLoader(),
            // pretendToBeVisual: true,
            beforeParse(window) {
                // window.fetch = (new LocalResourceLoader()).fetch;
                // window.fetch = fetch;
                window.navigator.fetch = () => {
                    console.warn('navigate.fetch not implemented');
                }

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

                const objectURLMap = {};
                window.URL.createObjectURL = (blob) => {
                    const uuid = Math.random().toString(36).slice(2);
                    // const path = `node_modules/.cache/${uuid}.png`;
                    // const path = `./images/${uuid}.png`;
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
                    fs.writeFileSync(path, buffer);
                    // fs.writeFile(path, buffer, (err) => {
                    //     if (err) console.error(err,path);
                    //     else console.log('The file has been saved!',path);
                    // });
                    const url = `${rootURL}${path}`;
                    objectURLMap[url] = path;
                    return url;
                };
                window.URL.revokeObjectURL = (url) => {
                    // console.warn('revokeObjectURL not implemented', url);
                    return;
                    // console.log('unlink',url);
                    // if (!objectURLMap.has(url)) {
                    //     console.warn('image missing')
                    // }
                    // fs.unlinkSync(objectURLMap[url]);
                    // delete objectURLMap[url];
                };
            }
        });
    },
};