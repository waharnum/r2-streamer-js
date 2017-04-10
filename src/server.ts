import { JSON } from "ta-json";

import * as express from "express";

import * as morgan from "morgan";

import * as fs from "fs";
import * as path from "path";
import * as util from "util";

import * as url from "url";

import * as crypto from "crypto";

import { EpubParser } from "./parser/epub";

import { Publication } from "./models/publication";

import { dumpPublication, processEPUB, sortObject } from "./cli";

console.log("process.cwd():");
console.log(process.cwd());

console.log("__dirname:");
console.log(__dirname);

const args = process.argv.slice(2);
console.log("args:");
console.log(args);

let filePath = args[0];
if (!filePath) {
    console.log("FILEPATH ARGUMENT IS MISSING.");
    process.exit(1);
}

filePath = filePath.trim();
console.log(filePath);
if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, filePath);
    console.log(filePath);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), filePath);
        console.log(filePath);
        if (!fs.existsSync(filePath)) {
            console.log("FILEPATH DOES NOT EXIST.");
            process.exit(1);
        }
    }
}

const fileName = path.basename(filePath);
const ext = path.extname(fileName).toLowerCase();

const server = express();
const port = 3000;

const filePathBase64 = new Buffer(filePath).toString("base64");

const urlRoot = "http://localhost:" + port + "/pub/";
const urlBook = urlRoot + filePathBase64 + "/manifest.json";
const urlBookShowAll = urlBook + "/show/all";

server.get("/", (req: express.Request, res: express.Response) => {
    res.status(200).send("<html><body><p>OK</p><p><a href='" +
        urlBookShowAll + "'>" + urlBookShowAll + "</a></p></body></html>");
});

const routerMediaOverlays = express.Router();
// routerMediaOverlays.use(morgan("combined"));

routerMediaOverlays.get(["", "/show/:" + EpubParser.mediaOverlayURLParam + "?"],
    (req: express.Request, res: express.Response) => {

        if (!req.params.pathBase64) {
            req.params.pathBase64 = (req as any).pathBase64;
        }

        const path = new Buffer(req.params.pathBase64, "base64").toString("utf8");

        processEPUB(filePath)
            .then((publication) => {
                console.log("== EpubParser: resolve");
                // dumpPublication(publication);

                const isShow = req.url.indexOf("/show") >= 0;

                let objToSerialize: any = null;

                const resource = isShow ? req.params[EpubParser.mediaOverlayURLParam] :
                    req.query[EpubParser.mediaOverlayURLParam];
                if (resource && resource !== "all") {
                    objToSerialize = publication.FindMediaOverlayByHref(resource);
                } else {
                    objToSerialize = publication.FindAllMediaOverlay();
                }

                if (!objToSerialize) {
                    objToSerialize = [];
                }

                let jsonObj = JSON.serialize(objToSerialize);
                jsonObj = { "media-overlay": jsonObj };

                if (isShow) {
                    const jsonStr = global.JSON.stringify(jsonObj, null, "    ");

                    // breakLength: 100  maxArrayLength: undefined
                    const dumpStr = util.inspect(objToSerialize,
                        { showHidden: false, depth: 1000, colors: false, customInspect: true });

                    res.status(200).send("<html><body>" +
                        "<h2>" + path + "</h2>" +
                        "<p><pre>" + jsonStr + "</pre></p>" +
                        "<p><pre>" + dumpStr + "</pre></p>" +
                        "</body></html>");
                } else {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.set("Content-Type", "application/vnd.readium.mo+json; charset=utf-8");

                    const jsonStr = global.JSON.stringify(sortObject(jsonObj), null, "");

                    const checkSum = crypto.createHash("sha256");
                    checkSum.update(jsonStr);
                    const hash = checkSum.digest("hex");

                    const match = req.header("If-None-Match");
                    if (match === hash) {
                        res.status(304); // StatusNotModified
                        return;
                    }

                    res.setHeader("ETag", hash);
                    res.send(jsonStr);
                }
            }).catch((err) => {
                console.log("== EpubParser: reject");
                console.log(err);
                res.status(500).send("<html><body><p>Internal Server Error</p><p>" + err + "</p></body></html>");
            });
    });

const routerManifestJson = express.Router();
// routerManifestJson.use(morgan("combined"));

