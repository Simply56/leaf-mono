const useVps: boolean = true;

export const environment = {
    useVps,
    url: useVps ? "https://msrsen.mooo.com" : "http://127.0.0.1:3000",
    apiKey: null as string | null,
};
