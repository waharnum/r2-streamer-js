import * as debug_ from "debug";
import * as StreamZip from "node-stream-zip";

import { IZip } from "./zip";

const debug = debug_("r2:zip1");

export class Zip1 implements IZip {

    public static init(filePath: string): Promise<IZip> {

        return new Promise<IZip>((resolve, reject) => {

            const zip = new StreamZip({
                file: filePath,
                storeEntries: true,
            });

            zip.on("error", (err: any) => {
                debug("--ZIP error:");
                debug(err);

                reject(err);
            });

            zip.on("entry", (_entry: any) => {
                // console.log("--ZIP: entry");
                // console.log(entry.name);
            });

            zip.on("extract", (entry: any, file: any) => {
                debug("--ZIP extract:");
                debug(entry.name);
                debug(file);
            });

            zip.on("ready", () => {
                // console.log("--ZIP: ready");
                // console.log(zip.entriesCount);

                // const entries = zip.entries();
                // console.log(entries);

                resolve(new Zip1(zip));
            });
        });
    }

    private constructor(readonly zip: any) {
    }

    public hasEntries(): boolean {
        return this.zip.entriesCount > 0;
    }

    public hasEntry(entryPath: string): boolean {
        return this.hasEntries()
            && Object.keys(this.zip.entries()).indexOf(entryPath) >= 0;
    }

    public forEachEntry(callback: (entryName: string, entry: any) => void) {

        if (!this.hasEntries()) {
            return;
        }

        const entries = this.zip.entries();
        Object.keys(entries).forEach((entryName) => {

            const entry = entries[entryName];
            callback(entryName, entry);
        });
    }

    public entryBuffer(entryPath: string): Buffer | undefined {

        if (!this.hasEntries()) {
            return undefined;
        }

        return this.zip.entryDataSync(entryPath);
    }
}