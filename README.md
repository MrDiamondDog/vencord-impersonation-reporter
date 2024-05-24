# Vencord Website Impersonation Checker

A very simple script to check for websites that are impersonating Vencord, because this has happened more than once. The only website owned by Vencord is https://vencord.dev/.

The websites below are impersonations of the Vencord website. 

-   https://vencord.app/

## Usage

```
pnpm i
pnpm start
```

This will install dependencies and run the script. To pipe this into a file, just add the file name to `pnpm start` like so:

```
pnpm start out.txt
```

To use the reporter, add `--report` to the end of the command. This will send a message to a Discord webhook, as specified in your `.env` file under `WEBHOOK_URL`.
