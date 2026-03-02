// OSC 8 hyperlink
export const link = (url: string, text?: string) => `\u001B]8;;${url}\u0007${text ?? url}\u001B]8;;\u0007`;
