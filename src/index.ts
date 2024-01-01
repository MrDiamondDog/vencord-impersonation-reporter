import fs from "fs";
import "dotenv/config";

let outFile: string | undefined = process.argv[2];

if (outFile === "--report") outFile = undefined;

if (outFile) {
    fs.rmSync(outFile, { force: true });
}

enum Colors {
    GREEN = "\x1b[32m",
    RED = "\x1b[31m",
    GRAY = "\x1b[90m",
    RESET = "\x1b[0m"
}

const timedOut: string[] = [];

async function urlStatus(url: string) {
    return fetch(url).then(res => res.status).catch(async e => {
        if (e.cause.code === "UND_ERR_CONNECT_TIMEOUT") {
            console.log(`Request timed out (${url})`);
            timedOut.push(url);
        }

        return 404;
    });
}

const TLDs = JSON.parse(fs.readFileSync("./tlds.json", "utf-8"));

const found: string[] = [];
const whitelist = [
    "DEV",
    "KZ" // just some random company
];

(async () => {
    await new Promise<void>(async resolve => {
        let done = 0;
        for (const tld of TLDs) {
            await urlStatus(`https://vencord.${tld}`).then(status => {
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

    if (process.argv.includes("--report")) {
        console.log("\nSending report...");

        const body = {
            embeds: [{
                title: "Impersonation Report",
                description: (found.length > 0 ? `Found ${found.length} website(s)!` : "No websites found!"),
                color: (found.length > 0 ? 0xFF0000 : 0x00FF00),
                fields: [
                    (found.length > 0 ? {
                        name: "Found URLs",
                        value: found.map(tld => `- https://vencord.${tld}`).join("\n")
                    } : undefined),
                    (timedOut.length > 0 ? {
                        name: "Timed Out",
                        value: timedOut.join("\n")
                    } : undefined)
                ].filter(Boolean),
                timestamp: new Date().toISOString()
            }]
        };

        await new Promise(resolve => setTimeout(resolve, 10000));

        await fetch(process.env.WEBHOOK_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }).then(res => {
            if (!res.ok) throw new Error("Failed to send report!");

            console.log(`${res.status} ${res.statusText}`)
        }).catch(e => {
            console.error(e);
            process.exit(1);
        });
        console.log("Sent report!");
    }

    process.exit(0);
})();