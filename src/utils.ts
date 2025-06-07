export function getBaseFileName(filePath: string) {
	// Extract the file name including extension
	const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);

	// Remove the extension from the file name
	const baseFileName = fileName.substring(0, fileName.lastIndexOf("."));

	return baseFileName;
}

const randomString = (length: number) => Array(length + 1).join((Math.random().toString(36) + "00000000000000000").slice(2, 18)).slice(0, length);

export async function payloadGenerator(payload_data: Record<string, any>): Promise<[ArrayBuffer, string]> {
	const boundary_string = `Boundary${randomString(16)}`;
	const boundary = `------${boundary_string}`;
	const chunks: (Uint8Array | ArrayBuffer)[] = [];

	for (const [key, value] of Object.entries(payload_data)) {
		chunks.push(new TextEncoder().encode(`${boundary}\r\n`));
		
		if (typeof value === "string") {
			chunks.push(new TextEncoder().encode(`Content-Disposition: form-data; name="${key}"\r\n\r\n`));
			chunks.push(new TextEncoder().encode(`${value}\r\n`));
		} else if (value instanceof Blob) {
			chunks.push(new TextEncoder().encode(`Content-Disposition: form-data; name="${key}"; filename="blob"\r\nContent-Type: "application/octet-stream"\r\n\r\n`));
			chunks.push(await value.arrayBuffer());
			chunks.push(new TextEncoder().encode("\r\n"));
		} else {
			chunks.push(new Uint8Array(await new Response(value).arrayBuffer()));
			chunks.push(new TextEncoder().encode("\r\n"));
		}
	}

	chunks.push(new TextEncoder().encode(`${boundary}--\r\n`));
	return [await new Blob(chunks).arrayBuffer(), boundary_string];
}
