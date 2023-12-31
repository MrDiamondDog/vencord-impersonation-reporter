import fs from "fs";

const outFile = process.argv[2];

if (outFile) {
    fs.rmSync(outFile, { force: true });
}

enum Colors {
    GREEN = "\x1b[32m",
    RED = "\x1b[31m",
    GRAY = "\x1b[90m",
    RESET = "\x1b[0m"
}

async function urlStatus(url: string) {
    return fetch(url).then(res => res.status).catch(() => 404);
}

const TLDs = JSON.parse(fs.readFileSync("./tlds.json", "utf-8"));

const found: string[] = [];
const whitelist = [
    "DEV",
    "KZ" // just some random company
];

(async () => {
    await new Promise<void>(resolve => {
        let done = 0;
        for (const tld of TLDs) {
            urlStatus(`https://vencord.${tld}`).then(status => {
                if (status !== 404) {
                    if (outFile) fs.appendFileSync(outFile, 
                        `https://vencord.${tld}... ${status} ${whitelist.includes(tld) ? "(whitelisted)" : ""}\n`);
                    else console.log(
                        `(${done + 1}/${TLDs.length}) https://vencord.${tld}... ${Colors.RED}${status}${Colors.GRAY} ${whitelist.includes(tld) ? "(whitelisted)" : ""}${Colors.RESET}`)
                    
                    if (!whitelist.includes(tld)) found.push(tld);
                } else {
                    if (outFile) fs.appendFileSync(outFile, `https://vencord.${tld}... ${status}\n`);
                    else console.log(
                        `(${done + 1}/${TLDs.length}) https://vencord.${tld}... ${Colors.GREEN}${status}${Colors.RESET}`);
                }

                done++;
                if (done === TLDs.length) resolve();
            })
        }
    });

    if (found.length > 0) {
        if (outFile) {
            fs.appendFileSync(outFile, `\nFound ${found.length} TLDs!\n`); 
            fs.appendFileSync(outFile, found.map(tld => `- https://vencord.${tld}`).join("\n"));
        }
        else {
            console.log(`\nFound ${Colors.RED}${found.length}${Colors.RESET} TLDs!`);
            console.log(found.map(tld => `- https://vencord.${tld}`).join("\n"));
        }

    } else {
        if (outFile) fs.appendFileSync(outFile, "No TLDs found!\n");
        else console.log(`${Colors.GREEN}No TLDs found!${Colors.RESET}`);
    }

    process.exit(0);
})();