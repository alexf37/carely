"use client";

import { cn } from "@/lib/utils";
import { FileTextIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// PDF.js is loaded dynamically to avoid SSR issues (uses browser-only APIs like DOMMatrix)
async function getPdfjs() {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString();
    return pdfjsLib;
}

export type PdfThumbnailProps = {
    url: string;
    width?: number;
    height?: number;
    className?: string;
};

export function PdfThumbnail({ url, width = 20, height = 20, className }: PdfThumbnailProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function renderPdf() {
            if (!url || !canvasRef.current) return;

            try {
                setIsLoading(true);
                setError(false);

                const pdfjsLib = await getPdfjs();
                if (cancelled) return;

                const pdf = await pdfjsLib.getDocument(url).promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                if (!context) return;

                // Calculate scale to fit the thumbnail size
                const viewport = page.getViewport({ scale: 1 });
                const scale = Math.min(width / viewport.width, height / viewport.height) * 2; // 2x for retina
                const scaledViewport = page.getViewport({ scale });

                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: scaledViewport,
                    canvas: canvas,
                }).promise;

                setIsLoading(false);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to render PDF thumbnail:", err);
                    setError(true);
                    setIsLoading(false);
                }
            }
        }

        renderPdf();

        return () => {
            cancelled = true;
        };
    }, [url, width, height]);

    if (error) {
        return <FileTextIcon className={cn("text-red-500", className)} />;
    }

    return (
        <canvas
            ref={canvasRef}
            className={cn("object-cover", isLoading && "opacity-0", className)}
            style={{ width, height }}
        />
    );
}
