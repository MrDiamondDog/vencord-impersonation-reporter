import fs from "fs";
import "dotenv/config";

const tldUrl = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

let outFile: string | undefined = process.argv[2];

if (outFile?.startsWith("--")) outFile = undefined;

if (outFile) {
    fs.rmSync(outFile, { force: true });
}

enum Colors {
    GREEN = "\x1b[32m",
    RED = "\x1b[31m",
    GRAY = "\x1b[90m",
    RESET = "\x1b[0m"
}


const found: string[] = [];
const timedOut: string[] = [];
const whitelist = [
    "DEV",
    "TECH", // hostinger default page, it's been like this for months
    "KZ", // just some random company
    "WIKI", // some random people who made a vencord wiki??? yeah idk either
    "CC", // vencoin to the moon
    "ROCKS", // 100% official domain
    "APP", // it isnt spreading malware and its a pain to take down so idc
];

async function urlStatus(url: string) {
    return fetch(url).then(res => res.status).catch(async e => {
        if (e.cause.code === "UND_ERR_CONNECT_TIMEOUT") {
            console.log(`Request timed out (${url})`);
            timedOut.push(url);
        }

        return 404;
    });
}

function bufferToBlob(buffer: Buffer, type: string) {
    return new Blob([buffer], { type });
}

(async () => {
    const TLDs = await fetch(tldUrl).then(res => res.text()).then(text => text.trim().split("\n").slice(1));
    // const TLDs = ["abc", "xyz", "app", "tech"];

    await new Promise<void>(async resolve => {
        let done = 0;
        for (const tld of TLDs) {
            await urlStatus(`https://vencord.${tld}`).then(status => {
                if (status !== 404) {
                    if (outFile) fs.appendFileSync(outFile, 
                        `https://vencord.${tld} ... ${status} ${whitelist.includes(tld) ? "(whitelisted)" : ""}\n`);
                    else console.log(
                        `(${done + 1}/${TLDs.length}) https://vencord.${tld} ... ${Colors.RED}${status}${Colors.GRAY} ${whitelist.includes(tld) ? "(whitelisted)" : ""}${Colors.RESET}`)
                    
                    if (!whitelist.includes(tld)) found.push(tld);
                } else {
                    if (outFile) fs.appendFileSync(outFile, `https://vencord.${tld} ... ${status}\n`);
                    else console.log(
                        `(${done + 1}/${TLDs.length}) https://vencord.${tld} ... ${Colors.GREEN}${status}${Colors.RESET}`);
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

    const images: string[] = [];
    if (process.argv.includes("--screenshot")) {
        console.log("\nTaking screenshots...");

        if (fs.existsSync("./screenshots")) fs.rmSync("./screenshots", { recursive: true, force: true });
        fs.mkdirSync("./screenshots");

        try {
            const puppeteer = await import("puppeteer");

            const browser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
            const page = await browser.newPage();

            for (const tld of found) {
                await page.goto(`https://vencord.${tld}`, { timeout: 0 });
                await page.screenshot({ path: `./screenshots/${tld}.png` });
                images.push(`./screenshots/${tld}.png`);
            }

            await browser.close();
        } catch (e) {
            console.error("Unable to take screenshot:", e);
        }

        console.log("Took screenshots!");
    }

    if (process.argv.includes("--report")) {
        console.log("\nSending report...");

        const body = new FormData();

        body.append("payload_json", JSON.stringify({
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
            }, ...images.map((_, i) => ({
                title: `vencord.${found[i]}`,
                image: {
                    url: `attachment://screenshot-${i}.png`
                },
                color: 0xFF0000
            }))]
        }));
        
        images.forEach((image, i) => {
            body.append(`files[${i}]`, bufferToBlob(fs.readFileSync(image), "image/png"), `screenshot-${i}.png`);
        });

        await fetch(process.env.WEBHOOK_URL!, {
            method: "POST",
            body
        }).then(async res => {
            console.log(`${res.status} ${res.statusText}`)
            const body = await res.text();
            if (!res.ok) throw new Error("Failed to send report!\n" + body);
        }).catch(e => {
            console.error(e);
            process.exit(1);
        });
        console.log("Sent report!");
    }

    console.log("Results -------")
    console.log(`Found: ${found.length}`);
    console.log(`Timed out: ${timedOut.length}`);
    console.log(`Whitelisted: ${whitelist.length}`);
    console.log(`Total: ${found.length + timedOut.length + whitelist.length}`);
    if (process.argv.includes("--screenshot")) console.log("Screenshots located in ./screenshots");
    if (process.argv.includes("--report")) console.log("Report sent!");

    process.exit(0);
})();
