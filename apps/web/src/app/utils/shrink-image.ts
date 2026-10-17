const MAX_SIDE = 1200;

/**
 * Re-encodes a photo as a JPEG of at most 1200px on its longest side, so a
 * phone uploads a few hundred kB instead of a multi-megabyte camera original
 * (the API shrinks it further). It also gives the API a name it accepts:
 * the upload is refused unless the file name ends in a lowercase image
 * extension, which a camera's `IMG_0001.JPG` does not. Falls back to the
 * original file when the browser cannot decode it.
 */
export async function shrinkImage(file: File): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file, {
            imageOrientation: "from-image",
        });
        const scale = Math.min(
            1,
            MAX_SIDE / Math.max(bitmap.width, bitmap.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d");
        if (context == null) {
            bitmap.close();
            return file;
        }
        // JPEG has no transparency; a transparent PNG would turn black
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.85),
        );
        return blob == null
            ? file
            : new File([blob], "photo.jpg", { type: "image/jpeg" });
    } catch {
        return file;
    }
}