routerManifestJson.get(["/", "/show/:jsonPath?"],
    (req: express.Request, res: express.Response) => {

        if (!req.params.pathBase64) {
            req.params.pathBase64 = (req as any).pathBase64;
        }

        const path = new Buffer(req.params.pathBase64, "base64").toString("utf8");

        processEPUB(filePath)
            .then((publication) => {
                console.log("== EpubParser: resolve");
                // dumpPublication(publication);

                // console.log(req.url); // path local to this router
                // console.log(req.baseUrl); // path local to above this router
                // console.log(req.originalUrl); // full path (req.baseUrl + req.url)
                // url.parse(req.originalUrl, false).host
                // req.headers.host has port, not req.hostname

                const rootUrl = "http://" + req.headers.host + "/pub/" + req.params.pathBase64;
                const manifestURL = rootUrl + "/manifest.json";
                publication.AddLink("application/webpub+json", ["self"], manifestURL, false);

                let hasMO = false;
                if (publication.Spine) {
                    const link = publication.Spine.find((l) => {
                        if (l.Properties && l.Properties.MediaOverlay) {
                            return true;
                        }
                        return false;
                    });
                    if (link) {
                        hasMO = true;
                    }
                }
                if (hasMO) {
                    const moURL = rootUrl + "/" + EpubParser.mediaOverlayURLPath +
                        "?" + EpubParser.mediaOverlayURLParam + "={path}";
                    publication.AddLink("application/vnd.readium.mo+json", ["media-overlay"], moURL, true);
                }
                if (req.url.indexOf("/show") >= 0) {
                    let objToSerialize: any = null;

                    if (req.params.jsonPath) {
                        switch (req.params.jsonPath) {

                            case "all": {
                                objToSerialize = publication;
                                break;
                            }
                            case "cover": {
                                objToSerialize = publication.GetCover();
                                break;
                            }
                            case "mediaoverlays": {
                                objToSerialize = publication.FindAllMediaOverlay();
                                break;
                            }
                            case "spine": {
                                objToSerialize = publication.Spine;
                                break;
                            }
                            case "pagelist": {
                                objToSerialize = publication.PageList;
                                break;
                            }
                            case "landmarks": {
                                objToSerialize = publication.Landmarks;
                                break;
                            }
                            case "links": {
                                objToSerialize = publication.Links;
                                break;
                            }
                            case "resources": {
                                objToSerialize = publication.Resources;
                                break;
                            }
                            case "toc": {
                                objToSerialize = publication.TOC;
                                break;
                            }
                            case "metadata": {
                                objToSerialize = publication.Metadata;
                                break;
                            }
                            default: {
                                objToSerialize = null;
                            }
                        }
                    } else {
                        objToSerialize = publication;
                    }

                    if (!objToSerialize) {
                        objToSerialize = {};
                    }

                    const jsonObj = JSON.serialize(objToSerialize);
                    const jsonStr = global.JSON.stringify(jsonObj, null, "    ");

                    // breakLength: 100  maxArrayLength: undefined
                    const dumpStr = util.inspect(objToSerialize,
                        { showHidden: false, depth: 1000, colors: false, customInspect: true });

                    res.status(200).send("<html><body>" +
                        "<h2>" + path + "</h2>" +
                        "<p><pre>" + jsonStr + "</pre></p>" +
                        "<p><pre>" + dumpStr + "</pre></p>" +
                        "</body></html>");
                } else {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.set("Content-Type", "application/webpub+json; charset=utf-8");

                    const publicationJsonObj = JSON.serialize(publication);
                    const publicationJsonStr = global.JSON.stringify(sortObject(publicationJsonObj), null, "");

                    const checkSum = crypto.createHash("sha256");
                    checkSum.update(publicationJsonStr);
                    const hash = checkSum.digest("hex");

                    const match = req.header("If-None-Match");
                    if (match === hash) {
                        res.status(304); // StatusNotModified
                        return;
                    }

                    res.setHeader("ETag", hash);

                    const links = publication.GetPreFetchResources();
                    if (links && links.length) {
                        let prefetch = "";
                        links.forEach((l) => {
                            prefetch += "<" + l.Href + ">;" + "rel=prefetch,";
                        });

                        res.setHeader("Link", prefetch);
                    }

                    // res.setHeader("Cache-Control", "public,max-age=86400");

                    res.send(publicationJsonStr);
                }
            }).catch((err) => {
                console.log("== EpubParser: reject");
                console.log(err);
                res.status(500).send("<html><body><p>Internal Server Error</p><p>" + err + "</p></body></html>");
            });
    });

const routerPathBase64 = express.Router();
routerPathBase64.use(morgan("combined"));

routerPathBase64.param("pathBase64", (req, res, next, value, name) => {
    if (value === filePathBase64) {
        (req as any).pathBase64 = value;
        next();
    } else {
        res.status(403).send("<html><body><p>Forbidden</p><p>INVALID parameter: <code>"
            + req.params.pathBase64 + "</code></p></body></html>");
        // next(new Error("INVALID file param"));
    }
});

routerPathBase64.use("/:pathBase64/manifest.json", routerManifestJson);
routerPathBase64.use("/:pathBase64/" + EpubParser.mediaOverlayURLPath, routerMediaOverlays);
routerPathBase64.get("/:pathBase64", (req: express.Request, res: express.Response) => {
    res.status(200).send("<html><body><p>OK</p><p><a href='" +
        urlBookShowAll + "'>" + urlBookShowAll + "</a></p></body></html>");
});

server.use("/pub", routerPathBase64);

server.listen(port, () => {
    console.log(urlRoot);
    console.log(urlBook);
});