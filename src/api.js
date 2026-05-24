const highWayExclude = ["footway", "street_lamp", "steps", "pedestrian", "track", "path"];
/**
 * 
 * @param {Array} boundingBox array with 2 objects that have a latitude and longitude property 
 * @returns {Promise<Response>}
 */
export async function fetchOverpassData(boundingBox) {
    const exclusion = highWayExclude.map(e => `[highway!="${e}"]`).join("");
    const query = `
    [out:json];(
        way[highway]${exclusion}[footway!="*"]
        (${boundingBox[0].latitude},${boundingBox[0].longitude},${boundingBox[1].latitude},${boundingBox[1].longitude});
        node(w);
    );
    out skel;`;

    const encodedQuery = encodeURIComponent(query);
    const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${endpoint}?data=${encodedQuery}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                return response;
            }

            lastError = new Error(`Endpoint ${endpoint} returned status ${response.status}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`All Overpass API endpoints failed. Last error: ${lastError.message}`);
}