export interface UploadInfo {
    action: string;
    fields: Record<string, string>;
}

export const uploadToS3 = async (uploadInfo: UploadInfo, fileData: Uint8Array) => {
    const { action, fields } = uploadInfo;
    const formData = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
    });

    const blob = new Blob([fileData as unknown as BlobPart], { type: "application/octet-stream" });

    formData.append("file", blob);

    const response = await fetch(action, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`S3 Upload Failed: ${response.statusText}`);
    }
};
