import ReactGA from "react-ga4";

export const initGA = () => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
        ReactGA.initialize(measurementId);
    } else {
        console.warn("Analytics: VITE_GA_MEASUREMENT_ID is missing. GA4 will not track.");
    }
};

export const logPageView = (path) => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
        ReactGA.send({ hitType: "pageview", page: path });
    }
};

export const logEvent = (category, action, label = "") => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
        ReactGA.event({
            category,
            action,
            label,
        });
    }
};
