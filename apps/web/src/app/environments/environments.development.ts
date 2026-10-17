// Requests stay on the dev server's own origin; proxy.conf.json forwards
// /plants and /static to the local API on port 3000.
export const environment = {
    url: "",
    apiKey: null as string | null,
};
