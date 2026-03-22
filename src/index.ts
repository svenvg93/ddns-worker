interface Env {
    DDNS_USERNAME: string;
    DDNS_PASSWORD: string;
    ZONE_ID: string;
    CF_API_TOKEN: string;
}

export default {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
        // 1. Validate Basic Auth
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Basic ")) {
            return new Response("Unauthorized", { status: 401 });
        }

        const encodedCredentials = authHeader.replace("Basic ", "");
        const decodedCredentials = atob(encodedCredentials);
        const [username, password] = decodedCredentials.split(":");

        if (username !== env.DDNS_USERNAME || password !== env.DDNS_PASSWORD) {
            return new Response("Unauthorized", { status: 401 });
        }

        // 2. Validate hostname param
        const url = new URL(request.url);
        const hostname = url.searchParams.get("hostname");
        if (!hostname) {
            return new Response(JSON.stringify({ success: false, error: "Hostname missing" }), { status: 400 });
        }

        // 3. Get the client's real public IP
        const clientIP = request.headers.get("CF-Connecting-IP");
        if (!clientIP) {
            return new Response(JSON.stringify({ success: false, error: "Cannot determine IP" }), { status: 500 });
        }

        // 4. Look up the DNS record ID by hostname
        const lookupURL = `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/dns_records?type=A&name=${encodeURIComponent(hostname)}`;
        const lookupResponse = await fetch(lookupURL, {
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN}`,
            },
        });

        const lookupResult = await lookupResponse.json() as { success: boolean; result: { id: string }[] };
        if (!lookupResult.success || lookupResult.result.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "Hostname not found in zone" }), { status: 400 });
        }

        const dnsRecordId = lookupResult.result[0].id;

        // 5. Update the DNS record
        const updateURL = `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/dns_records/${dnsRecordId}`;
        const updateResponse = await fetch(updateURL, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${env.CF_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "A",
                name: hostname,
                content: clientIP,
                ttl: 60, // 60 seconds: the lowest possible TTL for ultra-fast propagation
                proxied: false,
            }),
        });

        const updateResult = await updateResponse.json() as { success: boolean; errors: unknown };

        if (updateResult.success) {
            return new Response(JSON.stringify({ success: true, message: `Updated ${hostname}`, clientIP }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ success: false, error: updateResult.errors }), { status: 500 });
        }
    }
} satisfies ExportedHandler<Env>;
